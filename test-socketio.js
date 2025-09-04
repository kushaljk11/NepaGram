// test-socketio.js
import { Server } from "socket.io";
import { createServer } from "http";

const server = createServer();
const io = new Server(server);

server.listen(3001, () => {
  console.log('Test server running on port 3001');
});