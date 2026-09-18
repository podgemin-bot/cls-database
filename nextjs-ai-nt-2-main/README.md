# CLS Facility Center

ระบบบริหารจัดการศูนย์โทรคมนาคมและสถานีเคเบิลใต้น้ำ (Cable Landing Station) — ปากบารา (PKB, สตูล) และสงขลา (SKA)

Web app สำหรับจัดการข้อมูลอาคาร / ชั้น / ห้อง, ระบบความปลอดภัย, ระบบไฟฟ้า-ทำความเย็น, ใบรับรอง และผังชั้นแบบ Interactive พร้อมระบบสิทธิ์ผู้ใช้ (Admin / Editor / Viewer)

## เทคโนโลยี

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack, Cache Components)
- React 19, TypeScript
- [better-auth](https://better-auth.com) — ระบบยืนยันตัวตน + API / email, password
- [Prisma](https://www.prisma.io) 7 + MySQL / MariaDB (driver adapter)
- Tailwind CSS v4 + shadcn/ui
- Vitest — unit/smoke test

## โครงสร้าง

```
src/
├─ app/
│  ├─ (auth)/login, (auth)/signup        # หน้าเข้าสู่ระบบ / สมัครสมาชิก
│  ├─ (front)/                           # พื้นที่หลัง login
│  │  ├─ page.tsx                        # ภาพรวมสถานี (dashboard)
│  │  ├─ rooms/       ระบบห้อง + รูปถ่าย + รายละเอียด
│  │  ├─ locations/   ลำดับชั้น Site → Building → Floor → Room (CRUD)
│  │  ├─ floorplan/   ผังชั้น Interactive + การวางหมุด (pin)
│  │  ├─ engineering/ Power / Cooling / ใบรับรอง / ความปลอดภัย
│  │  ├─ profile/     โปรไฟล์ + เปลี่ยนรหัสผ่าน
│  │  └─ admin/       จัดการผู้ใช้และสิทธิ์ (Admin เท่านั้น)
│  └─ api/auth/[...all]                 # better-auth routes
├─ components/ui/      # shadcn/ui components
└─ lib/                # auth, prisma client, helpers
prisma/schema.prisma   # โมเดลข้อมูล
prisma/migrations/     # Prisma migrations
scripts/import.ts      # import จาก Excel master database (ครั้งเดียว)
```

## เริ่มต้นพัฒนา (Development)

```bash
# 1. ตั้งค่าตัวแปร environment
cp .env.example .env
# แก้ DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL ใน .env ตามจริง

# 2. ติดตั้ง dependencies
npm install

# 3. generate Prisma client และสร้าง schema ในฐานข้อมูล
npx prisma generate
npm run db:push     # เทียบเท่า prisma db push (เฉพาะ dev ครั้งแรก)

# 4. import ข้อมูลจาก Excel (ครั้งเดียว เมื่อมี CLS_Master_Database_Original.xlsx)
npx tsx scripts/import.ts

# 5. รัน dev server
npm run dev
# เปิด http://localhost:3000
```

## Scripts

| คำสั่ง | ความหมาย |
| ------ | ------- |
| `npm run dev` | รัน dev server (Turbopack) |
| `npm run build` | build สำหรับ production |
| `npm run start` | รัน production build |
| `npm run lint` | ตรวจ lint ด้วย ESLint |
| `npm test` | รัน unit/smoke test ด้วย Vitest |
| `npm run db:deploy` | ใช้ migrations กับฐานข้อมูล (production) |
| `npm run db:push` | sync schema โดยตรง `prisma db push` (dev) |

## Role / สิทธิ์

| Role | ความสามารถ |
| ---- | ---------- |
| ADMIN | ทุกอย่าง รวมถึงจัดการผู้ใช้ในหน้า `/admin` |
| EDITOR | แก้ไข / เพิ่ม / ลบข้อมูล (rooms, locations, floorplan, engineering) |
| VIEWER | ดูข้อมูลได้อย่างเดียว |

การยืนยันสิทธิ์ทำแบบ layered: `src/proxy.ts` ตรวจว่า logged-in (redirect ไป `/login` ถ้าไม่) และ guard อีกชั้นใน server components / server actions (`auth.api.getSession`) ทุกครั้ง

## Production Deployment

```bash
# ตั้ง env จริง (DB URL ฝั่ง production, BETTER_AUTH_SECRET, BETTER_AUTH_URL ตามโดเมน)
# ตรวจสอบให้ครบก่อน build:
npm run lint
npm test
npm run build

# สร้าง/build สคีมาฐานข้อมูลด้วย migrations
npm run db:deploy

# Build Docker image (output standalone)
docker build -t cls-facility-center .
docker run -p 3000:3000 --env-file .env cls-facility-center
```

หมายเหตุ:
- `.env.example` เป็น template ตัวจริง — ห้ามใส่ secrets จริงในไฟล์ที่ commit ขึ้น repo
- `next.config.ts` ตั้ง `output: "standalone"` เพื่อให้ Dockerfile สร้าง standalone build ได้
- ถ้ามีการเปลี่ยน `schema.prisma` ให้สร้าง migration ด้วย `npx prisma migrate dev` แล้ว commit ไฟล์ migration ไว้เสมอ

## ความปลอดภัย

- เปลี่ยน `BETTER_AUTH_SECRET` เป็นค่าสุ่มยาว (เช่น `openssl rand -base64 32`) ก่อนขึ้น production
- ไม่ commit `.env`, secrets หรือ credential จริงลง git
- Production ควรใช้ HTTPS และตั้ง `BETTER_AUTH_URL` ให้ตรงกับโดเมนจริง