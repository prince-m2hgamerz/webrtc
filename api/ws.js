export const config = {
  runtime: "edge",
};

let rooms = {};

export default async (req) => {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("room");
  const { socket, response } = Deno.upgradeWebSocket(req);

  if (!rooms[roomId]) rooms[roomId] = [];
  const peers = rooms[roomId];

  socket.onmessage = (e) => {
    peers.forEach((peer) => {
      if (peer !== socket) peer.send(e.data);
    });
  };

  socket.onclose = () => {
    rooms[roomId] = peers.filter((p) => p !== socket);
  };

  peers.push(socket);
  return response;
};
