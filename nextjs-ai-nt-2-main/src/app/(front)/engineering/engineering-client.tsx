"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  SerializedCertificate,
  SerializedCoolingAsset,
  SerializedPowerAsset,
  SerializedRoomSecurityRow,
} from "@/lib/cls";
import { Flame, FileCheck2, ShieldCheck, Wind, Zap } from "lucide-react";

type Props = {
  power: SerializedPowerAsset[];
  cooling: SerializedCoolingAsset[];
  certificates: SerializedCertificate[];
  security: SerializedRoomSecurityRow[];
  totals: { power: number; cooling: number; certs: number; security: number };
};

type TabKey = "power" | "cooling" | "certs" | "security";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "power", label: "Power System", icon: <Zap className="size-4" /> },
  { key: "cooling", label: "Precision AC", icon: <Wind className="size-4" /> },
  { key: "certs", label: "ใบรับรอง", icon: <FileCheck2 className="size-4" /> },
  { key: "security", label: "ความปลอดภัย", icon: <ShieldCheck className="size-4" /> },
];

const selectCls =
  "h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring";

export default function EngineeringClient({
  power,
  cooling,
  certificates,
  security,
  totals,
}: Props) {
  const [tab, setTab] = useState<TabKey>("power");
  const [site, setSite] = useState("");
  const [alertOnly, setAlertOnly] = useState(true);

  const powerSites = useMemo(
    () =>
      [...new Set(power.map((a) => a.siteCode).filter((x): x is string => !!x))].sort(),
    [power]
  );
  const coolingSites = useMemo(
    () =>
      [...new Set(cooling.map((a) => a.siteCode).filter((x): x is string => !!x))].sort(),
    [cooling]
  );
  const certSites = useMemo(
    () => [...new Set(certificates.map((c) => c.siteCode))].sort(),
    [certificates]
  );

  const totalCount = totals[tab];

  const filteredPower = useMemo(
    () =>
      power.filter(
        (a) =>
          (!site || a.siteCode === site) &&
          (!alertOnly || (a.status ?? "").toLowerCase().includes("แจ้งเตือน"))
      ),
    [power, site, alertOnly]
  );

  const filteredCooling = useMemo(
    () => cooling.filter((a) => !site || a.siteCode === site),
    [cooling, site]
  );

  const filteredSecurity = useMemo(
    () => security.filter((r) => !site || r.siteCode === site),
    [security, site]
  );

  const filteredCerts = useMemo(
    () => certificates.filter((c) => !site || c.siteCode === site),
    [certificates, site]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setTab(t.key);
              setSite("");
            }}
          >
            {t.icon}
            {t.label}
            <span className="text-xs opacity-70">{totals[t.key]}</span>
          </Button>
        ))}
      </div>

      {tab !== "security" && (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={selectCls}
            value={site}
            onChange={(e) => setSite(e.target.value)}
          >
            <option value="">ทุกสถานี</option>
            {(tab === "power"
              ? powerSites
              : tab === "cooling"
              ? coolingSites
              : certSites
            ).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {tab === "power" && (
            <label className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={alertOnly}
                onChange={(e) => setAlertOnly(e.target.checked)}
              />
              เฉพาะอุปกรณ์แจ้งเตือน
            </label>
          )}
          <span className="ml-auto text-sm text-muted-foreground">
            {tab === "power"
              ? filteredPower.length
              : tab === "cooling"
              ? filteredCooling.length
              : tab === "certs"
              ? filteredCerts.length
              : 0}{" "}
            จาก {totalCount} รายการ
          </span>
        </div>
      )}

      {tab === "power" && <PowerTable rows={filteredPower} />}
      {tab === "cooling" && <CoolingTable rows={filteredCooling} />}
      {tab === "certs" && <CertTable rows={filteredCerts} />}
      {tab === "security" && <SecurityTable rows={filteredSecurity} />}
    </div>
  );
}

function PowerTable({ rows }: { rows: SerializedPowerAsset[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อ</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>ความจุ</TableHead>
            <TableHead>ยี่ห้อ</TableHead>
            <TableHead>รุ่น</TableHead>
            <TableHead>สถานี / ชั้น</TableHead>
            <TableHead>สถานะ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                ไม่พบอุปกรณ์ที่ตรงเงื่อนไข
              </TableCell>
            </TableRow>
          )}
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs font-medium">{a.code}</TableCell>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>{a.specType ?? "-"}</TableCell>
              <TableCell className="tabular-nums">{a.capacity ?? "-"}</TableCell>
              <TableCell>{a.brand ?? "-"}</TableCell>
              <TableCell>{a.model ?? "-"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {a.siteCode ? `${a.siteCode} · ${a.floorLabel ?? ""}` : "-"}
              </TableCell>
              <TableCell>
                {a.status ? (
                  <Badge variant="destructive" className="gap-1">
                    <Flame className="size-3" />
                    {a.status}
                  </Badge>
                ) : (
                  <Badge variant="outline">ปกติ</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CoolingTable({ rows }: { rows: SerializedCoolingAsset[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>รหัส</TableHead>
            <TableHead>ชื่อ</TableHead>
            <TableHead>รุ่น</TableHead>
            <TableHead className="text-right">BTU รวม</TableHead>
            <TableHead className="text-center">ชุดพร้อมใช้/รวม</TableHead>
            <TableHead className="text-center">ประสิทธิภาพ</TableHead>
            <TableHead>ห้อง / สถานี</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                ไม่พบอุปกรณ์ที่ตรงเงื่อนไข
              </TableCell>
            </TableRow>
          )}
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs font-medium">{a.code}</TableCell>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>{a.model ?? "-"}</TableCell>
              <TableCell className="text-right tabular-nums">
                {a.btuTotal?.toLocaleString() ?? "-"}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {a.unitsReady ?? "-"}/{a.unitsTotal ?? "-"}
              </TableCell>
              <TableCell className="text-center">
                {a.efficiencyPct != null ? (
                  <Badge
                    variant={a.efficiencyPct < 100 ? "destructive" : "outline"}
                    className="tabular-nums"
                  >
                    {a.efficiencyPct}%
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {a.roomCode ? `${a.roomCode}` : a.siteCode ?? "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / 86400000);
}

function CertExpiryBadge({ expiresAt }: { expiresAt: string | null }) {
  const days = daysUntil(expiresAt);
  if (days === null) return <Badge variant="outline">ไม่ระบุ</Badge>;
  if (days < 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Flame className="size-3" />
        หมดอายุแล้ว
      </Badge>
    );
  }
  if (days < 30) {
    return (
      <Badge variant="destructive" className="tabular-nums">
        {days} วัน
      </Badge>
    );
  }
  if (days < 180) {
    return (
      <Badge variant="secondary" className="tabular-nums">
        {days} วัน
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="tabular-nums">
      {days} วัน
    </Badge>
  );
}

const SCOPE_LABEL: Record<string, string> = {
  STATION: "สถานี",
  BUILDING: "อาคาร",
  FLOOR: "ชั้น",
  ROOM: "ห้อง",
};

function CertTable({ rows }: { rows: SerializedCertificate[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>ชื่อใบรับรอง</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>หน่วยงานออก</TableHead>
            <TableHead>เลขที่</TableHead>
            <TableHead>สถานี</TableHead>
            <TableHead>วันออก</TableHead>
            <TableHead>หมดอายุ / นับถอยหลัง</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                ไม่พบใบรับรอง
              </TableCell>
            </TableRow>
          )}
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <div className="font-medium">{c.name}</div>
                <div className="font-mono text-[11px] text-muted-foreground">{c.code}</div>
              </TableCell>
              <TableCell>{SCOPE_LABEL[c.scope] ?? c.scope}</TableCell>
              <TableCell>{c.issuer ?? "-"}</TableCell>
              <TableCell className="font-mono text-xs">{c.certNo ?? "-"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.siteCode}</TableCell>
              <TableCell className="tabular-nums">
                {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("th-TH") : "-"}
              </TableCell>
              <TableCell>
                {c.expiresAt ? (
                  <span className="inline-flex flex-col items-start gap-1">
                    <span className="tabular-nums text-sm">
                      {new Date(c.expiresAt).toLocaleDateString("th-TH")}
                    </span>
                    <CertExpiryBadge expiresAt={c.expiresAt} />
                  </span>
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SecurityTable({ rows }: { rows: SerializedRoomSecurityRow[] }) {
  const [site, setSite] = useState("");

  const sites = useMemo(
    () => [...new Set(rows.map((r) => r.siteCode))].sort(),
    [rows]
  );
  const filtered = useMemo(
    () => rows.filter((r) => !site || r.siteCode === site),
    [rows, site]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectCls}
          value={site}
          onChange={(e) => setSite(e.target.value)}
        >
          <option value="">ทุกสถานี</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} ห้อง
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>รหัสห้อง</TableHead>
              <TableHead>ชื่อห้อง</TableHead>
              <TableHead>Access card</TableHead>
              <TableHead className="text-center">CCTV</TableHead>
              <TableHead>ระบบดับเพลิง</TableHead>
              <TableHead>ตรวจจับควัน (VESDA)</TableHead>
              <TableHead>แรงดันก๊าซ</TableHead>
              <TableHead className="text-center">ถังก๊าซ</TableHead>
              <TableHead>กลอนประตู</TableHead>
              <TableHead>Fire panel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  ไม่พบข้อมูลความปลอดภัย
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">{r.code}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.accessControl ?? "-"}</TableCell>
                <TableCell className="text-center tabular-nums">
                  {r.cctvCount != null ? `${r.cctvCount} ตัว` : "-"}
                </TableCell>
                <TableCell>{r.fireSuppression ?? "-"}</TableCell>
                <TableCell>{r.vesda ?? "-"}</TableCell>
                <TableCell>{r.gasPressure ?? "-"}</TableCell>
                <TableCell className="text-center tabular-nums">
                  {r.gasTankCount != null ? `${r.gasTankCount} ถัง` : "-"}
                </TableCell>
                <TableCell>{r.doorLockType ?? "-"}</TableCell>
                <TableCell>{r.firePanelBrand ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
