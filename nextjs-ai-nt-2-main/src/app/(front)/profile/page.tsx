import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ProfileClient from "./profile-client";

export const instant = false;

export const metadata: Metadata = { title: "โปรไฟล์" };

export type SerializedProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
};

export default async function ProfilePage() {
  await connection();

  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user
    .findUnique({ where: { id: session.user.id } })
    .catch(() => null);

  if (!user) {
    redirect("/login");
  }

  const serialized: SerializedProfileUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">โปรไฟล์</h1>
        <p className="text-sm text-muted-foreground">
          จัดการข้อมูลส่วนตัวและความปลอดภัยของบัญชี
        </p>
      </div>
      <ProfileClient user={serialized} />
    </div>
  );
}