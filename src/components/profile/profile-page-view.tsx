"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Lock, Shield, UserRound, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "@/actions/auth";
import { updateProfileAction } from "@/actions/users";
import { Field } from "@/components/shared/common-widgets";
import { ROLES_LIST } from "@/components/settings/rbac-matrix-section";

export function ProfilePageView({
  currentUser,
  users = [],
  onProfileUpdated,
}: {
  currentUser: any;
  users?: any[];
  onProfileUpdated: (updated?: any) => void;
}) {
  const activeUser =
    users.find(
      (u) =>
        u.id === currentUser?.userId ||
        u.id === currentUser?.id ||
        (currentUser?.username && u.username === currentUser?.username)
    ) || currentUser;

  const currentUsername =
    activeUser?.username || currentUser?.username || activeUser?.email?.split("@")[0] || "";

  const [isPending, startTransition] = useTransition();
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passCurrent, setPassCurrent] = useState("");
  const [passNew, setPassNew] = useState("");
  const [passConfirm, setPassConfirm] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passError, setPassError] = useState("");
  const [passPending, setPassPending] = useState(false);

  const handleSaveProfile = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileError("");
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName")?.toString() || "";
    const email = formData.get("email")?.toString()?.trim() || "";
    const address = formData.get("address")?.toString() || "";

    const targetUserId = currentUser?.userId || currentUser?.id || activeUser?.id;
    startTransition(async () => {
      const res = await updateProfileAction(targetUserId, {
        fullName,
        email,
        address,
        phoneNumber: formData.get("phoneNumber")?.toString(),
        dateOfBirth: formData.get("dateOfBirth")?.toString(),
        gender: formData.get("gender")?.toString() as any,
      });

      if (!res.success) {
        setProfileError(res.error || "Không thể cập nhật hồ sơ!");
        return;
      }

      setProfileMsg("Đã cập nhật thông tin hồ sơ và địa chỉ Email thành công!");
      onProfileUpdated({
        fullName,
        email,
        address,
      });
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg("");
    setPassError("");

    if (!passCurrent || !passNew) {
      setPassError("Vui lòng điền đầy đủ mật khẩu!");
      return;
    }
    if (passNew !== passConfirm) {
      setPassError("Mật khẩu mới và xác nhận mật khẩu không khớp!");
      return;
    }
    if (passNew.length < 6) {
      setPassError("Mật khẩu mới phải có tối thiểu 6 ký tự!");
      return;
    }

    setPassPending(true);
    try {
      const res = await changePasswordAction(currentUser.userId, passCurrent, passNew);
      if (!res.success) {
        setPassError(res.error || "Không thể đổi mật khẩu!");
      } else {
        setPassMsg("Đã đổi mật khẩu thành công!");
        setPassCurrent("");
        setPassNew("");
        setPassConfirm("");
      }
    } catch (err: any) {
      setPassError(err.message || "Lỗi khi đổi mật khẩu!");
    } finally {
      setPassPending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Role Card */}
      <div className="rounded-2xl border border-orange-200 bg-[#FFF7ED] p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#EA580C] text-white shadow-md">
            <Shield className="size-6" />
          </span>
          <div>
            <span className="text-xs font-bold text-[#EA580C] uppercase tracking-wider block">
              Vai trò tài khoản (Role)
            </span>
            <b className="text-lg text-[#0F172A] mt-0.5 block">
              {ROLES_LIST.find((r) => r.code === currentUser.role)?.label || currentUser.role} ({currentUser.role})
            </b>
            <span className="text-xs text-[#64748B]">
              Tài khoản được phân quyền theo ma trận Dynamic RBAC của hệ thống LMS SIMPACE.
            </span>
          </div>
        </div>
        <span className="px-4 py-1.5 bg-[#EA580C] text-white text-xs font-bold rounded-full shadow-sm">
          Đang hoạt động
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Form Hồ sơ cá nhân */}
        <section className="panel space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3">
            <UserRound className="size-5 text-[#EA580C]" />
            <div>
              <h2 className="font-bold text-base text-[#0F172A]">Thông tin hồ sơ cá nhân</h2>
              <p className="text-xs text-[#64748B]">
                Cập nhật họ tên, địa chỉ email và thông tin liên lạc.
              </p>
            </div>
          </div>

          {profileMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium border border-emerald-200">
              {profileMsg}
            </div>
          )}
          {profileError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-200">
              {profileError}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field
                name="fullName"
                label="Họ và tên *"
                defaultValue={activeUser?.profile?.fullName || activeUser?.fullName || currentUser?.fullName || ""}
                placeholder="Nhập họ và tên thật"
                required
              />
              <div>
                <label className="text-xs font-semibold text-[#0F172A] flex items-center gap-1.5 mb-1.5">
                  <Lock className="size-3 text-[#94A3B8]" />
                  Tên đăng nhập (Cố định)
                </label>
                <input
                  disabled
                  readOnly
                  value={currentUsername}
                  className="field bg-slate-100 text-[#0F172A] font-bold cursor-not-allowed font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field
                name="email"
                type="email"
                label="Địa chỉ Email *"
                defaultValue={activeUser?.email || currentUser?.email || ""}
                placeholder="name@simpace.edu.vn"
                required
              />
              <Field
                name="phoneNumber"
                label="Số điện thoại"
                placeholder="0987xxxxxx"
                defaultValue={activeUser?.profile?.phoneNumber || activeUser?.phoneNumber || currentUser?.phoneNumber || ""}
              />
            </div>

            <Field
              name="address"
              label="Địa chỉ cư trú"
              placeholder="VD: 123 Giải Phóng, Hai Bà Trưng, Hà Nội"
              defaultValue={activeUser?.profile?.address || activeUser?.address || currentUser?.address || ""}
            />

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl shadow-sm text-xs font-bold px-5"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null} Lưu thay đổi hồ sơ
              </Button>
            </div>
          </form>
        </section>

        {/* Form Đổi mật khẩu */}
        <section className="panel space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#F1F5F9] pb-3">
            <KeyRound className="size-5 text-[#EA580C]" />
            <div>
              <h2 className="font-bold text-base text-[#0F172A]">Đổi mật khẩu bảo vệ</h2>
              <p className="text-xs text-[#64748B]">
                Tăng cường bảo mật cho phiên đăng nhập của bạn.
              </p>
            </div>
          </div>

          {passMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium border border-emerald-200">
              {passMsg}
            </div>
          )}
          {passError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-200">
              {passError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
            <label className="block font-semibold text-[#0F172A]">
              Mật khẩu hiện tại *
              <input
                type="password"
                value={passCurrent}
                onChange={(e) => setPassCurrent(e.target.value)}
                className="field mt-1.5"
                placeholder="Nhập mật khẩu đang dùng"
                required
              />
            </label>

            <label className="block font-semibold text-[#0F172A]">
              Mật khẩu mới *
              <input
                type="password"
                value={passNew}
                onChange={(e) => setPassNew(e.target.value)}
                className="field mt-1.5"
                placeholder="Tối thiểu 6 ký tự"
                required
              />
            </label>

            <label className="block font-semibold text-[#0F172A]">
              Xác nhận mật khẩu mới *
              <input
                type="password"
                value={passConfirm}
                onChange={(e) => setPassConfirm(e.target.value)}
                className="field mt-1.5"
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </label>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={passPending}
                className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl shadow-sm text-xs font-bold px-5"
              >
                {passPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null} Đổi mật khẩu
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
