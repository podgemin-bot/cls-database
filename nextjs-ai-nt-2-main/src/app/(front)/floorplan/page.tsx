import fs from "node:fs";
import path from "node:path";
import { headers } from "next/headers";
import { connection } from "next/server";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { RoomPhotoFile, RoomStatus, SerializedFloorPlan } from "@/lib/cls";
import FloorplanClient from "./floorplan-client";

export const instant = false;

export const metadata: Metadata = { title: "ผังชั้น" };

function listRoomPhotos(code: string): RoomPhotoFile[] {
  const dir = path.join(process.cwd(), "public", "storage", "photos", code);
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      .sort()
      .map((f) => ({ url: `/storage/photos/${code}/${f}`, name: f }));
  } catch {
    return [];
  }
}

export default async function FloorPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  const params = await searchParams;
  const initialFloor = typeof params.floor === "string" ? params.floor : "";

  const [floors, session] = await Promise.all([
    prisma.floor.findMany({
      orderBy: { code: "asc" },
      include: {
        building: { include: { site: true } },
        rooms: {
          orderBy: { no: "asc" },
          include: {
            photoPoints: { orderBy: { seqOnFloor: "asc" }, take: 1 },
          },
        },
      },
    }),
    auth.api
      .getSession({ headers: await headers() })
      .catch(() => null),
  ]);

  let canEdit = false;
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    canEdit = user?.role === "ADMIN" || user?.role === "EDITOR";
  }

  const photosByRoom: Record<number, RoomPhotoFile[]> = {};
  for (const f of floors) {
    for (const r of f.rooms) {
      photosByRoom[r.id] = listRoomPhotos(r.code);
    }
  }

  const serialized: SerializedFloorPlan[] = floors.map((f) => ({
    code: f.code,
    label: f.label,
    level: f.level,
    planImage: f.planImage,
    siteCode: f.building.site.code,
    siteName: f.building.site.name,
    buildingCode: f.building.code,
    buildingName: f.building.name,
      rooms: f.rooms.map((r) => ({
        id: r.id,
        code: r.code,
        no: r.no,
        name: r.name,
      status: r.status as RoomStatus,
      areaSqm: r.areaSqm,
      tenant: r.tenant,
      pin: r.photoPoints[0]
        ? {
            id: r.photoPoints[0].id,
            code: r.photoPoints[0].code,
            x: r.photoPoints[0].x,
            y: r.photoPoints[0].y,
          }
        : null,
    })),
  }));

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ผังชั้นแบบโต้ตอบ</h1>
        <p className="text-sm text-muted-foreground">
          เลือกสถานี/ชั้น แล้วคลิกที่หมุดเพื่อดูข้อมูลห้อง
          {canEdit && " — เปิดโหมด Pin Editor เพื่อวางหรือย้ายหมุด"}
        </p>
      </div>
      <FloorplanClient
        floors={serialized}
        photos={photosByRoom}
        initialFloor={initialFloor}
        canEdit={canEdit}
      />
    </div>
  );
}
