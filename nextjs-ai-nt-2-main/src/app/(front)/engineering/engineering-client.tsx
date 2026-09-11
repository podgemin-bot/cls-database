"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type {
  EngHierarchySite,
  SerializedCertificate,
  SerializedCoolingAsset,
  SerializedPowerAsset,
  SerializedRoomSecurityRow,
} from "@/lib/cls";
import {
  createAsset,
  createCertificate,
  deleteAsset,
  deleteCertificate,
  resolveNextAssetCode,
  updateAsset,
  updateCertificate,
  type AssetCategory,
  type AssetInput,
  type CertInput,
} from "./actions";
import {
  Flame,
  FileCheck2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Wind,
  Zap,
} from "lucide-react";

type Props = {
  power: SerializedPowerAsset[];
  cooling: SerializedCoolingAsset[];
  certificates: SerializedCertificate[];
  security: SerializedRoomSecurityRow[];
  totals: { power: number; cooling: number; certs: number; security: number };
  canEdit: boolean;
  hierarchy: EngHierarchySite[];
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

const ENG_ERROR_LABEL: Record<string, string> = {
  unauthorized: "กรุณาเข้าสู่ระบบ",
  forbidden: "ต้องเป็น Admin/Editor เท่านั้น",
  "invalid-input": "ข้อมูลไม่ถูกต้อง",
  "duplicate-code": "รหัสซ้ำในระบบแล้ว",
  "not-found": "ไม่พบรายการนี้",
  "server-error": "เกิดข้อผิดพลาด กรุณาลองใหม่",
};

type PowerOrCooling = SerializedPowerAsset | SerializedCoolingAsset;

type AssetDialogState =
  | { mode: "create"; category: AssetCategory }
  | { mode: "edit"; asset: PowerOrCooling };

type CertDialogState = { mode: "create" } | { mode: "edit"; cert: SerializedCertificate };

export default function EngineeringClient({
  power,
  cooling,
  certificates,
  security,
  totals,
  canEdit,
  hierarchy,
}: Props) {
  const [tab, setTab] = useState<TabKey>("power");
  const [site, setSite] = useState("");
  const [alertOnly, setAlertOnly] = useState(true);
  const [assetDialog, setAssetDialog] = useState<AssetDialogState | null>(null);
  const [certDialog, setCertDialog] = useState<CertDialogState | null>(null);
  const [, startTransition] = useTransition();

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

  function askDeleteAsset(a: PowerOrCooling) {
    if (!window.confirm(`ลบอุปกรณ์ "${a.name}" (${a.code}) แน่ใจหรือไม่?`)) return;
    startTransition(async () => {
      const res = await deleteAsset(a.id);
      if (!res.ok && res.error) window.alert(ENG_ERROR_LABEL[res.error] ?? "เกิดข้อผิดพลาด");
    });
  }

  function askDeleteCert(c: SerializedCertificate) {
    if (!window.confirm(`ลบใบรับรอง "${c.name}" (${c.code}) แน่ใจหรือไม่?`)) return;
    startTransition(async () => {
      const res = await deleteCertificate(c.id);
      if (!res.ok && res.error) window.alert(ENG_ERROR_LABEL[res.error] ?? "เกิดข้อผิดพลาด");
    });
  }

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

      <div className="flex flex-wrap items-center gap-2">
        {tab !== "security" && (
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
        )}
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
        {canEdit && tab === "power" && (
          <Button
            size="sm"
            onClick={() => setAssetDialog({ mode: "create", category: "POWER" })}
          >
            <Plus data-icon="inline-start" />
            เพิ่ม Power
          </Button>
        )}
        {canEdit && tab === "cooling" && (
          <Button
            size="sm"
            onClick={() => setAssetDialog({ mode: "create", category: "COOLING" })}
          >
            <Plus data-icon="inline-start" />
            เพิ่ม AC
          </Button>
        )}
        {canEdit && tab === "certs" && (
          <Button size="sm" onClick={() => setCertDialog({ mode: "create" })}>
            <Plus data-icon="inline-start" />
            เพิ่มใบรับรอง
          </Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {tab === "power"
            ? filteredPower.length
            : tab === "cooling"
            ? filteredCooling.length
            : tab === "certs"
            ? filteredCerts.length
            : filteredSecurity.length}{" "}
          จาก {totalCount} รายการ
        </span>
      </div>

      {tab === "power" && (
        <PowerTable rows={filteredPower} canEdit={canEdit}
          onEdit={(a) => setAssetDialog({ mode: "edit", asset: a })}
          onDelete={askDeleteAsset}
        />
      )}
      {tab === "cooling" && (
        <CoolingTable rows={filteredCooling} canEdit={canEdit}
          onEdit={(a) => setAssetDialog({ mode: "edit", asset: a })}
          onDelete={askDeleteAsset}
        />
      )}
      {tab === "certs" && (
        <CertTable rows={filteredCerts} canEdit={canEdit}
          onEdit={(c) => setCertDialog({ mode: "edit", cert: c })}
          onDelete={askDeleteCert}
        />
      )}
      {tab === "security" && <SecurityTable rows={filteredSecurity} />}

      {assetDialog && (
        <AssetDialog
          dialog={assetDialog}
          hierarchy={hierarchy}
          onClose={() => setAssetDialog(null)}
        />
      )}
      {certDialog && (
        <CertDialog
          dialog={certDialog}
          hierarchy={hierarchy}
          onClose={() => setCertDialog(null)}
        />
      )}
    </div>
  );
}

type ActionCellProps = {
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

function ActionCell({ canEdit, onEdit, onDelete }: ActionCellProps) {
  if (!canEdit) return null;
  return (
    <TableCell className="w-20">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" tabIndex={-1} onClick={onEdit} aria-label="แก้ไข">
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          tabIndex={-1}
          onClick={onDelete}
          aria-label="ลบ"
          className="text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </TableCell>
  );
}

function PowerTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: SerializedPowerAsset[];
  canEdit: boolean;
  onEdit: (a: SerializedPowerAsset) => void;
  onDelete: (a: SerializedPowerAsset) => void;
}) {
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
            {canEdit && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 9 : 8} className="py-10 text-center text-muted-foreground">
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
              <ActionCell
                canEdit={canEdit}
                onEdit={() => onEdit(a)}
                onDelete={() => onDelete(a)}
              />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CoolingTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: SerializedCoolingAsset[];
  canEdit: boolean;
  onEdit: (a: SerializedCoolingAsset) => void;
  onDelete: (a: SerializedCoolingAsset) => void;
}) {
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
            {canEdit && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7} className="py-10 text-center text-muted-foreground">
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
              <ActionCell
                canEdit={canEdit}
                onEdit={() => onEdit(a)}
                onDelete={() => onDelete(a)}
              />
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

function CertTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: SerializedCertificate[];
  canEdit: boolean;
  onEdit: (c: SerializedCertificate) => void;
  onDelete: (c: SerializedCertificate) => void;
}) {
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
            {canEdit && <TableHead className="w-20" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={canEdit ? 8 : 7} className="py-10 text-center text-muted-foreground">
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
              <ActionCell
                canEdit={canEdit}
                onEdit={() => onEdit(c)}
                onDelete={() => onDelete(c)}
              />
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

// ==================== FORMS ====================

const label = (text: string) => (
  <Label className="text-xs leading-none text-muted-foreground">{text}</Label>
);

function initialLocation(hierarchy: EngHierarchySite[], asset?: PowerOrCooling) {
  let site = "";
  let floor = "";
  let room = "";
  if (!asset) return { site, floor, room };
  if ("floorId" in asset && asset.floorId != null) {
    for (const s of hierarchy) {
      const f = s.floors.find((x) => x.id === asset.floorId);
      if (f) {
        site = s.code;
        floor = String(f.id);
        break;
      }
    }
  }
  if ("roomId" in asset && asset.roomId != null) {
    for (const s of hierarchy) {
      for (const f of s.floors) {
        const r = f.rooms.find((x) => x.id === asset.roomId);
        if (r) {
          site = s.code;
          floor = String(f.id);
          room = String(r.id);
          break;
        }
      }
    }
  }
  return { site, floor, room };
}

function AssetDialog({
  dialog,
  hierarchy,
  onClose,
}: {
  dialog: AssetDialogState;
  hierarchy: EngHierarchySite[];
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();
  const editing =
    dialog.mode === "edit"
      ? (dialog.asset as PowerOrCooling)
      : null;
  const category: AssetCategory =
    dialog.mode === "create" ? dialog.category : "roomId" in dialog.asset ? "COOLING" : "POWER";
  const isCooling = category === "COOLING";

  const initLoc = editing ? initialLocation(hierarchy, editing) : { site: "", floor: "", room: "" };

  const [name, setName] = useState(editing?.name ?? "");
  const [legacyCode, setLegacyCode] = useState(editing?.legacyCode ?? "");
  const [brand, setBrand] = useState((editing && "brand" in editing ? editing.brand : null) ?? "");
  const [model, setModel] = useState(editing?.model ?? "");
  const [status, setStatus] = useState((editing && "status" in editing ? editing.status : null) ?? "");
  const [specType, setSpecType] = useState(
    editing && "specType" in editing ? editing.specType ?? "" : ""
  );
  const [capacity, setCapacity] = useState(
    editing && "capacity" in editing ? editing.capacity ?? "" : ""
  );
  const [btuTotal, setBtuTotal] = useState(
    editing && "btuTotal" in editing
      ? editing.btuTotal != null
        ? String(editing.btuTotal)
        : ""
      : ""
  );
  const [unitsTotal, setUnitsTotal] = useState(
    editing && "unitsTotal" in editing
      ? editing.unitsTotal != null
        ? String(editing.unitsTotal)
        : ""
      : ""
  );
  const [unitsReady, setUnitsReady] = useState(
    editing && "unitsReady" in editing
      ? editing.unitsReady != null
        ? String(editing.unitsReady)
        : ""
      : ""
  );
  const [unitsDown, setUnitsDown] = useState(
    editing && "unitsDown" in editing
      ? editing.unitsDown != null
        ? String(editing.unitsDown)
        : ""
      : ""
  );
  const [efficiencyPct, setEfficiencyPct] = useState(
    editing && "efficiencyPct" in editing
      ? editing.efficiencyPct != null
        ? String(editing.efficiencyPct)
        : ""
      : ""
  );

  const [siteCode, setSiteCode] = useState(initLoc.site);
  const [floorId, setFloorId] = useState(initLoc.floor);
  const [roomId, setRoomId] = useState(initLoc.room);
  const [newCode, setNewCode] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const site = hierarchy.find((s) => s.code === siteCode);
  const floors = site?.floors ?? [];
  const floor = floors.find((f) => f.id === Number(floorId));
  const rooms = floor?.rooms ?? [];

  useEffect(() => {
    if (dialog.mode === "edit" || !siteCode) return;
    let alive = true;
    resolveNextAssetCode(category, siteCode)
      .then((c) => {
        if (alive && c) setNewCode(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [dialog.mode, category, siteCode]);

  const input = (): AssetInput => ({
    category,
    name,
    legacyCode,
    brand,
    model,
    status,
    floorId: isCooling ? "" : floorId,
    roomId: isCooling ? roomId : "",
    specType,
    capacity,
    btuTotal,
    unitsTotal,
    unitsReady,
    unitsDown,
    efficiencyPct,
  });

  function save() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    startTransition(async () => {
      const res =
        dialog.mode === "edit"
          ? await updateAsset(dialog.asset.id, input())
          : await createAsset(input());
      setBusy(false);
      if (!res.ok && res.error) return setError(res.error);
      setSuccess("บันทึกเรียบร้อย");
      onClose();
    });
  }

  const code = dialog.mode === "edit" ? dialog.asset.code : siteCode ? newCode : "";

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {dialog.mode === "edit" ? "แก้ไขอุปกรณ์" : isCooling ? "เพิ่ม Precision AC" : "เพิ่ม Power System"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">{code || "รหัสจะถูกสร้างอัตโนมัติเมื่อเลือกสถานี"}</DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm font-medium text-destructive">
            {ENG_ERROR_LABEL[error] ?? "เกิดข้อผิดพลาด"}
          </p>
        )}
        {success && <p className="text-sm font-medium text-emerald-600">{success}</p>}

        <div className="space-y-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold">ข้อมูลอุปกรณ์</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 space-y-1">
                {label("รหัสอุปกรณ์ (อัตโนมัติ)")}
                <Input value={code} disabled placeholder="- เลือกสถานี -" />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-1">
                {label("Legacy code")}
                <Input value={legacyCode} onChange={(e) => setLegacyCode(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-1">
                {label("ชื่ออุปกรณ์ *")}
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                {label("ยี่ห้อ")}
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
              <div className="space-y-1">
                {label("รุ่น")}
                <Input value={model} onChange={(e) => setModel(e.target.value)} />
              </div>
              <div className="space-y-1">
                {label("สถานะ")}
                <Input
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="เช่น แจ้งเตือน"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">ตำแหน่งที่ตั้ง</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                {label("สถานี *")}
                <select
                  className={selectCls}
                  value={siteCode}
                  onChange={(e) => {
                    setSiteCode(e.target.value);
                    setFloorId("");
                    setRoomId("");
                  }}
                >
                  <option value="">เลือกสถานี</option>
                  {hierarchy.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.code} ({s.name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                {label("ชั้น *")}
                <select
                  className={selectCls}
                  value={floorId}
                  disabled={!siteCode}
                  onChange={(e) => {
                    setFloorId(e.target.value);
                    setRoomId("");
                  }}
                >
                  <option value="">เลือกชั้น</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.buildingName} · {f.label}
                    </option>
                  ))}
                </select>
              </div>
              {isCooling && (
                <div className="space-y-1">
                  {label("ห้อง *")}
                  <select
                    className={selectCls}
                    value={roomId}
                    disabled={!floorId}
                    onChange={(e) => setRoomId(e.target.value)}
                  >
                    <option value="">เลือกห้อง</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} · {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold">
              {isCooling ? "สเปค Precision AC" : "สเปค Power"}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                {label("ประเภท")}
                <Input value={specType} onChange={(e) => setSpecType(e.target.value)} />
              </div>
              {isCooling ? (
                <>
                  <div className="space-y-1">
                    {label("BTU รวม")}
                    <Input
                      type="number"
                      min={0}
                      value={btuTotal}
                      onChange={(e) => setBtuTotal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    {label("ชุดรวม")}
                    <Input
                      type="number"
                      min={0}
                      value={unitsTotal}
                      onChange={(e) => setUnitsTotal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    {label("ชุดพร้อมใช้")}
                    <Input
                      type="number"
                      min={0}
                      value={unitsReady}
                      onChange={(e) => setUnitsReady(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    {label("ชุดเสีย")}
                    <Input
                      type="number"
                      min={0}
                      value={unitsDown}
                      onChange={(e) => setUnitsDown(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    {label("ประสิทธิภาพ (%)")}
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={efficiencyPct}
                      onChange={(e) => setEfficiencyPct(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  {label("ความจุ")}
                  <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            ปิด
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const toDateInput = (iso: string | null): string => {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
};

function CertDialog({
  dialog,
  hierarchy,
  onClose,
}: {
  dialog: CertDialogState;
  hierarchy: EngHierarchySite[];
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();
  const editing = dialog.mode === "edit" ? dialog.cert : null;

  const [code, setCode] = useState(editing?.code ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [scope, setScope] = useState(editing?.scope ?? "STATION");
  const [siteId, setSiteId] = useState(editing ? String(editing.siteId) : "");
  const [issuer, setIssuer] = useState(editing?.issuer ?? "");
  const [certNo, setCertNo] = useState(editing?.certNo ?? "");
  const [issuedAt, setIssuedAt] = useState(toDateInput(editing?.issuedAt ?? null));
  const [expiresAt, setExpiresAt] = useState(toDateInput(editing?.expiresAt ?? null));
  const [detail, setDetail] = useState(editing?.detail ?? "");
  const [buildingCode, setBuildingCode] = useState(editing?.buildingCode ?? "");
  const [roomCode, setRoomCode] = useState(editing?.roomCode ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const input = (): CertInput => ({
    code,
    name,
    scope,
    siteId,
    issuer,
    certNo,
    issuedAt,
    expiresAt,
    detail,
    buildingCode,
    roomCode,
  });

  function save() {
    setError(null);
    setSuccess(null);
    setBusy(true);
    startTransition(async () => {
      const res =
        dialog.mode === "edit"
          ? await updateCertificate(dialog.cert.id, input())
          : await createCertificate(input());
      setBusy(false);
      if (!res.ok && res.error) return setError(res.error);
      setSuccess("บันทึกเรียบร้อย");
      onClose();
    });
  }

  const withScope = scope === "BUILDING" || scope === "FLOOR" || scope === "ROOM";

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {dialog.mode === "edit" ? "แก้ไขใบรับรอง" : "เพิ่มใบรับรอง"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-sm font-medium text-destructive">
            {ENG_ERROR_LABEL[error] ?? "เกิดข้อผิดพลาด"}
          </p>
        )}
        {success && <p className="text-sm font-medium text-emerald-600">{success}</p>}

        <div className="space-y-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold">ข้อมูลใบรับรอง</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 space-y-1 sm:col-span-1">
                {label("รหัสใบรับรอง *")}
                <Input value={code} onChange={(e) => setCode(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1 sm:col-span-1">
                {label("ชื่อใบรับรอง *")}
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                {label("ขอบเขต *")}
                <select
                  className={selectCls}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  {(["STATION", "BUILDING", "FLOOR", "ROOM"] as const).map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                {label("สถานี *")}
                <select
                  className={selectCls}
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                >
                  <option value="">เลือกสถานี</option>
                  {hierarchy.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} ({s.name})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                {label("หน่วยงานออก")}
                <Input value={issuer} onChange={(e) => setIssuer(e.target.value)} />
              </div>
              <div className="space-y-1">
                {label("เลขที่")}
                <Input value={certNo} onChange={(e) => setCertNo(e.target.value)} />
              </div>
              <div className="space-y-1">
                {label("วันออก")}
                <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                {label("วันหมดอายุ")}
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              {withScope && (
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  {label("รหัสอาคาร")}
                  <Input value={buildingCode} onChange={(e) => setBuildingCode(e.target.value)} />
                </div>
              )}
              {scope === "ROOM" && (
                <div className="space-y-1">
                  {label("รหัสห้อง")}
                  <Input value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
                </div>
              )}
              <div className="col-span-2 space-y-1 sm:col-span-3">
                {label("รายละเอียด")}
                <Input value={detail} onChange={(e) => setDetail(e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            ปิด
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}