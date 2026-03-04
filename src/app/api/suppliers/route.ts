import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Supplier } from "@/models/Supplier";
import { Warehouse } from "@/models/Warehouse"; // needed so Mongoose can resolve the assignedWarehouse ref
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/** Generates a random human-friendly password (no ambiguous chars like 0/O, 1/l). */
function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

/** Derives a login email from the partner's name if no email was supplied. */
function deriveLoginEmail(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".");
  return `${slug}.dp@godown.internal`;
}

export async function GET() {
  try {
    await connectDB();
    // Ensure Warehouse model is registered before populate
    void Warehouse;
    const suppliers = await Supplier.find({ isActive: { $ne: false } })
      .populate("assignedWarehouse", "name code city")
      .sort({ name: 1 })
      .lean();
    // Normalise: older docs may not have vehicles field in MongoDB
    const normalised = suppliers.map((s: any) => ({
      ...s,
      vehicles: Array.isArray(s.vehicles) ? s.vehicles : [],
    }));
    return NextResponse.json(normalised);
  } catch (err: any) {
    console.error("[GET /api/suppliers]", err?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    await connectDB();

    // ── 1. Determine login email ───────────────────────────────────────────
    const loginEmail = body.email?.trim()
      ? body.email.trim().toLowerCase()
      : deriveLoginEmail(body.name.trim());

    // Check if a user with this email already exists
    const existing = await User.findOne({ email: loginEmail });
    if (existing) {
      return NextResponse.json(
        { error: `A user with email "${loginEmail}" already exists. Use a different email or name.` },
        { status: 409 }
      );
    }

    // ── 2. Generate & hash password ────────────────────────────────────────
    const rawPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // ── 3. Create the User account ─────────────────────────────────────────
    const user = await User.create({
      name: body.name.trim(),
      email: loginEmail,
      password: hashedPassword,
      role: "delivery-partner",
      isActive: true,
    });

    // ── 4. Build and save the Supplier document ────────────────────────────
    const doc: Record<string, any> = {
      name: body.name,
      email: body.email || undefined,
      phone: body.phone || undefined,
      address: body.address || undefined,
      pincode: body.pincode || undefined,
      vehicles: Array.isArray(body.vehicles) ? body.vehicles : [],
      isActive: true,
      userId: user._id,
      assignedWarehouse: body.assignedWarehouse || undefined,
    };
    if (body.coordinates?.lat && body.coordinates?.lng) {
      doc.coordinates = { lat: body.coordinates.lat, lng: body.coordinates.lng };
    }

    const supplier = await Supplier.create(doc);

    // ── 5. Return supplier + plain-text credentials (shown once) ──────────
    return NextResponse.json(
      {
        supplier,
        credentials: {
          loginEmail,
          password: rawPassword,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/suppliers]", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    await connectDB();
    const supplier = await Supplier.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Delivery partner removed" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
