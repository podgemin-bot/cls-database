import { connection } from "next/server";
import { headers } from "next/headers";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  CUSTOMER_STAGES,
  type CustomerStage,
  type SerializedCustomer,
} from "@/lib/cls";
import CustomersClient from "./customers-client";

export const instant = false;

export const metadata: Metadata = { title: "ลูกค้า" };

const isStage = (v: string): v is CustomerStage =>
  (CUSTOMER_STAGES as readonly string[]).includes(v);

export default async function CustomersPage() {
  await connection();

  const [customers, rooms, session] = await Promise.all([
    prisma.customer.findMany({ orderBy: { code: "asc" } }),
    prisma.room.findMany({
      orderBy: { code: "asc" },
      select: { code: true, name: true, tenant: true },
    }),
    auth.api.getSession({ headers: await headers() }).catch(() => null),
  ]);

  let canEdit = false;
  if (session?.user?.id) {
    const user = await prisma.user
      .findUnique({ where: { id: session.user.id }, select: { role: true } })
      .catch(() => null);
    canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";
  }

  const tenantsRoomMap = new Map<string, { code: string; name: string }[]>();
  for (const r of rooms) {
    if (!r.tenant) continue;
    const key = r.tenant.trim().toLowerCase();
    const list = tenantsRoomMap.get(key) ?? [];
    list.push({ code: r.code, name: r.name });
    tenantsRoomMap.set(key, list);
  }

  const serialized: SerializedCustomer[] = customers.map((c) => {
    const key = c.name.trim().toLowerCase();
    const rentedRooms = tenantsRoomMap.get(key) ?? [];
    const interested = Array.isArray(c.interestedRooms)
      ? (c.interestedRooms as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    return {
      id: c.id,
      code: c.code,
      name: c.name,
      stage: isStage(c.stage) ? c.stage : "INQUIRY",
      contactName: c.contactName,
      contactPhone: c.contactPhone,
      contactEmail: c.contactEmail,
      interestedRooms: interested,
      inquiryDate: c.inquiryDate.toISOString(),
      contractNo: c.contractNo,
      contractStart: c.contractStart ? c.contractStart.toISOString() : null,
      contractEnd: c.contractEnd ? c.contractEnd.toISOString() : null,
      note: c.note,
      rentedRoomCount: rentedRooms.length,
      rentedRooms,
    };
  });

  const availableRooms = rooms.map((r) => ({ code: r.code, name: r.name }));

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ลูกค้า</h1>
        <p className="text-sm text-muted-foreground">
          ฐานข้อมูลลูกค้าและผู้ติดต่อ — สอบถามทั่วไป, สอบถามห้องว่าง, และเช่าห้อง
        </p>
      </div>
      <CustomersClient
        customers={serialized}
        availableRooms={availableRooms}
        canEdit={canEdit}
      />
    </div>
  );
}