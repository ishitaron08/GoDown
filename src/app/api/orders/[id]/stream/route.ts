import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { getOrderStatus } from "@/lib/redis-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: { id: string } };

/**
 * GET /api/orders/:id/stream — Server-Sent Events for live order status
 *
 * The client uses EventSource to connect. Every 3 seconds we check Redis
 * for status changes and push them down the stream.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const orderId = params.id;

  await connectDB();
  const order = await Order.findById(orderId)
    .select("status deliveryStatus orderNumber")
    .lean() as any;

  if (!order) {
    return new Response(JSON.stringify({ error: "Order not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let lastStatus = order.status;
  let lastDelivery = order.deliveryStatus;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send an SSE event
      function send(data: Record<string, unknown>) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      }

      // Send initial state immediately
      send({
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        orderNumber: order.orderNumber,
        updatedAt: new Date().toISOString(),
      });

      // Poll Redis every 3 seconds for changes
      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }

        try {
          const cached = await getOrderStatus(orderId);
          if (cached) {
            const changed =
              cached.status !== lastStatus ||
              cached.deliveryStatus !== lastDelivery;

            if (changed) {
              lastStatus = cached.status ?? lastStatus;
              lastDelivery = cached.deliveryStatus ?? lastDelivery;
              send({
                status: lastStatus,
                deliveryStatus: lastDelivery,
                updatedAt: cached.updatedAt,
              });
            }
          }
        } catch {
          // Redis error — skip this tick
        }
      }, 3000);

      // Auto-close after 5 minutes (client will reconnect)
      setTimeout(() => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, 5 * 60 * 1000);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
