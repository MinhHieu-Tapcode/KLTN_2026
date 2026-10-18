"use client";

import React, { useRef, useState, useTransition } from "react";
import { CircleCheck, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loginAction,
  requestPasswordResetOtpAction,
  resetPasswordWithOtpAction,
} from "@/actions/auth";
import { ActivateView } from "@/components/auth/activate-view";
import { SimpaceLogo } from "@/components/logo";

export function LoginView({ onLoggedIn }: { onLoggedIn: (user: any) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("simpace2026");
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [activationData, setActivationData] = useState<any>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.success) {
        setErrorMsg(result.error || "Đăng nhập thất bại!");
        setPassword("");
        passwordInputRef.current?.focus();
        return;
      }

      if (result.mustChangePassword) {
        setActivationData(result);
      } else {
        onLoggedIn(result.user || { fullName: "Quản trị viên", role: result.role });
      }
    });
  };

  if (activationData) {
    return (
      <ActivateView
        userId={activationData.userId}
        fullName={activationData.fullName}
        email={activationData.email}
        role={activationData.role}
        onComplete={(user) => {
          onLoggedIn(
            user || {
              fullName: activationData.fullName,
              role: activationData.role || "STUDENT",
            }
          );
        }}
        onCancel={() => setActivationData(null)}
      />
    );
  }

  return (
    <div className="grid min-h-screen bg-[#F8F9FA] lg:grid-cols-[1fr_1.05fr]">
      <section className="flex flex-col justify-center px-7 py-10 sm:px-16 lg:px-[12vw]">
        <SimpaceLogo className="mb-8 h-12 w-auto max-w-[220px]" />
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">Chào mừng trở lại</h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Đăng nhập để tiếp tục truy cập hệ thống LMS SIMPACE
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold text-[#0F172A]">
              Email hoặc mã học viên
              <input
                name="identifier"
                required
                className="field mt-2"
                placeholder="Nhập email hoặc mã học viên của bạn"
                defaultValue="admin@simpace.vn"
              />
            </label>
            <label className="block text-sm font-semibold text-[#0F172A]">
              Mật khẩu
              <div className="relative mt-2">
                <input
                  ref={passwordInputRef}
                  name="password"
                  required
                  className="field pr-11"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F172A]"
                  aria-label="Hiện mật khẩu"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>

            <Button
              className="mt-6 w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20"
              size="lg"
              type="submit"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="font-semibold text-primary hover:underline"
            >
              Quên mật khẩu?
            </button>
          </div>

          <div className="mt-8 border-t border-[#E2E8F0] pt-4">
            <p className="text-xs text-[#94A3B8]">
              Tài khoản mẫu: <b>admin@simpace.vn</b> • Mật khẩu: <b>simpace2026</b>
            </p>
          </div>
        </div>
      </section>

      <section className="login-visual hidden min-h-screen overflow-hidden lg:flex">
        <div className="relative z-10 mt-auto p-16">
          <h2 className="max-w-sm text-3xl font-extrabold leading-snug text-[#0F172A]">
            Cùng SIMPACE
            <br />
            kiến tạo hành trình học tập
            <br />
            không giới hạn
          </h2>
          <p className="mt-3 text-sm text-[#475569] max-w-sm">
            Hệ thống đào tạo IELTS, SAT và Cambridge tại hơn 17 trường THPT đối tác.
          </p>
        </div>
      </section>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    startTransition(async () => {
      const res = await requestPasswordResetOtpAction(email);
      if (!res.success) {
        setErr(res.error || "Lỗi gửi mã OTP!");
      } else {
        setStep(2);
        setMsg("Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư và nhập mã để đổi mật khẩu.");
      }
    });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    startTransition(async () => {
      const res = await resetPasswordWithOtpAction(email, otp, newPass);
      if (!res.success) {
        setErr(res.error || "Không thể đặt lại mật khẩu!");
      } else {
        setStep(3);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-primary" /> Khôi phục mật khẩu
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Nhập email của bạn để nhận mã OTP khôi phục tài khoản."
              : step === 2
              ? "Nhập mã OTP vừa nhận được và mật khẩu mới của bạn."
              : "Mật khẩu của bạn đã được cập nhật thành công."}
          </DialogDescription>
        </DialogHeader>

        {err && <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg">{err}</div>}
        {msg && <div className="p-3 text-sm bg-amber-50 text-amber-700 rounded-lg">{msg}</div>}

        {step === 3 ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CircleCheck className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Đặt lại mật khẩu thành công!</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.
              </p>
            </div>
            <Button
              onClick={() => {
                onOpenChange(false);
                setStep(1);
              }}
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              Quay lại đăng nhập
            </Button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4 mt-2">
            <label className="block text-sm font-semibold">
              Địa chỉ Email
              <input
                type="email"
                required
                className="field mt-2"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
                {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Gửi mã OTP
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 mt-2">
            <label className="block text-sm font-semibold">
              Mã xác thực OTP (6 chữ số)
              <input
                required
                className="field mt-2"
                placeholder="Nhập mã OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </label>
            <label className="block text-sm font-semibold">
              Mật khẩu mới
              <input
                type="password"
                required
                className="field mt-2"
                placeholder="Tối thiểu 6 ký tự"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Quay lại
              </Button>
              <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-white">
                {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Xác nhận đổi
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
