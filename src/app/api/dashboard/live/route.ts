import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { getStaleWarehouses, getPartnersOnlineStatus } from "@/lib/redis-cache";
import { Supplier } from "@/models/Supplier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/dashboard/live — SSE endpoint for admin live dashboard
 *
 * Pushes live stats every 5 seconds:
 * - Active orders (processing / in-transit)
 * - Online delivery partners
 * - Stale warehouses
 * - Today's revenue
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      }

      async function tick() {
        if (closed) return;

        try {
          await connectDB();

          // Active orders
          const [processingCount, inTransitCount, todayRevenue] = await Promise.all([
            Order.countDocuments({ status: "processing" }),
            Order.countDocuments({ deliveryStatus: { $in: ["assigned", "picked_up", "in_transit"] } }),
            Order.aggregate([
              {
                $match: {
                  status: "completed",
                  createdAt: {
                    $gte: new Date(new Date().toISOString().split("T")[0]), // start of today
                  },
                },
              },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),
          ]);

          // Online partners
          const partners = await Supplier.find({ isActive: true }).select("_id").lean() as any[];
          const partnerIds = partners.map((p: any) => p._id.toString());
          const onlineMap = await getPartnersOnlineStatus(partnerIds);
          const onlineCount = Object.values(onlineMap).filter(Boolean).length;

          // Stale warehouses
          const stale = await getStaleWarehouses();

          send({
            ordersProcessing: processingCount,
            ordersInTransit: inTransitCount,
            partnersOnline: onlineCount,
            partnersTotal: partnerIds.length,
            staleWarehouses: stale.length,
            todayRevenue: todayRevenue[0]?.total ?? 0,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          // Skip this tick on error
          console.error("[Live dashboard tick]", err);
        }
      }

      // Send immediately
      await tick();

      // Then every 5 seconds
      const interval = setInterval(tick, 5000);

      // Auto-close after 5 minutes
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
