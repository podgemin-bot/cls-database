import { headers } from "next/headers";
import { connection } from "next/server";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import AdminClient from "./admin-client";

export const instant = false;

export const metadata: Metadata = { title: "ผู้ดูแลระบบ" };

export type SerializedAdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  isSelf: boolean;
};

export default async function AdminPage() {
  await connection();

  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  const currentUser = session?.user?.id
    ? await prisma.user
        .findUnique({ where: { id: session.user.id }, select: { role: true } })
        .catch(() => null)
    : null;
  const isAdmin = currentUser?.role === "ADMIN";

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">ผู้ดูแลระบบ</h1>
        <p className="text-sm text-destructive">
          หน้านี้เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น
        </p>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  const serialized: SerializedAdminUser[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt.toISOString(),
    isSelf: u.id === session?.user?.id,
  }));

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ผู้ดูแลระบบ</h1>
        <p className="text-sm text-muted-foreground">
          จัดการผู้ใช้งานและกำหนดสิทธิ์ (Admin / Editor / Viewer)
        </p>
      </div>
      <AdminClient users={serialized} />
    </div>
  );
}
