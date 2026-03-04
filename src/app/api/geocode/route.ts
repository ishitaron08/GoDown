import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server-side geocoding proxy for Nominatim.
 * Nominatim requires a User-Agent header and blocks most browser fetch calls.
 * Running from the server avoids CORS issues and lets us set proper headers.
 *
 * GET /api/geocode?address=...&city=...&pincode=...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address") ?? "";
  const city = searchParams.get("city") ?? "";
  const pincode = searchParams.get("pincode") ?? "";

  // Build a list of queries to try, from most specific to least
  const queries = [
    [address, city, pincode, "India"].filter(Boolean).join(", "),
    [city, pincode, "India"].filter(Boolean).join(", "),
    [city, "India"].filter(Boolean).join(", "),
  ].filter((q) => q.replace(/,\s*/g, "").trim().length > 0);

  const headers = {
    "User-Agent": "GoDownInventoryApp/1.0 (contact@godown.local)",
    "Accept-Language": "en",
    Accept: "application/json",
  };

  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in`;
      const res = await fetch(url, { headers, next: { revalidate: 0 } });

      if (!res.ok) continue;
      const data = await res.json();

      if (data && data.length > 0) {
        return NextResponse.json({
          lat: parseFloat(data[0].lat).toFixed(6),
          lng: parseFloat(data[0].lon).toFixed(6),
          display: data[0].display_name,
          query: q,
        });
      }
    } catch {
      // try next query
    }
  }

  return NextResponse.json({ error: "Location not found" }, { status: 404 });
}
