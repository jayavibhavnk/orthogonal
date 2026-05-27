import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats, sessions } from "@/lib/db/schema";
import { getUserById } from "@/lib/auth/users";
import { getOrCreateSessionId, SESSION_COOKIE } from "@/lib/session";

export const USER_COOKIE = "orthogonal_user_id";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(USER_COOKIE)?.value;
  if (!userId) return null;
  return getUserById(userId);
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError();
  return user;
}

export async function attachUserToSession(userId: string) {
  const sessionId = await getOrCreateSessionId();
  const cookieStore = await cookies();

  await db.update(sessions).set({ userId }).where(eq(sessions.id, sessionId));
  await db
    .update(chats)
    .set({ userId })
    .where(and(eq(chats.sessionId, sessionId), isNull(chats.userId)));

  cookieStore.set(USER_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuth() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  cookieStore.delete(USER_COOKIE);

  if (sessionId) {
    await db
      .update(sessions)
      .set({ userId: null })
      .where(eq(sessions.id, sessionId));
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  return null;
}
