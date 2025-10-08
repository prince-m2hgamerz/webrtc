const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let pc = new RTCPeerConnection(servers);

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
  localVideo.srcObject = stream;
  stream.getTracks().forEach((track) => pc.addTrack(track, stream));
});

pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
};

// ----- OFFER -----
document.getElementById("startCall").onclick = async () => {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  document.getElementById("offer").value = JSON.stringify(pc.localDescription);
};

// ----- ANSWER -----
document.getElementById("answerCall").onclick = async () => {
  const offer = JSON.parse(document.getElementById("offer").value);
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  document.getElementById("answer").value = JSON.stringify(pc.localDescription);
};

// ----- ADD ANSWER -----
document.getElementById("addAnswer").onclick = async () => {
  const answer = JSON.parse(document.getElementById("answer").value);
  if (!pc.currentRemoteDescription) {
    await pc.setRemoteDescription(answer);
  }
};
