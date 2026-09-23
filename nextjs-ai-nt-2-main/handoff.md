# Handoff — CLS Facility Center (nextjs-ai-nt-2-main)

Thai cable-landing-station (CLS) facility center web app for NT (ประจำสถานีปากบารา/สงขลา). Repo: `git@github.com:podgemin-bot/cls-database.git` (origin/main).

## Stack
- **Next.js 16.3.1 (App Router, Turbopack)** · React 19 · TypeScript 5
- **Prisma 7 + MariaDB driver adapter** (`prisma/schema.prisma`, `prisma.config.ts`, `@prisma/adapter-mariadb`) — **ไม่ใช้ `@prisma/client` ตัว CJS** ต้อง import ผ่าน path alias/tsx/Next
- **better-auth 1.7** (email/password, DB session) — client `src/lib/auth-client.ts`, server `src/lib/auth.ts`
- **Tailwind CSS 4** + shadcn/radix-ui · react-hook-form + zod · lucide-react · xlsx
- **Vitest 4** (tests), **tsx** (ts scripts)
- **`next.config.ts`**: `output: "standalone"` + **`cacheComponents: true`**

## วิธีรัน
```powershell
npm.cmd run dev            # dev server (ต้องใช้ npm.cmd/npx.cmd — .ps1 โดน execution policy บล็อก)
npm.cmd test               # vitest run ทั้งหมด (25 files / 258 tests)
npx.cmd tsc --noEmit       # typecheck
npx.cmd eslint             # lint
npm.cmd run db:push        # อัปเดต schema ไป DB
npm.cmd run db:deploy      # apply migrations
npx.cmd prisma generate    # หลังแก้ schema
```

## Environment
- `.env`: `DATABASE_URL` (MariaDB, `mysql://` prefix ใช้ได้กับ Prisma แต่ driver mariadb ตรง ๆ ต้อง `mariadb://`), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`
- `.env.production.example` — ต้นแบบ production env (DB/auth)
- `.gitignore` ครอบ `dev.log`/`dev.err.log`/`deploy.*.log`/`.env*` แล้ว

## Auth & Protected routes
- `src/proxy.ts` — middleware guard: redirect 307 → `/login?callbackURL=…`; login/signup กลับ redirect ไป `/` ถ้ามี session แล้ว
- Protected: `/`, `/rooms`, `/locations`, `/floorplan`, `/engineering`, `/customers`, `/profile`, `/admin`
- Role: `ADMIN` / `EDITOR` / `VIEWER` (field `user.role`) — ADMIN/EDITOR แก้ข้อมูลได้, VIEWER อ่านอย่างเดียว
- Session cookie: `better-auth.session_token=<token>.<signature>` — **signed cookie** (HMAC ด้วย `BETTER_AUTH_SECRET`) ค่า raw token ใน DB ใช้ตรง ๆ ไม่ได้ ต้องเอามาจาก `auth.api.*` + `returnHeaders: true`

## Pages (src/app/(front))
| Route | ฟีเจอร์ |
|---|---|
| `/` | Dashboard |
| `/rooms` | Room CRUD + security fields + photo upload/delete |
| `/locations` | Hierarchical CRUD site/building/floor/room + auto-code |
| `/floorplan` | Floor plan pins, room dialog + photo lightbox, filters |
| `/engineering` | Power/AC/certificate/security tabs + AssetDialog/SecurityEditDialog/CertDialog |
| `/profile` | แก้ชื่อ / เปลี่ยนรหัสผ่าน / จัดการ session |
| `/customers` | ลูกค้า/ลีด: stage INQUIRY→ROOM_INQUIRY→RENTING→CLOSED, contract section, search |
| `/admin` | User/role management (search/filter/delete-user) |
| `/login` `/signup` | auth (public, กลับ redirect เมื่อ logged in แล้ว) |

## Data model (prisma/schema.prisma)
- `User`, `Session`, `Account` (better-auth) + field `role`
- `Customer` — code, name, stage, contact*, interestedRooms Json, inquiryDate, contract info
- CLS data: sites/buildings/floors/rooms + engineering (asset/certificate) + security columns
- Migration ล่าสุด: `20260919150744_add_customer`

## Testing (คำสั่ง: `npm.cmd test` — 25 files / 258 tests)
Tests ระดับ integration ใช้ DB จริง (mock auth ผ่าน `vi.mock`; สร้าง temp user + cleanup เอง):
- `src/proxy.test.ts` — unit guard proxy
- `src/*-crud.test.ts` — rooms / customers / engineering / locations / admin (DB integration)
- `src/profile-auth.test.ts`, `src/profile-actions.test.ts` — better-auth / actions จริง
- `src/lib/*.test.ts` — unit: cls, profile schemas/errors
- `src/app/(front)/*/**/*.test.tsx` — component tests (jsdom) ทุกหน้า: dashboard, rooms, locations, floorplan, engineering, customers, profile, admin
- `src/components/*.test.tsx` — lightbox, security-form, navbar, nav-menu, navigation-sheet, logout-button
- `vitest.config.ts` alias `@` → `src`; jsdom env ต่อไฟล์ด้วย pragma `// @vitest-environment jsdom`
- Smoke/e2e scripts (`scripts/*-smoke.ts`) รันยิง dev server ผ่าน better-auth HTTP — ใช้เป็น final check หลังแก้เรื่อง auth/route

## ล่าสุดที่ทำ (session ล่าสุด)
1. **fix(rooms/locations/customers): client `router.refresh()` หลัง actions** (commit `a116452`)
   - เทียบกับ fix ครั้งก่อนของ engineering — ย้ายไปใช้ `router.refresh()` ฝั่ง client หลัง action สำเร็จ (เก็บ server `refresh()` ใน actions ไว้)
   - `rooms-client.tsx`: refresh หลัง save / upload photo / delete photo
   - `locations-client.tsx`: ย้าย `runAction` เข้า client component + `router.refresh()` เมื่อสำเร็จ
   - `customers-client.tsx`: refresh หลัง save dialog + delete
   - เพิ่ม mock `next/navigation` + ยืนยันการเรียก refresh ใน 3 ไฟล์ test
   - **ยืนยันด้วย UAT จริง** (playwright-core + Chrome headless, login EDITOR ผ่าน UI): ผ่าน 2 รอบซ้ำ **11/11**
     - rooms: save แสดง success ใน ~400–450ms ไม่ค้าง "Rendering", DB อัปเดตจริง
     - locations: create site → dialog ปิด ~320–350ms, row `UAT-*` ใน DB + render ขึ้นหน้า, delete มีผลจริง
     - customers: create → dialog ปิด ~330–415ms, DB + render + delete ผ่าน
   - โน้ต: เดิม FLAKY เพราะ check โดยใช้ `waitFor({ state: "detached" })` บน `[role="dialog"]` ทั่วไป ซึ่งชนกับ **dev overlay ของ hydration warning** ที่มี `role` เดียวกัน (transient, เกิดได้ใน dev + cacheComponents) — แก้โดย key การรอที่ title ของ dialog จริง ("เพิ่มสถานีใหม่"/"เพิ่มลูกค้าใหม่") + login/dialog-open แบบ retry UAT จริงจึง deterministic
2. **fix(engineering): stuck-on-save hang** (commit `c834e14`)
   - อาการ: หน้า Power System แก้ไขอุปกรณ์ → กดบันทึก → ค้างที่ indicator "Rendering"
   - สาเหตุ: actions เรียก `refresh()` → Next.js embed re-render หน้านี้ (หนักมาก) ใน action response; client transition ไม่ settle — ตรงกับ known issue (#88767/#86055) เมื่อ `cacheComponents` + Turbopack
   - แก้: mirror pattern ของ admin/profile — เรียก `router.refresh()` ฝั่ง client **หลัง** action สำเร็จในทุกจุด (deleteAsset/deleteCertificate + save ทุก dialog — Asset/Security/Cert) `engineering-client.tsx`
   - เพิ่ม mock `next/navigation` ใน `engineering-client.test.tsx`
   - **ยืนยันด้วย UAT จริง** (playwright-core + Chrome headless, login เป็น EDITOR → แก้ไขชื่ออุปกรณ์ → บันทึก): dialog ปิดใน ~330ms, ไม่มี "Rendering" ค้าง, DB เปลี่ยนจริง
2. **feat(auth): protect /customers** (commit `b52799f`) — เพิ่ม `/customers` ใน `PROTECTED_PREFIXES` ของ proxy
3. **Docker/deploy prep** (commit `c834e14` รวมไว้):
   - `Dockerfile` — standalone multi-stage + prisma engines/schema + `docker-entrypoint.sh` (run `migrate deploy` ก่อน start)
   - `docker-entrypoint.sh`, `scripts/deploy.ps1` (build/run script), `.env.production.example`
   - `.dockerignore` ย่อเหลือ minimum

## งานค้าง / โน้ต
- ~~หน้าอื่นที่ใช้ pattern เดียวกับ engineering เก่า~~ ✅ แก้แล้ว (rooms/locations/customers — commit `a116452`) ถ้าหน้าอื่นเจอค้างแบบเดียวกัน ให้ใช้ `router.refresh()` client-side หลัง action
- Dev mode มี hydration warning เป็นครั้งคราว (overlay ชั่วคราว) กับ `cacheComponents` + Turbopack — เกิดเฉพาะ dev, ปรากฏใน play-test ว่าเป็น element `role="dialog"` ที่ไม่ใช่ dialog จริงของแอป
- Dev server รันอยู่ที่ http://localhost:3000 (log: `dev.log`, `dev.err.log` ที่ root ของ repo — untracked โดยตั้งใจ)
- `scripts/` มีสคริปต์แนบครั้งเดียว (seed/backfill/normalize/smoke/import) — รันซ้ำส่วนใหญ่ปลอดภัย (upsert)
- `playwright-core` อาจติดค้างใน `node_modules` (ติดตั้งแบบ `--no-save` จาก UAT) — ไม่ได้อยู่ใน `package.json`
- ตรวจ `git status` ให้สะอาดก่อนส่งต่องาน (exclude `dev.log`/`dev.err.log`/LibreOffice `~.lock` file)
- `AGENTS.md` ของโปรเจกต์: Next.js เวอร์ชันนี้มี breaking changes — ต้องอ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด