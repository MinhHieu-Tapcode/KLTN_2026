"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  FileText,
  Folder,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { getSchoolsAction, getSchoolManagersAction } from "@/actions/schools";
import { getClassesAction, getClassDetailAction } from "@/actions/classes";
import {
  getUsersAction,
  getTeachersAction,
  getTAsAction,
} from "@/actions/users";
import { getSystemPermissionsAction } from "@/actions/permissions";
import { getIeltsLevelsAction } from "@/actions/ielts-levels";
import { RoleCode } from "@prisma/client";
import { GlobalMaterialsView } from "@/components/materials/global-materials-view";
import { ClassMaterialsTab } from "@/components/materials/class-materials-tab";
import { ClassAssignmentsTab } from "@/components/assignments/class-assignments-tab";
import { ClassMaterialsPanel } from "@/components/materials/class-materials-panel";
import { ClassAssignmentsPanel } from "@/components/assignments/class-assignments-panel";
import { MultiClassAssignmentModal } from "@/components/assignments/multi-class-assignment-modal";
import { subtitle, roleLabel, roleBreadcrumbPrefix } from "@/components/shared/common-widgets";
import { SimpaceLogo } from "@/components/logo";
import { CustomModuleView } from "@/components/settings/permission-widgets";
import {
  SchoolSheet,
  EditSchoolModal,
} from "@/components/schools/school-modals";
import {
  AccountCreatedEmailDialog,
  ViewUserModal,
} from "@/components/users/user-view-modals";
import { EditUserModal } from "@/components/users/edit-user-modal";
import { ClassDialog } from "@/components/classes/create-class-dialog";
import { EditClassModal } from "@/components/classes/edit-class-modal";
import { LoginView } from "@/components/auth/login-view";
import { NavItem, DashboardView } from "@/components/dashboard/dashboard-view";
import { ImportPageView } from "@/components/import/import-page-view";
import { SchedulePageView } from "@/components/schedule/schedule-page-view";
import { SettingsPageView } from "@/components/settings/settings-page-view";
import { SchoolsPageView } from "@/components/schools/schools-page-view";
import { ClassesPageView } from "@/components/classes/classes-page-view";
import { ClassDetailView } from "@/components/classes/class-detail-view";
import { UsersPageView } from "@/components/users/users-page-view";
import { UserDialog } from "@/components/users/user-dialog";
import { IeltsTemplatesShowcase } from "@/components/assignments/ielts-templates-showcase";

export type View =
  | "dashboard"
  | "users"
  | "schools"
  | "classes"
  | "class-detail"
  | "schedule"
  | "import"
  | "settings"
  | "custom-module"
  | "materials-global"
  | "assignments-global";

interface SimpaceAppProps {
  initialSession: any;
  initialSchools: any[];
  initialClasses: any[];
  initialUsers: any[];
  initialManagers: any[];
  initialTeachers: any[];
  initialTAs: any[];
  initialPermissions: any[];
  initialIeltsLevels?: any[];
}

export function SimpaceApp({
  initialSession,
  initialSchools,
  initialClasses,
  initialUsers,
  initialManagers,
  initialTeachers,
  initialTAs,
  initialPermissions,
  initialIeltsLevels = [],
}: SimpaceAppProps) {
  const [currentUser, setCurrentUser] = useState(initialSession);
  const [view, setView] = useState<View>("dashboard");
  const [sidebar, setSidebar] = useState(false);
  const [notice, setNotice] = useState("");
  const [bellOpen, setBellOpen] = useState(false);

  // Dữ liệu ứng dụng
  const [schools, setSchools] = useState(initialSchools);
  const [classes, setClasses] = useState(initialClasses);
  const [users, setUsers] = useState(initialUsers);
  const [managers, setManagers] = useState(initialManagers);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [tas, setTAs] = useState(initialTAs);
  const [permissions, setPermissions] = useState(initialPermissions);
  const [ieltsLevels, setIeltsLevels] = useState<any[]>(initialIeltsLevels);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [classDetailTab, setClassDetailTab] = useState<"info" | "materials" | "assignments">("info");
  const [activeGlobalMaterialClass, setActiveGlobalMaterialClass] = useState<any | null>(null);
  const [activeGlobalAssignmentClass, setActiveGlobalAssignmentClass] = useState<any | null>(null);
  const [isMultiClassAssignmentModalOpen, setIsMultiClassAssignmentModalOpen] = useState(false);

  // Modals & Drawers tạo mới
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);
  const [selectedSchoolForAdd, setSelectedSchoolForAdd] = useState<string | undefined>(undefined);

  // Modals chỉnh sửa
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);

  // Modal Email Preview khi vừa tạo User
  const [createdAccountInfo, setCreatedAccountInfo] = useState<any>(null);

  // Màn hình mở rộng được chọn
  const [activeCustomPerm, setActiveCustomPerm] = useState<any>(null);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("showcase=1")) {
      setShowcaseOpen(true);
    }
  }, []);

  // Kiểm tra quyền theo vai trò hiện tại
  const hasPerm = (featureKey: string) => {
    if (currentUser?.role === "ADMIN") return true;
    const perm = permissions.find((p) => p.featureKey === featureKey);
    if (!perm) return false;
    return perm.allowedRoles?.includes(currentUser?.role as RoleCode);
  };

  // Điều hướng an toàn có kiểm tra phân quyền (RBAC)
  const navigate = (next: View) => {
    if (next === "schedule") {
      next = "classes";
    }
    if (next === "users" && !hasPerm("VIEW_USERS")) return;
    if (next === "schools" && !hasPerm("VIEW_SCHOOLS")) return;
    if (next === "classes" && !hasPerm("VIEW_CLASSES") && !hasPerm("VIEW_SCHEDULE")) return;
    if (next === "import" && !hasPerm("IMPORT_EXCEL")) return;
    if (next === "materials-global") setActiveGlobalMaterialClass(null);
    if (next === "assignments-global") setActiveGlobalAssignmentClass(null);
    setView(next);
    setSidebar(false);
  };

  // Tự động chuyển về Dashboard nếu view hiện tại không được phép truy cập
  useEffect(() => {
    if (view === "users" && !hasPerm("VIEW_USERS")) setView("dashboard");
    if (view === "schools" && !hasPerm("VIEW_SCHOOLS")) setView("dashboard");
    if (view === "classes" && !hasPerm("VIEW_CLASSES") && !hasPerm("VIEW_SCHEDULE")) setView("dashboard");
    if (view === "schedule") setView("classes");
    if (view === "import" && !hasPerm("IMPORT_EXCEL")) setView("dashboard");
  }, [currentUser?.role, permissions, view]);

  const handleLogout = async () => {
    await logoutAction();
    setCurrentUser(null);
  };

  const refreshIeltsLevels = async () => {
    const res = await getIeltsLevelsAction();
    if (res.success && res.levels) {
      setIeltsLevels(res.levels);
    }
  };

  const refreshAll = async () => {
    const [sc, cl, us, per, mgrs, tchs, taList, lvlRes] = await Promise.all([
      getSchoolsAction("", "ALL"),
      getClassesAction("ALL", "", "ALL"),
      getUsersAction("Tất cả", "", "ALL"),
      getSystemPermissionsAction(),
      getSchoolManagersAction(),
      getTeachersAction(),
      getTAsAction(),
      getIeltsLevelsAction(),
    ]);
    setSchools(sc);
    setClasses(cl);
    setUsers(us);
    setPermissions(per);
    setManagers(mgrs);
    setTeachers(tchs);
    setTAs(taList);
    if (lvlRes?.success && lvlRes.levels) {
      setIeltsLevels(lvlRes.levels);
    }
  };

  const refreshUsers = async () => {
    const us = await getUsersAction("Tất cả", "", "ALL");
    setUsers(us);
  };

  const refreshSchools = async () => {
    const [sc, mgrs] = await Promise.all([
      getSchoolsAction("", "ALL"),
      getSchoolManagersAction(),
    ]);
    setSchools(sc);
    setManagers(mgrs);
  };

  const refreshClasses = async () => {
    const [cl, tchs, taList] = await Promise.all([
      getClassesAction("ALL", "", "ALL"),
      getTeachersAction(),
      getTAsAction(),
    ]);
    setClasses(cl);
    setTeachers(tchs);
    setTAs(taList);
  };

  if (showcaseOpen) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-2 sm:p-4">
        <IeltsTemplatesShowcase isOpen={true} onClose={() => setShowcaseOpen(false)} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onLoggedIn={async (user) => {
          setCurrentUser(user);
          setNotice("Đăng nhập thành công!");
          await refreshAll();
        }}
      />
    );
  }

  const canManageSettings =
    currentUser?.role === "ADMIN" ||
    permissions.some(
      (p) =>
        p.featureKey === "SYSTEM_SETTINGS" &&
        p.allowedRoles?.includes(currentUser?.role as RoleCode)
    );

  const title: Record<View, string> = {
    dashboard: "Tổng quan",
    users: "Quản lý người dùng",
    schools: "Quản lý trường học",
    classes: "Quản lý lớp học",
    "class-detail": "Chi tiết lớp học",
    schedule: "Lịch học & Giảng dạy",
    import: "Import / Export Excel",
    settings: canManageSettings ? "Cài đặt & Phân quyền" : "Hồ sơ cá nhân & Bảo mật",
    "custom-module": activeCustomPerm?.name || "Tính năng mở rộng",
    "materials-global":
      currentUser?.role === "ADMIN"
        ? "Kho học liệu chung toàn hệ thống"
        : currentUser?.role === "STUDENT"
        ? "Kho học liệu của tôi"
        : "Kho học liệu giảng dạy",
    "assignments-global":
      currentUser?.role === "STUDENT"
        ? "Bài tập & Đề thi cần hoàn thành"
        : "Trung tâm Quản lý Bài tập & Chấm điểm",
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`${
            sidebar ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
          } w-64 shrink-0 flex-col border-r border-[#E2E8F0] bg-white lg:flex`}
        >
          <div className="flex h-20 items-center justify-between border-b border-[#E2E8F0] px-5 py-3">
            <SimpaceLogo
              className="h-11 w-auto max-w-[190px]"
              onClick={() => navigate("dashboard")}
            />
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[#64748B]"
              onClick={() => setSidebar(false)}
              aria-label="Đóng menu"
            >
              <X className="size-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1.5 p-3.5">
            {hasPerm("VIEW_DASHBOARD") && (
              <NavItem
                icon={LayoutDashboard}
                label="Tổng quan"
                active={view === "dashboard"}
                onClick={() => navigate("dashboard")}
              />
            )}
            {hasPerm("VIEW_USERS") && (
              <NavItem
                icon={Users}
                label="Quản lý người dùng"
                active={view === "users"}
                onClick={() => navigate("users")}
              />
            )}
            {hasPerm("VIEW_SCHOOLS") && (
              <NavItem
                icon={Building2}
                label="Quản lý trường"
                active={view === "schools"}
                onClick={() => navigate("schools")}
              />
            )}
            {(hasPerm("VIEW_CLASSES") || hasPerm("VIEW_SCHEDULE")) && (
              <NavItem
                icon={GraduationCap}
                label="Quản lý lớp học"
                active={view === "classes" || view === "class-detail" || view === "schedule"}
                onClick={() => navigate("classes")}
              />
            )}
            <NavItem
              icon={Folder}
              label={
                currentUser.role === "ADMIN"
                  ? "Kho học liệu chung"
                  : currentUser.role === "STUDENT"
                  ? "Học liệu của tôi"
                  : "Kho học liệu"
              }
              active={view === "materials-global"}
              onClick={() => navigate("materials-global")}
            />
            <NavItem
              icon={FileText}
              label={
                currentUser.role === "STUDENT"
                  ? "Bài tập cần làm"
                  : "Quản lý bài tập"
              }
              active={view === "assignments-global"}
              onClick={() => navigate("assignments-global")}
            />
            <NavItem
              icon={canManageSettings ? Settings : UserRound}
              label={canManageSettings ? "Cài đặt & Phân quyền" : "Hồ sơ cá nhân"}
              active={view === "settings"}
              onClick={() => navigate("settings")}
            />

            {/* Các màn hình mới được tạo từ giao diện phân quyền */}
            {permissions
              .filter(
                (p) =>
                  ![
                    "VIEW_DASHBOARD",
                    "VIEW_USERS",
                    "VIEW_SCHOOLS",
                    "VIEW_CLASSES",
                    "VIEW_SCHEDULE",
                    "IMPORT_EXCEL",
                    "SYSTEM_SETTINGS",
                  ].includes(p.featureKey) &&
                  (currentUser.role === "ADMIN" || p.allowedRoles.includes(currentUser.role as RoleCode))
              )
              .map((dyn) => (
                <NavItem
                  key={dyn.featureKey}
                  icon={ShieldCheck}
                  label={dyn.name}
                  active={view === "custom-module" && activeCustomPerm?.featureKey === dyn.featureKey}
                  onClick={() => {
                    setActiveCustomPerm(dyn);
                    navigate("custom-module");
                  }}
                />
              ))}
          </nav>

          <div className="m-3.5 border-t border-[#E2E8F0] pt-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-sm hover:bg-[#F1F5F9] transition"
            >
              <span className="grid size-9 place-items-center rounded-full bg-primary text-white font-bold text-sm shadow-sm">
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : "A"}
              </span>
              <span className="flex-1 overflow-hidden">
                <b className="block truncate text-[#0F172A]">{currentUser.fullName}</b>
                <small className="text-[#64748B] block truncate text-xs">
                  {roleLabel(currentUser.role)}
                </small>
              </span>
              <LogOut className="size-4 shrink-0 text-[#94A3B8] hover:text-[#EF4444]" />
            </button>
          </div>
        </aside>

        {sidebar && (
          <button
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            aria-label="Đóng menu"
            onClick={() => setSidebar(false)}
          />
        )}

        {/* Main Content */}
        <main className="min-w-0 flex-1 flex flex-col">
          <header className="sticky top-0 z-20 flex h-18 items-center gap-3 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur md:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[#64748B]"
              onClick={() => setSidebar(true)}
              aria-label="Mở menu"
            >
              <Menu className="size-5" />
            </Button>

            <SimpaceLogo
              className="h-8 w-auto max-w-[130px] lg:hidden"
              onClick={() => navigate("dashboard")}
            />

            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#0F172A] truncate">
                {title[view]}
              </h1>
            </div>

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-[#64748B] hover:text-[#0F172A]"
                onClick={() => setBellOpen(!bellOpen)}
                aria-label="Thông báo"
              >
                <Bell className="size-5" />
              </Button>
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-[#E2E8F0] bg-white p-3 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 mb-2">
                    <b className="text-xs text-[#0F172A]">Thông báo hệ thống</b>
                  </div>
                  <p className="text-xs text-[#64748B] py-2 text-center italic">
                    Chưa có thông báo mới.
                  </p>
                </div>
              )}
            </div>

            <div
              className="hidden items-center gap-2.5 sm:flex cursor-pointer hover:opacity-85 transition pl-2 border-l border-[#E2E8F0]"
              onClick={() => navigate("settings")}
            >
              <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-white shadow-sm">
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : "U"}
              </span>
              <span className="text-sm">
                <b className="block text-[#0F172A] leading-tight">{currentUser.fullName}</b>
                <small className="text-[#64748B] text-xs">{roleLabel(currentUser.role)}</small>
              </span>
              <ChevronDown className="size-3.5 text-[#94A3B8]" />
            </div>
          </header>

          <div className="p-4 md:p-8 flex-1">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-medium text-[#64748B]">
                  {view === "materials-global" && activeGlobalMaterialClass
                    ? `${roleBreadcrumbPrefix(currentUser.role)} / Kho học liệu chung / ${activeGlobalMaterialClass.name}`
                    : view === "assignments-global" && activeGlobalAssignmentClass
                    ? `${roleBreadcrumbPrefix(currentUser.role)} / Quản lý bài tập / ${activeGlobalAssignmentClass.name}`
                    : `${roleBreadcrumbPrefix(currentUser.role)} / ${title[view]}`}
                </p>
                <h1 className="text-2xl font-bold text-[#0F172A]">
                  {view === "materials-global" && activeGlobalMaterialClass
                    ? activeGlobalMaterialClass.name
                    : view === "assignments-global" && activeGlobalAssignmentClass
                    ? activeGlobalAssignmentClass.name
                    : view === "dashboard"
                    ? `Xin chào, ${currentUser.fullName}`
                    : title[view]}
                </h1>
                <p className="mt-1 text-sm text-[#64748B]">
                  {view === "materials-global" && activeGlobalMaterialClass
                    ? `Mã lớp: ${activeGlobalMaterialClass.code} • Xem và quản lý tài liệu, bài giảng`
                    : view === "assignments-global" && activeGlobalAssignmentClass
                    ? `Mã lớp: ${activeGlobalAssignmentClass.code} • Soạn đề 4 kỹ năng & Chấm điểm bài làm`
                    : subtitle(view)}
                </p>
              </div>

              <div className="flex gap-2.5">
                {view === "users" && (currentUser?.role === "ADMIN" || currentUser?.role === "SCHOOL_MANAGER") && (
                  <Button
                    onClick={() => setAddUserOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
                  >
                    <Plus className="size-4 mr-1.5" /> Thêm người dùng
                  </Button>
                )}
                {view === "schools" && currentUser?.role === "ADMIN" && (
                  <Button
                    onClick={() => setAddSchoolOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
                  >
                    <Plus className="size-4 mr-1.5" /> Thêm trường học
                  </Button>
                )}
                {view === "classes" && (currentUser?.role === "ADMIN" || currentUser?.role === "SCHOOL_MANAGER") && (
                  <Button
                    onClick={() => setAddClassOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
                  >
                    <Plus className="size-4 mr-1.5" /> Tạo lớp học
                  </Button>
                )}
              </div>
            </div>

            {/* View router */}
            {view === "dashboard" && (
              <DashboardView
                navigate={navigate}
                usersCount={users.length}
                schoolsCount={schools.length}
                classesCount={classes.length}
                currentUser={currentUser}
                classes={classes}
              />
            )}
            {view === "users" && hasPerm("VIEW_USERS") && (
              <UsersPageView
                users={users}
                currentUser={currentUser}
                schools={schools}
                classes={classes}
                onRefresh={refreshUsers}
                onOpenAddUser={() => setAddUserOpen(true)}
                onEditUser={(u) => setEditingUser(u)}
                onViewUser={(u) => setViewingUser(u)}
              />
            )}
            {view === "schools" && hasPerm("VIEW_SCHOOLS") && (
              <SchoolsPageView
                schools={schools}
                managers={managers}
                currentUser={currentUser}
                onRefresh={refreshSchools}
                onAdd={() => setAddSchoolOpen(true)}
                onEditSchool={(s) => setEditingSchool(s)}
                onEditClass={(c) => setEditingClass(c)}
                onOpenAddClass={(schoolId) => {
                  setSelectedSchoolForAdd(schoolId);
                  setAddClassOpen(true);
                }}
              />
            )}
            {view === "classes" && (hasPerm("VIEW_CLASSES") || hasPerm("VIEW_SCHEDULE")) && (
              <ClassesPageView
                classes={classes}
                schools={schools}
                currentUser={currentUser}
                onRefresh={refreshClasses}
                onOpenDetail={async (cls) => {
                  const detail = await getClassDetailAction(cls.id);
                  setSelectedClass(detail || cls);
                  setClassDetailTab("info");
                  navigate("class-detail");
                }}
                onEditClass={(c) => setEditingClass(c)}
                onOpenAddClass={(schoolId) => {
                  setSelectedSchoolForAdd(schoolId);
                  setAddClassOpen(true);
                }}
              />
            )}
            {view === "class-detail" && (hasPerm("VIEW_CLASSES") || hasPerm("VIEW_SCHEDULE")) && (
              <ClassDetailView
                classItem={selectedClass}
                classes={classes}
                teachers={teachers}
                tas={tas}
                currentUser={currentUser}
                initialTab={classDetailTab}
                onBack={() => navigate("classes")}
                onEditClass={(c) => setEditingClass(c)}
                onRefreshDetail={async () => {
                  if (selectedClass) {
                    const detail = await getClassDetailAction(selectedClass.id);
                    setSelectedClass(detail);
                  }
                  refreshAll();
                }}
              />
            )}
            {view === "materials-global" && (
              currentUser.role === "STUDENT" ? (
                (() => {
                  const currentUid = currentUser?.id || currentUser?.userId;
                  const myClass =
                    classes.find((c) =>
                      c.enrollments?.some(
                        (e: any) =>
                          e.studentId === currentUid ||
                          e.student?.id === currentUid ||
                          (currentUser.username && e.student?.username === currentUser.username) ||
                          (currentUser.email && e.student?.email === currentUser.email)
                      )
                    ) || classes[0];

                  return (
                    <div className="space-y-4">
                      <ClassMaterialsTab
                        classId={myClass?.id || "demo-class-1"}
                        className={myClass?.name || "Lớp IELTS của tôi"}
                        currentUser={currentUser}
                      />
                    </div>
                  );
                })()
              ) : activeGlobalMaterialClass ? (
                <ClassMaterialsPanel
                  classId={activeGlobalMaterialClass.id}
                  className={activeGlobalMaterialClass.name}
                  currentUser={currentUser}
                  onBack={() => setActiveGlobalMaterialClass(null)}
                  mode="inside-global"
                />
              ) : (
                <GlobalMaterialsView
                  classes={classes}
                  currentUser={currentUser}
                  onOpenClassMaterials={async (cls) => {
                    const detail = await getClassDetailAction(cls.id);
                    setActiveGlobalMaterialClass(detail || cls);
                  }}
                  onRefreshAll={refreshAll}
                />
              )
            )}
            {view === "assignments-global" && (() => {
              if (activeGlobalAssignmentClass) {
                return (
                  <ClassAssignmentsPanel
                    classId={activeGlobalAssignmentClass.id}
                    className={activeGlobalAssignmentClass.name}
                    currentUser={currentUser}
                    onBack={() => setActiveGlobalAssignmentClass(null)}
                    mode="inside-global"
                  />
                );
              }

              const currentUid = currentUser?.id || currentUser?.userId;
              const accessibleClassesForAssignments = classes.filter((c) => {
                if (!c.isActive) return false;
                if (!currentUser || currentUser.role === "ADMIN") return true;

                if (currentUser.role === "SCHOOL_MANAGER") {
                  return (
                    c.school?.managerId === currentUid ||
                    c.school?.manager?.id === currentUid ||
                    c.school?.manager?.username === currentUser.username ||
                    currentUser.managedSchools?.some((ms: any) => ms.id === c.schoolId)
                  );
                }

                if (currentUser.role === "TEACHER" || currentUser.role === "TEACHING_ASSISTANT") {
                  return c.assignments?.some(
                    (a: any) =>
                      a.userId === currentUid ||
                      a.staff?.id === currentUid ||
                      (currentUser.username && a.staff?.username === currentUser.username) ||
                      (currentUser.email && a.staff?.email === currentUser.email)
                  );
                }

                if (currentUser.role === "STUDENT") {
                  return c.enrollments?.some(
                    (e: any) =>
                      e.studentId === currentUid ||
                      e.student?.id === currentUid ||
                      (currentUser.username && e.student?.username === currentUser.username) ||
                      (currentUser.email && e.student?.email === currentUser.email)
                  );
                }

                return false;
              });

              return (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {currentUser.role === "STUDENT"
                          ? "Bài tập & Đề thi cần hoàn thành"
                          : currentUser.role === "TEACHER" || currentUser.role === "TEACHING_ASSISTANT"
                          ? "Quản lý Bài tập các Lớp bạn phụ trách"
                          : "Trung tâm Quản lý Bài tập & Chấm điểm"}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {currentUser.role === "STUDENT"
                          ? "Chọn lớp học bạn đang theo học để làm bài trực tuyến, nộp bài tự luận và xem kết quả chấm điểm."
                          : "Chọn lớp học để xem danh sách bài tập, hạn nộp, chấm bài và theo dõi vi phạm chuyển tab."}
                      </p>
                    </div>

                    {currentUser.role !== "STUDENT" && (
                      <Button
                        onClick={() => setIsMultiClassAssignmentModalOpen(true)}
                        className="h-9 px-3.5 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold gap-1.5 shadow-sm shrink-0"
                      >
                        <Plus className="size-4" /> Giao bài tập cho nhiều lớp
                      </Button>
                    )}
                  </div>

                  {accessibleClassesForAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {accessibleClassesForAssignments.map((cls) => (
                        <div
                          key={cls.id}
                          onClick={async () => {
                            const detail = await getClassDetailAction(cls.id);
                            setActiveGlobalAssignmentClass(detail || cls);
                          }}
                          className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md cursor-pointer transition flex items-center justify-between group"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {cls.code}
                              </span>
                              <span className="text-xs text-[#EA580C] font-semibold">{cls.program}</span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#EA580C] transition">
                              {cls.name}
                            </h4>
                            <p className="text-xs text-slate-500">{cls.school?.name}</p>
                          </div>
                          <div className="size-10 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-[#EA580C] group-hover:text-white grid place-items-center transition">
                            <FileText className="size-5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
                      <p className="text-sm font-bold text-slate-700">
                        {currentUser.role === "STUDENT"
                          ? "Bạn chưa có bài tập trong lớp học nào."
                          : "Bạn hiện chưa được phân công phụ trách lớp học nào."}
                      </p>
                      <p className="text-xs text-slate-500">
                        Vui lòng liên hệ Giáo vụ hoặc Quản trị viên để được phân quyền lớp học.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            {view === "import" && (
              <ImportPageView
                onImportSuccess={() => {
                  refreshAll();
                  setNotice("Đã import thành công danh sách học viên!");
                }}
              />
            )}
            {view === "settings" && (
              <SettingsPageView
                currentUser={currentUser}
                users={users}
                permissions={permissions}
                onRefreshPermissions={refreshAll}
                ieltsLevels={ieltsLevels}
                onRefreshLevels={refreshIeltsLevels}
                onProfileUpdated={(updated) => {
                  if (updated) {
                    setCurrentUser((prev: any) => ({ ...prev, ...updated }));
                  }
                  refreshAll();
                  setNotice("Đã lưu thông tin hồ sơ thành công!");
                }}
              />
            )}
            {view === "custom-module" && activeCustomPerm && (
              <CustomModuleView
                perm={activeCustomPerm}
                currentUser={currentUser}
                onNavigateBack={() => navigate("dashboard")}
              />
            )}
          </div>
        </main>
      </div>

      {/* MODAL & DRAWER TẠO MỚI */}
      <UserDialog
        open={addUserOpen}
        onOpenChange={setAddUserOpen}
        schools={schools}
        classes={classes}
        users={users}
        ieltsLevels={ieltsLevels}
        onAddClassShortcut={() => setAddClassOpen(true)}
        onAddSchoolShortcut={() => {
          setAddUserOpen(false);
          setView("schools");
          setAddSchoolOpen(true);
        }}
        onCreatedSuccess={(acc) => {
          setAddUserOpen(false);
          refreshAll();
          setCreatedAccountInfo(acc);
        }}
      />

      <ClassDialog
        open={addClassOpen}
        onOpenChange={(v) => {
          setAddClassOpen(v);
          if (!v) setSelectedSchoolForAdd(undefined);
        }}
        schools={schools}
        teachers={teachers}
        tas={tas}
        defaultSchoolId={selectedSchoolForAdd}
        onAddSchoolShortcut={() => setAddSchoolOpen(true)}
        onDone={() => {
          setAddClassOpen(false);
          setSelectedSchoolForAdd(undefined);
          refreshAll();
          setNotice("Đã tạo lớp học mới thành công!");
        }}
      />

      <SchoolSheet
        open={addSchoolOpen}
        onOpenChange={setAddSchoolOpen}
        managers={managers}
        onDone={() => {
          setAddSchoolOpen(false);
          refreshAll();
          setNotice("Đã thêm trường học mới!");
        }}
      />

      {/* MODAL SỬA */}
      {editingSchool && (
        <EditSchoolModal
          school={editingSchool}
          managers={managers}
          onClose={() => setEditingSchool(null)}
          onDone={() => {
            setEditingSchool(null);
            refreshAll();
            setNotice("Đã cập nhật thông tin trường học!");
          }}
        />
      )}

      {editingClass && (
        <EditClassModal
          classItem={editingClass}
          teachers={teachers}
          tas={tas}
          onClose={() => setEditingClass(null)}
          onDone={() => {
            setEditingClass(null);
            refreshAll();
            setNotice("Đã cập nhật thông tin lớp học!");
          }}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          schools={schools}
          classes={classes}
          onClose={() => setEditingUser(null)}
          onDone={() => {
            setEditingUser(null);
            refreshAll();
            setNotice("Đã cập nhật thông tin người dùng!");
          }}
        />
      )}

      {/* MODAL XEM CHI TIẾT NGƯỜI DÙNG (READ-ONLY) */}
      {viewingUser && (
        <ViewUserModal
          user={viewingUser}
          open={!!viewingUser}
          onOpenChange={(op) => !op && setViewingUser(null)}
          schools={schools}
          classes={classes}
        />
      )}

      {/* POPUP XEM TRƯỚC EMAIL TÀI KHOẢN VỪA TẠO */}
      {createdAccountInfo && (
        <AccountCreatedEmailDialog
          info={createdAccountInfo}
          onClose={() => setCreatedAccountInfo(null)}
        />
      )}

      {/* MODAL GIAO BÀI TẬP ĐA LỚP (CỬA 2) */}
      <MultiClassAssignmentModal
        open={isMultiClassAssignmentModalOpen}
        onOpenChange={setIsMultiClassAssignmentModalOpen}
        accessibleClasses={classes}
        currentUser={currentUser}
        onSuccess={() => {
          refreshAll();
          setNotice("Đã giao bài tập thành công cho các lớp học được chọn!");
        }}
      />

      {/* Toast Notification */}
      {notice && (
        <div className="fixed bottom-5 right-5 z-[70] flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-[#0F172A] px-4 py-3 text-sm text-white shadow-2xl animate-in slide-in-from-bottom-2">
          <CircleCheck className="size-5 text-emerald-400 shrink-0" />
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            className="text-slate-400 hover:text-white"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

