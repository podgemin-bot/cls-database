# Handoff — CLS Facility Center (nextjs-ai-nt-2-main)

Project: Thai cable-landing-station (CLS) facility center web app for NT ประจำสถานีปากบารา/สงขลา.

## Stack
- **Next.js 16.3.1 (App Router)** · React 19 · TypeScript 5
- **Prisma 7 + MariaDB** (`prisma/schema.prisma`, `prisma.config.ts`)
- **better-auth 1.7** (email/password, DB session) — client at `src/lib/auth-client.ts`, server at `src/lib/auth.ts`
- **Tailwind CSS 4** + shadcn/radix-ui · react-hook-form + zod · lucide-react · xlsx
- **Vitest 4** สำหรับเทสต์, **tsx** สำหรับรันสคริปต์

## วิธีรัน
```powershell
npm.cmd run dev            # dev server (ใช้ npm.cmd เพราะ execution policy บัง PowerShell)
npm.cmd test               # vitest run ทั้งหมด
npx.cmd tsc --noEmit       # typecheck
npx.cmd eslint             # lint
npm.cmd run db:push        # อัปเดต schema ไป DB
npm.cmd run db:deploy      # apply migrations
npx.cmd prisma generate    # หลังแก้ schema
```

**Gotcha:** ติดตั้ง/เรียกคำสั่ง npm ต้องใช้ `npm.cmd`/`npx.cmd` (ตัว `.ps1` โดน execution policy บล็อก)

## Environment
- `.env`: `DATABASE_URL` (MariaDB), `BETTER_AUTH_SECRET` (มีค่าแล้ว ใช้กันได้ข้าม process), `BETTER_AUTH_URL=http://localhost:3000`
- `.env.example` มี placeholder
- `.gitignore` รวม `dev.log`/`dev.err.log` แล้ว

## Auth & Protected routes
- `src/proxy.ts` — middleware guard: redirect 307 → `/login?callbackURL=…`
- Protected: `/rooms`, `/locations`, `/floorplan`, `/engineering`, `/profile`, `/admin` (**ไม่รวม** `/customers`)
- Role: `ADMIN` / `EDITOR` / `VIEWER` (field `user.role`)
- Session cookie: `better-auth.session_token=<token>.<signature>` — **เป็น signed cookie** (HMAC ด้วย `BETTER_AUTH_SECRET`) ค่า raw token ใน DB ใช้ directamente ไม่ได้ ต้องเอามาจาก `auth.api.*` กับ `returnHeaders: true`

## Pages (src/app/(front))
| Route | ฟีเจอร์ |
|---|---|
| `/` | Dashboard |
| `/rooms` | Room CRUD + security fields + photo upload/delete (editor+ guard) |
| `/locations` | Hierarchical CRUD site/building/floor/room + auto-code |
| `/floorplan` | Floor plan pins, room dialog + photo lightbox, filters |
| `/engineering` | Power/AC/certificate/security tabs, BTU field, location column |
| `/profile` | แก้ชื่อ / เปลี่ยนรหัสผ่าน (react-hook-form + zod) |
| `/customers` | ลูกค้า/ลีด: stage INQUIRY→ROOM_INQUIRY→RENTING→CLOSED, contract section, search |
| `/admin` | User/role management, create-user, role assignment |
| `/login` `/signup` | auth (public) |

## Data model (prisma/schema.prisma)
- `User`, `Session`, `Account` (better-auth), field `role` เพิ่มเอง
- `Customer` — code, name, stage, contact*, interestedRooms Json, inquiryDate, contract info
- CLS data: sites/buildings/floors/rooms + engineering + security columns
- Migration ล่าสุด: `20260919150744_add_customer`

## Testing (คำสั่ง: `npm.cmd test`)
- `src/proxy.test.ts` — unit guard proxy
- `src/customers-crud.test.ts` — integration จริง DB, mock auth ผ่าน `vi.mock`
- `src/lib/profile-schemas.test.ts` + `profile-errors.test.ts` — unit validation/แปลข้อความ
- `src/profile-auth.test.ts` — integration กับ better-auth จริง: sign-in, updateUser, changePassword, revokeOtherSessions (สร้าง temp user + cleanup เอง)
- `scripts/profile-http-smoke.ts` — smoke เทียบ dev server: `/profile` 307 (unauth) / 200 (authed)
- `vitest.config.ts` มี alias `@` → `src`

## ล่าสุดที่ทำ (session นี้)
1. **UI component tests** — เพิ่ม testing-library (jsdom):
   - ติดตั้ง: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`
   - `vitest.config.ts`: include `*.test.{ts,tsx}`, `setupFiles: src/test/setup.ts`
   - `src/test/setup.ts`: jest-dom matchers + `cleanup()` หลังทุกเทสต์ (ต้อง cleanup เองเพราะ `globals` ปิด)
   - **หมายเหตุ**: vitest 4 ไม่มี option `environmentMatchGlobs` — ใช้ไฟล์ pragma `// @vitest-environment jsdom` แทน
   - `src/components/lightbox.test.tsx` — 10 เทสต์: open/close, counter, next/prev wrap-around, dots, Escape/Arrow keys, backdrop vs image click, unmount
   - `src/components/security-form.test.tsx` — 9 เทสต์: controlled harness, toggle access control, CCTV count, selects, short labels, `securityFormFromData` mapping
   - `src/lib/cls.test.ts` — unit: `shortOptionLabel`/`splitAccessControl`/`joinAccessControl`/status meta
   - `src/components/logout-button.test.tsx` — 3 เทสต์ mock `@/lib/auth-client` + `next/navigation` (vi.mock + vi.hoisted): render label, click → signOut, onSuccess → router.refresh
   - `src/components/nav-menu.test.tsx` — 5 เทสต์ mock `next/link`: 6 ลิงก์ฐาน + แสดง/ซ่อน "โปรไฟล์" (isLoggedIn) และ "ดูแลระบบ" (isAdmin)
   - `src/components/navigation-sheet.test.tsx` — 3 เทสต์ (radix Dialog ใน jsdom): trigger เปิด dialog, ลิงก์ base+role ภายใน sheet
   - `src/components/navbar.test.tsx` — 4 เทสต์ (async RSC): `await Navbar()` แล้ว render — mock `@/lib/auth` (getSession), `@/lib/prisma` (findUnique), `next/headers`, `next/link`, `./logout-button`: logged-out → login link, logged-in non-admin → welcome+profile, ADMIN → +admin link, db fail → fallback non-admin
   - `src/app/(front)/customers/customers-client.test.tsx` — 10 เทสต์ (ฟอร์มใหญ่สุด, radix Dialog จริง): list+search filter+stage filter, `canEdit=false` ซ่อนปุ่ม, create RENTING+contract ครบ, error mapping แสดงไทย, edit prefill+updateCustomer, delete confirm true/false, detail dialog — mock `./actions` (create/update/delete)
5. **Admin (User role) CRUD ทดสอบ** — `src/admin-crud.test.ts` (11, integration จริง DB) + `src/app/(front)/admin/admin-client.test.tsx` (10, jsdom):
   - `admin-crud.test.ts`: mock `next/headers`/`next/cache`, mock `@/lib/auth` แบบ `importOriginal` + spike เฉพาะ `api.getSession` (เก็บ `signUpEmail` จริง) → `createUser` happy path + `email-exists` + `invalid-input` (ชื่อ/อีเมล/รหัสสั้น/role ผิด) + `unauthorized`/`forbidden`; `setUserRole` update role + `invalid-input` + `not-found` + `cannot-demote-self` + `unauthorized` — upsert admin/editor user ก่อน, cleanup account/session/user หลัง
   - `admin-client.test.tsx`: mock `./actions` (vi.hoisted) — role counts + self badge, verified badges (มี 2 ราย verified → ใช้ `getAllByText`), form validation (password mismatch/empty name **ไม่**เรียก createUser), success + form reset, `email-exists` mapping; role selects (combobox index 0 = select ฟอร์มสร้าง, 1/2/3 = แถว u1/u2/u3), update role, self-demote blocked, self ADMIN allowed, error mapping — **Gotcha**: select row เดิมใส่ index ผิด → ตอนนี้ลำดับ combobox ระวัง
   - `src/test/setup.ts` มี guarded polyfill: ResizeObserver + matchMedia (เฉพาะ jsdom env, ก่อน `typeof window !== undefined`) — radix ต้องการ ResizeObserver
   - **Gotcha**: ปุ่ม trigger ของ NavigationSheet ไม่มี accessible name (ไอคอน lucide `aria-hidden`) → query ผ่าน `[data-slot="sheet-trigger"]` แทน role/name
6. **Engineering + Locations ทดสอบ** (ต่อจาก Admin CRUD):
   - `src/engineering-crud.test.ts` (14, integration จริง DB): mock auth แบบเต็มโมดูล (engineering actions ใช้แค่ `api.getSession`) — `resolveNextAssetCode` ลำดับรหัส/unauth+ไม่มีสถานี, `createAsset` POWER+COOLING (specs ลง Json), validation/unauthorized/forbidden, `updateAsset`/`deleteAsset`, `createCertificate` (STATION scope) + duplicate-code + update-rename (duplicate ต้องเปลี่ยนเป็นรหัสของใบอื่น) + delete — **Gotcha**: รหัสสินทรัพย์เป็นลำดับวงรอบ site → test ที่สร้างรหัสซ้ำต้อง `prisma.asset.deleteMany` ก่อนมิฉะนั้น P2002 กลายเป็น `server-error`
   - `src/locations-crud.test.ts` (14, integration จริง DB): site (uppercase code, regex `/^[A-Za-z0-9_-]{1,10}$/` → `invalid-site-code`, duplicate), building (auto-code B01→B02), floor (duplicate-level, code พร้อม pad2 `F05`), room (auto `R`+pad2, status validate, tenant trim), cascade delete room/floor/building/site (site ลบรวม certs ด้วย) + forbidden/unauthorized — **Gotcha**: แต่ละ test seed hierarchy เอง (`seed()`) ห้ามพึ่ง test ก่อนหน้าเพราะ vitest รันขนาน/สลับลำดับได้
   - `src/app/(front)/engineering/engineering-client.test.tsx` (15, jsdom, mock `./actions` + `../rooms/actions` ใน vi.hoisted): tabs+counts (Power System/Cooling/ใบรับรอง/ความปลอดภัย), site/status filter + ล้างตัวกรอง, canEdit=false ซ่อนปุ่ม, create POWER/COOLING dialog (combobox ใน dialog: [0]สถานะ [1]สถานี [2]อาคาร [3]ชั้น [4]ห้อง; resolveNextAssetCode เรียกเมื่อเลือกสถานี), edit prefill, delete confirm, cert create + expired badge + duplicate-error, security read/edit dialog เรียก `updateRoomSecurity` (ยังสั้น label FM-200)
   - `src/app/(front)/locations/locations-client.test.tsx` (11, jsdom, mock `./actions`): site cards+counts, canEdit=false ซ่อนทุกปุ่ม/ตาราง, create/edit site dialog (รหัส disabled เมื่อแก้ไข) + error mapping, drill-down sites→buildings→floors→rooms ผ่าน breadcrumb ทั้งหมด/ชื่อ, building/floor/room dialog พร้อม preview รหัสอัตโนมัติ (S1-B01-F02, R02), room status เป็น native `<select>`, delete confirm พร้อมข้อความไทย — **Gotcha**: helper นำทางต้องเป็น one-step (goToFloors จาก buildings เท่านั้น), ลิงก์ breadcrumb ชื่อ site กลับไป buildings (ไม่ใช่ sites — ใช้ "ทั้งหมด" เพื่อกลับ), รอ dialog ปิดก่อนกดปุ่มในตารางมิฉะนั้น radix `aria-hidden` ซ่อน table จาก accessibility tree
7. **Rooms + Floorplan client ทดสอบ** (ปิดจบ client UI หลักทั้งหมด):
   - `src/app/(front)/rooms/rooms-client.test.tsx` (17, jsdom, mock `./actions` = updateRoom/updateRoomSecurity/uploadRoomPhoto/deleteRoomPhoto): filter site/building/floor/status/search (combobox ลำดับ [0]site [1]building [2]floor [3]status, count "N ห้อง"), empty state + "ไม่พบห้องที่ตรงเงื่อนไข", initialSite/initialFloor จาก props, dialog detail (specs/security/cooling/photos), canEdit=false ซ่อนปุ่มแก้ไข, save เรียก `updateRoom`+`updateRoomSecurity` พร้อมกัน (ยังใช้ SecurityForm จริง → ค่า sec ได้จาก fixture), error mapping ("ไม่พบห้องนี้"), upload ไฟล์ + too-large เกิน 10MB, delete photo confirm/cancel, ปิด dialog ผ่าน X (sr-only "ปิด")
   - `src/app/(front)/floorplan/floorplan-client.test.tsx` (11, jsdom, mock `./actions` = savePin + mock `@/components/lightbox` → null): หมุด/legend counts/สถานะ filter, switch ชั้น/site + placeholder "ไม่มีไฟล์ผังชั้นสำหรับ...", initialFloor prop, dialog จาก pin/placed list (ภาพ+ลิงก์กลับ `/rooms?site=&floor=`), editor mode activate pin, วางหมุดโดย mock `getBoundingClientRect` ของ img (200×100 → คลิก 50,25 → savePin(2,25,25)), savePin denied → "ต้องเป็น admin/editor", canEdit=false ซ่อน editor + unplaced disabled — **Gotcha**: หมุดเป็น `<button title>` ที่มี tooltip span → `getByText`/`getByRole` ตีเจอหลายตัว ให้ใช้ `getByTitle` หรือ scope ด้วย `within(โหมดวางหมุด header)` หรือชื่อปุ่มแบบ exact ("ห้องแบตเตอรี่S1-B01-F01-R03"); unplaced room คลิกได้เฉพาะโหมด editor (view mode disabled แม้ canEdit=true)
8. **Profile page อัปเกรด (P1 UX + P2 session management)**:
   - `src/app/(front)/profile/page.tsx`: fetch `auth.api.listSessions` ควบคู่ user, mark เซสชันปัจจุบันจาก `session.session.token`, ส่ง `SerializedSession[]` ลง client
   - `src/app/(front)/profile/actions.ts` (ใหม่): `revokeSessionAction(token)` + `revokeOtherSessionsAction()` ตาม pattern locations (`requireSession` guard ห้าม revoke เซสชันตัวเอง → `cannot-revoke-current`, แล้ว `refresh()` จาก `next/cache`)
   - `src/app/(front)/profile/profile-client.tsx`: P1 — busy state ปุ่ม (RHF `isSubmitting` + "กำลังบันทึก..."), กล่อง alert success/error แบบ login form + `role="alert"`, เคลียร์ข้อความเมื่อพิมพ์ใหม่, ปุ่ม show/hide รหัสผ่าน (Eye/EyeOff), สรุปสิทธิ์ role (ROLE_META.summary); P2 — Card "อุปกรณ์ที่เข้าใช้งาน" (device label จาก userAgent / IP / เข้า-หมดอายุ th-TH, Badge "อุปกรณ์นี้", revoke รายการ + revoke-other พร้อม confirm 2-step) — เพิ่ม entry `cannot-revoke-current` ใน `src/lib/profile-errors.ts`
   - Tests: `profile-client.test.tsx` (17, jsdom, mock `@/lib/auth-client` + `./actions`), `src/profile-actions.test.ts` (7, unit mock auth.api), ขยาย `src/profile-auth.test.ts` (+3 integration จริง: listSessions / revokeSession / revokeOtherSessions)
   - **Gotcha**: cookie session เป็น `<token>.<signature>` ถูก URL-encode แต่ DB `session.token` / listSessions / revokeSession ใช้ส่วนก่อนจุดแรก → integration test ต้อง `decodeURIComponent(cookie).split(".")[0]`; `auth.api.getSession` คืน `{ session, user }` → ใช้ `session.session.token` (tsc ฟ้องถ้าเผลอใช้ `session.token`)
   - **E2E smoke จริงผ่าน dev server**: `scripts/profile-e2e-smoke.ts` (ใช้ tsx, สร้าง user/session จริงแล้วลบทิ้ง) — sign-up → sign-in 2 ตัว → GET /profile มี "โปรไฟล์"/"อุปกรณ์ที่เข้าใช้งาน"/Badge "อุปกรณ์นี้" → list-sessions 1→2 → revoke-others → เหลือ 1 + get-session ตัวอื่นเป็น null + /profile redirect /login — 17/17 PASS (รัน: `npx.cmd tsx scripts/profile-e2e-smoke.ts`)
   - **Gotcha (HTTP จาก Node)**: `fetch` (undici) ส่ง `Origin: null` บน POST เสมอ → better-auth คืน 403 `MISSING_OR_NULL_ORIGIN` → script HTTP ต้องตั้ง header `origin: http://localhost:3000` เอง; `redirect` ต้องส่งเป็น option ในตัวที่ 2 ของ fetch (ตัวที่ 3 ไม่มีผล — undici ตาม redirect เอง)
   - **Gotcha (proxy.ts)**: ปกป้องหน้าแค่ดูว่ามี cookie `better-auth.session_token` หรือไม่ (ไม่ validate) → session ที่ถูก revoke แล้วยังเข้า `/` ได้ (หน้า home ไม่ redirect) แต่หน้าแบบ `/profile` ที่เรียก `getSession` จะ redirect เอง → ตรวจ "revoke ได้ผล" ผ่าน `get-session → null` แทน
9. **Admin page อัปเกรด (P1 UX/a11y + ค้นหา/กรอง + ลบผู้ใช้)**:
   - `src/app/(front)/admin/actions.ts`: เพิ่ม `deleteUserAction(userId)` — guard `not-found` / `cannot-delete-self` / `cannot-delete-last-admin` (target เป็น ADMIN และมี admin ทั้งหมด ≤ 1 ตัว) → `prisma.user.delete` (cascade sessions+accounts) → `refresh()`
   - `src/app/(front)/admin/admin-client.tsx`: P1 — ฟอร์มสร้างใช้ `Field/FieldLabel/FieldGroup/FieldError` + `htmlFor/id` (label ผูกช่องจริง), show/hide รหัสผ่าน (Eye/EyeOff), feedback แยกเป็นกล่อง alert ต่อ section (`role="alert"`, emerald/destructive) + เคลียร์เมื่อพิมพ์, live hint รหัสไม่ตรงกัน, role change มี pending state (disable select ทุกแถว + "กำลังอัปเดต...") + `router.refresh()`; P2 — กล่องค้นหาชื่อ/อีเมล + select กรองสิทธิ์ (ทุกสิทธิ์/Admin/Editor/Viewer), empty state แยก ("ยังไม่มีผู้ใช้" / "ไม่พบผู้ใช้ที่ตรงเงื่อนไข"), ปุ่มลบ (Trash2) → Dialog confirm (ชื่อ+อีเมล+คำเตือน cascade) → `deleteUserAction` → `router.refresh()`, ปุ่มลบ disable เมื่อเป็นตัวเอง / ADMIN คนสุดท้าย (คำนวณจาก adminCount)
   - Tests: `admin-client.test.tsx` เหลือเป็น 27 ตัว (jsdom, mock `./actions` + `useRouter`) — **Gotcha**: เดิมใช้ index `combobox` (เพิ่ม select กรองสิทธิ์เข้ามา → ลำดับเปลี่ยน) ตอนนี้ทุก select มี accessible name (`เลือกสิทธิ์สำหรับสร้าง` / `กรองตามสิทธิ์` / `สิทธิ์ของ {ชื่อ}`) → ใช้ `getByRole("combobox", { name })`; `admin-crud.test.ts` +7 (รวม 18): delete สำเร็จ + cascade account/session, not-found, cannot-delete-self, delete ADMIN ได้เมื่อมี admin เหลือ, **cannot-delete-last-admin ทดสอบได้โดยแกล้ง `prisma.user.count` คืน 1** (guard นี้ในทางจริงไม่มีทาง trigger เพราะคนลบต้องเป็น admin เอง), unauthorized, forbidden
   - suite รวม: 24 ไฟล์ / **247 เทสต์** ✓
   - **E2E smoke จริงผ่าน dev server**: `scripts/admin-e2e-smoke.ts` (tsx) — bootstrap admin (sign-up + set role) → สร้าง user 3 บทบาท (ADMIN/EDITOR/VIEWER) → เช็คสิทธิ์ใช้งาน (/admin แสดง UI กับผู้ดูแล, แสดง "เฉพาะผู้ดูแลระบบ" กับ editor/viewer; /floorplan แสดง pin editor กับ admin/editor แต่ viewer เห็นเฉพาะ read-only) → ลบทั้ง 3 → ตรวจ cascade (user/session/account หาย) + cookie เก่า invalid + หน้า /admin ไม่แสดงคนถูกลบ — **21/21 PASS**, cleanup เองหมด (0 ผู้ใช้ค้าง) — **Gotcha**: better-auth `get-session` ไม่คืนคอลัมน์ `role` (custom column) → ตรวจสิทธิ์จาก DB เหมือนที่ RSC pages ทำ
10. **Dashboard ทดสอบ** — `src/app/(front)/page.test.tsx` (6, jsdom, mock `@/lib/prisma` + `next/server`): header + รวมสถานี/ห้อง (ยืนยันผ่าน textContent ต้องใช้ function matcher เพราะตัวเลขอยู่ใน Badge ไม่ใช่ text node ตรง ๆ), legend สถานะครบ 4, site card ชื่อ/จว./GPS + ลิงก์ Google Maps, stats + floor shortcut `/rooms?floor=` + `ดูห้องทั้งหมดของCODE`, `prisma.room.groupBy` ถูกเรียก scoped ต่อ site (`siteId` where), สถานะที่ไม่มีค่า default 0 + site ไม่มี building/floors, empty state (0 site → ไม่เรียก groupBy)
2. **Security page** — `shortOptionLabel` ตัดวงเล็บ (FM-200/Novec 1230), default "ไม่ติดตั้ง", backfill script
3. **Customer page** — model + migration + UI ครบ + seed (`scripts/seed-customers.ts` 5 ราย)
4. **Profile ทดสอบ** (commit `94b69ee`):
   - Refactor: `src/lib/profile-schemas.ts`, `src/lib/profile-errors.ts`
   - **Bug ที่เจอ+แก้**: `translateError` เดิม map ไทยด้วย key `invalid-password` แต่ better-auth ส่ง `INVALID_PASSWORD` → ข้อความไทยไม่เคยถูกใช้ ตอนนี้ normalize `_→-` + lowercase ใน `translateProfileError` แล้ว

Dev server รันอยู่ที่ http://localhost:3000 (ดู log: `dev.log`, `dev.err.log`)

## งานค้าง / โน้ต
- UI component test ครอบคลุมเพียบ (Lightbox, SecurityForm, LogoutMenu, Navbar, CustomersClient, AdminClient, EngineeringClient, LocationsClient, RoomsClient, FloorplanClient, ProfileClient, Dashboard + server actions ของ admin/engineering/locations/profile) — suite รวม 24 ไฟล์ / 247 เทสต์ ✓
- **หมายเหตุ**: admin-client ใช้ <select> ธรรมดา (ไม่ใช่ radix Select) — นับ `combobox` ลำดับ: 0=สิทธิ์ฟอร์มสร้าง, แล้วไล่ตามแถวตาราง
- **Gotcha**: ฟอร์มลูกค้า input หลายตัวไม่มี label association + placeholder (อีเมล/date) → test ใช้ `dialog.querySelector('input[type=...]')`
- `scripts/` มีสคริปต์แบบใช้ครั้งเดียว (backfill/normalize/seed) — รันซ้ำได้ปลอดภัย (upsert)
- ตรวจ `git status` ให้สะอาดก่อนส่งต่องาน