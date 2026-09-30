import { Server } from "socket.io"
import type { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";

let io: Server;

export function initSocketServer(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      socket.disconnect();
      return;
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
      socket.join(`user-${decoded.id}`);
      console.log(`Socket ${socket.id} joined room user-${decoded.id}`);
    } catch (err) {
      console.error("Socket auth failed:", err);
      socket.disconnect();
    }

    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} disconnected`);
    });
  });

  return io;

}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialized yet");
  return io;
}


