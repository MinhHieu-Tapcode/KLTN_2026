"use client";

import React, { useState, useTransition } from "react";
import { Layers, Loader2, Lock, Sliders } from "lucide-react";
import { RoleCode } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { changePasswordAction } from "@/actions/auth";
import { updateProfileAction } from "@/actions/users";
import { Field, InfoCard } from "@/components/shared/common-widgets";
import { RbacMatrixSection, ROLES_LIST } from "@/components/settings/rbac-matrix-section";
import {
  IeltsAllocationSection,
  IeltsLevelsSection,
} from "@/components/settings/ielts-config-section";

export function SettingsPageView({
  currentUser,
  users = [],
  permissions,
  onRefreshPermissions,
  onProfileUpdated,
  ieltsLevels = [],
  onRefreshLevels = () => {},
}: {
  currentUser: any;
  users?: any[];
  permissions: any[];
  onRefreshPermissions: () => void;
  onProfileUpdated: (updated?: any) => void;
  ieltsLevels?: any[];
  onRefreshLevels?: () => void;
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

  const canManageSettings =
    (currentUser?.role === "ADMIN" || activeUser?.role?.code === "ADMIN") ||
    permissions.some(
      (p) =>
        p.featureKey === "SYSTEM_SETTINGS" &&
        p.allowedRoles?.includes((currentUser?.role || activeUser?.role?.code) as RoleCode)
    );

  const [tab, setTab] = useState<"profile" | "matrix" | "ielts-levels" | "ielts-allocation" | "system">(
    canManageSettings ? "matrix" : "profile"
  );
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
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-[#E2E8F0] pb-3">
        {canManageSettings && (
          <button
            onClick={() => setTab("matrix")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === "matrix"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            Ma trận phân quyền (Dynamic RBAC)
          </button>
        )}
        {canManageSettings && (
          <button
            onClick={() => setTab("ielts-levels")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
              tab === "ielts-levels"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            <Layers className="size-4" /> Cấu hình trình độ IELTS
          </button>
        )}
        {canManageSettings && (
          <button
            onClick={() => setTab("ielts-allocation")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
              tab === "ielts-allocation"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            <Sliders className="size-4" /> Cấu hình phân lớp IELTS
          </button>
        )}
        <button
          onClick={() => setTab("profile")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
            tab === "profile"
              ? "bg-[#EA580C] text-white shadow-sm"
              : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
          }`}
        >
          Hồ sơ của tôi
        </button>
        {canManageSettings && (
          <button
            onClick={() => setTab("system")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === "system"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]"
            }`}
          >
            Thông tin hệ thống
          </button>
        )}
      </div>

      {canManageSettings && tab === "matrix" && (
        <RbacMatrixSection
          permissions={permissions}
          onRefreshPermissions={onRefreshPermissions}
        />
      )}

      {canManageSettings && tab === "ielts-levels" && (
        <IeltsLevelsSection
          ieltsLevels={ieltsLevels}
          onRefreshLevels={onRefreshLevels}
        />
      )}

      {canManageSettings && tab === "ielts-allocation" && (
        <IeltsAllocationSection
          ieltsLevels={ieltsLevels}
          onRefreshLevels={onRefreshLevels}
        />
      )}

      {tab === "profile" && (
        <div className="space-y-6 max-w-3xl">
          <div className="rounded-2xl border border-orange-200 bg-[#FFF7ED] p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <span className="text-xs font-bold text-[#EA580C] uppercase tracking-wider block">
                Vai trò tài khoản (Role)
              </span>
              <b className="text-base text-[#0F172A] mt-0.5 block">
                {ROLES_LIST.find((r) => r.code === currentUser.role)?.label || currentUser.role} ({currentUser.role})
              </b>
              <span className="text-xs text-[#64748B]">
                Vai trò được quản lý theo cấu trúc RBAC để phân quyền chức năng và dữ liệu.
              </span>
            </div>
            <span className="px-3.5 py-1.5 bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-sm">
              Đang hoạt động
            </span>
          </div>

          <section className="panel">
            <h2 className="font-bold text-base text-[#0F172A] mb-1">Thông tin hồ sơ cá nhân</h2>
            <p className="text-xs text-[#64748B] mb-4">
              Cập nhật họ và tên thật, tên đăng nhập và các thông tin liên lạc cá nhân.
            </p>

            {profileMsg && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl font-medium border border-emerald-200">
                {profileMsg}
              </div>
            )}
            {profileError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-200">
                {profileError}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="fullName"
                  label="Họ và tên *"
                  defaultValue={activeUser?.profile?.fullName || activeUser?.fullName || currentUser?.fullName || ""}
                  placeholder="Nhập họ và tên thật"
                  required
                />
                <div>
                  <label className="text-sm font-semibold text-[#0F172A] flex items-center gap-1.5 mb-2">
                    <Lock className="size-3.5 text-[#94A3B8]" />
                    Tên đăng nhập / Mã tài khoản (Cố định)
                  </label>
                  <input
                    disabled
                    readOnly
                    value={currentUsername}
                    className="field bg-slate-100 text-[#0F172A] font-bold cursor-not-allowed font-mono"
                    title="Mã định danh tài khoản được cố định bởi hệ thống và không thể thay đổi."
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Mã định danh duy nhất do hệ thống quản lý (Không thể sửa)
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Field
                    name="email"
                    type="email"
                    label="Địa chỉ Email *"
                    defaultValue={activeUser?.email || currentUser?.email || ""}
                    placeholder="name@simpace.edu.vn"
                    required
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">
                    Hệ thống hỗ trợ cập nhật Email khi bạn cần đổi hòm thư nhận thông báo &amp; bảo mật.
                  </p>
                </div>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="dateOfBirth"
                  label="Ngày sinh"
                  type="date"
                  defaultValue={
                    activeUser?.profile?.dateOfBirth
                      ? new Date(activeUser.profile.dateOfBirth).toISOString().split("T")[0]
                      : currentUser?.dateOfBirth
                      ? new Date(currentUser.dateOfBirth).toISOString().split("T")[0]
                      : ""
                  }
                />
                <label className="block text-sm font-semibold text-[#0F172A]">
                  Giới tính
                  <select
                    name="gender"
                    className="field mt-2"
                    defaultValue={activeUser?.profile?.gender || currentUser?.gender || "MALE"}
                  >
                    <option value="MALE">Nam</option>
                    <option value="FEMALE">Nữ</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white rounded-xl shadow-sm">
                  {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Lưu thông tin hồ sơ
                </Button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="border-b border-[#E2E8F0] pb-3 mb-4">
              <h2 className="font-bold text-base text-[#0F172A]">Bảo mật & Đổi mật khẩu</h2>
              <p className="text-xs text-[#64748B]">
                Đổi mật khẩu tài khoản trực tiếp để bảo vệ quyền truy cập và dữ liệu học tập.
              </p>
            </div>

            {passMsg && (
              <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl font-medium border border-emerald-200">
                {passMsg}
              </div>
            )}
            {passError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-200">
                {passError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <label className="block text-sm font-semibold text-[#0F172A]">
                Mật khẩu hiện tại *
                <input
                  type="password"
                  value={passCurrent}
                  onChange={(e) => setPassCurrent(e.target.value)}
                  className="field mt-2"
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-[#0F172A]">
                Mật khẩu mới *
                <input
                  type="password"
                  value={passNew}
                  onChange={(e) => setPassNew(e.target.value)}
                  className="field mt-2"
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </label>

              <label className="block text-sm font-semibold text-[#0F172A]">
                Xác nhận mật khẩu mới *
                <input
                  type="password"
                  value={passConfirm}
                  onChange={(e) => setPassConfirm(e.target.value)}
                  className="field mt-2"
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </label>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={passPending}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-xl shadow-sm"
                >
                  {passPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Cập nhật mật khẩu mới
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

      {canManageSettings && tab === "system" && (
        <div className="grid max-w-4xl gap-5 md:grid-cols-2">
          <InfoCard
            title="Thông tin hệ thống"
            items={[
              "Tên phần mềm: SIMPACE LMS",
              "Phiên bản: Sprint 1.0 (Full-stack Next.js 14)",
              "Cơ sở dữ liệu: Supabase PostgreSQL (10 bảng)",
              "Ngôn ngữ: 100% TypeScript + Tiếng Việt",
            ]}
          />
          <InfoCard
            title="Bảo mật & Phiên làm việc"
            items={[
              "Băm mật khẩu: Bcrypt (Salt rounds = 10)",
              "Đổi mật khẩu lần đầu: Bắt buộc (mustChangePassword)",
              "Phiên làm việc: JWT Cookie httpOnly, Secure",
              "Phân quyền: Ma trận Dynamic RBAC lưu CSDL",
            ]}
          />
        </div>
      )}
    </div>
  );
}
