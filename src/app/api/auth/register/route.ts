import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Role } from "@/models/Role";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 registrations per minute per IP
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rl = await rateLimit(`register:${ip}`, 5, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later.", resetIn: rl.resetIn },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Find the default role, fall back to "staff"
    const defaultRole = await Role.findOne({ isDefault: true }).lean() as any;
    const roleSlug = defaultRole?.slug ?? "staff";

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      role: roleSlug,
    });

    return NextResponse.json(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
