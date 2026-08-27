"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type Roles = "ADMIN" | "EDITOR" | "VIEWER";

export type AdminResult = { ok: boolean; error?: string };

async function requireAdmin(): Promise<null | string> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (!session?.user?.id) return "unauthorized";
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") return "forbidden";
  return null;
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: Roles
): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  if (!name.trim() || !email.trim() || password.length < 8) {
    return { ok: false, error: "invalid-input" };
  }

  try {
    const created = await auth.api.signUpEmail({
      body: { name: name.trim(), email: email.trim(), password },
    });
    await prisma.user.update({
      where: { id: created.user.id },
      data: { role },
    });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "email-exists" };
  }
}

export async function setUserRole(
  userId: string,
  role: Roles
): Promise<AdminResult> {
  const denied = await requireAdmin();
  if (denied) return { ok: false, error: denied };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "not-found" };

  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.id === userId && role !== "ADMIN") {
    return { ok: false, error: "cannot-demote-self" };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  refresh();
  return { ok: true };
}
