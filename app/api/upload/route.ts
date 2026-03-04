import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/middleware/permission";
import { uploadRequestSchema } from "@/lib/zod-schemas";
import {
  validateFile,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  generateFileKey,
} from "@/lib/s3";
import { z } from "zod";

// POST /api/upload — Generate presigned upload URL
export const POST = withPermission("file.upload", {
  rateLimit: { maxRequests: 20, windowSeconds: 60 },
})(
  async (req: NextRequest, { user }) => {
    try {
      const body = await req.json();
      const data = uploadRequestSchema.parse(body);

      // Validate file type and size
      const validation = validateFile(data.contentType, data.fileSize);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Generate unique file key
      const key = generateFileKey(user.tenantId, "documents", data.filename);

      // Generate presigned upload URL
      const result = await generatePresignedUploadUrl(key, data.contentType);

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: error.issues },
          { status: 400 }
        );
      }
      console.error("Upload URL error:", error);
      return NextResponse.json(
        { error: "Failed to generate upload URL" },
        { status: 500 }
      );
    }
  }
);

// GET /api/upload?key=... — Generate presigned download URL
export const GET = withPermission("file.upload")(
  async (req: NextRequest, { user }) => {
    try {
      const { searchParams } = new URL(req.url);
      const key = searchParams.get("key");

      if (!key) {
        return NextResponse.json({ error: "File key is required" }, { status: 400 });
      }

      // Verify the key belongs to the user's tenant
      if (!key.startsWith(user.tenantId)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const result = await generatePresignedDownloadUrl(key);
      return NextResponse.json(result);
    } catch (error) {
      console.error("Download URL error:", error);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }
  }
);
