import { unsealData } from "iron-session";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SessionData } from "@/src/lib/session";

const COOKIE_NAME = "agentclinic_session";

export async function middleware(request: NextRequest) {
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;

  if (!cookieValue) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const session = await unsealData<SessionData>(cookieValue, {
      password: process.env.SESSION_SECRET!,
    });
    if (!session.authenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
