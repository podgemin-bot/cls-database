import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers()),
}));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({ user: { id: "__crud_admin__" } }),
    },
  },
}));

import prisma from "@/lib/prisma";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerInput,
} from "./app/(front)/customers/actions";

const ADMIN_ID = "__crud_admin__";
const createdIds: number[] = [];

function input(over: Partial<CustomerInput> = {}): CustomerInput {
  return {
    name: "TEST อินทิเกรชัน จำกัด",
    stage: "ROOM_INQUIRY",
    contactName: "คุณเทสต์",
    contactPhone: "089-999-9999",
    contactEmail: "test@example.com",
    interestedRooms: ["PKB-B01-F02-R02"],
    contractNo: "",
    contractStart: "",
    contractEnd: "",
    note: "crud test",
    ...over,
  };
}

beforeAll(async () => {
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    update: { role: "ADMIN" },
    create: {
      id: ADMIN_ID,
      name: "CRUD Test Admin",
      email: "crud-admin@test.local",
      role: "ADMIN",
    },
  });
  await prisma.customer.deleteMany({ where: { name: { startsWith: "TEST " } } });
});

afterAll(async () => {
  await prisma.customer.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.customer.deleteMany({ where: { name: { startsWith: "TEST " } } });
  await prisma.user.deleteMany({ where: { id: ADMIN_ID } });
  await prisma.$disconnect();
});

describe("customer CRUD actions (real DB, auth mocked)", () => {
  it("createCustomer persists a record with auto code", async () => {
    const res = await createCustomer(input());
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const row = await prisma.customer.findFirst({ where: { name: "TEST อินทิเกรชัน จำกัด" } });
    expect(row).not.toBeNull();
    expect(row?.code).toMatch(/^CUST-\d{3}$/);
    expect(row?.stage).toBe("ROOM_INQUIRY");
    expect(row?.contactName).toBe("คุณเทสต์");
    expect(row?.interestedRooms).toEqual(["PKB-B01-F02-R02"]);
    createdIds.push(row!.id);
  });

  it("rejects invalid required fields", async () => {
    const res = await createCustomer(input({ contactName: "   " }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid-input");
  });

  it("rejects unknown stage", async () => {
    const res = await createCustomer(input({ stage: "FUTURE" }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid-input");
  });

  it("updateCustomer moves stage to RENTING with contract info", async () => {
    const row = await prisma.customer.findFirst({
      where: { name: "TEST อินทิเกรชัน จำกัด" },
    });
    expect(row).not.toBeNull();

    const res = await updateCustomer(
      input({
        id: row!.id,
        name: "TEST อินทิเกรชัน จำกัด 2",
        stage: "RENTING",
        contractNo: "T-2026-001",
        contractStart: "2026-01-01",
        contractEnd: "2027-12-31",
        note: "",
      })
    );
    expect(res.ok).toBe(true);

    const upd = await prisma.customer.findUnique({ where: { id: row!.id } });
    expect(upd?.name).toBe("TEST อินทิเกรชัน จำกัด 2");
    expect(upd?.stage).toBe("RENTING");
    expect(upd?.contractNo).toBe("T-2026-001");
    expect(upd?.contractStart?.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(upd?.contractEnd?.toISOString().slice(0, 10)).toBe("2027-12-31");
    expect(upd?.note).toBeNull();
  });

  it("updateCustomer on missing id returns not-found", async () => {
    const res = await updateCustomer(input({ id: 999999 }));
    expect(res.ok).toBe(false);
    expect(res.error).toBe("not-found");
  });

  it("deleteCustomer removes the record", async () => {
    const row = await prisma.customer.findFirst({
      where: { name: "TEST อินทิเกรชัน จำกัด 2" },
    });
    const target = row ?? (await prisma.customer.findFirst({ where: { id: { in: createdIds } } }));
    expect(target).not.toBeNull();

    const res = await deleteCustomer(target!.id);
    expect(res.ok).toBe(true);
    const gone = await prisma.customer.findUnique({ where: { id: target!.id } });
    expect(gone).toBeNull();
  });

  it("deleteCustomer on missing id returns not-found", async () => {
    const res = await deleteCustomer(999999);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("not-found");
  });
});