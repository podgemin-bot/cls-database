import fs from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import type { Metadata } from "next";
import prisma from "@/lib/prisma";
import type {
  CoolingSpec,
  RoomStatus,
  SecurityData,
  SerializedRoom,
} from "@/lib/cls";
import RoomsClient from "./rooms-client";

export const instant = false;

export const metadata: Metadata = { title: "ห้องทั้งหมด" };

function listRoomPhotos(code: string): string[] {
  const dir = path.join(process.cwd(), "public", "storage", "photos", code);
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
      .sort();
  } catch {
    return [];
  }
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await connection();
  const params = await searchParams;
  const initialSite = typeof params.site === "string" ? params.site : "";
  const initialFloor = typeof params.floor === "string" ? params.floor : "";

  const rooms = await prisma.room.findMany({
    orderBy: { code: "asc" },
    include: {
      floor: { include: { building: { include: { site: true } } } },
      security: true,
      assets: { where: { category: "COOLING" }, orderBy: { code: "asc" } },
    },
  });

  const serialized: SerializedRoom[] = rooms.map((r) => ({
    id: r.id,
    code: r.code,
    no: r.no,
    name: r.name,
    status: r.status as RoomStatus,
    areaSqm: r.areaSqm,
    ceilingHeightM: r.ceilingHeightM,
    raisedFloorCm: r.raisedFloorCm,
    floorLoadKgm2: r.floorLoadKgm2,
    tenant: r.tenant,
    floorCode: r.floor.code,
    floorLabel: r.floor.label,
    level: r.floor.level,
    buildingCode: r.floor.building.code,
    buildingName: r.floor.building.name,
    siteCode: r.floor.building.site.code,
    siteName: r.floor.building.site.name,
    security: r.security
      ? ({
          cctvCount: r.security.cctvCount,
          accessControl: r.security.accessControl,
          fireSuppression: r.security.fireSuppression,
          gasPressure: r.security.gasPressure,
          vesda: r.security.vesda,
          doorLockType: r.security.doorLockType,
          firePanelBrand: r.security.firePanelBrand,
          gasTankCount: r.security.gasTankCount,
        } satisfies SecurityData)
      : null,
    cooling: r.assets.map((a) => ({
      code: a.code,
      name: a.name,
      model: a.model,
      specs: (a.specs ?? {}) as CoolingSpec,
    })),
    photos: listRoomPhotos(r.code).map((f) => ({
      url: `/storage/photos/${r.code}/${f}`,
      name: f,
    })),
  }));

  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ห้องทั้งหมด</h1>
        <p className="text-sm text-muted-foreground">
          รายการห้องทุกสถานี — ค้นหา กรองสถานะ และดูข้อมูล 360° ของแต่ละห้อง
        </p>
      </div>
      <RoomsClient
        rooms={serialized}
        initialSite={initialSite}
        initialFloor={initialFloor}
      />
    </div>
  );
}
