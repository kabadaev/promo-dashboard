import { NextResponse } from "next/server";
import { fetchPromos } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const promos = await fetchPromos();
    return NextResponse.json({ promos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
