"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_META, type RoomStatus, type SerializedRoom } from "@/lib/cls";
import { ImageIcon, MapPin, Ruler, ShieldCheck, Wind } from "lucide-react";

type Props = {
  rooms: SerializedRoom[];
  initialSite: string;
  initialFloor: string;
};

export default function RoomsClient({ rooms, initialSite, initialFloor }: Props) {
  const [site, setSite] = useState(initialSite);
  const [floor, setFloor] = useState(initialFloor);
  const [status, setStatus] = useState<RoomStatus | "">("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SerializedRoom | null>(null);

  const sites = useMemo(() => [...new Set(rooms.map((r) => r.siteCode))].sort(), [rooms]);

  const floors = useMemo(
    () =>
      [
        ...new Map(
          rooms
            .filter((r) => !site || r.siteCode === site)
            .map((r) => [r.floorCode, { code: r.floorCode, label: r.floorLabel }])
        ).values(),
      ].sort((a, b) => a.code.localeCompare(b.code)),
    [rooms, site]
  );

  const filtered = useMemo(
    () =>
      rooms.filter((r) => {
        if (site && r.siteCode !== site) return false;
        if (floor && r.floorCode !== floor) return false;
        if (status && r.status !== status) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!r.code.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q))
            return false;
        }
        return true;
      }),
    [rooms, site, floor, status, search]
  );

  const statusCounts = useMemo(() => {
    const m = new Map<RoomStatus, number>();
    for (const r of filtered) m.set(r.status, (m.get(r.status) ?? 0) + 1);
    return m;
  }, [filtered]);

  const selectCls =
    "h-9 rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={selectCls}
          value={site}
          onChange={(e) => {
            setSite(e.target.value);
            setFloor("");
          }}
        >
          <option value="">ทุกสถานี</option>
          {sites.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
        >
          <option value="">ทุกชั้น</option>
          {floors.map((f) => (
            <option key={f.code} value={f.code}>
              {f.code} ({f.label})
            </option>
          ))}
        </select>

        <select
          className={selectCls}
          value={status}
          onChange={(e) => setStatus(e.target.value as RoomStatus | "")}
        >
          <option value="">ทุกสถานะ</option>
          {(Object.keys(STATUS_META) as RoomStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>

        <div className="relative min-w-52 flex-1">
          <Input
            placeholder="ค้นหาชื่อห้อง / รหัสห้อง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </div>

        <span className="text-sm whitespace-nowrap text-muted-foreground">
          {filtered.length} ห้อง
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>รหัสห้อง</TableHead>
              <TableHead>ชื่อห้อง</TableHead>
              <TableHead>สถานี / ชั้น</TableHead>
              <TableHead className="text-right">พื้นที่ (ตร.ม.)</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-center">รูป</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  ไม่พบห้องที่ตรงเงื่อนไข
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer"
                onClick={() => setSelected(r)}
              >
                <TableCell className="font-mono text-xs font-medium">{r.code}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.siteCode} · {r.floorLabel}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.areaSqm ?? "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_META[r.status].badge}>
                    {STATUS_META[r.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {r.photos.length > 0 ? `${r.photos.length}` : "-"}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" tabIndex={-1}>
                    ดูรายละเอียด
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {statusCounts.size > 0 && <span>ในผลลัพธ์:</span>}
        {[...statusCounts.entries()].map(([s, n]) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${STATUS_META[s].dot}`} />
            {STATUS_META[s].label}: {n}
          </span>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-3xl">
          {selected && <RoomDetail room={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoomDetail({ room }: { room: SerializedRoom }) {
  const sec = room.security;
  const specs: [string, string][] = [
    ["พื้นที่", room.areaSqm != null ? `${room.areaSqm} ตร.ม.` : "-"],
    ["ความสูงเพดาน", room.ceilingHeightM != null ? `${room.ceilingHeightM} ม.` : "-"],
    ["Raised Floor", room.raisedFloorCm != null ? `${room.raisedFloorCm} ซม.` : "-"],
    ["Floor Load", room.floorLoadKgm2 != null ? `${room.floorLoadKgm2} กก./ตร.ม.` : "-"],
    ["ผู้ถือครอง/ผู้เช่า", room.tenant ?? "-"],
  ];

  const secRows: [string, string | number | null | undefined][] = sec
    ? [
        ["กล้อง CCTV", sec.cctvCount != null ? `${sec.cctvCount} ตัว` : "-"],
        ["Access Control", sec.accessControl],
        ["ระบบดับเพลิง", sec.fireSuppression],
        ["แรงดันก๊าซ", sec.gasPressure],
        ["VESDA", sec.vesda],
        ["กลอนประตู", sec.doorLockType],
        ["Fire Panel", sec.firePanelBrand],
        ["ถังก๊าซ", sec.gasTankCount != null ? `${sec.gasTankCount} ถัง` : "-"],
      ]
    : [];

  return (
    <>
      <DialogHeader>
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <DialogTitle>{room.name}</DialogTitle>
          <Badge variant="outline" className={STATUS_META[room.status].badge}>
            {STATUS_META[room.status].label}
          </Badge>
        </div>
        <DialogDescription className="flex flex-wrap items-center gap-x-2 font-mono text-xs">
          {room.code}
          <span className="font-sans">
            · {room.buildingName} ({room.buildingCode}) · {room.floorLabel}
          </span>
          <span className="inline-flex items-center gap-0.5 font-sans">
            <MapPin className="size-3" /> {room.siteName} ({room.siteCode})
          </span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        <Section icon={<Ruler className="size-4" />} title="สเปกห้อง">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {specs.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {sec && (
          <Section icon={<ShieldCheck className="size-4" />} title="ระบบความปลอดภัย">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {secRows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="text-sm font-medium">{v ?? "-"}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {room.cooling.length > 0 && (
          <Section icon={<Wind className="size-4" />} title="เครื่องปรับอากาศ">
            <div className="space-y-3">
              {room.cooling.map((c) => (
                <div key={c.code} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{c.code}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>BTU: {c.specs.btuTotal?.toLocaleString() ?? "-"}</span>
                    <span>
                      พร้อมใช้ {c.specs.unitsReady ?? "-"}/{c.specs.unitsTotal ?? "-"} ชุด
                    </span>
                    <span>ประสิทธิภาพ: {c.specs.efficiencyPct != null ? `${c.specs.efficiencyPct}%` : "-"}</span>
                    {c.model && c.model !== "-" && <span>รุ่น: {c.model}</span>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section
          icon={<ImageIcon className="size-4" />}
          title={`ภาพถ่าย (${room.photos.length})`}
        >
          {room.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีภาพถ่าย</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {room.photos.map((p) => (
                <a key={p.url} href={p.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`${room.name} - ${p.name}`}
                    loading="lazy"
                    className="aspect-video w-full rounded-md border object-cover transition-opacity hover:opacity-85"
                  />
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>
    </>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}
