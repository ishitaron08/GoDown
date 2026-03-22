import { NextRequest, NextResponse } from "next/server";

/**
 * 🔒 Registration API - DISABLED
 *
 * User accounts are managed by administrators only.
 * No public self-registration is allowed.
 * All users must be created in the database by an admin.
 */

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: "Registration is disabled. User accounts are managed by administrators only.",
      message: "Contact your system administrator to create an account.",
    },
    { status: 403 }
  );
}
