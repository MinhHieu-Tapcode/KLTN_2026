"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock,
  GraduationCap,
  TrendingUp,
  UserRound,
} from "lucide-react";
import type { View } from "@/components/simpace-app";
import { parseSchedule } from "@/lib/schedule";
import { getRecentActivitiesAction } from "@/actions/dashboard";
import type { SystemActivity } from "@/services/dashboard.service";

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
          : "text-[#475569] hover:bg-[#EA580C] hover:text-white"
      }`}
    >
      <Icon className="size-4.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Sparkline({ color, id }: { color: string; id: string }) {
  return (
    <svg className="w-24 sm:w-28 h-14 shrink-0 overflow-visible" viewBox="0 0 120 50" fill="none">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M2 42 C18 40, 24 26, 38 30 C52 34, 60 14, 76 22 C90 29, 98 8, 118 16 L118 48 L2 48 Z"
        fill={`url(#grad-${id})`}
      />
      <path
        d="M2 42 C18 40, 24 26, 38 30 C52 34, 60 14, 76 22 C90 29, 98 8, 118 16"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DashboardView({
  navigate,
  usersCount,
  schoolsCount,
  classesCount,
  currentUser,
  classes = [],
  users = [],
}: {
  navigate: (v: View) => void;
  usersCount: number;
  schoolsCount: number;
  classesCount: number;
  currentUser?: any;
  classes?: any[];
  users?: any[];
}) {
  const currentUid = currentUser?.userId || currentUser?.id;
  const [activities, setActivities] = useState<SystemActivity[]>([]);

  useEffect(() => {
    let isMounted = true;
    getRecentActivitiesAction().then((res) => {
      if (isMounted && res.success) {
        setActivities(res.activities);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const totalWeeklySessions = useMemo(() => {
    return classes.reduce((sum, c) => {
      if (!c.isActive) return sum;
      const parsed = parseSchedule(c.description);
      return sum + (parsed?.days?.length || 0);
    }, 0);
  }, [classes]);

  const roleBreakdown = useMemo(() => {
    const total = users.length || usersCount || 0;
    const students = users.filter((u) => u.role?.code === "STUDENT").length;
    const teachers = users.filter((u) => u.role?.code === "TEACHER").length;
    const tas = users.filter((u) => u.role?.code === "TEACHING_ASSISTANT").length;
    const managers = users.filter((u) => u.role?.code === "SCHOOL_MANAGER").length;
    const admins = users.filter((u) => u.role?.code === "ADMIN").length;
    const getPct = (cnt: number) => (total > 0 ? Math.round((cnt / total) * 100) : 0);

    const list = [
      { label: "Học sinh", count: students, pct: getPct(students), dotColor: "bg-[#EA580C]", hex: "#EA580C" },
      { label: "Giáo viên", count: teachers, pct: getPct(teachers), dotColor: "bg-[#3B82F6]", hex: "#3B82F6" },
      { label: "Trợ giảng (TA)", count: tas, pct: getPct(tas), dotColor: "bg-[#FBBF24]", hex: "#FBBF24" },
      { label: "Quản nhiệm trường", count: managers, pct: getPct(managers), dotColor: "bg-[#10B981]", hex: "#10B981" },
      { label: "Quản trị viên (Admin)", count: admins, pct: getPct(admins), dotColor: "bg-[#8B5CF6]", hex: "#8B5CF6" },
    ];
    return list.filter((r) => r.count > 0 || total === 0);
  }, [users, usersCount]);

  const donutGradient = useMemo(() => {
    const total = roleBreakdown.reduce((s, r) => s + r.count, 0);
    if (total === 0) return "conic-gradient(#E2E8F0 0deg 360deg)";
    let acc = 0;
    const stops = roleBreakdown.map((r) => {
      const start = acc;
      const deg = (r.count / total) * 360;
      acc += deg;
      return `${r.hex} ${start.toFixed(1)}deg ${acc.toFixed(1)}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, [roleBreakdown]);

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
      { icon: GraduationCap, label: "Lớp học của tôi", value: `${myClasses.length} lớp`, sub: "Đang diễn ra", dest: "classes", iconBg: "bg-[#FFF1EB] text-[#EA580C]", hex: "#EA580C" },
      { icon: CalendarDays, label: "Thời khóa biểu tuần", value: `${myClasses.filter((c) => c.description).length} ca/tuần`, sub: "Đúng tiến độ", dest: "classes", iconBg: "bg-blue-50 text-blue-600", hex: "#3B82F6" },
      { icon: Building2, label: "Trường liên kết", value: activeSchoolName, sub: "Đối tác đào tạo", dest: "classes", iconBg: "bg-emerald-50 text-emerald-600", hex: "#10B981" },
      { icon: UserRound, label: "Tài khoản học viên", value: currentUser?.fullName || "Học viên", sub: "Đang hoạt động", dest: "profile", iconBg: "bg-purple-50 text-purple-600", hex: "#8B5CF6" },
    ];

    return (
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {studentStats.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                onClick={() => navigate(s.dest as View)}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white p-5 sm:p-6 border border-[#E2E8F0]/80 shadow-xs text-left transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[#EA580C]/40"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${s.iconBg}`}>
                    <Icon className="size-7" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-[#64748B] font-medium">{s.label}</p>
                    <b className="mt-0.5 block text-xl sm:text-2xl font-extrabold text-[#0F172A] truncate">{s.value}</b>
                    <small className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      ↑ {s.sub}
                    </small>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      id: "users",
      icon: UserRound,
      label: "Người dùng",
      value: usersCount.toLocaleString("vi-VN"),
      trend: "+12%",
      trendSub: "so với tháng trước",
      dest: "users" as View,
      iconBg: "bg-[#FFF1EB] text-[#EA580C]",
      sparkColor: "#EA580C",
    },
    {
      id: "schools",
      icon: Building2,
      label: "Trường học",
      value: schoolsCount.toLocaleString("vi-VN"),
      trend: "+0%",
      trendSub: "so với tháng trước",
      dest: "schools" as View,
      iconBg: "bg-blue-50 text-blue-600",
      sparkColor: "#3B82F6",
    },
    {
      id: "classes",
      icon: GraduationCap,
      label: "Lớp học",
      value: classesCount.toLocaleString("vi-VN"),
      trend: "+0%",
      trendSub: "so với tháng trước",
      dest: "classes" as View,
      iconBg: "bg-emerald-50 text-emerald-600",
      sparkColor: "#10B981",
    },
    {
      id: "schedule",
      icon: CalendarDays,
      label: "Lịch giảng dạy",
      value: totalWeeklySessions > 0 ? `${totalWeeklySessions} ca/tuần` : "Chưa xếp lịch",
      trend: totalWeeklySessions > 0 ? "Đang diễn ra" : "—",
      trendSub: "",
      dest: "classes" as View,
      iconBg: "bg-purple-50 text-purple-600",
      sparkColor: "",
    },
  ];

  const activityStyles = [
    { icon: BookOpen, bg: "bg-blue-50 text-blue-600" },
    { icon: UserRound, bg: "bg-emerald-50 text-emerald-600" },
    { icon: UserRound, bg: "bg-purple-50 text-purple-600" },
    { icon: GraduationCap, bg: "bg-[#FFF1EB] text-[#EA580C]" },
    { icon: BookOpen, bg: "bg-blue-50 text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards ngang có biểu đồ sóng Sparkline chuẩn thiết kế */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => navigate(card.dest)}
              className="group relative flex items-center justify-between gap-3 rounded-2xl bg-white p-5 sm:p-6 border border-[#E2E8F0]/80 shadow-xs text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#EA580C]/40 overflow-hidden"
            >
              <div className="flex items-start gap-4 min-w-0 z-10">
                <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${card.iconBg} transition-transform group-hover:scale-105`}>
                  <Icon className="size-7" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-[#64748B] font-medium">{card.label}</p>
                  <b className="mt-0.5 block text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight truncate">
                    {card.value}
                  </b>
                  <div className="mt-1.5 flex items-center gap-1 text-xs">
                    {card.trend !== "—" ? (
                      <>
                        <span className="font-bold text-emerald-600">↑ {card.trend}</span>
                        {card.trendSub && <span className="text-[#94A3B8]">{card.trendSub}</span>}
                      </>
                    ) : (
                      <span className="text-[#94A3B8] font-medium">—</span>
                    )}
                  </div>
                </div>
              </div>

              {card.sparkColor ? (
                <Sparkline color={card.sparkColor} id={card.id} />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-purple-50/70 text-purple-300">
                  <CalendarDays className="size-7" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hàng dưới: Biểu đồ Donut Vai trò (5 cột) & Hoạt động gần đây (7 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl bg-white p-6 border border-[#E2E8F0]/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="size-5 text-[#EA580C]" />
              <h2 className="font-bold text-base sm:text-lg text-[#0F172A]">
                Thống kê người dùng theo vai trò
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#334155]">
              Tháng này <ChevronDown className="size-3.5 text-[#64748B]" />
            </span>
          </div>

          <div className="my-6 flex flex-col sm:flex-row items-center justify-center gap-8">
            <div
              className="grid size-44 shrink-0 place-items-center rounded-full shadow-inner transition-all"
              style={{ background: donutGradient }}
            >
              <div className="grid size-28 place-items-center rounded-full bg-white text-center shadow-xs">
                <div>
                  <b className="block text-2xl font-extrabold text-[#0F172A] leading-none">
                    {usersCount}
                  </b>
                  <span className="mt-1 block text-[11px] font-medium text-[#64748B]">
                    Tổng người dùng
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3.5 text-sm">
              {roleBreakdown.map((x) => (
                <div className="flex items-center justify-between gap-3" key={x.label}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`size-3 shrink-0 rounded-full ${x.dotColor}`} />
                    <span className="text-[#475569] font-medium truncate">{x.label}</span>
                  </div>
                  <b className="text-[#0F172A] font-bold shrink-0">
                    {x.count} ({x.pct}%)
                  </b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 rounded-2xl bg-white p-6 border border-[#E2E8F0]/80 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <Clock className="size-5 text-[#EA580C]" />
              <h2 className="font-bold text-base sm:text-lg text-[#0F172A]">
                Hoạt động hệ thống gần đây
              </h2>
            </div>
            <button
              onClick={() => navigate("users")}
              className="text-xs sm:text-sm font-bold text-[#EA580C] hover:underline"
            >
              Xem tất cả →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {activities.length > 0 ? (
              activities.map((x, idx) => {
                const style = activityStyles[idx % activityStyles.length];
                const ActIcon = style.icon;
                return (
                  <div
                    key={x.id}
                    className="flex items-center justify-between gap-3.5 py-3.5 text-sm hover:bg-[#F8FAFC] px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="text-xs text-[#94A3B8] font-medium w-12 shrink-0">
                        {x.time}
                      </span>
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${style.bg}`}>
                        <ActIcon className="size-4.5" />
                      </span>
                      <b className="truncate text-[#1E293B] font-semibold" title={x.title}>
                        {x.title}
                      </b>
                    </div>
                    <span className="text-xs font-medium text-[#64748B] shrink-0">{x.actor}</span>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-xs text-[#94A3B8] italic">
                Chưa có hoạt động hệ thống mới ghi nhận
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
