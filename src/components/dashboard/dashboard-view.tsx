"use client";

import React from "react";
import { Building2, CalendarDays, GraduationCap, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { View } from "@/components/simpace-app";

export function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
        active
          ? "bg-[#EA580C] text-white shadow-md shadow-[#EA580C]/25"
          : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
      }`}
    >
      <Icon className="size-4.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function DashboardView({
  navigate,
  usersCount,
  schoolsCount,
  classesCount,
  currentUser,
  classes = [],
}: {
  navigate: (v: View) => void;
  usersCount: number;
  schoolsCount: number;
  classesCount: number;
  currentUser?: any;
  classes?: any[];
}) {
  const currentUid = currentUser?.userId || currentUser?.id;

  if (currentUser?.role === "STUDENT") {
    const myClasses = classes.filter(
      (c) =>
        c.isActive &&
        c.enrollments?.some(
          (e: any) =>
            e.studentId === currentUid ||
            e.student?.id === currentUid ||
            e.student?.username === currentUser?.username
        )
    );

    const activeSchoolName = myClasses[0]?.school?.name || "SIMPACE Việt Nam";

    const studentStats = [
      [GraduationCap, "Lớp học của tôi", `${myClasses.length} lớp`, "Đang diễn ra", "schedule"],
      [CalendarDays, "Thời khóa biểu tuần", `${myClasses.filter((c) => c.description).length} ca/tuần`, "Đúng tiến độ", "schedule"],
      [Building2, "Trường liên kết", activeSchoolName, "Đối tác", "schedule"],
      [UserRound, "Tài khoản học viên", currentUser?.fullName || "Học viên", "Hoạt động", "settings"],
    ] as const;

    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {studentStats.map(([Icon, label, value, tag, dest]) => (
            <button
              key={label}
              onClick={() => navigate(dest as View)}
              className="panel text-left transition hover:-translate-y-0.5 hover:border-[#EA580C]/30 group"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-[#FFF1EB] text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white transition">
                <Icon className="size-5.5" />
              </span>
              <p className="mt-4 text-sm text-[#64748B] font-medium">{label}</p>
              <b className="mt-1 block text-2xl font-extrabold text-[#0F172A] truncate">{value}</b>
              <small className="font-semibold text-emerald-600">● {tag}</small>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <section className="panel">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="font-bold text-base text-[#0F172A]">Lớp học đang theo học</h2>
                <p className="text-xs text-[#64748B]">Danh sách lớp học và thời khóa biểu cá nhân của bạn</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("schedule")}
                className="text-xs font-semibold text-[#EA580C] hover:bg-orange-50"
              >
                Xem thời khóa biểu tuần →
              </Button>
            </div>

            {myClasses.length > 0 ? (
              <div className="space-y-3">
                {myClasses.map((cls) => {
                  const teacher = cls.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.staff?.profile?.fullName;

                  return (
                    <div
                      key={cls.id}
                      className="rounded-2xl border border-orange-200/90 bg-[#FFF7ED]/30 p-4 hover:border-[#EA580C] transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#EA580C] bg-orange-100 px-2 py-0.5 rounded">
                          {cls.code}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Đang theo học
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-[#0F172A] mt-2">{cls.name}</h3>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 text-[#475569]">
                        <div><b>Trường:</b> {cls.school?.name}</div>
                        <div><b>Lịch học:</b> <span className="text-[#EA580C] font-semibold">{cls.description || "Chưa xếp lịch"}</span></div>
                        <div className="sm:col-span-2"><b>Giáo viên:</b> {teacher || "Đang cập nhật"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-sm text-[#94A3B8] italic">
                Bạn chưa được ghi danh vào lớp học nào. Vui lòng liên hệ Quản nhiệm trường hoặc Admin để được hỗ trợ.
              </div>
            )}
          </section>

          <section className="panel space-y-4">
            <h2 className="font-bold text-base text-[#0F172A]">Thông tin học viên</h2>
            <div className="rounded-xl border border-[#E2E8F0] p-4 bg-[#F8FAFC] space-y-2 text-xs">
              <div><span className="text-[#64748B]">Mã học viên:</span> <b className="font-mono ml-1 text-[#0F172A]">{currentUser.username}</b></div>
              <div><span className="text-[#64748B]">Họ và tên:</span> <b className="ml-1 text-[#0F172A]">{currentUser.fullName}</b></div>
              <div><span className="text-[#64748B]">Email:</span> <b className="ml-1 text-[#0F172A]">{currentUser.email}</b></div>
              <div><span className="text-[#64748B]">Vai trò:</span> <span className="ml-1 font-bold text-[#EA580C]">Học viên (STUDENT)</span></div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-800 space-y-1.5">
              <b className="block font-bold">💡 Lưu ý học tập:</b>
              <p>Học viên vui lòng theo dõi thời khóa biểu hàng tuần, tham gia đầy đủ các buổi học và hoàn thành bài tập đúng hạn để đảm bảo kết quả cam kết đầu ra.</p>
            </div>
          </section>
        </div>
      </>
    );
  }

  const stats = [
    [UserRound, "Người dùng", usersCount.toLocaleString("vi-VN"), "+12%", "users"],
    [Building2, "Trường học", schoolsCount.toLocaleString("vi-VN"), "+2 trường", "schools"],
    [GraduationCap, "Lớp học", classesCount.toLocaleString("vi-VN"), "+18%", "classes"],
    [CalendarDays, "Lịch giảng dạy", "538 buổi", "+26%", "schedule"],
  ] as const;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([Icon, label, value, trend, dest]) => (
          <button
            key={label}
            onClick={() => navigate(dest as View)}
            className="panel text-left transition hover:-translate-y-0.5 hover:border-[#EA580C]/30 group"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-[#FFF1EB] text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white transition">
              <Icon className="size-5.5" />
            </span>
            <p className="mt-4 text-sm text-[#64748B] font-medium">{label}</p>
            <b className="mt-1 block text-3xl font-extrabold text-[#0F172A]">{value}</b>
            <small className="font-semibold text-emerald-600">↑ {trend} so với tháng trước</small>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="panel">
          <h2 className="font-bold text-base text-[#0F172A]">Thống kê người dùng theo vai trò</h2>
          <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row">
            <div className="donut grid size-44 place-items-center rounded-full shadow-inner">
              <div className="grid size-24 place-items-center rounded-full bg-white text-center shadow">
                <b className="text-xl font-extrabold text-[#0F172A]">{usersCount}</b>
                <span className="text-[10px] text-[#94A3B8] uppercase tracking-wider">Tài khoản</span>
              </div>
            </div>
            <div className="w-full space-y-3 text-sm">
              {[
                ["Học sinh", "68%"],
                ["Giáo viên", "20%"],
                ["Quản nhiệm trường", "7%"],
                ["Quản trị viên (Admin)", "5%"],
              ].map((x, i) => (
                <div className="flex items-center" key={x[0]}>
                  <span className={`mr-2.5 size-2.5 rounded-full dot-${i}`} />
                  <span className="flex-1 text-[#475569]">{x[0]}</span>
                  <b className="text-[#0F172A]">{x[1]}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-base text-[#0F172A]">Hoạt động hệ thống gần đây</h2>
            <button className="text-xs font-semibold text-[#EA580C] hover:underline">
              Xem tất cả →
            </button>
          </div>
          <div className="mt-4 divide-y divide-[#F1F5F9]">
            {[
              ["10:42", "Đồng bộ CSDL lên Supabase Cloud", "Hệ thống"],
              ["09:36", "Cấu hình Ma trận phân quyền động (Dynamic RBAC)", "Admin"],
              ["08:20", "Phân công Quản nhiệm phụ trách trường THPT Trương Định", "Quản nhiệm"],
              ["16:45", "Kiểm tra cơ chế Import Excel và xuất file lỗi", "Admin"],
              ["14:12", "Cấu hình chính sách bảo mật đổi mật khẩu lần đầu", "Bảo mật"],
            ].map((x) => (
              <div key={x[1]} className="grid grid-cols-[60px_1fr_auto] gap-3 py-3 text-sm items-center">
                <span className="text-xs text-[#94A3B8] font-mono">{x[0]}</span>
                <b className="truncate text-[#1E293B]">{x[1]}</b>
                <span className="text-xs text-[#64748B]">{x[2]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
