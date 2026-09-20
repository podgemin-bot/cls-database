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
   - `src/test/setup.ts` มี guarded polyfill: ResizeObserver + matchMedia (เฉพาะ jsdom env, ก่อน `typeof window !== undefined`) — radix ต้องการ ResizeObserver
   - **Gotcha**: ปุ่ม trigger ของ NavigationSheet ไม่มี accessible name (ไอคอน lucide `aria-hidden`) → query ผ่าน `[data-slot="sheet-trigger"]` แทน role/name
2. **Security page** — `shortOptionLabel` ตัดวงเล็บ (FM-200/Novec 1230), default "ไม่ติดตั้ง", backfill script
3. **Customer page** — model + migration + UI ครบ + seed (`scripts/seed-customers.ts` 5 ราย)
4. **Profile ทดสอบ** (commit `94b69ee`):
   - Refactor: `src/lib/profile-schemas.ts`, `src/lib/profile-errors.ts`
   - **Bug ที่เจอ+แก้**: `translateError` เดิม map ไทยด้วย key `invalid-password` แต่ better-auth ส่ง `INVALID_PASSWORD` → ข้อความไทยไม่เคยถูกใช้ ตอนนี้ normalize `_→-` + lowercase ใน `translateProfileError` แล้ว

Dev server รันอยู่ที่ http://localhost:3000 (ดู log: `dev.log`, `dev.err.log`)

## งานค้าง / โน้ต
- UI component test ครอบคลุม Lightbox, SecurityForm, LogoutButton, NavMenu, NavigationSheet แล้ว — ยังไม่ครอบคลุม server components (navbar เป็น async RSC พึ่ง auth/prisma/) และฟอร์มใหญ่ (rooms/customers actions) เพราะต้อง mock เยอะ
- `scripts/` มีสคริปต์แบบใช้ครั้งเดียว (backfill/normalize/seed) — รันซ้ำได้ปลอดภัย (upsert)
- ตรวจ `git status` ให้สะอาดก่อนส่งต่องาน