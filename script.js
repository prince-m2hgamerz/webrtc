const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let pc = new RTCPeerConnection(servers);
let socket;
let roomId;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
  localVideo.srcObject = stream;
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
});

pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
};

document.getElementById("createRoom").onclick = () => {
  roomId = Math.random().toString(36).substring(2, 8);
  const link = `${window.location.origin}?room=${roomId}`;
  document.getElementById("roomLink").value = link;
  startWebSocket(roomId, true);
};

const urlRoom = new URLSearchParams(window.location.search).get("room");
if (urlRoom) startWebSocket(urlRoom, false);

function startWebSocket(room, isCaller) {
  const wsUrl = `${window.location.origin.replace(/^http/, "ws")}/api/ws?room=${room}`;
  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", async () => {
    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.send(JSON.stringify({ offer }));
    }
  });

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.answer) {
      await pc.setRemoteDescription(data.answer);
    } else if (data.offer) {
      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.send(JSON.stringify({ answer }));
    } else if (data.candidate) {
      try {
        await pc.addIceCandidate(data.candidate);
      } catch (e) {
        console.error(e);
      }
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ candidate: event.candidate }));
      } else {
        socket.addEventListener("open", () => {
          socket.send(JSON.stringify({ candidate: event.candidate }));
        });
      }
    }
  };
}
