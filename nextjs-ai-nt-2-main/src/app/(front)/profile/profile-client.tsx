"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import {
  nameSchema,
  passwordSchema,
  type NameFormValues,
  type PasswordFormValues,
} from "@/lib/profile-schemas";
import { translateProfileError } from "@/lib/profile-errors";
import type { SerializedProfileUser } from "./page";

type Props = {
  user: SerializedProfileUser;
};

const ROLE_META: Record<string, { label: string; badge: string }> = {
  ADMIN: { label: "Admin", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  EDITOR: { label: "Editor", badge: "bg-sky-100 text-sky-800 border-sky-200" },
  VIEWER: { label: "Viewer", badge: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default function ProfileClient({ user }: Props) {
  const router = useRouter();
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const roleMeta = ROLE_META[user.role] ?? ROLE_META.VIEWER;

  const nameForm = useForm<NameFormValues>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      name: user.name,
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmitName(data: NameFormValues) {
    setNameError(null);
    setNameSuccess(null);
    await authClient.updateUser(
      { name: data.name },
      {
        onSuccess: () => {
          setNameSuccess("อัปเดตชื่อสำเร็จ");
          router.refresh();
        },
        onError: (ctx) => {
          setNameError(translateProfileError(ctx));
        },
      }
    );
  }

  async function onSubmitPassword(data: PasswordFormValues) {
    setPasswordError(null);
    setPasswordSuccess(null);
    await authClient.changePassword(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: true,
      },
      {
        onSuccess: () => {
          setPasswordSuccess("เปลี่ยนรหัสผ่านสำเร็จ");
          passwordForm.reset();
        },
        onError: (ctx) => {
          setPasswordError(translateProfileError(ctx));
        },
      }
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-5 text-primary" /> ข้อมูลส่วนตัว
            </CardTitle>
            <CardDescription>
              ข้อมูลบัญชีผู้ใช้ของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <UserRound className="size-4" /> ชื่อ
              </p>
              <p className="text-lg font-semibold">{user.name}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-4" /> อีเมล
              </p>
              <p className="font-mono text-sm">{user.email}</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ShieldCheck className="size-4" /> สิทธิ์
              </p>
              <Badge className={`mt-1 border ${roleMeta.badge}`}>
                {roleMeta.label}
              </Badge>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" /> ยืนยันอีเมล
              </p>
              {user.emailVerified ? (
                <Badge variant="outline" className="mt-1">
                  ยืนยันแล้ว
                </Badge>
              ) : (
                <Badge variant="secondary" className="mt-1">
                  ยังไม่ยืนยัน
                </Badge>
              )}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4" /> สมัครสมาชิกเมื่อ
              </p>
              <p className="text-sm">
                {new Date(user.createdAt).toLocaleDateString("th-TH")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-5 text-primary" /> แก้ไขชื่อ
            </CardTitle>
            <CardDescription>อัปเดตชื่อที่แสดงในระบบ</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="form-name" onSubmit={nameForm.handleSubmit(onSubmitName)}>
              <FieldGroup>
                <Controller
                  name="name"
                  control={nameForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="form-name-name">ชื่อ</FieldLabel>
                      <Input
                        {...field}
                        id="form-name-name"
                        type="text"
                        aria-invalid={fieldState.invalid}
                        placeholder="สมชาย ใจดี"
                        autoComplete="name"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Button type="submit" form="form-name">
              บันทึกชื่อ
            </Button>
            {(nameError || nameSuccess) && (
              <p
                className={`text-sm font-medium ${
                  nameSuccess ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {nameSuccess ?? nameError}
              </p>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-5 text-primary" /> เปลี่ยนรหัสผ่าน
            </CardTitle>
            <CardDescription>
              เปลี่ยนรหัสผ่านเพื่อความปลอดภัยของบัญชี
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              id="form-password"
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            >
              <FieldGroup>
                <Controller
                  name="currentPassword"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="form-password-current">
                        รหัสผ่านปัจจุบัน
                      </FieldLabel>
                      <Input
                        {...field}
                        id="form-password-current"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="newPassword"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="form-password-new">
                        รหัสผ่านใหม่
                      </FieldLabel>
                      <Input
                        {...field}
                        id="form-password-new"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={passwordForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="form-password-confirm">
                        ยืนยันรหัสผ่านใหม่
                      </FieldLabel>
                      <Input
                        {...field}
                        id="form-password-confirm"
                        type="password"
                        aria-invalid={fieldState.invalid}
                        placeholder="••••••••"
                        autoComplete="new-password"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2">
            <Button type="submit" form="form-password">
              เปลี่ยนรหัสผ่าน
            </Button>
            {(passwordError || passwordSuccess) && (
              <p
                className={`text-sm font-medium ${
                  passwordSuccess ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {passwordSuccess ?? passwordError}
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}