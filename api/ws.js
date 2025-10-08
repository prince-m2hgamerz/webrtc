export const config = {
  runtime: 'edge',
};

let rooms = new Map();

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('room');

  // Upgrade request to WebSocket
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected WebSocket', { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  if (!rooms.has(roomId)) {
    rooms.set(roomId, []);
  }
  const peers = rooms.get(roomId);

  socket.onmessage = (event) => {
    // Broadcast messages to other peers in the room
    for (const peer of peers) {
      if (peer !== socket) {
        try {
          peer.send(event.data);
        } catch (err) {
          console.error('Send error:', err);
        }
      }
    }
  };

  socket.onclose = () => {
    const updated = peers.filter((p) => p !== socket);
    rooms.set(roomId, updated);
    console.log(`Socket closed for room ${roomId}`);
  };

  peers.push(socket);
  console.log(`Socket connected to room ${roomId}`);
  return response;
}
