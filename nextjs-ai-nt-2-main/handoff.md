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
npm.cmd test               # vitest run ทั้งหมด (26 files / 260 tests)
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
| `/customers` | ข้อมูลบริษัท/ผู้ติดต่อ: ตำแหน่ง โทรศัพท์ อีเมล หมายเหตุ และ search |
| `/admin` | User/role management (search/filter/delete-user) |
| `/login` `/signup` | auth (public, กลับ redirect เมื่อ logged in แล้ว) |

## Data model (prisma/schema.prisma)
- `User`, `Session`, `Account` (better-auth) + field `role`
- `Customer` — code, name, stage, contactName/contactPosition/contactPhone/contactEmail, note, interestedRooms Json, inquiryDate, contract info
- CLS data: sites/buildings/floors/rooms + engineering (asset/certificate) + security columns
- Migration ล่าสุด: `20260925123705_add_customer_contact_position`

## Testing (คำสั่ง: `npm.cmd test` — 26 files / 260 tests)
Tests ระดับ integration ใช้ DB จริง (mock auth ผ่าน `vi.mock`; สร้าง temp user + cleanup เอง):
- `src/proxy.test.ts` — unit guard proxy
- `src/*-crud.test.ts` — rooms / customers / engineering / locations / admin (DB integration)
- `src/profile-auth.test.ts`, `src/profile-actions.test.ts` — better-auth / actions จริง
- `src/lib/*.test.ts` — unit: cls, profile schemas/errors
- `src/app/(front)/*/**/*.test.tsx` — component tests (jsdom) ทุกหน้า: dashboard, rooms, locations, floorplan, engineering, customers, profile, admin
- `src/components/*.test.tsx`, `src/components/ui/table.test.tsx` — lightbox, security-form, navbar, nav-menu, navigation-sheet, logout-button, table scroll hint
- `vitest.config.ts` alias `@` → `src`; jsdom env ต่อไฟล์ด้วย pragma `// @vitest-environment jsdom`
- Smoke/e2e scripts (`scripts/*-smoke.ts`) รันยิง dev server ผ่าน better-auth HTTP — ใช้เป็น final check หลังแก้เรื่อง auth/route

## ประวัติที่ทำ (session ใหม่ล่าสุดอยู่บนสุด)
1. **Customer contact fields + simplified form (session นี้ — ยังต้อง commit)**
   - ตารางลูกค้าเหลือคอลัมน์ ชื่อบริษัท, ผู้ติดต่อ, ตำแหน่งลูกค้า, เบอร์โทร, อีเมล, หมายเหตุ และ action
   - เพิ่ม `Customer.contactPosition` แบบ nullable พร้อม migration `20260925123705_add_customer_contact_position`; apply กับ local MariaDB และ `prisma generate` แล้ว
   - ฟอร์มเพิ่ม/แก้ไขถอดขั้นตอน, วันที่สอบถาม, ห้องที่สนใจ และข้อมูลสัญญาออก; action ไม่เขียนฟิลด์เหล่านี้เพื่อรักษาข้อมูล workflow เดิม
   - search ครอบคลุมบริษัท ผู้ติดต่อ ตำแหน่ง โทรศัพท์ อีเมล และหมายเหตุ
   - Verification อัตโนมัติ: customer component + DB integration 17 tests, full Vitest 26 files / 260 tests, `tsc --noEmit`, ESLint และ customer smoke 12/12 ผ่าน
   - Chrome headless UAT รอบสุดท้าย (viewport 1440×1000, login EDITOR ผ่าน UI) ผ่าน:
     - header ตรงตาม 6 คอลัมน์ข้อมูล + action และฟอร์มไม่มี 4 ช่องที่ถูกถอดออก
     - เพิ่มลูกค้าผ่านฟอร์มและเห็นครบทุกฟิลด์ในตาราง; DB สร้าง `CUST-006`, `stage=INQUIRY` และข้อมูลตรงทุก field
     - ลบผ่าน confirm → แถวหายจากหน้าและ DB ใน ~385ms; server action ~21ms
     - ไม่พบ console error, JavaScript runtime error หรือ `dev.err.log`; ลบลูกค้า/บัญชี UAT ครบและไม่มี Chrome headless ค้าง
2. **Responsive / accessibility / mobile table UX** (commit `da2727f`)
   - **แก้ navbar ล้นจอช่วง tablet**: เปลี่ยน desktop navigation จาก `md` เป็น `xl`, แสดง hamburger ถึงก่อน `xl`, ใส่ `shrink-0` ให้ control group/logo และจำกัดชื่อผู้ใช้ด้วย `max-w-48 truncate`
   - **เพิ่ม accessible name ให้ hamburger**: `aria-label="เปิดเมนูนำทาง"`; test เปลี่ยนมา query ด้วย role/name จริง
   - **แก้ profile ล้นแนวนอนเมื่อข้อมูลยาว**: ใส่ `min-w-0` ให้ grid columns/session content, email ใช้ `break-all`, session metadata ใช้ `break-words`; เพิ่ม test email ยาว
   - **เพิ่มคำแนะนำตารางมือถือส่วนกลาง** ใน `src/components/ui/table.tsx`: "ปัดซ้าย-ขวาเพื่อดูข้อมูลเพิ่มเติม" แสดงเฉพาะก่อน `md`; ครอบทุกตารางโดยไม่แก้ business pages ซ้ำ และเพิ่ม `table.test.tsx`
   - **แก้ favicon 404 บน auth pages**: ย้าย `src/app/(front)/favicon.ico` ไป `src/app/favicon.ico` ตาม Next.js 16 app icon convention
   - **Verification ผ่านทั้งหมด**:
     - targeted tests 4 files / 26 tests
     - full Vitest **26 files / 260 tests**, `tsc --noEmit`, ESLint
     - `npm.cmd run build` ผ่าน: compile ~1.2s, TypeScript ~5.1s, static generation 13/13
     - Chrome headless UAT ผ่านที่ 390/768/1024/1280/1440px: document overflow=0 ทุกขนาด; hamburger แสดงที่ <=1024 และซ่อนที่ >=1280
     - profile ที่ 390px overflow=0; rooms scroll hint แสดงและ table scroll 356→1084px; `/favicon.ico`=200; console/network errors=0
   - Dev server restart หลัง build แล้ว: `http://localhost:3000` ตอบ 200
3. **Production-readiness + UAT ครอบทุกหน้า** (commit `c93a3ab`)
   - **`npm run build` ผ่าน** (standalone + `cacheComponents`) — compile 19.7s (cold) / 1.6s (warm), 12 routes + proxy
   - **fix(floorplan): `router.refresh()` หลัง `savePin`** — floorplan ยังใช้ pattern เก่า (server `refresh()` + `startTransition`, ไม่มี client refresh) → ใส่ `useRouter` + `router.refresh()` หลัง pin วางสำเร็จใน `floorplan-client.tsx` (ระบุไม่ใช้แล้ว `photoPoint` mutation ค้างแบบเดียวกับ engineering) + mock `next/navigation` + ยืนยัน refresh ใน `floorplan-client.test.tsx`
   - **UAT UI ครอบหน้าที่เหลือ 12/12 ผ่าน 2 รอบซ้ำ** (playwright-core + Chrome headless):
     - floorplan (EDITOR): Pin Editor → เลือกห้อง → คลิกวาง pin → หมุดโผล่ ~200–265ms ไม่ค้าง, DB `photoPoint` เปลี่ยนจริง (x=39.91,y=29.9), restore ค่าเดิม, view-mode คลิกหมุดเปิด dialog
     - admin (ADMIN): create user ผ่านฟอร์ม → row โผล่ ~1.2s, role=EDITOR, DB จริง; delete → confirm "ยืนยันการลบ" → row + DB หาย
     - profile (ADMIN): เปลี่ยนชื่อ → success ~1.3s + DB อัปเดต + restore; revoke "ออกจากระบบอุปกรณ์อื่นทั้งหมด" → sessions 2→1, session อุปกรณ์ B invalid จริง
   - **ทบทวน hydration warning**: เจอตอน UAT ก่อนหน้าแบบชั่วคราว แต่ post-hoc probes (ทุกหน้าโหลด + flow save/refresh ผ่าน console capture) **reproduce ไม่ได้** — สรุปเป็น dev-only transient noise (Turbopack + cacheComponents), ไม่ใช่ code bug
4. **fix(rooms/locations/customers): client `router.refresh()` หลัง actions** (commit `a116452`)
   - เทียบกับ fix ครั้งก่อนของ engineering — ย้ายไปใช้ `router.refresh()` ฝั่ง client หลัง action สำเร็จ (เก็บ server `refresh()` ใน actions ไว้)
   - `rooms-client.tsx`: refresh หลัง save / upload photo / delete photo
   - `locations-client.tsx`: ย้าย `runAction` เข้า client component + `router.refresh()` เมื่อสำเร็จ
   - `customers-client.tsx`: refresh หลัง save dialog + delete
   - เพิ่ม mock `next/navigation` + ยืนยันการเรียก refresh ใน 3 ไฟล์ test
   - **ยืนยันด้วย UAT จริง** (playwright-core + Chrome headless, login EDITOR ผ่าน UI): ผ่าน 2 รอบซ้ำ **11/11**
     - rooms: save แสดง success ใน ~400–450ms ไม่ค้าง "Rendering", DB อัปเดตจริง
     - locations: create site → dialog ปิด ~320–350ms, row `UAT-*` ใน DB + render ขึ้นหน้า, delete มีผลจริง
     - customers: create → dialog ปิด ~330–415ms, DB + render + delete ผ่าน
5. **fix(engineering): stuck-on-save hang** (commit `c834e14`)
   - อาการ: หน้า Power System แก้ไขอุปกรณ์ → กดบันทึก → ค้างที่ indicator "Rendering"
   - สาเหตุ: actions เรียก `refresh()` → Next.js embed re-render หน้านี้ (หนักมาก) ใน action response; client transition ไม่ settle — ตรงกับ known issue (#88767/#86055) เมื่อ `cacheComponents` + Turbopack
   - แก้: mirror pattern ของ admin/profile — เรียก `router.refresh()` ฝั่ง client **หลัง** action สำเร็จในทุกจุด (deleteAsset/deleteCertificate + save ทุก dialog — Asset/Security/Cert) `engineering-client.tsx`
   - เพิ่ม mock `next/navigation` ใน `engineering-client.test.tsx`
   - **ยืนยันด้วย UAT จริง** (playwright-core + Chrome headless, login เป็น EDITOR → แก้ไขชื่ออุปกรณ์ → บันทึก): dialog ปิดใน ~330ms, ไม่มี "Rendering" ค้าง, DB เปลี่ยนจริง
6. **feat(auth): protect /customers** (commit `b52799f`) — เพิ่ม `/customers` ใน `PROTECTED_PREFIXES` ของ proxy
7. **Docker/deploy prep** (commit `c834e14` รวมไว้):
   - `Dockerfile` — standalone multi-stage + prisma engines/schema + `docker-entrypoint.sh` (run `migrate deploy` ก่อน start)
   - `docker-entrypoint.sh`, `scripts/deploy.ps1` (build/run script), `.env.production.example`
   - `.dockerignore` ย่อเหลือ minimum

## งานค้าง / โน้ต
- **งาน customer contact fields + simplified form session นี้ยังไม่ commit** — รวม schema/migration, customer UI/actions/tests, seed/smoke และ `handoff.md`
- **ข้อสังเกตจาก UAT:** `nextCode()` อ่านรหัสลูกค้าที่มีอยู่ล่าสุดแล้วบวก 1; หลังลบ `CUST-006` ที่เป็นรหัสสูงสุด รหัสนี้อาจถูกใช้ซ้ำกับลูกค้าใหม่ — ควรพิจารณา sequence/counter หรือวิธีออกรหัสที่ไม่ reuse หากต้องการคง audit semantics
- **Docker deploy ยังไม่เคยรันจริง** — มี Dockerfile/deploy.ps1 แต่ยังไม่ได้ `docker build` + run ตรวจ standalone จริง
- ถ้าหน้าอื่นเจอค้างแบบเดียวกัน (action เรียก `refresh()` แต่ client ไม่ `router.refresh()`) → ใช้ fix เดียวกับ engineering/floorplan; ตอนนี้ครบคือ rooms/locations/customers/engineering/floorplan (admin/profile ดีอยู่แล้ว)
- **Hydration warning ใน dev**: เป็นครั้งคราว ชั่วคราว กับ `cacheComponents` + Turbopack — reproduce ไม่ได้ใน post-hoc probes, มี element `nextjs-portal` (ของ Next dev tools, ปกติ) จะเบลอถ้าเล่น UAT ผ่าน `[role="dialog"]` ทั่วไป ให้ key ที่ title ของ dialog จริงแทน
- **UAT ผ่าน UI (playwright)** ต้องระวัง hydration race:
  - `.fill()` ก่อน React hydrated → controlled state ยังเป็นค่าว่าง → หลัง hydrate มัน reset ค่า → submit แล้วเจอ validation error (เช่น "รหัสผ่านขั้นต่ำ 8 ตัว") → ให้ refill+settle ~400ms ก่อน click ทุกครั้ง และ retry วนใหม่
  - login/dialog-open: click ได้แต่ไม่มีผล (handler ยังไม่ attached) → ควร retry + รอ signal จริงของ form (เช่น `[role="dialog"] input` ครบจำนวน)
  - ปุ่ม revoke-all ของ profile เป็น **inline expansion** (ปุ่ม "ยืนยัน" ใน CardFooter) ไม่ใช่ Radix AlertDialog — ไม่มี `role="dialog"`
  - "ออกจากระบบอุปกรณ์อื่นทั้งหมด" จะแสดงเฉพาะเมื่อหน้าโหลดแล้วมี `otherSessions>0` → ต้อง sign-in อุปกรณ์ที่ 2 **ก่อน** `goto /profile`
- Dev server รันอยู่ที่ http://localhost:3000 (restart หลัง schema/migration แล้ว; `/login` ตอบ 200, `dev.err.log` ว่าง; log: `dev.log`, `dev.err.log`; มี `../dev.log` และ `../dev.err.log` untracked ที่ git root จากการรันก่อนหน้า)
- `scripts/` มีสคริปต์แนบครั้งเดียว (seed/backfill/normalize/smoke/import) — รันซ้ำส่วนใหญ่ปลอดภัย (upsert)
- `playwright-core` อาจติดค้างใน `node_modules` (ติดตั้งแบบ `--no-save` จาก UAT) — ไม่ได้อยู่ใน `package.json`
- ตรวจ `git status` ให้สะอาดก่อนส่งต่องาน (exclude `dev.log`/`dev.err.log`/LibreOffice `~.lock` file)
- `AGENTS.md` ของโปรเจกต์: Next.js เวอร์ชันนี้มี breaking changes — ต้องอ่าน `node_modules/next/dist/docs/` ก่อนเขียนโค้ด

## งานที่จะทำต่อ
1. **Commit + push งาน session ปัจจุบัน**: customer contact fields + simplified form + migration + tests + handoff นี้ — จากนั้นตรวจ `git status` (ไม่รวม `../dev*.log` ที่เป็น runtime log)
2. **ตัดสินใจแก้ customer code reuse**: ป้องกันการออกรหัส `CUST-xxx` ซ้ำหลังลบลูกค้ารหัสสูงสุด หรือยืนยันว่า reuse เป็นพฤติกรรมที่ยอมรับได้
3. **ทดสอบ Docker deploy จริง**: `docker build -t cls-facility-center .` → รันด้วย `--env-file .env` → smoke ตรวจ production build (`npm run start`) ก่อน
4. ถ้าต้องปรับ UX มือถือเพิ่ม ให้พิจารณาเปลี่ยนตาราง rooms/customers/engineering/admin เป็น card layout เฉพาะ mobile; รอบนี้ใช้ scroll hint เพื่อคง business actions เดิมและลดความเสี่ยง
5. (เมื่อมีหน้าใหม่) ถ้าเจอค้าง "Rendering" หลัง action → ใช้ `router.refresh()` client-side ตาม pattern ที่บันทึกไว้ข้างบน
