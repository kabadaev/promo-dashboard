import { NextResponse } from "next/server";
import { fetchMonthlyBudget } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const budget = await fetchMonthlyBudget();
    return NextResponse.json({ budget });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
