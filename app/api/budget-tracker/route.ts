import { NextResponse } from "next/server";
import { fetchBudgetTracker } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tracker = await fetchBudgetTracker();
    return NextResponse.json({ tracker });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
