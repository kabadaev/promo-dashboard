import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, AUTH } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";
    if (!checkPassword(password)) {
      return NextResponse.json(
        { ok: false, error: "Грешна парола" },
        { status: 401 }
      );
    }
    const token = createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: AUTH.COOKIE_MAX_AGE,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
