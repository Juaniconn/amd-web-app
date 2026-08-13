import { describe, expect, it } from "vitest";
import { createUserSchema, loginSchema, updateUserSchema } from "./auth";

describe("auth validation", () => {
  it("rejects invalid login emails", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password1",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid user creation payload", () => {
    const result = createUserSchema.safeParse({
      name: "Ana Ventas",
      email: "ana@amd-operations.local",
      password: "password1",
      roleId: "ventas",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown roles", () => {
    const result = createUserSchema.safeParse({
      name: "Ana",
      email: "ana@amd-operations.local",
      password: "password1",
      roleId: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("allows updating a user without changing the password", () => {
    const result = updateUserSchema.safeParse({
      id: "user-1",
      name: "Ana Ventas",
      email: "ana@amd-operations.local",
      roleId: "ventas",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a short password on update when one is provided", () => {
    const result = updateUserSchema.safeParse({
      id: "user-1",
      name: "Ana Ventas",
      email: "ana@amd-operations.local",
      roleId: "ventas",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});
