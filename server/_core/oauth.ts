import type { Express, Request, Response } from "express";
import { sdk } from "./sdk";
import { getUserByEmail, verifyPassword } from "../auth";

function getBodyParam(body: any, key: string): string | undefined {
  const value = body?.[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  // Ruta de login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const email = getBodyParam(req.body, "email");
      const password = getBodyParam(req.body, "password");

      if (!email || !password) {
        res.status(400).json({ error: "email and password are required" });
        return;
      }

      const user = await getUserByEmail(email);

      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      if (user.status !== "active") {
        res.status(403).json({ error: "Account is inactive" });
        return;
      }

      const isPasswordValid = await verifyPassword(password, user.passwordHash);

      if (!isPasswordValid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Crear token de sesión
      const sessionToken = await sdk.createSessionToken(user.id, user.email);
      sdk.setSessionCookie(res, sessionToken);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Ruta de logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    try {
      sdk.clearSessionCookie(res);
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Logout failed", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Ruta para obtener usuario actual
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);

      if (!user) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (error) {
      console.error("[Auth] Get me failed", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });
}
