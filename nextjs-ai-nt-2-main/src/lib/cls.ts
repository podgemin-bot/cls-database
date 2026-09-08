export type RoomStatus = "VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED"

export const STATUS_META: Record<
  RoomStatus,
  { label: string; badge: string; dot: string; bar: string }
> = {
  VACANT: {
    label: "ว่าง",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  OCCUPIED: {
    label: "มีผู้ใช้งาน",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  MAINTENANCE: {
    label: "ซ่อมบำรุง",
    badge: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
  RESERVED: {
    label: "จอง",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
}

export const STATUS_ORDER: RoomStatus[] = ["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"]

export type CoolingSpec = {
  type?: string | null
  btuTotal?: number | null
  unitsTotal?: number | null
  unitsReady?: number | null
  unitsDown?: number | null
  efficiencyPct?: number | null
}

export type PowerSpec = {
  type?: string | null
  capacity?: string | null
}

export type SecurityData = {
  cctvCount?: number | null
  accessControl?: string | null
  fireSuppression?: string | null
  gasPressure?: string | null
  vesda?: string | null
  doorLockType?: string | null
  firePanelBrand?: string | null
  gasTankCount?: number | null
}

export type RoomPhotoFile = { url: string; name: string }

export type SerializedRoom = {
  id: number
  code: string
  no: number
  name: string
  status: RoomStatus
  areaSqm: number | null
  ceilingHeightM: number | null
  raisedFloorCm: number | null
  floorLoadKgm2: number | null
  tenant: string | null
  floorCode: string
  floorLabel: string
  level: number
  buildingCode: string
  buildingName: string
  siteCode: string
  siteName: string
  security: SecurityData | null
  cooling: { code: string; name: string; model: string | null; specs: CoolingSpec }[]
  photos: RoomPhotoFile[]
}

export type PlanPin = {
  id: number
  code: string
  x: number | null
  y: number | null
}

export type PlanRoom = {
  id: number
  code: string
  no: number
  name: string
  status: RoomStatus
  areaSqm: number | null
  tenant: string | null
  pin: PlanPin | null
}

export type SerializedFloorPlan = {
  code: string
  label: string
  level: number
  planImage: string | null
  siteCode: string
  siteName: string
  buildingCode: string
  buildingName: string
  rooms: PlanRoom[]
}

export type SerializedPowerAsset = {
  id: number
  code: string
  legacyCode: string | null
  name: string
  brand: string | null
  model: string | null
  status: string | null
  specType: string | null
  capacity: string | null
  siteCode: string | null
  floorLabel: string | null
}

export type SerializedCoolingAsset = {
  id: number
  code: string
  legacyCode: string | null
  name: string
  model: string | null
  specType: string | null
  btuTotal: number | null
  unitsTotal: number | null
  unitsReady: number | null
  unitsDown: number | null
  efficiencyPct: number | null
  siteCode: string | null
  roomCode: string | null
}

export type SerializedCertificate = {
  id: number
  code: string
  name: string
  scope: string
  issuer: string | null
  certNo: string | null
  issuedAt: string | null
  expiresAt: string | null
  detail: string | null
  siteCode: string
  siteName: string
  buildingCode: string | null
  roomCode: string | null
}

export type SerializedRoomSecurityRow = {
  id: number
  code: string
  name: string
  siteCode: string
  floorLabel: string
  cctvCount: number | null
  accessControl: string | null
  fireSuppression: string | null
  vesda: string | null
  gasPressure: string | null
  gasTankCount: number | null
  doorLockType: string | null
  firePanelBrand: string | null
}

export type SerializedSite = {
  id: number
  code: string
  name: string
  province: string
  lat: number | null
  lng: number | null
  buildingCount: number
  floorCount: number
  roomCount: number
}

export type SerializedBuilding = {
  id: number
  code: string
  name: string
  siteCode: string
  siteName: string
  floorCount: number
  roomCount: number
}

export type SerializedFloor = {
  id: number
  code: string
  level: number
  label: string
  planImage: string | null
  buildingCode: string
  buildingName: string
  siteCode: string
  roomCount: number
}

export type SerializedLocationRoom = {
  id: number
  code: string
  no: number
  name: string
  status: RoomStatus
  areaSqm: number | null
  tenant: string | null
  floorCode: string
  floorLabel: string
}
