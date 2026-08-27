"use client";

import { useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createUser, setUserRole, type Roles } from "./actions";
import type { SerializedAdminUser } from "./page";
import { ShieldCheck, UserPlus, UserRound } from "lucide-react";

type Props = {
  users: SerializedAdminUser[];
};

const ROLES: Roles[] = ["ADMIN", "EDITOR", "VIEWER"];

const ROLE_META: Record<Roles, { label: string; badge: string }> = {
  ADMIN: { label: "Admin", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  EDITOR: { label: "Editor", badge: "bg-sky-100 text-sky-800 border-sky-200" },
  VIEWER: { label: "Viewer", badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

const selectCls =
  "h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring";

const ERROR_LABEL: Record<string, string> = {
  unauthorized: "กรุณาเข้าสู่ระบบ",
  forbidden: "ต้องเป็น Admin เท่านั้น",
  "invalid-input": "กรอกข้อมูลไม่ถูกต้อง (รหัสผ่านขั้นต่ำ 8 ตัว)",
  "email-exists": "อีเมลนี้ถูกใช้แล้ว",
  "not-found": "ไม่พบผู้ใช้",
  "cannot-demote-self": "ไม่สามารถลดสิทธิ์ตัวเองได้",
  "server-error": "เกิดข้อผิดพลาด กรุณาลองใหม่",
};

export default function AdminClient({ users }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Roles>("VIEWER");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const roleCounts = useMemo(() => {
    const m = new Map<Roles, number>();
    for (const u of users) {
      const r = (ROLES.includes(u.role as Roles) ? u.role : "VIEWER") as Roles;
      m.set(r, (m.get(r) ?? 0) + 1);
    }
    return m;
  }, [users]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setSuccess(null);
    if (!name.trim() || !email.trim()) {
      setActionError("invalid-input");
      return;
    }
    if (password.length < 8) {
      setActionError("invalid-input");
      return;
    }
    if (password !== confirm) {
      setActionError("password-mismatch");
      return;
    }
    setBusy(true);
    startTransition(async () => {
      const res = await createUser(name, email, password, role);
      setBusy(false);
      if (!res.ok) {
        setActionError(res.error ?? "unknown");
        return;
      }
      setSuccess(`สร้างผู้ใช้ "${email}" สำเร็จ`);
      setName("");
      setEmail("");
      setPassword("");
      setConfirm("");
      setRole("VIEWER");
    });
  }

  function changeRole(userId: string, r: string, isSelf: boolean) {
    setActionError(null);
    setSuccess(null);
    if (isSelf && r !== "ADMIN") {
      setActionError("cannot-demote-self");
      return;
    }
    startTransition(async () => {
      const res = await setUserRole(userId, r as Roles);
      if (!res.ok) setActionError(res.error ?? "unknown");
      else setSuccess("อัปเดตสิทธิ์สำเร็จ");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <UserRound className="size-4" /> ทั้งหมด:{" "}
          <strong className="text-foreground">{users.length}</strong>
        </span>
        {(Object.keys(ROLE_META) as Roles[]).map((r) => (
          <span key={r} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${ROLE_META[r].badge.split(" ")[0]}`} />
            {ROLE_META[r].label}: <strong className="text-foreground">{roleCounts.get(r) ?? 0}</strong>
          </span>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-5 text-primary" /> สร้างผู้ใช้ใหม่
          </CardTitle>
          <CardDescription>
            ระบุข้อมูลเพื่อสร้างบัญชีผู้ใช้และกำหนดสิทธิ์เริ่มต้น
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
            <div className="min-w-44 flex-1 space-y-1">
              <label className="text-sm font-medium">ชื่อ</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="สมชาย ใจดี" />
            </div>
            <div className="min-w-52 flex-1 space-y-1">
              <label className="text-sm font-medium">อีเมล</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="min-w-40 flex-1 space-y-1">
              <label className="text-sm font-medium">รหัสผ่าน</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="min-w-40 flex-1 space-y-1">
              <label className="text-sm font-medium">ยืนยันรหัสผ่าน</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">สิทธิ์</label>
              <select className={selectCls} value={role} onChange={(e) => setRole(e.target.value as Roles)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_META[r].label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={busy}>
              {busy ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
            </Button>
          </form>
          {(actionError || success) && (
            <p
              className={`mt-3 text-sm font-medium ${
                success ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {success ??
                (actionError
                  ? ERROR_LABEL[actionError] ??
                    (actionError === "password-mismatch"
                      ? "รหัสผ่านไม่ตรงกัน"
                      : "เกิดข้อผิดพลาด")
                  : null)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-primary" /> รายชื่อผู้ใช้
          </CardTitle>
          <CardDescription>คลิกเลือกสิทธิ์เพื่อเปลี่ยนแปลง</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>สิทธิ์</TableHead>
                  <TableHead>ยืนยันอีเมล</TableHead>
                  <TableHead>สมัครเมื่อ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      ยังไม่มีผู้ใช้
                    </TableCell>
                  </TableRow>
                )}
                {users.map((u) => {
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name}
                        {u.isSelf && (
                          <Badge variant="outline" className="ml-2">
                            คุณ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{u.email}</TableCell>
                      <TableCell>
                        <select
                          className={selectCls}
                          value={ROLES.includes(u.role as Roles) ? u.role : "VIEWER"}
                          onChange={(e) => changeRole(u.id, e.target.value, u.isSelf)}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        {u.emailVerified ? (
                          <Badge variant="outline">ยืนยันแล้ว</Badge>
                        ) : (
                          <Badge variant="secondary">ยังไม่ยืนยัน</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("th-TH")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
