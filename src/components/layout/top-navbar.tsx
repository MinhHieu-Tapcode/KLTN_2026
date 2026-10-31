"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  GraduationCap,
  Folder,
  FileText,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  Settings,
  UserRound,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { SimpaceLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import type { View } from "@/components/simpace-app";
import { RoleCode } from "@prisma/client";

export interface TopNavbarProps {
  view: View;
  navigate: (v: View) => void;
  currentUser: any;
  hasPerm: (featureKey: string) => boolean;
  canManageSettings: boolean;
  permissions: any[];
  activeCustomPerm?: any;
  setActiveCustomPerm?: (perm: any) => void;
  onLogout: () => void;
  onOpenSettingsTab: (tab: "matrix" | "ielts-levels") => void;
  onOpenProfile: () => void;
  onOpenHelp: () => void;
}

export function TopNavbar({
  view,
  navigate,
  currentUser,
  hasPerm,
  canManageSettings,
  permissions = [],
  activeCustomPerm,
  setActiveCustomPerm,
  onLogout,
  onOpenSettingsTab,
  onOpenProfile,
  onOpenHelp,
}: TopNavbarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsSubmenuOpen, setSettingsSubmenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
        setSettingsSubmenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 80 || userMenuOpen || bellOpen || mobileMenuOpen) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }
      if (currentScrollY > lastScrollY + 12) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY - 8) {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, userMenuOpen, bellOpen, mobileMenuOpen]);

  const navItems = [
    {
      key: "dashboard" as View,
      labelFull: "Tổng quan",
      labelShort: "Tổng quan",
      icon: LayoutDashboard,
      visible: hasPerm("VIEW_DASHBOARD"),
    },
    {
      key: "users" as View,
      labelFull: "Quản lý người dùng",
      labelShort: "Người dùng",
      icon: Users,
      visible: hasPerm("VIEW_USERS"),
    },
    {
      key: "schools" as View,
      labelFull: "Quản lý trường",
      labelShort: "Trường học",
      icon: Building2,
      visible: hasPerm("VIEW_SCHOOLS"),
    },
    {
      key: "classes" as View,
      labelFull: "Quản lý lớp học",
      labelShort: "Lớp học",
      icon: GraduationCap,
      visible: hasPerm("VIEW_CLASSES") || hasPerm("VIEW_SCHEDULE"),
      activeKeys: ["classes", "class-detail", "schedule"],
    },
    {
      key: "materials-global" as View,
      labelFull:
        currentUser.role === "ADMIN"
          ? "Kho học liệu chung"
          : currentUser.role === "STUDENT"
          ? "Kho học liệu của tôi"
          : "Kho học liệu",
      labelShort: currentUser.role === "STUDENT" ? "Học liệu" : "Kho học liệu",
      icon: Folder,
      visible: true,
    },
    {
      key: "assignments-global" as View,
      labelFull: currentUser.role === "STUDENT" ? "Bài tập cần làm" : "Quản lý bài tập",
      labelShort: "Bài tập",
      icon: FileText,
      visible: true,
    },
    {
      key: "reports" as View,
      labelFull: currentUser.role === "STUDENT" ? "Báo cáo học tập" : "Báo cáo & Thống kê",
      labelShort: "Báo cáo & Thống kê",
      icon: BarChart3,
      visible: true,
    },
  ].filter((item) => item.visible);

  const customModules = permissions.filter(
    (p) =>
      ![
        "VIEW_DASHBOARD",
        "VIEW_USERS",
        "VIEW_SCHOOLS",
        "VIEW_CLASSES",
        "VIEW_SCHEDULE",
        "VIEW_REPORTS",
        "IMPORT_EXCEL",
        "SYSTEM_SETTINGS",
      ].includes(p.featureKey) &&
      (currentUser.role === "ADMIN" || p.allowedRoles?.includes(currentUser.role as RoleCode))
  );

  const userInitial = currentUser.fullName ? currentUser.fullName[0].toUpperCase() : "U";

  const getRoleDisplayName = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "Quản trị viên",
      SCHOOL_MANAGER: "Quản nhiệm trường",
      TEACHER: "Giáo viên",
      TEACHING_ASSISTANT: "Trợ giảng",
      STUDENT: "Học sinh",
    };
    return map[role] || role;
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-20 flex items-center justify-between gap-3">
          {/* Logo & Mobile Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[#64748B] hover:bg-[#EA580C] hover:text-white rounded-xl size-10"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="size-6" />
            </Button>

            <SimpaceLogo
              className="h-10 sm:h-11 w-auto max-w-[150px] sm:max-w-[180px] cursor-pointer"
              onClick={() => navigate("dashboard")}
            />
          </div>

          {/* Desktop Navigation Tabs: Căn giữa, cỡ chữ & icon to rõ, Hover chuyển FULL CAM (#EA580C) */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-1 xl:gap-2 2xl:gap-3 h-full overflow-hidden select-none px-2">
            {navItems.map((item) => {
              const isActive = item.activeKeys?.includes(view) ?? view === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className={`group relative flex items-center gap-2 px-3 xl:px-4 py-2.5 text-[13.5px] xl:text-[15px] font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-[#FFF1EB] text-[#EA580C] font-bold shadow-2xs hover:bg-[#EA580C] hover:text-white"
                      : "text-[#475569] hover:bg-[#EA580C] hover:text-white hover:shadow-md hover:shadow-[#EA580C]/20"
                  }`}
                >
                  <Icon
                    className={`size-4.5 xl:size-5 shrink-0 transition-colors ${
                      isActive
                        ? "text-[#EA580C] group-hover:text-white"
                        : "text-[#64748B] group-hover:text-white"
                    }`}
                  />
                  <span className="hidden 2xl:inline">{item.labelFull}</span>
                  <span className="inline 2xl:hidden">
                    {navItems.length <= 5 ? item.labelFull : item.labelShort}
                  </span>

                  {/* Thanh gạch chân màu cam dưới đáy header cho tab đang active */}
                  {isActive && (
                    <span className="absolute -bottom-[14px] left-2 right-2 h-[3px] rounded-t-full bg-[#EA580C]" />
                  )}
                </button>
              );
            })}

            {customModules.map((dyn) => {
              const isActive =
                view === "custom-module" && activeCustomPerm?.featureKey === dyn.featureKey;
              return (
                <button
                  key={dyn.featureKey}
                  onClick={() => {
                    setActiveCustomPerm?.(dyn);
                    navigate("custom-module");
                  }}
                  className={`group relative flex items-center gap-2 px-3 xl:px-4 py-2.5 text-[13.5px] xl:text-[15px] font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "bg-[#FFF1EB] text-[#EA580C] font-bold hover:bg-[#EA580C] hover:text-white"
                      : "text-[#475569] hover:bg-[#EA580C] hover:text-white hover:shadow-md hover:shadow-[#EA580C]/20"
                  }`}
                >
                  <ShieldCheck
                    className={`size-4.5 xl:size-5 shrink-0 transition-colors ${
                      isActive
                        ? "text-[#EA580C] group-hover:text-white"
                        : "text-[#64748B] group-hover:text-white"
                    }`}
                  />
                  <span>{dyn.name}</span>
                  {isActive && (
                    <span className="absolute -bottom-[14px] left-2 right-2 h-[3px] rounded-t-full bg-[#EA580C]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons: Chuông thông báo & Avatar lớn rõ nét */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(!bellOpen)}
                aria-label="Thông báo"
                className="group relative grid size-10 place-items-center rounded-full text-[#475569] hover:bg-[#EA580C] hover:text-white transition-all"
              >
                <Bell className="size-5 transition-colors group-hover:text-white" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-[#EA580C] ring-2 ring-white group-hover:bg-white" />
              </button>

              {bellOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2.5 mb-2.5">
                    <b className="text-sm text-[#0F172A]">Thông báo hệ thống</b>
                    <span className="text-xs text-[#EA580C] font-semibold cursor-pointer hover:underline">
                      Đã đọc tất cả
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] py-4 text-center italic">
                    Chưa có thông báo mới nào.
                  </p>
                </div>
              )}
            </div>

            {/* User Avatar Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 py-1.5 pl-2 pr-2.5 rounded-full hover:bg-[#FFF1EB] transition focus:outline-none group"
              >
                <span className="grid size-10 place-items-center rounded-full bg-[#EA580C] text-sm font-bold text-white shadow-sm ring-2 ring-orange-100 group-hover:ring-orange-300 transition">
                  {userInitial}
                </span>
                <span className="hidden md:block text-left">
                  <b className="block text-sm font-bold text-[#0F172A] leading-tight max-w-[150px] truncate group-hover:text-[#EA580C] transition">
                    {currentUser.fullName}
                  </b>
                  <small className="text-xs text-[#64748B] block leading-tight mt-0.5">
                    {getRoleDisplayName(currentUser.role)}
                  </small>
                </span>
                <ChevronDown className="size-4 text-[#64748B] group-hover:text-[#EA580C] transition" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-3 w-76 rounded-2xl border border-[#E2E8F0] bg-white p-2.5 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center gap-3.5 p-3 border-b border-[#F1F5F9] mb-1.5">
                    <span className="grid size-11 place-items-center rounded-full bg-[#EA580C] text-base font-bold text-white shadow-sm shrink-0">
                      {userInitial}
                    </span>
                    <div className="overflow-hidden">
                      <b className="block text-sm font-bold text-[#0F172A] truncate">
                        {currentUser.fullName}
                      </b>
                      <span className="text-xs text-[#64748B] block truncate mt-0.5">
                        {getRoleDisplayName(currentUser.role)}
                      </span>
                    </div>
                  </div>

                  {/* Menu Items: Hover chuyển FULL CAM (#EA580C) chữ trắng */}
                  <div className="space-y-1 text-[13.5px]">
                    {canManageSettings && (
                      <div className="rounded-xl overflow-hidden">
                        <button
                          onClick={() => setSettingsSubmenuOpen(!settingsSubmenuOpen)}
                          className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold transition-all text-left ${
                            settingsSubmenuOpen || view === "settings"
                              ? "bg-[#FFF1EB] text-[#EA580C] hover:bg-[#EA580C] hover:text-white"
                              : "text-[#334155] hover:bg-[#EA580C] hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Settings
                              className={`size-4.5 transition-colors ${
                                settingsSubmenuOpen || view === "settings"
                                  ? "text-[#EA580C] group-hover:text-white"
                                  : "text-[#64748B] group-hover:text-white"
                              }`}
                            />
                            <span>Cài đặt & Phân quyền</span>
                          </div>
                          <ChevronRight
                            className={`size-4 transition-all ${
                              settingsSubmenuOpen
                                ? "rotate-90 text-[#EA580C] group-hover:text-white"
                                : "text-slate-400 group-hover:text-white"
                            }`}
                          />
                        </button>

                        {settingsSubmenuOpen && (
                          <div className="pl-5 pr-1.5 py-1.5 space-y-1 bg-[#FFF7ED]/70 rounded-xl my-1 border-l-3 border-[#EA580C]">
                            <button
                              onClick={() => {
                                onOpenSettingsTab("matrix");
                                setUserMenuOpen(false);
                                setSettingsSubmenuOpen(false);
                              }}
                              className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] font-semibold text-slate-700 hover:bg-[#EA580C] hover:text-white transition-all"
                            >
                              <ShieldCheck className="size-4 text-[#EA580C] group-hover:text-white shrink-0 transition-colors" />
                              <span>Ma trận phân quyền (RBAC)</span>
                            </button>

                            <button
                              onClick={() => {
                                onOpenSettingsTab("ielts-levels");
                                setUserMenuOpen(false);
                                setSettingsSubmenuOpen(false);
                              }}
                              className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[13px] font-semibold text-slate-700 hover:bg-[#EA580C] hover:text-white transition-all"
                            >
                              <Layers className="size-4 text-[#EA580C] group-hover:text-white shrink-0 transition-colors" />
                              <span>Cấu hình trình độ IELTS</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        onOpenProfile();
                        setUserMenuOpen(false);
                      }}
                      className={`group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${
                        view === "profile"
                          ? "bg-[#FFF1EB] text-[#EA580C] font-semibold hover:bg-[#EA580C] hover:text-white"
                          : "text-[#334155] hover:bg-[#EA580C] hover:text-white"
                      }`}
                    >
                      <UserRound
                        className={`size-4.5 transition-colors ${
                          view === "profile"
                            ? "text-[#EA580C] group-hover:text-white"
                            : "text-slate-500 group-hover:text-white"
                        }`}
                      />
                      <span>Hồ sơ cá nhân & Đổi mật khẩu</span>
                    </button>

                    <button
                      onClick={() => {
                        setBellOpen(true);
                        setUserMenuOpen(false);
                      }}
                      className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[#334155] hover:bg-[#EA580C] hover:text-white transition-all text-left"
                    >
                      <Bell className="size-4.5 text-slate-500 group-hover:text-white transition-colors" />
                      <span>Thông báo hệ thống</span>
                    </button>

                    <button
                      onClick={() => {
                        onOpenHelp();
                        setUserMenuOpen(false);
                      }}
                      className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[#334155] hover:bg-[#EA580C] hover:text-white transition-all text-left"
                    >
                      <HelpCircle className="size-4.5 text-slate-500 group-hover:text-white transition-colors" />
                      <span>Trợ giúp & Thông tin hệ thống</span>
                    </button>
                  </div>

                  <div className="border-t border-[#F1F5F9] mt-2 pt-1.5">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-all text-left"
                    >
                      <LogOut className="size-4.5 text-red-500 group-hover:text-white transition-colors" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu (< lg) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-76 max-w-[85vw] bg-white h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left">
            <div className="flex h-20 items-center justify-between border-b border-[#E2E8F0] px-5">
              <SimpaceLogo
                className="h-9 w-auto"
                onClick={() => {
                  navigate("dashboard");
                  setMobileMenuOpen(false);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#64748B] hover:bg-[#EA580C] hover:text-white rounded-xl"
              >
                <X className="size-5" />
              </Button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {navItems.map((item) => {
                const isActive = item.activeKeys?.includes(view) ?? view === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      navigate(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#EA580C] text-white shadow-sm"
                        : "text-[#475569] hover:bg-[#EA580C] hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`size-5 shrink-0 ${
                        isActive ? "text-white" : "text-[#64748B] group-hover:text-white"
                      }`}
                    />
                    <span className="truncate">{item.labelFull}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
