import { describe, it, expect, beforeAll } from "vitest";
import { getDb, createClient } from "./db";
import { hashPassword, verifyPassword, getUserByEmail } from "./auth";

describe("Auth Login", () => {
  beforeAll(async () => {
    // Asegurarse de que la base de datos está disponible
    const db = await getDb();
    expect(db).toBeDefined();
  });

  it("should verify password correctly", async () => {
    const password = "admin123";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("should reject invalid password", async () => {
    const password = "admin123";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword("wrongpassword", hash);
    expect(isValid).toBe(false);
  });

  it("should find admin user by email", async () => {
    const user = await getUserByEmail("admin@creditotienda.local");
    expect(user).toBeDefined();
    expect(user?.email).toBe("admin@creditotienda.local");
    expect(user?.status).toBe("active");
    expect(user?.role).toBe("admin");
  });

  it("should verify admin password hash", async () => {
    const user = await getUserByEmail("admin@creditotienda.local");
    expect(user).toBeDefined();
    if (user) {
      const isValid = await verifyPassword("admin123", user.passwordHash);
      expect(isValid).toBe(true);
    }
  });
});
