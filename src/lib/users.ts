import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { userRoles, users } from "@/db/schema";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only use letters, numbers, . _ -"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(userRoles).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(userRoles),
});

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  const username = normalizeUsername(input.username);

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    throw new Error("This username is already taken");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const id = crypto.randomUUID();

  await db.insert(users).values({
    id,
    username,
    name: input.name.trim(),
    email: null,
    passwordHash,
    role: input.role ?? "employee",
  });

  return db.query.users.findFirst({
    where: eq(users.id, id),
    columns: {
      id: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function updateUserRole(userId: string, role: (typeof userRoles)[number]) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, username: true, role: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "admin" && role !== "admin") {
    const admins = await db.query.users.findMany({
      where: eq(users.role, "admin"),
      columns: { id: true },
    });

    if (admins.length <= 1) {
      throw new Error("Cannot remove the last admin");
    }
  }

  await db.update(users).set({ role }).where(eq(users.id, userId));

  return db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function listUsers() {
  return db.query.users.findMany({
    columns: {
      id: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: (table, { asc }) => [asc(table.name)],
  });
}
