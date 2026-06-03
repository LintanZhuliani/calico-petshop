import { Server } from "socket.io";

let io: Server | null = null;

export const initSocket = (server: any, corsOrigin: string) => {
  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected via WebSocket:", socket.id);
    
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};

/**
 * Get the global Socket.io instance to emit events from anywhere in the backend.
 */
export const getIo = () => {
  return io;
};
