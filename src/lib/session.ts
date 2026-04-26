import { getIronSession, type IronSession, type IronSessionOptions } from "iron-session";

export interface SessionData {
  authenticated?: boolean;
}

export const sessionOptions: IronSessionOptions = {
  cookieName: "agentclinic_session",
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    maxAge: 8 * 60 * 60, // 8 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

// Dynamic import so next/headers is never resolved in the edge runtime
export async function getSession(): Promise<IronSession<SessionData>> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
