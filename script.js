const createRoomBtn = document.getElementById("createRoomBtn");
const joinBtn = document.getElementById("joinBtn");
const roomInput = document.getElementById("roomInput");
const callArea = document.getElementById("callArea");
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const hangupBtn = document.getElementById("hangupBtn");
const shareLink = document.getElementById("shareLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");

let pc, ws;

// Generate random room ID
function generateRoomID() {
  return Math.random().toString(36).substring(2, 10);
}

// Create new room
createRoomBtn.onclick = () => {
  const roomId = generateRoomID();
  roomInput.value = roomId;
  startCall(roomId);
};

// Join existing room
joinBtn.onclick = () => {
  const roomId = roomInput.value.trim();
  if (!roomId) return alert("Please enter a room ID");
  startCall(roomId);
};

// Hangup
hangupBtn.onclick = () => {
  if (pc) pc.close();
  if (ws) ws.close();
  location.reload();
};

// Copy link
copyLinkBtn.onclick = () => {
  navigator.clipboard.writeText(window.location.href + "?room=" + roomInput.value)
    .then(() => alert("Link copied!"))
    .catch(() => alert("Failed to copy link"));
};

// Start WebRTC call
async function startCall(roomId) {
  pc = new RTCPeerConnection();
  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  localVideo.srcObject = localStream;

  pc.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Connect to Render backend
  const wsUrl = `wss://webrtc2-ax2m.onrender.com/?room=${roomId}`;
  ws = new WebSocket(wsUrl);

  ws.onmessage = async (event) => {
    let data;

    // Convert Blob to text if needed
    if (event.data instanceof Blob) {
      const text = await event.data.text();
      try { data = JSON.parse(text); } 
      catch (err) { console.error("Failed to parse JSON from Blob:", err); return; }
    } else {
      try { data = JSON.parse(event.data); } 
      catch (err) { console.error("Failed to parse JSON:", err, event.data); return; }
    }

    if (data.sdp) {
      await pc.setRemoteDescription(data.sdp);
      if (data.sdp.type === "offer") {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ sdp: pc.localDescription }));
      }
    } else if (data.candidate) {
      try { await pc.addIceCandidate(data.candidate); }
      catch (err) { console.error("Error adding ICE candidate:", err); }
    }
  };

  ws.onopen = async () => {
    pc.onicecandidate = (event) => {
      if (event.candidate) ws.send(JSON.stringify({ candidate: event.candidate }));
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    ws.send(JSON.stringify({ sdp: pc.localDescription }));

    callArea.classList.remove("hidden");
    shareLink.textContent = `Share this room link: ${window.location.origin}?room=${roomId}`;
  };
}
