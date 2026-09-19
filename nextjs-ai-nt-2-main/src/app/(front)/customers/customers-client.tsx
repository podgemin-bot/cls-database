"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CUSTOMER_STAGES,
  CUSTOMER_STAGE_META,
  type CustomerStage,
  type SerializedCustomer,
} from "@/lib/cls";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
  type CustomerInput,
} from "./actions";
import { Building2, Eye, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";

type Props = {
  customers: SerializedCustomer[];
  availableRooms: { code: string; name: string }[];
  canEdit: boolean;
};

const selectCls =
  "h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring";

const ERROR_LABEL: Record<string, string> = {
  unauthorized: "กรุณาเข้าสู่ระบบ",
  forbidden: "ต้องเป็น Admin หรือ Editor เท่านั้น",
  "invalid-input": "กรอกข้อมูลไม่ถูกต้อง (ชื่อบริษัท, ผู้ติดต่อ, เบอร์โทร จำเป็น)",
  "not-found": "ไม่พบข้อมูลลูกค้า",
  "server-error": "เกิดข้อผิดพลาด กรุณาลองใหม่",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function stageOf(v: string): CustomerStage {
  return (CUSTOMER_STAGES as readonly string[]).includes(v) ? (v as CustomerStage) : "INQUIRY";
}

function emptyForm(): CustomerFormValue {
  return {
    name: "",
    stage: "INQUIRY",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    interestedRooms: [] as string[],
    contractNo: "",
    contractStart: "",
    contractEnd: "",
    note: "",
  };
}

function formFromCustomer(c: SerializedCustomer): CustomerFormValue {
  return {
    name: c.name,
    stage: c.stage,
    contactName: c.contactName,
    contactPhone: c.contactPhone,
    contactEmail: c.contactEmail ?? "",
    interestedRooms: c.interestedRooms,
    contractNo: c.contractNo ?? "",
    contractStart: c.contractStart ? c.contractStart.slice(0, 10) : "",
    contractEnd: c.contractEnd ? c.contractEnd.slice(0, 10) : "",
    note: c.note ?? "",
  };
}

type CustomerFormValue = {
  name: string;
  stage: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  interestedRooms: string[];
  contractNo: string;
  contractStart: string;
  contractEnd: string;
  note: string;
};

export default function CustomersClient({ customers, availableRooms, canEdit }: Props) {
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [editing, setEditing] = useState<SerializedCustomer | "new" | null>(null);
  const [viewing, setViewing] = useState<SerializedCustomer | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (stageFilter && c.stage !== stageFilter) return false;
      if (!q) return true;
      return [c.code, c.name, c.contactName, c.contactPhone, c.contactEmail ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [customers, query, stageFilter]);

  const stageCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of customers) m.set(c.stage, (m.get(c.stage) ?? 0) + 1);
    return m;
  }, [customers]);

  function handleDelete(c: SerializedCustomer) {
    if (!window.confirm(`ลบลูกค้า ${c.code} "${c.name}" ?`)) return;
    startTransition(async () => {
      const res = await deleteCustomer(c.id);
      if (!res.ok) {
        alert(ERROR_LABEL[res.error ?? "server-error"] ?? "เกิดข้อผิดพลาด");
      }
    });
  }

  const roomOptions = availableRooms;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-9 max-w-xs"
          placeholder="ค้นหา ชื่อบริษัท / ผู้ติดต่อ / เบอร์โทร..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={selectCls}
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">ทุกขั้นตอน</option>
          {CUSTOMER_STAGES.map((s) => (
            <option key={s} value={s}>
              {CUSTOMER_STAGE_META[s].label} ({stageCounts.get(s) ?? 0})
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-muted-foreground">{filtered.length} ราย</span>
        {canEdit && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> เพิ่มลูกค้า
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>รหัส</TableHead>
              <TableHead>ชื่อบริษัท</TableHead>
              <TableHead>ขั้นตอน</TableHead>
              <TableHead>ผู้ติดต่อ</TableHead>
              <TableHead>เบอร์โทร</TableHead>
              <TableHead>ห้องที่สนใจ</TableHead>
              <TableHead>ห้องที่เช่า</TableHead>
              <TableHead className="w-24 text-center">ดู / แก้ไข</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  ไม่พบข้อมูลลูกค้า
                </TableCell>
              </TableRow>
            )}
            {filtered.map((c) => {
              const meta = CUSTOMER_STAGE_META[stageOf(c.stage)];
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-medium">{c.code}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={meta.badge}>
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.contactName}</TableCell>
                  <TableCell className="whitespace-nowrap">{c.contactPhone}</TableCell>
                  <TableCell className="max-w-40 truncate text-xs text-muted-foreground">
                    {c.interestedRooms.length > 0 ? c.interestedRooms.join(", ") : "-"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c.rentedRoomCount > 0 ? `${c.rentedRoomCount} ห้อง` : "-"}
                  </TableCell>
                  <TableCell className="w-24">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        tabIndex={-1}
                        onClick={() => setViewing(c)}
                        aria-label="ดูข้อมูล"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          tabIndex={-1}
                          onClick={() => setEditing(c)}
                          aria-label="แก้ไข"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          tabIndex={-1}
                          onClick={() => handleDelete(c)}
                          aria-label="ลบ"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <CustomerFormDialog
          customer={editing === "new" ? null : editing}
          roomOptions={roomOptions}
          onClose={() => setEditing(null)}
        />
      )}

      {viewing && <CustomerDetailDialog customer={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function label(text: string) {
  return <Label className="text-xs leading-none text-muted-foreground">{text}</Label>;
}

function CustomerFormDialog({
  customer,
  roomOptions,
  onClose,
}: {
  customer: SerializedCustomer | null;
  roomOptions: { code: string; name: string }[];
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();
  const [form, setForm] = useState<CustomerFormValue>(() =>
    customer ? formFromCustomer(customer) : emptyForm()
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<CustomerFormValue>) => setForm((f) => ({ ...f, ...patch }));
  const toggleRoom = (code: string) =>
    set({
      interestedRooms: form.interestedRooms.includes(code)
        ? form.interestedRooms.filter((x) => x !== code)
        : [...form.interestedRooms, code],
    });

  async function save() {
    setError(null);
    setBusy(true);
    const input: CustomerInput = {
      id: customer?.id,
      name: form.name,
      stage: form.stage,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      interestedRooms: form.interestedRooms,
      contractNo: form.contractNo,
      contractStart: form.contractStart,
      contractEnd: form.contractEnd,
      note: form.note,
    };
    startTransition(async () => {
      try {
        const res = customer
          ? await updateCustomer(input)
          : await createCustomer(input);
        if (!res.ok && res.error) {
          setError(res.error);
          return;
        }
        onClose();
      } catch {
        setError("server-error");
      } finally {
        setBusy(false);
      }
    });
  }

  const isRenting = form.stage === "RENTING";

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? `แก้ไขลูกค้า: ${customer.code}` : "เพิ่มลูกค้าใหม่"}</DialogTitle>
          <DialogDescription>
            ข้อมูลพื้นฐานลูกค้า (ชื่อบริษัท, ผู้ติดต่อ, เบอร์โทร จำเป็น)
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm font-medium text-destructive">
            {ERROR_LABEL[error] ?? "เกิดข้อผิดพลาด"}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            {label("ชื่อบริษัท/หน่วยงาน *")}
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="เช่น National Telecom"
            />
          </div>
          <div className="space-y-1">
            {label("ขั้นตอน *")}
            <select
              className={selectCls}
              value={form.stage}
              onChange={(e) => set({ stage: e.target.value })}
            >
              {CUSTOMER_STAGES.map((s) => (
                <option key={s} value={s}>
                  {CUSTOMER_STAGE_META[s].label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            {label("วันที่สอบถาม")}
            <Input value={fmtDate(customer?.inquiryDate ?? null)} disabled />
          </div>
          <div className="space-y-1">
            {label("ผู้ติดต่อ *")}
            <Input
              value={form.contactName}
              onChange={(e) => set({ contactName: e.target.value })}
              placeholder="ชื่อ-นามสกุล"
            />
          </div>
          <div className="space-y-1">
            {label("เบอร์โทร *")}
            <Input
              value={form.contactPhone}
              onChange={(e) => set({ contactPhone: e.target.value })}
              placeholder="0X-XXX-XXXX"
            />
          </div>
          <div className="space-y-1">
            {label("อีเมล")}
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => set({ contactEmail: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          {label("ห้องที่สนใจ (เลือกได้หลายห้อง)")}
          <div className="max-h-36 overflow-y-auto rounded-md border p-2">
            {roomOptions.length === 0 ? (
              <p className="p-1 text-xs text-muted-foreground">ยังไม่มีห้องในระบบ</p>
            ) : (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {roomOptions.map((r) => (
                  <label
                    key={r.code}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.interestedRooms.includes(r.code)}
                      onChange={() => toggleRoom(r.code)}
                    />
                    <span className="font-mono text-xs">{r.code}</span>
                    <span className="text-xs text-muted-foreground">{r.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {isRenting && (
          <div className="rounded-md border p-3">
            <div className="mb-2 text-xs font-semibold text-muted-foreground">ข้อมูลสัญญาเช่า</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                {label("เลขที่สัญญา")}
                <Input
                  value={form.contractNo}
                  onChange={(e) => set({ contractNo: e.target.value })}
                  placeholder="NT-2026-001"
                />
              </div>
              <div className="space-y-1">
                {label("วันเริ่มสัญญา")}
                <Input
                  type="date"
                  value={form.contractStart}
                  onChange={(e) => set({ contractStart: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                {label("วันสิ้นสุดสัญญา")}
                <Input
                  type="date"
                  value={form.contractEnd}
                  onChange={(e) => set({ contractEnd: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {label("หมายเหตุการติดตาม")}
          <Textarea
            rows={3}
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
            placeholder="ผลการโทร, นัดดูห้อง, ใบเสนอราคา..."
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            ปิด
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailDialog({
  customer,
  onClose,
}: {
  customer: SerializedCustomer;
  onClose: () => void;
}) {
  const meta = CUSTOMER_STAGE_META[stageOf(customer.stage)];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-4" /> {customer.name}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {customer.code} · วันที่สอบถาม {fmtDate(customer.inquiryDate)}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">ขั้นตอน</dt>
            <dd className="pt-1">
              <Badge variant="outline" className={meta.badge}>
                {meta.label}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">ผู้ติดต่อ</dt>
            <dd className="pt-1 text-sm font-medium">{customer.contactName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">เบอร์โทร / อีเมล</dt>
            <dd className="pt-1 text-sm font-medium">
              <span className="flex items-center gap-1">
                <Phone className="size-3 text-muted-foreground" /> {customer.contactPhone}
              </span>
              <span className="text-xs text-muted-foreground">{customer.contactEmail ?? "-"}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">ห้องที่สนใจ</dt>
            <dd className="pt-1 text-sm font-medium">
              {customer.interestedRooms.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {customer.interestedRooms.map((code) => (
                    <Badge key={code} variant="outline" className="font-mono text-[10px]">
                      {code}
                    </Badge>
                  ))}
                </div>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">สัญญา</dt>
            <dd className="pt-1 text-sm font-medium">
              {customer.contractNo ? (
                <>
                  <div>{customer.contractNo}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtDate(customer.contractStart)} → {fmtDate(customer.contractEnd)}
                  </div>
                </>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">ห้องที่เช่าจริง</dt>
            <dd className="pt-1 text-sm font-medium">
              {customer.rentedRooms.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {customer.rentedRooms.map((r) => (
                    <Badge
                      key={r.code}
                      variant="outline"
                      className="gap-1 font-mono text-[10px]"
                    >
                      <Building2 className="size-3" />
                      {r.code}
                    </Badge>
                  ))}
                </div>
              ) : (
                "-"
              )}
            </dd>
          </div>
        </dl>

        {customer.note && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">หมายเหตุการติดตาม</div>
            <p className="whitespace-pre-wrap text-sm">{customer.note}</p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}