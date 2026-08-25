import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export const instant = false;

export const metadata = { title: "ระบบวิศวกรรม" };

export default async function EngineeringPage() {
  return (
    <div className="mx-auto max-w-(--breakpoint-xl) px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">ระบบวิศวกรรม</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" /> กำลังพัฒนา (Phase 4)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            หน้ารวมอุปกรณ์ Power System (13 รายการ) และ Precision Air Conditioning
            (17 รายการ) พร้อมสถานะ &ldquo;แจ้งเตือน&rdquo; และหน้าใบรับรองมาตรฐาน
            (7 ใบ) ที่มี badge นับถอยหลังวันหมดอายุ
          </p>
          <p className="mt-2">
            ข้อมูลถูก import เรียบร้อยแล้วในตาราง{" "}
            <code className="font-mono">Asset</code> และ{" "}
            <code className="font-mono">Certificate</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
