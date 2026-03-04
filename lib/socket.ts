import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

let io: SocketIOServer | null = null;

// ============================================================================
// Socket.io Event Types
// ============================================================================

export interface SocketEvents {
  "inventory.updated": {
    productId: string;
    productName: string;
    oldQuantity: number;
    newQuantity: number;
    tenantId: string;
  };
  "vendor.status.changed": {
    vendorId: string;
    vendorName: string;
    oldStatus: string;
    newStatus: string;
    tenantId: string;
  };
  "order.created": {
    orderId: string;
    consumerId: string;
    totalAmount: number;
    type: string;
    tenantId: string;
  };
  "po.status.changed": {
    purchaseOrderId: string;
    oldStatus: string;
    newStatus: string;
    vendorName: string;
    tenantId: string;
  };
}

// ============================================================================
// Initialize Socket.io Server with Redis Adapter
// ============================================================================

export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socketio",
    addTrailingSlash: false,
  });

  // Setup Redis adapter for horizontal scaling
  if (process.env.REDIS_HOST) {
    try {
      const redisOptions = {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || "6379"),
        username: process.env.REDIS_USERNAME || "default",
        password: process.env.REDIS_PASSWORD || undefined,
      };
      const pubClient = new Redis(redisOptions);
      const subClient = pubClient.duplicate();

      io.adapter(createAdapter(pubClient, subClient));
      console.log("Socket.io Redis adapter connected");
    } catch (error) {
      console.error("Failed to connect Socket.io Redis adapter:", error);
    }
  }

  // Authentication middleware
  io.use((socket, next) => {
    const tenantId = socket.handshake.auth.tenantId;
    const userId = socket.handshake.auth.userId;

    if (!tenantId || !userId) {
      return next(new Error("Authentication required"));
    }

    // Store user info on socket
    socket.data.tenantId = tenantId;
    socket.data.userId = userId;
    next();
  });

  io.on("connection", (socket) => {
    const { tenantId, userId } = socket.data;
    console.log(`User ${userId} connected to tenant ${tenantId}`);

    // Join tenant-specific room for multi-tenant isolation
    socket.join(`tenant:${tenantId}`);

    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  console.log("Socket.io server initialized");
  return io;
}

// ============================================================================
// Emit Events (used by service layer)
// ============================================================================

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToTenant<K extends keyof SocketEvents>(
  tenantId: string,
  event: K,
  data: SocketEvents[K]
): void {
  if (io) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}

export { io };
