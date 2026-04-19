import { NextResponse } from "next/server";
import { fetchBrands } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const brands = await fetchBrands();
    return NextResponse.json({ brands });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
