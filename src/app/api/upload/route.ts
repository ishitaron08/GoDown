import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadImage, getImageKitAuth } from "@/lib/imagekit";

export const dynamic = "force-dynamic";

// GET — return ImageKit auth parameters for client-side upload
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const auth = getImageKitAuth();
  return NextResponse.json({
    ...auth,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
}

// POST — server-side upload (base64)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileBase64, fileName, folder } = await req.json();
    if (!fileBase64 || !fileName) {
      return NextResponse.json({ error: "fileBase64 and fileName are required" }, { status: 400 });
    }

    const result = await uploadImage(fileBase64, fileName, folder ?? "/godown/products");
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[POST /api/upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
