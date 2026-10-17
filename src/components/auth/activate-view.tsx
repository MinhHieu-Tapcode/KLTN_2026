"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, CircleCheck, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activateWithOtpAction, requestActivationOtpAction } from "@/actions/auth";

export function ActivateView({
  userId,
  fullName,
  email,
  role,
  onComplete,
  onCancel,
}: {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  onComplete: (user: any) => void;
  onCancel?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState(0);
  const hasRequestedOtpRef = useRef(false);

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setErrorMsg("");
    try {
      const res = await requestActivationOtpAction(userId);
      if (res.success) {
        setCountdown(60);
      } else {
        setErrorMsg(res.error || "Không thể gửi mã OTP!");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi hệ thống khi gửi OTP!");
    } finally {
      setIsSendingOtp(false);
    }
  };

  useEffect(() => {
    if (hasRequestedOtpRef.current) return;
    hasRequestedOtpRef.current = true;
    handleSendOtp();
  }, [userId]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (!otp.trim()) {
      setErrorMsg("Vui lòng nhập mã OTP xác thực!");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Mật khẩu mới phải có tối thiểu 6 ký tự!");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }

    startTransition(async () => {
      const res = await activateWithOtpAction({
        userId,
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể kích hoạt tài khoản!");
        return;
      }

      setSuccessMsg("Kích hoạt tài khoản thành công! Đang chuyển hướng vào hệ thống...");
      setTimeout(() => {
        onComplete(res.user);
      }, 700);
    });
  };

  return (
    <div className="grid min-h-screen bg-[#F8F9FA] lg:grid-cols-[.82fr_1fr]">
      <aside className="activation-visual hidden flex-col justify-between p-12 lg:flex">
        <img src="/logo.png" alt="SIMPACE" className="h-12 w-auto max-w-[220px] object-contain" />
        <h2 className="text-4xl font-extrabold leading-tight text-[#0F172A]">
          Kiến tạo
          <br />
          năng lực,
          <br />
          mở lối tương lai
        </h2>
        <p className="text-sm text-[#64748B]">© 2026 SIMPACE Việt Nam LMS.</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <p className="font-bold text-[#EA580C] text-xs uppercase tracking-wider">SIMPACE LMS</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#0F172A]">
            Kích hoạt tài khoản &amp;<br />Đổi mật khẩu mới
          </h1>

          <div className="my-5 rounded-xl border border-orange-200 bg-[#FFF7ED] p-4 text-sm text-[#9A3412] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#EA580C]">
              <Mail className="size-4 shrink-0" />
              <span>Xác thực OTP qua Email</span>
            </div>
            <p className="text-xs text-[#7C2D12] leading-relaxed">
              Xin chào <b>{fullName}</b>! Mã xác thực 6 chữ số đã được gửi đến email: <b>{email}</b>. Vui lòng kiểm tra hòm thư đến hoặc thư rác.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
              <CircleCheck className="size-5 shrink-0" />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#0F172A]">
                Mã OTP xác thực (6 chữ số) *
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  className="field font-mono text-center text-lg tracking-widest uppercase font-bold"
                  placeholder="------"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendOtp}
                  disabled={countdown > 0 || isSendingOtp}
                  className="shrink-0 text-xs h-10 px-3"
                >
                  {isSendingOtp ? (
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                  ) : null}
                  {countdown > 0 ? `Gửi lại (${countdown}s)` : "Gửi lại OTP"}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A]">
                Mật khẩu mới *
              </label>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="field pr-10"
                  placeholder="Tối thiểu 6 ký tự"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A]">
                Xác nhận mật khẩu mới *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="field mt-2"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>

            <Button
              className="w-full mt-4 h-11 bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl font-bold"
              size="lg"
              type="submit"
              disabled={isPending || !!successMsg}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Đang kích hoạt...
                </>
              ) : (
                <>
                  Kích hoạt & Đăng nhập ngay <ChevronRight className="ml-1 size-4" />
                </>
              )}
            </Button>

            {onCancel && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] underline"
                >
                  Quay lại màn hình đăng nhập
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
