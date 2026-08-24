import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  clients,
  driveFiles,
  googleConnections,
  tasks,
  users,
} from "@/db/schema";
import { getSeedAdminPassword, getSeedAdminUsername } from "@/lib/env";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username can only use letters, numbers, . _ -"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function registerUser(input: z.infer<typeof registerSchema>) {
  const username = normalizeUsername(input.username);

  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    throw new Error("This username is already taken");
  }

  const userCount = await db.query.users.findMany();
  const role = userCount.length === 0 ? "admin" : "employee";

  const passwordHash = await bcrypt.hash(input.password, 10);
  const id = crypto.randomUUID();

  await db.insert(users).values({
    id,
    username,
    name: input.name.trim(),
    email: null,
    passwordHash,
    role,
  });

  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function verifyUser(input: z.infer<typeof loginSchema>) {
  const username = normalizeUsername(input.username);

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    throw new Error("Invalid username or password");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid username or password");
  }

  return user;
}

export async function resetToAdminUser() {
  await db.delete(driveFiles);
  await db.delete(tasks);
  await db.delete(googleConnections);
  await db.delete(clients);
  await db.delete(users);

  const passwordHash = await bcrypt.hash(getSeedAdminPassword(), 10);
  const username = getSeedAdminUsername();

  await db.insert(users).values({
    id: crypto.randomUUID(),
    username,
    name: "Admin",
    email: null,
    passwordHash,
    role: "admin",
  });
}
