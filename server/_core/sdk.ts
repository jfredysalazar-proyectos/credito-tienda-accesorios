import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { getUserById } from "../auth";

const AXIOS_TIMEOUT_MS = 30000;

export type SessionPayload = {
  userId: number;
  email: string;
};

class SDKServer {
  private readonly jwtSecret: Uint8Array;

  constructor() {
    this.jwtSecret = new TextEncoder().encode(ENV.jwtSecret);
  }

  private parseCookies(cookieHeader?: string): Map<string, string> {
    const cookies = new Map<string, string>();
    if (!cookieHeader) return cookies;

    const parsed = parseCookieHeader(cookieHeader);
    for (const [key, value] of Object.entries(parsed)) {
      cookies.set(key, value);
    }

    return cookies;
  }

  async createSessionToken(userId: number, email: string): Promise<string> {
    const token = await new SignJWT({ userId, email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(this.jwtSecret);

    return token;
  }

  async verifySessionToken(token: string): Promise<SessionPayload | null> {
    try {
      const verified = await jwtVerify(token, this.jwtSecret);
      return verified.payload as SessionPayload;
    } catch (error) {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get("session");

    if (!sessionCookie) {
      return null;
    }

    const session = await this.verifySessionToken(sessionCookie);

    if (!session) {
      return null;
    }

    const user = await getUserById(session.userId);

    if (!user || user.status !== "active") {
      return null;
    }

    return user;
  }

  setSessionCookie(res: Response, token: string): void {
    res.cookie("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie("session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }
}

export const sdk = new SDKServer();
