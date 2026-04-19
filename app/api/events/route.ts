import { NextResponse } from "next/server";
import { fetchEvents } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await fetchEvents();
    return NextResponse.json({ events });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
