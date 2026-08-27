import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { NavMenu } from "@/components/nav-menu";
import { NavigationSheet } from "@/components/navigation-sheet";
import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import LogoutButton from "./logout-button";

const Navbar = async () => {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  let isAdmin = false;
  if (session?.user?.id) {
    const user = await prisma.user
      .findUnique({ where: { id: session.user.id }, select: { role: true } })
      .catch(() => null);
    isAdmin = user?.role === "ADMIN";
  }

  return (
    <header className="sticky top-0 z-40 h-16 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-(--breakpoint-xl) items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <NavMenu className="hidden md:block" isAdmin={isAdmin} />

        <div className="flex items-center gap-3">
          {!session && (
            <Button asChild>
              <Link href="/login">เข้าสู่ระบบ</Link>
            </Button>
          )}

          {session && (
            <>
              <div className="mr-2 hidden items-center sm:flex">
                สวัสดี, {session.user.name}
              </div>
              <LogoutButton />
            </>
          )}

          <div className="md:hidden">
            <NavigationSheet isAdmin={isAdmin} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
