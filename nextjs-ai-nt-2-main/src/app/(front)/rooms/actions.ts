"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { refresh } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { RoomStatus } from "@/lib/cls";

export type RoomResult = { ok: boolean; error?: string };

const STATUSES: RoomStatus[] = ["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"];
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function photosDir(roomCode: string): string {
  return path.join(process.cwd(), "public", "storage", "photos", roomCode);
}

async function requireEditor(): Promise<string | null> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null);
  if (!session?.user?.id) return "unauthorized";
  const user = await prisma.user
    .findUnique({ where: { id: session.user.id }, select: { role: true } })
    .catch(() => null);
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) return "forbidden";
  return null;
}

const toNum = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export type UpdateRoomInput = {
  id: number;
  name: string;
  status: string;
  no: string;
  areaSqm: string;
  ceilingHeightM: string;
  raisedFloorCm: string;
  floorLoadKgm2: string;
  tenant: string;
};

export async function updateRoom(input: UpdateRoomInput): Promise<RoomResult> {
  const denied = await requireEditor();
  if (denied) return { ok: false, error: denied };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "invalid-input" };
  if (!STATUSES.includes(input.status as RoomStatus)) {
    return { ok: false, error: "invalid-input" };
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: input.id } });
    if (!room) return { ok: false, error: "not-found" };

    await prisma.room.update({
      where: { id: input.id },
      data: {
        name,
        status: input.status as RoomStatus,
        no: toNum(input.no) ?? room.no,
        areaSqm: toNum(input.areaSqm),
        ceilingHeightM: toNum(input.ceilingHeightM),
        raisedFloorCm: toNum(input.raisedFloorCm),
        floorLoadKgm2: toNum(input.floorLoadKgm2),
        tenant: input.tenant.trim() || null,
      },
    });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "server-error" };
  }
}

export type SecurityInput = {
  roomId: number;
  cctvCount: string;
  accessControl: string;
  fireSuppression: string;
  gasPressure: string;
  vesda: string;
  doorLockType: string;
  firePanelBrand: string;
  gasTankCount: string;
};

export async function updateRoomSecurity(input: SecurityInput): Promise<RoomResult> {
  const denied = await requireEditor();
  if (denied) return { ok: false, error: denied };

  try {
    const room = await prisma.room.findUnique({ where: { id: input.roomId } });
    if (!room) return { ok: false, error: "not-found" };

    await prisma.roomSecurity.upsert({
      where: { roomId: input.roomId },
      create: {
        roomId: input.roomId,
        cctvCount: toNum(input.cctvCount),
        accessControl: input.accessControl.trim() || null,
        fireSuppression: input.fireSuppression.trim() || null,
        gasPressure: input.gasPressure.trim() || null,
        vesda: input.vesda.trim() || null,
        doorLockType: input.doorLockType.trim() || null,
        firePanelBrand: input.firePanelBrand.trim() || null,
        gasTankCount: toNum(input.gasTankCount),
      },
      update: {
        cctvCount: toNum(input.cctvCount),
        accessControl: input.accessControl.trim() || null,
        fireSuppression: input.fireSuppression.trim() || null,
        gasPressure: input.gasPressure.trim() || null,
        vesda: input.vesda.trim() || null,
        doorLockType: input.doorLockType.trim() || null,
        firePanelBrand: input.firePanelBrand.trim() || null,
        gasTankCount: toNum(input.gasTankCount),
      },
    });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "server-error" };
  }
}

const safeFilename = (name: string): string | null => {
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return null;
  }
  return name;
};

export async function uploadRoomPhoto(
  roomCode: string,
  file: File
): Promise<RoomResult> {
  const denied = await requireEditor();
  if (denied) return { ok: false, error: denied };
  if (!safeFilename(roomCode)) return { ok: false, error: "invalid-input" };

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return { ok: false, error: "invalid-type" };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "too-large" };

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const dir = photosDir(roomCode);
    await fs.mkdir(dir, { recursive: true });
    const base = path.basename(file.name, ext);
    const safeBase = base.replace(/[^a-zA-Z0-9_\-가-힣\u0E00-\u0E7F]/g, "-").slice(0, 60);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${safeBase || "photo"}-${stamp}${ext}`;
    await fs.writeFile(path.join(dir, filename), buffer);
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "server-error" };
  }
}

export async function deleteRoomPhoto(
  roomCode: string,
  filename: string
): Promise<RoomResult> {
  const denied = await requireEditor();
  if (denied) return { ok: false, error: denied };
  if (!safeFilename(roomCode) || !safeFilename(filename)) {
    return { ok: false, error: "invalid-input" };
  }

  try {
    const filePath = path.join(photosDir(roomCode), filename);
    await fs.unlink(filePath);
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: "server-error" };
  }
}
