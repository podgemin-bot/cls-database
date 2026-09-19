"use server"

import { headers } from "next/headers"
import { refresh } from "next/cache"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { CUSTOMER_STAGES } from "@/lib/cls"

export type CustomerResult = { ok: boolean; error?: string }

async function requireEditor(): Promise<string | null> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (!session?.user?.id) return "unauthorized"
  const user = await prisma.user
    .findUnique({ where: { id: session.user.id }, select: { role: true } })
    .catch(() => null)
  if (!user || (user.role !== "ADMIN" && user.role !== "EDITOR")) return "forbidden"
  return null
}

const isStage = (v: string): boolean => (CUSTOMER_STAGES as readonly string[]).includes(v)

const strOrNull = (v: string): string | null => {
  const s = v.trim()
  return s ? s : null
}

const toDate = (v: string): Date | null => {
  if (!v.trim()) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function normalizeRooms(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean)
}

async function nextCode(): Promise<string> {
  const last = await prisma.customer.findFirst({
    orderBy: { code: "desc" },
    select: { code: true },
  })
  const n = last ? Number(last.code.replace(/^CUST-/, "")) || 0 : 0
  return `CUST-${String(n + 1).padStart(3, "0")}`
}

export type CustomerInput = {
  id?: number
  name: string
  stage: string
  contactName: string
  contactPhone: string
  contactEmail: string
  interestedRooms: string[]
  contractNo: string
  contractStart: string
  contractEnd: string
  note: string
}

export async function createCustomer(input: CustomerInput): Promise<CustomerResult> {
  const denied = await requireEditor()
  if (denied) return { ok: false, error: denied }

  const name = input.name.trim()
  const stage = input.stage.trim()
  const contactName = input.contactName.trim()
  const contactPhone = input.contactPhone.trim()

  if (!name || !contactName || !contactPhone) return { ok: false, error: "invalid-input" }
  if (!isStage(stage)) return { ok: false, error: "invalid-input" }

  try {
    const code = await nextCode()
    await prisma.customer.create({
      data: {
        code,
        name,
        stage,
        contactName,
        contactPhone,
        contactEmail: strOrNull(input.contactEmail),
        interestedRooms: normalizeRooms(input.interestedRooms),
        contractNo: strOrNull(input.contractNo),
        contractStart: toDate(input.contractStart),
        contractEnd: toDate(input.contractEnd),
        note: strOrNull(input.note),
      },
    })
    refresh()
    return { ok: true }
  } catch {
    return { ok: false, error: "server-error" }
  }
}

export async function updateCustomer(input: CustomerInput): Promise<CustomerResult> {
  const denied = await requireEditor()
  if (denied) return { ok: false, error: denied }
  if (!input.id) return { ok: false, error: "invalid-input" }

  const name = input.name.trim()
  const stage = input.stage.trim()
  const contactName = input.contactName.trim()
  const contactPhone = input.contactPhone.trim()

  if (!name || !contactName || !contactPhone) return { ok: false, error: "invalid-input" }
  if (!isStage(stage)) return { ok: false, error: "invalid-input" }

  try {
    const existing = await prisma.customer.findUnique({ where: { id: input.id } })
    if (!existing) return { ok: false, error: "not-found" }

    await prisma.customer.update({
      where: { id: input.id },
      data: {
        name,
        stage,
        contactName,
        contactPhone,
        contactEmail: strOrNull(input.contactEmail),
        interestedRooms: normalizeRooms(input.interestedRooms),
        contractNo: strOrNull(input.contractNo),
        contractStart: toDate(input.contractStart),
        contractEnd: toDate(input.contractEnd),
        note: strOrNull(input.note),
      },
    })
    refresh()
    return { ok: true }
  } catch {
    return { ok: false, error: "server-error" }
  }
}

export async function deleteCustomer(id: number): Promise<CustomerResult> {
  const denied = await requireEditor()
  if (denied) return { ok: false, error: denied }

  try {
    const existing = await prisma.customer.findUnique({ where: { id } })
    if (!existing) return { ok: false, error: "not-found" }
    await prisma.customer.delete({ where: { id } })
    refresh()
    return { ok: true }
  } catch {
    return { ok: false, error: "server-error" }
  }
}