import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Supplier } from "@/models/Supplier";
import {
  setPartnerOnline,
  setPartnerOffline,
  getPartnersOnlineStatus,
} from "@/lib/redis-cache";

export const dynamic = "force-dynamic";

/**
 * GET /api/partners/status — batch online/offline status for all partners
 *
 * ?id=xxx  — single partner check (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const singleId = new URL(req.url).searchParams.get("id");

    if (singleId) {
      const status = await getPartnersOnlineStatus([singleId]);
      return NextResponse.json({ partnerId: singleId, online: !!status[singleId] });
    }

    const partners = await Supplier.find({ isActive: true }).select("_id name").lean() as any[];
    const ids = partners.map((p: any) => p._id.toString());
    const onlineMap = await getPartnersOnlineStatus(ids);

    const result = partners.map((p: any) => ({
      _id: p._id.toString(),
      name: p.name,
      online: !!onlineMap[p._id.toString()],
    }));

    return NextResponse.json({ partners: result });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/partners/status — toggle online/offline
 *
 * Body: { partnerId: string, online: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { partnerId, online } = await req.json();
    if (!partnerId || typeof online !== "boolean") {
      return NextResponse.json({ error: "partnerId and online (boolean) required" }, { status: 400 });
    }

    if (online) {
      await setPartnerOnline(partnerId, 8); // 8-hour TTL
    } else {
      await setPartnerOffline(partnerId);
    }

    return NextResponse.json({ partnerId, online, expiresIn: online ? "8h" : null });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
