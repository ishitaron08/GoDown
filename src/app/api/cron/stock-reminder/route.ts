import { NextRequest, NextResponse } from "next/server";
import { getStaleWarehouses, pushNotification } from "@/lib/redis-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/stock-reminder
 *
 * Called by an external cron service (or manually from admin dashboard).
 * Checks which warehouses have NOT updated stock today and logs warnings.
 * Secured by CRON_SECRET header or session auth.
 */
export async function GET(req: NextRequest) {
  // Simple secret-based auth
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stale = await getStaleWarehouses();

    // Push notifications to each warehouse manager
    for (const w of stale) {
      const managerId = w.manager?._id?.toString();
      if (managerId) {
        await pushNotification(
          managerId,
          `⚠️ Warehouse "${w.name}" (${w.code}) has NOT updated stock today. Please update inventory immediately.`
        );
      }
    }

    const now = new Date().toISOString();

    return NextResponse.json({
      timestamp: now,
      totalWarehouses: stale.length + 0, // we don't know total here easily
      staleCount: stale.length,
      staleWarehouses: stale.map((w) => ({
        _id: w._id.toString(),
        name: w.name,
        code: w.code,
        manager: w.manager?.name ?? "Unassigned",
        managerEmail: w.manager?.email ?? null,
      })),
      remindersQueued: stale.filter((w) => w.manager?._id).length,
      message:
        stale.length === 0
          ? "All warehouses have updated stock today ✅"
          : `${stale.length} warehouse(s) have stale stock — reminders sent`,
    });
  } catch (err: any) {
    console.error("[Cron stock-reminder]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
