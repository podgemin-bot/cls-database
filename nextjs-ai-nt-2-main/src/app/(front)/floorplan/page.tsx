import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export const instant = true;

export const metadata = { title: "ผังชั้น" };

export default function FloorPlanPage() {
  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">ผังชั้นแบบโต้ตอบ</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="size-5 text-primary" /> กำลังพัฒนา (Phase 3)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            หน้าผังชั้นแบบโต้ตอบ พร้อมหมุดสีตามสถานะห้อง
            และโหมด Pin Editor สำหรับ admin วางหมุดบนผัง — ข้อมูลพิกัด X/Y
            ปัจจุบันยังว่างอยู่ในตาราง <code className="font-mono">PhotoPoint</code>
          </p>
          <p className="mt-2">
            ไฟล์ผังชั้นทั้ง 7 ชั้นพร้อมใช้แล้วที่{" "}
            <code className="font-mono">/storage/plans/</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
