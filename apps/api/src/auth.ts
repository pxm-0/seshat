import crypto from "node:crypto";

import { sessions, users, type Database } from "@seshat/db";
import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt } from "drizzle-orm";

import { ApiError } from "./errors.js";

export const sessionCookieName = "seshat_session";

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
};

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function sessionExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

export async function createSession(
  db: Database,
  reply: FastifyReply,
  userId: string,
  secureCookie: boolean,
) {
  const token = createSessionToken();
  await db.insert(sessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt: sessionExpiryDate(),
  });

  reply.setCookie(sessionCookieName, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: secureCookie,
  });
}

export async function clearSession(db: Database, request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[sessionCookieName];
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  }

  reply.clearCookie(sessionCookieName, {
    path: "/",
  });
}

export async function getAuthenticatedUser(
  db: Database,
  request: FastifyRequest,
): Promise<AuthenticatedUser | null> {
  const token = request.cookies[sessionCookieName];
  if (!token) {
    return null;
  }

  const [row] = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    id: row.userId,
    email: row.email,
    displayName: row.displayName,
  };
}

export async function requireUser(db: Database, request: FastifyRequest) {
  const user = await getAuthenticatedUser(db, request);
  if (!user) {
    throw new ApiError(401, "UNAUTHENTICATED", "You must be logged in.");
  }

  return user;
}
