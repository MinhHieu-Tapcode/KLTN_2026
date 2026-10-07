"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePlus,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  UserRound,
  Users,
  X,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Lock,
  Clock,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  loginAction,
  activateAndChangePasswordAction,
  requestActivationOtpAction,
  activateWithOtpAction,
  logoutAction,
  requestPasswordResetOtpAction,
  resetPasswordWithOtpAction,
  changePasswordAction,
} from "@/actions/auth";
import {
  createSchoolAction,
  updateSchoolAction,
  deleteSchoolAction,
  deleteMultipleSchoolsAction,
  getSchoolsAction,
  restoreSchoolAction,
  getSchoolDetailAction,
  getNextSchoolCodeAction,
} from "@/actions/schools";
import {
  createClassAction,
  updateClassAction,
  deleteClassAction,
  deleteMultipleClassesAction,
  assignStaffToClassAction,
  removeStaffFromClassAction,
  getClassesAction,
  getClassDetailAction,
  restoreClassAction,
  getNextClassCodeAction,
} from "@/actions/classes";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
  deleteMultipleUsersAction,
  updateProfileAction,
  getUsersAction,
  parseAndValidateExcelAction,
  commitImportUsersAction,
  restoreUserAction,
  getNextUserCodeAction,
} from "@/actions/users";
import {
  updateSystemPermissionAction,
  getSystemPermissionsAction,
  createSystemPermissionAction,
  deleteSystemPermissionAction,
} from "@/actions/permissions";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { RoleCode } from "@prisma/client";

export type View =
  | "dashboard"
  | "users"
  | "schools"
  | "classes"
  | "class-detail"
  | "schedule"
  | "import"
  | "settings"
  | "custom-module";

interface SimpaceAppProps {
  initialSession: any;
  initialSchools: any[];
  initialClasses: any[];
  initialUsers: any[];
  initialManagers: any[];
  initialTeachers: any[];
  initialTAs: any[];
  initialPermissions: any[];
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
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Modals & Drawers tạo mới
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [addSchoolOpen, setAddSchoolOpen] = useState(false);

  // Modals chỉnh sửa
  const [editingSchool, setEditingSchool] = useState<any>(null);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Modal Email Preview khi vừa tạo User
  const [createdAccountInfo, setCreatedAccountInfo] = useState<any>(null);

  // Màn hình mở rộng được chọn
  const [activeCustomPerm, setActiveCustomPerm] = useState<any>(null);

  // Kiểm tra quyền theo vai trò hiện tại
  const hasPerm = (featureKey: string) => {
    if (currentUser?.role === "ADMIN") return true;
    const perm = permissions.find((p) => p.featureKey === featureKey);
    if (!perm) return false;
    return perm.allowedRoles?.includes(currentUser?.role as RoleCode);
  };

  // Điều hướng
  const navigate = (next: View) => {
    setView(next);
    setSidebar(false);
  };

  const handleLogout = async () => {
    await logoutAction();
    setCurrentUser(null);
  };

  const refreshAll = async () => {
    const [sc, cl, us, per] = await Promise.all([
      getSchoolsAction("", "ALL"),
      getClassesAction("ALL", "", "ALL"),
      getUsersAction("Tất cả", "", "ALL"),
      getSystemPermissionsAction(),
    ]);
    setSchools(sc);
    setClasses(cl);
    setUsers(us);
    setPermissions(per);
  };

  if (!currentUser) {
    return (
      <LoginView
        onLoggedIn={(user) => {
          setCurrentUser(user);
          setNotice("Đăng nhập thành công!");
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
            <img
              src="/logo.png"
              alt="SIMPACE"
              className="h-11 w-auto max-w-[190px] object-contain cursor-pointer transition hover:opacity-90"
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
            {hasPerm("VIEW_CLASSES") && (
              <NavItem
                icon={GraduationCap}
                label="Quản lý lớp học"
                active={view === "classes" || view === "class-detail"}
                onClick={() => navigate("classes")}
              />
            )}
            {hasPerm("VIEW_SCHEDULE") && (
              <NavItem
                icon={CalendarDays}
                label="Lịch học & Giảng dạy"
                active={view === "schedule"}
                onClick={() => navigate("schedule")}
              />
            )}
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
              <span className="grid size-9 place-items-center rounded-full bg-[#EA580C] text-white font-bold text-sm shadow-sm">
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : "A"}
              </span>
              <span className="flex-1 overflow-hidden">
                <b className="block truncate text-[#0F172A]">{currentUser.fullName}</b>
                <small className="text-[#64748B] block truncate text-xs">
                  {currentUser.role}
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
          <header className="sticky top-0 z-20 flex h-18 items-center gap-4 border-b border-[#E2E8F0] bg-white/95 px-4 py-3 backdrop-blur md:px-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-[#64748B]"
              onClick={() => setSidebar(true)}
              aria-label="Mở menu"
            >
              <Menu className="size-5" />
            </Button>

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
                    <span className="text-[10px] text-[#94A3B8]">Sprint 1</span>
                  </div>
                  <p className="text-xs text-[#64748B] py-2 text-center italic">
                    Chưa có thông báo mới.<br />(Thông báo báo cáo & bài tập sẽ kích hoạt ở Sprint 2).
                  </p>
                </div>
              )}
            </div>

            <div
              className="hidden items-center gap-2.5 sm:flex cursor-pointer hover:opacity-85 transition pl-2 border-l border-[#E2E8F0]"
              onClick={() => navigate("settings")}
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#EA580C] text-sm font-bold text-white shadow-sm">
                {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : "U"}
              </span>
              <span className="text-sm">
                <b className="block text-[#0F172A] leading-tight">{currentUser.fullName}</b>
                <small className="text-[#64748B] text-xs">{currentUser.role}</small>
              </span>
              <ChevronDown className="size-3.5 text-[#94A3B8]" />
            </div>
          </header>

          <div className="p-4 md:p-8 flex-1">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-xs font-medium text-[#64748B]">
                  Quản trị hệ thống / {title[view]}
                </p>
                <h1 className="text-2xl font-bold text-[#0F172A]">
                  {view === "dashboard" ? `Xin chào, ${currentUser.fullName}` : title[view]}
                </h1>
                <p className="mt-1 text-sm text-[#64748B]">
                  {view === "dashboard"
                    ? "Chúc bạn một ngày làm việc hiệu quả và thành công!"
                    : subtitle(view)}
                </p>
              </div>

              <div className="flex gap-2.5">
                {view === "users" && (
                  <Button
                    onClick={() => setAddUserOpen(true)}
                    className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl shadow-sm"
                  >
                    <Plus className="size-4 mr-1.5" /> Thêm người dùng
                  </Button>
                )}
                {view === "schools" && currentUser?.role !== "SCHOOL_MANAGER" && (
                  <Button
                    onClick={() => setAddSchoolOpen(true)}
                    className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl shadow-sm"
                  >
                    <Plus className="size-4 mr-1.5" /> Thêm trường học
                  </Button>
                )}
                {view === "classes" && (
                  <Button
                    onClick={() => setAddClassOpen(true)}
                    className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl shadow-sm"
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
              />
            )}
            {view === "users" && (
              <UsersPageView
                users={users}
                currentUser={currentUser}
                schools={schools}
                classes={classes}
                onRefresh={refreshAll}
                onOpenAddUser={() => setAddUserOpen(true)}
                onEditUser={(u) => setEditingUser(u)}
              />
            )}
            {view === "schools" && (
              <SchoolsPageView
                schools={schools}
                onRefresh={refreshAll}
                onAdd={() => setAddSchoolOpen(true)}
                onEditSchool={(s) => setEditingSchool(s)}
              />
            )}
            {view === "classes" && (
              <ClassesPageView
                classes={classes}
                onRefresh={refreshAll}
                onOpenDetail={async (cls) => {
                  const detail = await getClassDetailAction(cls.id);
                  setSelectedClass(detail || cls);
                  navigate("class-detail");
                }}
                onEditClass={(c) => setEditingClass(c)}
              />
            )}
            {view === "class-detail" && (
              <ClassDetailView
                classItem={selectedClass}
                teachers={teachers}
                tas={tas}
                onBack={() => navigate("classes")}
                onRefreshDetail={async () => {
                  if (selectedClass) {
                    const detail = await getClassDetailAction(selectedClass.id);
                    setSelectedClass(detail);
                  }
                  refreshAll();
                }}
              />
            )}
            {view === "schedule" && (
              <SchedulePageView
                classes={classes}
                currentUser={currentUser}
              />
            )}
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
                permissions={permissions}
                onRefreshPermissions={refreshAll}
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
        onAddClassShortcut={() => setAddClassOpen(true)}
        onCreatedSuccess={(acc) => {
          setAddUserOpen(false);
          refreshAll();
          setCreatedAccountInfo(acc);
        }}
      />

      <ClassDialog
        open={addClassOpen}
        onOpenChange={setAddClassOpen}
        schools={schools}
        teachers={teachers}
        tas={tas}
        onAddSchoolShortcut={() => setAddSchoolOpen(true)}
        onDone={() => {
          setAddClassOpen(false);
          refreshAll();
          setNotice("Đã tạo lớp học mới thành công!");
        }}
      />

      <SchoolSheet
        open={addSchoolOpen}
        onOpenChange={setAddSchoolOpen}
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

      {/* POPUP XEM TRƯỚC EMAIL TÀI KHOẢN VỪA TẠO */}
      {createdAccountInfo && (
        <AccountCreatedEmailDialog
          info={createdAccountInfo}
          onClose={() => setCreatedAccountInfo(null)}
        />
      )}

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

/* =========================================================================
   1. LOGIN & PASSWORD ACTIVATION & FORGOT PASSWORD VIEWS
   ========================================================================= */

function LoginView({ onLoggedIn }: { onLoggedIn: (user: any) => void }) {
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
        setPassword(""); // Xóa trắng mật khẩu khi đăng nhập lỗi (BUG_14)
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
        <img src="/logo.png" alt="SIMPACE" className="mb-10 h-12 w-auto max-w-[220px] object-contain" />
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
              className="mt-6 w-full h-11 bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl text-sm font-bold shadow-md shadow-[#EA580C]/20"
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
              className="font-semibold text-[#EA580C] hover:underline"
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
          <div className="mb-8 grid size-20 place-items-center rounded-2xl bg-white/90 shadow-xl">
            <BookOpen className="size-10 text-[#EA580C]" />
          </div>
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

      {/* DIALOG QUÊN MẬT KHẨU */}
      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </div>
  );
}

function ForgotPasswordDialog({
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
        setMsg(`Mã OTP đã được tạo (Demo code: ${res.demoOtp}). Vui lòng nhập mã để đổi mật khẩu.`);
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
            <KeyRound className="size-5 text-[#EA580C]" /> Khôi phục mật khẩu
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
              className="w-full bg-[#EA580C] text-white"
            >
              Đăng nhập ngay
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
              <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
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
              <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
                {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Xác nhận đổi
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivateView({
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

  // Tự động phát lệnh gửi OTP một lần khi vào trang kích hoạt
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

  // Bộ đếm lùi gửi lại OTP
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

/* =========================================================================
   2. SIDEBAR NAVITEM & DASHBOARD VIEW
   ========================================================================= */

function NavItem({
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

function DashboardView({
  navigate,
  usersCount,
  schoolsCount,
  classesCount,
}: {
  navigate: (v: View) => void;
  usersCount: number;
  schoolsCount: number;
  classesCount: number;
}) {
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
                ["Học sinh", "62%"],
                ["Giáo viên", "18%"],
                ["Trợ giảng (TA)", "8%"],
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

/* =========================================================================
   3. USERS PAGE VIEW (CHECKBOX, BATCH DELETE, EDIT, DYNAMIC ADD)
   ========================================================================= */

function UsersPageView({
  users,
  currentUser,
  schools,
  classes,
  onRefresh,
  onOpenAddUser,
  onEditUser,
}: {
  users: any[];
  currentUser?: any;
  schools?: any[];
  classes?: any[];
  onRefresh: () => void;
  onOpenAddUser?: () => void;
  onEditUser: (u: any) => void;
}) {
  const [tab, setTab] = useState("Tất cả");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();
  const [localUsers, setLocalUsers] = useState(users);

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Nếu là Quản nhiệm: Không cho lọc và xem Admin hay Quản nhiệm khác (BUG_01)
  const isSchoolManager = currentUser?.role === "SCHOOL_MANAGER";
  const roleTabs = isSchoolManager
    ? ["Tất cả", "Giáo viên", "Trợ giảng", "Học sinh"]
    : ["Tất cả", "Quản trị viên", "Quản nhiệm", "Giáo viên", "Trợ giảng", "Học sinh"];

  const filtered = localUsers.filter((u) => {
    // 1. Lọc theo trạng thái xóa mềm (BUG_05)
    if (statusFilter === "ACTIVE" && !u.isActive) return false;
    if (statusFilter === "INACTIVE" && u.isActive) return false;

    // 2. Lọc theo quyền của Quản nhiệm: Ẩn tuyệt đối Admin và QN khác
    if (isSchoolManager && (u.role?.code === "ADMIN" || u.role?.code === "SCHOOL_MANAGER")) {
      return false;
    }

    // 3. Lọc theo Tab vai trò
    const matchesTab =
      tab === "Tất cả" ||
      (tab === "Quản trị viên" && u.role?.code === "ADMIN") ||
      (tab === "Quản nhiệm" && u.role?.code === "SCHOOL_MANAGER") ||
      (tab === "Giáo viên" && u.role?.code === "TEACHER") ||
      (tab === "Trợ giảng" && u.role?.code === "TEACHING_ASSISTANT") ||
      (tab === "Học sinh" && u.role?.code === "STUDENT");

    // 4. Tìm kiếm tự động .trim() (BUG_11)
    const cleanSearch = search.trim().toLowerCase();
    const matchesSearch =
      !cleanSearch ||
      u.email?.toLowerCase().includes(cleanSearch) ||
      (u.profile?.fullName || "").toLowerCase().includes(cleanSearch) ||
      u.username?.toLowerCase().includes(cleanSearch);

    return matchesTab && matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((u) => u.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const handleBatchDelete = () => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa người dùng đã chọn",
      description: `Bạn có chắc chắn muốn ngưng hoạt động ${selectedIds.length} người dùng đã chọn? Thao tác này sẽ bảo vệ lịch sử học tập và chuyển trạng thái sang ngưng hoạt động.`,
      action: async () => {
        // Optimistic UI (BUG_04)
        setLocalUsers((prev) =>
          prev.map((u) => (selectedIds.includes(u.id) ? { ...u, isActive: false } : u))
        );
        await deleteMultipleUsersAction(selectedIds);
        setSelectedIds([]);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (id: string, name?: string) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa người dùng",
      description: `Bạn có chắc chắn muốn xóa tài khoản ${name ? `"${name}"` : "này"}? Tài khoản sẽ chuyển sang trạng thái ngưng hoạt động và có thể khôi phục lại bất kỳ lúc nào.`,
      action: async () => {
        // Optimistic UI (BUG_04)
        setLocalUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isActive: false } : u))
        );
        await deleteUserAction(id);
        onRefresh();
      },
    });
  };

  const handleRestoreSingle = async (id: string) => {
    // Optimistic UI
    setLocalUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, isActive: true } : u))
    );
    await restoreUserAction(id);
    onRefresh();
  };

  return (
    <section className="panel overflow-hidden">
      {/* Tab vai trò */}
      <div className="mb-4 flex gap-6 overflow-x-auto border-b border-[#E2E8F0]">
        {roleTabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
              tab === t ? "border-[#EA580C] text-[#EA580C]" : "border-transparent text-[#64748B]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Toolbar & Bộ lọc trạng thái xóa mềm (BUG_05) */}
      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              className="field field-search border-[#CBD5E1]"
              placeholder="Tìm kiếm theo họ tên, email, mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Lọc trạng thái (Soft-delete filter) */}
          <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-[#EA580C] shadow-sm font-bold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Đang hoạt động
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "INACTIVE"
                  ? "bg-white text-rose-600 shadow-sm font-bold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Đã xóa mềm
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "ALL"
                  ? "bg-white text-[#0F172A] shadow-sm font-bold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="rounded-xl shadow-sm"
            >
              <Trash2 className="size-4 mr-1.5" /> Xóa ({selectedIds.length}) mục
            </Button>
          )}

          {onOpenAddUser && (
            <Button
              onClick={onOpenAddUser}
              className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl shadow-sm text-xs"
            >
              <Plus className="size-4 mr-1.5" /> Thêm người dùng
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded border-[#CBD5E1]"
                />
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Họ và tên</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Email / Mã định danh</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Vai trò</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trường / Lớp phụ trách</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {filtered.length > 0 ? (
              filtered.map((u) => {
                // Kiểm tra quyền thao tác trên từng người dùng (BUG_01)
                const isTargetAdmin = u.role?.code === "ADMIN";
                const isSelf = currentUser && u.id === currentUser.userId;
                const canEdit = !isSchoolManager || !isTargetAdmin;
                const canDelete = (!isSchoolManager || !isTargetAdmin) && !isSelf;

                // Chuỗi hiển thị phân công trường / lớp đa nhiệm
                let assignmentText = "—";
                if (u.role?.code === "SCHOOL_MANAGER" && u.managedSchools?.length > 0) {
                  assignmentText = u.managedSchools.map((s: any) => s.name).join(", ");
                } else if (
                  (u.role?.code === "TEACHER" || u.role?.code === "TEACHING_ASSISTANT") &&
                  u.classAssignments?.length > 0
                ) {
                  assignmentText = u.classAssignments
                    .map((a: any) => a.class?.name || a.class?.code)
                    .filter(Boolean)
                    .join(", ");
                } else if (u.classEnrollments?.length > 0) {
                  assignmentText = u.classEnrollments
                    .map((e: any) => e.class?.name || e.class?.code)
                    .filter(Boolean)
                    .join(", ");
                }

                return (
                  <tr key={u.id} className="hover:bg-[#F8FAFC] transition">
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="rounded border-[#CBD5E1]"
                      />
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 place-items-center rounded-full bg-[#FFF1EB] text-[#EA580C] font-bold text-xs uppercase">
                          {u.profile?.fullName ? u.profile.fullName.trim()[0] : u.username[0]}
                        </span>
                        <div>
                          <span>{u.profile?.fullName || u.username}</span>
                          {u.profile?.phoneNumber && (
                            <span className="block text-xs font-normal text-[#94A3B8]">
                              {u.profile.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#475569]">
                      <div>
                        <span>{u.email}</span>
                        <code className="block text-[11px] font-mono text-[#94A3B8]">
                          {u.username}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge>{u.role?.name || u.role?.code}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-[#64748B] text-xs max-w-[200px] truncate" title={assignmentText}>
                      {assignmentText}
                    </td>
                    <td className="px-4 py-3.5">
                      {u.isActive ? (
                        <Status tone="success">Đang hoạt động</Status>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Đã xóa mềm
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        {u.isActive ? (
                          <>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-[#64748B] hover:text-[#0F172A]"
                                onClick={() => onEditUser(u)}
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="size-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-[#64748B] hover:text-[#EF4444]"
                                onClick={() => handleDeleteSingle(u.id, u.profile?.fullName || u.username)}
                                title="Xóa tài khoản (Chuyển sang ngưng hoạt động)"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                            onClick={() => handleRestoreSingle(u.id)}
                            title="Khôi phục tài khoản này"
                          >
                            <RotateCcw className="size-3.5 mr-1 text-emerald-600" /> Khôi phục
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-sm text-[#94A3B8] italic">
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        isPending={isDeleting}
        onConfirm={() => {
          startTransition(async () => {
            await confirmModal.action();
            setConfirmModal((prev) => ({ ...prev, open: false }));
          });
        }}
      />
    </section>
  );
}

/* =========================================================================
   4. SCHOOLS PAGE VIEW (CHECKBOX, BATCH DELETE, EDIT)
   ========================================================================= */

function SchoolsPageView({
  schools,
  onRefresh,
  onAdd,
  onEditSchool,
}: {
  schools: any[];
  onRefresh: () => void;
  onAdd: () => void;
  onEditSchool: (s: any) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();
  const [localSchools, setLocalSchools] = useState(schools);
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<any>(null);

  useEffect(() => {
    setLocalSchools(schools);
  }, [schools]);

  const filtered = localSchools.filter((s) => {
    if (statusFilter === "ACTIVE" && !s.isActive) return false;
    if (statusFilter === "INACTIVE" && s.isActive) return false;

    const cleanSearch = search.trim().toLowerCase();
    if (!cleanSearch) return true;
    return (
      s.name.toLowerCase().includes(cleanSearch) ||
      s.code.toLowerCase().includes(cleanSearch) ||
      (s.address || "").toLowerCase().includes(cleanSearch)
    );
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((s) => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const handleBatchDelete = () => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa các trường học đã chọn",
      description: `Bạn có chắc chắn muốn ngưng hoạt động ${selectedIds.length} trường học đã chọn? Thao tác này sẽ chuyển trạng thái các trường học sang không hoạt động.`,
      action: async () => {
        setLocalSchools((prev) =>
          prev.map((s) => (selectedIds.includes(s.id) ? { ...s, isActive: false } : s))
        );
        await deleteMultipleSchoolsAction(selectedIds);
        setSelectedIds([]);
        onRefresh();
      },
    });
  };

  // BUG_15a: Hiển thị cả Tên trường VÀ Mã trường trong dialog xác nhận xóa
  const handleDeleteSingle = (id: string, name: string, code: string) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa trường học",
      description: `Bạn có chắc chắn muốn xóa trường "${name}" (Mã trường: ${code}) không? Hành động này sẽ chuyển trạng thái trường sang ngưng hoạt động. Lịch sử các lớp học và học sinh trực thuộc vẫn được bảo lưu.`,
      action: async () => {
        setLocalSchools((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isActive: false } : s))
        );
        await deleteSchoolAction(id);
        onRefresh();
      },
    });
  };

  const handleRestoreSingle = async (id: string) => {
    setLocalSchools((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: true } : s))
    );
    await restoreSchoolAction(id);
    onRefresh();
  };

  return (
    <section className="panel">
      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
            <input
              className="field field-search border-[#CBD5E1]"
              placeholder="Tìm kiếm trường học theo tên, mã..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="inline-flex rounded-xl bg-[#F1F5F9] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-[#EA580C] shadow-sm font-bold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Đang hoạt động
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "INACTIVE"
                  ? "bg-white text-rose-600 shadow-sm font-bold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Đã xóa mềm
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition ${
                statusFilter === "ALL"
                  ? "bg-white text-[#0F172A] shadow-sm font-bold"
                  : "text-[#64748B] hover:text-[#0F172A]"
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBatchDelete}
            disabled={isDeleting}
            className="rounded-xl shadow-sm"
          >
            <Trash2 className="size-4 mr-1.5" /> Xóa ({selectedIds.length}) trường đã chọn
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded border-[#CBD5E1]"
                />
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Tên trường</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Mã trường</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Khối học</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Quản nhiệm phụ trách</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Số lớp</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {filtered.length > 0 ? (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-[#F8FAFC] transition cursor-pointer"
                  onClick={() => setSelectedSchoolDetail(s)}
                >
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="rounded border-[#CBD5E1]"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#0F172A] hover:text-[#EA580C]">
                    <div className="flex items-center gap-2">
                      <span>{s.name}</span>
                      <span title="Bấm xem chi tiết">
                        <Eye className="size-3.5 text-[#94A3B8] opacity-60" />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#64748B]">{s.code}</td>
                  <td className="px-4 py-3.5 text-[#475569]">{s.type}</td>
                  <td className="px-4 py-3.5 text-[#0F172A] font-medium">
                    {s.manager?.profile?.fullName || s.manager?.username || (
                      <span className="text-[#94A3B8] italic">Chưa phân công</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#EA580C]">
                    {s._count?.classes || s.classes?.length || 0} lớp
                  </td>
                  <td className="px-4 py-3.5">
                    {s.isActive ? (
                      <Status tone="success">Hoạt động</Status>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Đã xóa mềm
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {s.isActive ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[#64748B] hover:text-[#0F172A]"
                            onClick={() => onEditSchool(s)}
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[#64748B] hover:text-[#EF4444]"
                            onClick={() => handleDeleteSingle(s.id, s.name, s.code)}
                            title="Xóa trường học"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                          onClick={() => handleRestoreSingle(s.id)}
                          title="Khôi phục trường học"
                        >
                          <RotateCcw className="size-3.5 mr-1 text-emerald-600" /> Khôi phục
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-8 text-sm text-[#94A3B8] italic">
                  Không tìm thấy trường học phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DRAWER XEM CHI TIẾT TRƯỜNG HỌC (BUG_13) */}
      <SchoolDetailDrawer
        school={selectedSchoolDetail}
        open={!!selectedSchoolDetail}
        onOpenChange={(op) => !op && setSelectedSchoolDetail(null)}
        onEditSchool={onEditSchool}
      />

      <ConfirmDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        isPending={isDeleting}
        onConfirm={() => {
          startTransition(async () => {
            await confirmModal.action();
            setConfirmModal((prev) => ({ ...prev, open: false }));
          });
        }}
      />
    </section>
  );
}

/* =========================================================================
   DRAWER CHI TIẾT TRƯỜNG HỌC & DANH SÁCH LỚP TRỰC THUỘC (BUG_13)
   ========================================================================= */

function SchoolDetailDrawer({
  school,
  open,
  onOpenChange,
  onEditSchool,
}: {
  school: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditSchool?: (s: any) => void;
}) {
  if (!school) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
              {school.code}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
              {school.type}
            </span>
          </div>
          <SheetTitle className="text-xl font-bold text-[#0F172A] mt-1">
            {school.name}
          </SheetTitle>
          <SheetDescription>
            Chi tiết đối tác đào tạo và các lớp học trực thuộc tại trường.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          {/* Thông tin liên hệ */}
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2">
            <b className="text-xs uppercase text-slate-500 tracking-wider block">
              Thông tin liên hệ trường học
            </b>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block">Đại diện BGH / Giáo vụ:</span>
                <span className="font-semibold text-slate-800">
                  {school.contactName || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Số điện thoại:</span>
                <span className="font-semibold text-slate-800">
                  {school.contactPhone || "—"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">Địa chỉ:</span>
                <span className="font-semibold text-slate-800">
                  {school.address || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Quản nhiệm phụ trách */}
          <div className="rounded-xl bg-[#FFF1EB] border border-orange-200 p-4 space-y-1">
            <b className="text-xs uppercase text-[#EA580C] tracking-wider block">
              Quản nhiệm phụ trách
            </b>
            <p className="font-bold text-slate-900 text-sm">
              {school.manager?.profile?.fullName ||
                school.manager?.username ||
                "Chưa phân công quản nhiệm (Gán tại Quản lý người dùng)"}
            </p>
            {school.manager?.email && (
              <p className="text-xs text-slate-600">
                Email: {school.manager.email}
              </p>
            )}
          </div>

          {/* Danh sách lớp trực thuộc */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <b className="text-xs uppercase text-slate-500 tracking-wider">
                Danh sách lớp học tại trường ({school.classes?.length || 0})
              </b>
            </div>
            {school.classes && school.classes.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {school.classes.map((cls: any) => (
                  <div
                    key={cls.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#EA580C] transition text-xs flex justify-between items-center"
                  >
                    <div>
                      <b className="text-slate-900 font-bold block">{cls.name}</b>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {cls.code} • {cls.program}
                      </span>
                    </div>
                    <span className="px-2 py-1 rounded bg-slate-100 font-semibold text-slate-700">
                      Sĩ số: {cls.capacity || 30}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chưa có lớp học nào được mở tại trường này.
              </p>
            )}
          </div>

          {onEditSchool && (
            <div className="pt-2">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onEditSchool(school);
                }}
                className="w-full bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl"
              >
                <Edit2 className="size-4 mr-1.5" /> Chỉnh sửa thông tin trường
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* =========================================================================
   5. CLASSES PAGE VIEW & DETAIL VIEW (ASSIGN / UNASSIGN STAFF)
   ========================================================================= */

function ClassesPageView({
  classes,
  onRefresh,
  onOpenDetail,
  onEditClass,
}: {
  classes: any[];
  onRefresh: () => void;
  onOpenDetail: (c: any) => void;
  onEditClass: (c: any) => void;
}) {
  const [lifecycleStatus, setLifecycleStatus] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();
  const [localClasses, setLocalClasses] = useState(classes);

  useEffect(() => {
    setLocalClasses(classes);
  }, [classes]);

  const classTabs = [
    ["ALL", "Tất cả"],
    ["ACTIVE", "Đang diễn ra"],
    ["UPCOMING", "Sắp khai giảng"],
    ["FINISHED", "Lịch sử"],
  ] as const;

  const filtered = localClasses.filter((c) => {
    // 1. Lọc theo trạng thái xóa mềm
    if (statusFilter === "ACTIVE" && !c.isActive) return false;
    if (statusFilter === "INACTIVE" && c.isActive) return false;

    // 2. Lọc theo chu kỳ lớp học
    const matchesLifecycle = lifecycleStatus === "ALL" || c.status === lifecycleStatus;

    // 3. Tìm kiếm .trim() (BUG_10)
    const cleanSearch = search.trim().toLowerCase();
    const matchesSearch =
      !cleanSearch ||
      c.name.toLowerCase().includes(cleanSearch) ||
      c.code.toLowerCase().includes(cleanSearch) ||
      (c.school?.name || "").toLowerCase().includes(cleanSearch);

    return matchesLifecycle && matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    action: async () => {},
  });

  const handleBatchDelete = () => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa các lớp học đã chọn",
      description: `Bạn có chắc chắn muốn chuyển ${selectedIds.length} lớp học đã chọn sang danh sách Đã xóa mềm? Các lớp học này có thể khôi phục lại bất kỳ lúc nào.`,
      action: async () => {
        // Optimistic UI update
        const toDeleteIds = [...selectedIds];
        setLocalClasses((prev) =>
          prev.map((c) => (toDeleteIds.includes(c.id) ? { ...c, isActive: false } : c))
        );
        setSelectedIds([]);
        await deleteMultipleClassesAction(toDeleteIds);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (cls: any) => {
    // Hiển thị cả Tên lớp học VÀ Mã lớp học (BUG_15b)
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa lớp học",
      description: `Bạn có chắc chắn muốn xóa lớp học "${cls.name}" (Mã lớp: ${cls.code})? Lớp học sẽ được chuyển sang trạng thái Đã xóa mềm và có thể khôi phục lại.`,
      action: async () => {
        // Optimistic UI update
        setLocalClasses((prev) =>
          prev.map((c) => (c.id === cls.id ? { ...c, isActive: false } : c))
        );
        await deleteClassAction(cls.id);
        onRefresh();
      },
    });
  };

  const handleRestore = async (cls: any) => {
    setLocalClasses((prev) =>
      prev.map((c) => (c.id === cls.id ? { ...c, isActive: true } : c))
    );
    await restoreClassAction(cls.id);
    onRefresh();
  };

  return (
    <section className="panel">
      {/* Hàng 1: Tabs Trạng thái xóa mềm (Đang hoạt động / Đã xóa mềm / Tất cả) + Tabs Tiến độ */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
        {/* Pills Tabs Chu kỳ lớp học */}
        <div className="flex gap-2 overflow-x-auto">
          {classTabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setLifecycleStatus(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                lifecycleStatus === key
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bộ lọc xóa mềm */}
        <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === "ACTIVE"
                ? "bg-white text-[#EA580C] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Đang hoạt động
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === "INACTIVE"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Đã xóa mềm
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === "ALL"
                ? "bg-white text-[#0F172A] shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="field field-search border-[#CBD5E1]"
            placeholder="Tìm theo tên lớp, mã lớp, trường..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBatchDelete}
            disabled={isDeleting}
            className="rounded-xl shadow-sm"
          >
            <Trash2 className="size-4 mr-1.5" /> Xóa ({selectedIds.length}) lớp đã chọn
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded border-[#CBD5E1]"
                />
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Mã lớp</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Tên lớp</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trường học</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Giáo viên / TA phụ trách</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Sĩ số</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {filtered.length > 0 ? (
              filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-[#F8FAFC] transition ${!c.isActive ? "bg-rose-50/20" : ""}`}>
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="rounded border-[#CBD5E1]"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-xs text-[#0F172A]">{c.code}</td>
                  <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                    <button
                      onClick={() => onOpenDetail(c)}
                      className="hover:text-[#EA580C] text-left transition"
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-[#475569]">{c.school?.name || "—"}</td>
                  <td className="px-4 py-3.5 text-xs text-[#64748B]">
                    {c.assignments && c.assignments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.assignments.map((a: any) => (
                          <span
                            key={a.id}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              a.roleInClass === "TEACHER"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {a.roleInClass === "TEACHER" ? "GV: " : "TA: "}
                            {a.staff?.profile?.fullName || a.staff?.username}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#94A3B8] italic">Chưa phân công</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                    {c._count?.enrollments || 0}/{c.capacity}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <Status
                        tone={
                          c.status === "FINISHED" ? "neutral" : c.status === "UPCOMING" ? "warn" : "success"
                        }
                      >
                        {c.status === "ACTIVE"
                          ? "Hoạt động"
                          : c.status === "UPCOMING"
                          ? "Sắp mở"
                          : "Đã kết thúc"}
                      </Status>
                      {!c.isActive && (
                        <span className="inline-flex w-fit items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          Đã xóa mềm
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end items-center gap-1">
                      {c.isActive ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenDetail(c)}
                            className="text-xs text-[#EA580C] hover:text-[#EA580C] font-semibold"
                          >
                            Chi tiết →
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[#64748B] hover:text-[#0F172A]"
                            onClick={() => onEditClass(c)}
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[#64748B] hover:text-[#EF4444]"
                            onClick={() => handleDeleteSingle(c)}
                            title="Xóa mềm"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(c)}
                          className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 font-semibold"
                        >
                          <RotateCcw className="size-3.5 mr-1" /> Khôi phục
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-8 text-sm text-[#94A3B8] italic">
                  Không tìm thấy lớp học nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        isPending={isDeleting}
        onConfirm={() => {
          startTransition(async () => {
            await confirmModal.action();
            setConfirmModal((prev) => ({ ...prev, open: false }));
          });
        }}
      />
    </section>
  );
}

function ClassDetailView({
  classItem,
  teachers,
  tas,
  onBack,
  onRefreshDetail,
}: {
  classItem: any;
  teachers: any[];
  tas: any[];
  onBack: () => void;
  onRefreshDetail: () => void;
}) {
  const [assignRole, setAssignRole] = useState<"TEACHER" | "TEACHING_ASSISTANT" | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!classItem) return null;

  const currentTeacher = classItem.assignments?.find((a: any) => a.roleInClass === "TEACHER");
  const currentTA = classItem.assignments?.find((a: any) => a.roleInClass === "TEACHING_ASSISTANT");

  const handleAssign = () => {
    if (!assignRole || !selectedStaffId) return;
    startTransition(async () => {
      await assignStaffToClassAction(classItem.id, selectedStaffId, assignRole);
      setAssignRole(null);
      setSelectedStaffId("");
      onRefreshDetail();
    });
  };

  const [unassignTarget, setUnassignTarget] = useState<{ userId: string; roleName: string } | null>(null);

  const handleUnassign = (userId: string, roleName: string) => {
    setUnassignTarget({ userId, roleName });
  };

  const confirmUnassign = () => {
    if (!unassignTarget) return;
    startTransition(async () => {
      await removeStaffFromClassAction(classItem.id, unassignTarget.userId);
      setUnassignTarget(null);
      onRefreshDetail();
    });
  };

  return (
    <>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#EA580C] transition"
      >
        <ChevronLeft className="size-4" /> Quay lại danh sách lớp học
      </button>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="Thông tin lớp học"
          items={[
            `Mã lớp: ${classItem.code}`,
            `Khóa học: ${classItem.program || "IELTS"}`,
            `Trường học: ${classItem.school?.name || "Chưa gán"}`,
            `Sĩ số: ${classItem.enrollments?.length || 0}/${classItem.capacity} học viên`,
            `Trạng thái: ${classItem.status}`,
          ]}
        />

        {/* Card Giáo viên với nút Đổi / Hủy phân công */}
        <section className="panel flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-base text-[#0F172A]">Giáo viên phụ trách</h2>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-lg"
                onClick={() => {
                  setAssignRole("TEACHER");
                  setSelectedStaffId(currentTeacher?.userId || "");
                }}
              >
                {currentTeacher ? "Đổi giáo viên" : "+ Gán giáo viên"}
              </Button>
            </div>
            {currentTeacher ? (
              <div className="space-y-1.5 text-sm">
                <b className="text-[#0F172A] block text-base">
                  {currentTeacher.staff?.profile?.fullName || currentTeacher.staff?.username}
                </b>
                <p className="text-[#64748B] text-xs">{currentTeacher.staff?.email}</p>
                <Badge>Giáo viên giảng dạy chính</Badge>
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] italic">Chưa phân công giáo viên</p>
            )}
          </div>
          {currentTeacher && (
            <button
              onClick={() => handleUnassign(currentTeacher.userId, "giáo viên")}
              className="mt-4 text-xs font-semibold text-red-600 hover:underline text-left"
            >
              Hủy phân công giáo viên này
            </button>
          )}
        </section>

        {/* Card Trợ giảng với nút Đổi / Hủy phân công */}
        <section className="panel flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-base text-[#0F172A]">Trợ giảng (TA) phụ trách</h2>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-lg"
                onClick={() => {
                  setAssignRole("TEACHING_ASSISTANT");
                  setSelectedStaffId(currentTA?.userId || "");
                }}
              >
                {currentTA ? "Đổi trợ giảng" : "+ Gán trợ giảng"}
              </Button>
            </div>
            {currentTA ? (
              <div className="space-y-1.5 text-sm">
                <b className="text-[#0F172A] block text-base">
                  {currentTA.staff?.profile?.fullName || currentTA.staff?.username}
                </b>
                <p className="text-[#64748B] text-xs">{currentTA.staff?.email}</p>
                <Badge>Trợ giảng hỗ trợ lớp</Badge>
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] italic">Chưa phân công trợ giảng</p>
            )}
          </div>
          {currentTA && (
            <button
              onClick={() => handleUnassign(currentTA.userId, "trợ giảng")}
              className="mt-4 text-xs font-semibold text-red-600 hover:underline text-left"
            >
              Hủy phân công trợ giảng này
            </button>
          )}
        </section>
      </div>

      <section className="panel mt-6">
        <h2 className="font-bold text-base text-[#0F172A] mb-4">
          Danh sách học viên theo học ({classItem.enrollments?.length || 0})
        </h2>

        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Họ và tên</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Email</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Mã học viên</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Ngày vào lớp</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] bg-white">
              {classItem.enrollments?.length > 0 ? (
                classItem.enrollments.map((enr: any) => (
                  <tr key={enr.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                      {enr.student?.profile?.fullName || enr.student?.username}
                    </td>
                    <td className="px-4 py-3.5 text-[#475569]">{enr.student?.email}</td>
                    <td className="px-4 py-3.5 font-mono text-xs">{enr.student?.username}</td>
                    <td className="px-4 py-3.5 text-[#64748B]">
                      {new Date(enr.enrolledAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Status tone="success">
                        {enr.status === "STUDYING" ? "Đang học" : enr.status}
                      </Status>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-sm text-[#94A3B8] italic">
                    Chưa có học viên trong lớp. Hãy sử dụng tính năng Import Excel để thêm học viên!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* DIALOG GÁN NHÂN SỰ */}
      {assignRole && (
        <Dialog open={true} onOpenChange={() => setAssignRole(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {assignRole === "TEACHER" ? "Phân công Giáo viên" : "Phân công Trợ giảng"}
              </DialogTitle>
              <DialogDescription>
                Chọn nhân sự để gán vào lớp {classItem.name} ({classItem.code})
              </DialogDescription>
            </DialogHeader>

            <div className="py-3">
              <label className="block text-sm font-semibold mb-2">Chọn nhân sự</label>
              <select
                className="field"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">-- Chọn nhân sự --</option>
                {(assignRole === "TEACHER" ? teachers : tas).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.profile?.fullName || s.username} ({s.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" onClick={() => setAssignRole(null)}>
                Hủy
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!selectedStaffId || isPending}
                className="bg-[#EA580C] text-white"
              >
                {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Xác nhận phân công
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!unassignTarget}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
        title={`Hủy phân công ${unassignTarget?.roleName || "nhân sự"}`}
        description={`Bạn có chắc muốn hủy phân công ${unassignTarget?.roleName || "nhân sự này"} khỏi lớp học? Thao tác này sẽ gỡ nhân sự khỏi lớp.`}
        confirmText="Hủy phân công"
        isPending={isPending}
        onConfirm={confirmUnassign}
      />
    </>
  );
}

/* =========================================================================
   6. SCHEDULE PAGE VIEW (LỌC THEO ROLE CHÍNH XÁC)
   ========================================================================= */

function SchedulePageView({
  classes,
  currentUser,
}: {
  classes: any[];
  currentUser: any;
}) {
  const [selectedSchool, setSelectedSchool] = useState("ALL");

  // Lọc các lớp học liên quan đến vai trò của người dùng
  const relevantClasses = classes.filter((c) => {
    if (c.status !== "ACTIVE") return false;

    if (currentUser.role === "ADMIN") return true;

    if (currentUser.role === "SCHOOL_MANAGER") {
      // Xem lớp của trường mình quản lý
      return c.school?.managerId === currentUser.userId;
    }

    if (currentUser.role === "TEACHER" || currentUser.role === "TEACHING_ASSISTANT") {
      // Xem lớp mình được phân công
      return c.assignments?.some((a: any) => a.userId === currentUser.userId);
    }

    if (currentUser.role === "STUDENT") {
      // Xem lớp mình ghi danh
      return c.enrollments?.some((e: any) => e.studentId === currentUser.userId);
    }

    return true;
  });

  const displayed = relevantClasses.filter(
    (c) => selectedSchool === "ALL" || c.schoolId === selectedSchool
  );

  return (
    <section className="panel">
      <div className="mb-5 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-bold text-base text-[#0F172A]">Lịch học & Giảng dạy các lớp</h2>
          <p className="text-xs text-[#64748B]">
            Hiển thị thời khóa biểu của các lớp học đang hoạt động liên quan đến tài khoản của bạn.
          </p>
        </div>

        {currentUser.role === "ADMIN" && (
          <select
            className="field max-w-xs"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
          >
            <option value="ALL">-- Tất cả các trường --</option>
            {Array.from(
              new Map(
                classes
                  .map((c) => c.school)
                  .filter(Boolean)
                  .map((s: any) => [s.id, s])
              ).values()
            ).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[700px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Lớp học</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trường học</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Thời gian học</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Giáo viên phụ trách</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trợ giảng</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {displayed.length > 0 ? (
              displayed.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                    {c.name} <code className="text-xs text-[#64748B] font-mono">({c.code})</code>
                  </td>
                  <td className="px-4 py-3.5 text-[#475569]">{c.school?.name}</td>
                  <td className="px-4 py-3.5 text-xs text-[#0F172A] font-medium">
                    <div>{c.description || "Chưa xếp lịch cụ thể"}</div>
                    {(c.startDate || c.endDate) && (
                      <div className="text-[11px] text-[#64748B] mt-0.5 font-normal">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString("vi-VN") : "---"}
                        {" → "}
                        {c.endDate ? new Date(c.endDate).toLocaleDateString("vi-VN") : "---"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#475569]">
                    {c.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.staff?.profile
                      ?.fullName || "Chưa phân công"}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#475569]">
                    {c.assignments?.find((a: any) => a.roleInClass === "TEACHING_ASSISTANT")?.staff
                      ?.profile?.fullName || "Chưa phân công"}
                  </td>
                  <td className="px-4 py-3.5">
                    <Status tone="success">Đang diễn ra</Status>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-[#94A3B8] italic">
                  Không có lịch học nào phù hợp với phạm vi quản lý của bạn.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* =========================================================================
   7. IMPORT EXCEL PAGE VIEW (PREVIEW & EXPORT ERROR FILE)
   ========================================================================= */

function ImportPageView({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMsg("");
    setReport(null);
    setAnalyzing(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const res = await parseAndValidateExcelAction(base64);

      if (!res.success) {
        setErrorMsg(res.error || "Lỗi xử lý file Excel!");
      } else {
        setReport(res);
      }
    } catch (err: any) {
      setErrorMsg("Không thể đọc file: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!report?.errorRows || report.errorRows.length === 0) return;

    const exportData = report.errorRows.map((r: any) => ({
      STT: r.stt,
      "Họ và tên": r.fullName,
      Email: r.email,
      "Mã lớp IELTS": r.classCode,
      "Lý do từ chối (Ghi chú hệ thống)": r.reason,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Loi");
    XLSX.writeFile(wb, `SIMPACE_Bao_Cao_Loi_${Date.now()}.xlsx`);
  };

  const handleCommitImport = async () => {
    if (!report?.validRows || report.validRows.length === 0) return;
    setCommitting(true);

    try {
      const res = await commitImportUsersAction(report.validRows, file?.name || "import.xlsx");
      if (!res.success) {
        setErrorMsg(res.error || "Lỗi khi lưu dữ liệu!");
      } else {
        onImportSuccess();
        setReport(null);
        setFile(null);
      }
    } catch (err: any) {
      setErrorMsg("Lỗi khi lưu học viên: " + err.message);
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        STT: 1,
        "Họ và tên": "Nguyễn Văn An",
        Email: "an.nguyen@gmail.com",
        "Mã lớp IELTS": "IELTS_TD_01",
        "Số điện thoại": "0987654321",
        "Ngày sinh": "15/08/2008",
        "Giới tính": "Nam",
      },
      {
        STT: 2,
        "Họ và tên": "Trần Thị Mai",
        Email: "mai.tran@gmail.com",
        "Mã lớp IELTS": "IELTS_TD_01",
        "Số điện thoại": "0912345678",
        "Ngày sinh": "20/11/2008",
        "Giới tính": "Nữ",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hoc_Vien");
    XLSX.writeFile(wb, "SIMPACE_Mau_Import_HocVien.xlsx");
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-[#64748B]">
          Điều kiện: Bắt buộc có <b>Email</b> hợp lệ và <b>Mã lớp IELTS</b> phải tồn tại trên hệ thống.
        </p>
        <Button variant="outline" size="sm" onClick={handleDownloadSample} className="rounded-xl">
          <Download className="mr-1.5 size-4" /> Tải file Excel mẫu chuẩn 7 cột
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-white p-8 hover:border-[#EA580C] cursor-pointer transition shadow-sm"
      >
        <FileSpreadsheet className="mb-3 size-12 text-emerald-500" />
        <b className="text-base text-[#0F172A]">Kéo thả file Excel vào đây hoặc bấm để chọn file</b>
        <span className="mt-1 text-sm text-[#94A3B8]">
          Hỗ trợ định dạng .xlsx, .xls (Tối đa 10MB)
        </span>
      </div>

      {analyzing && (
        <div className="panel mt-4 flex items-center justify-center gap-3 py-6">
          <Loader2 className="size-6 animate-spin text-[#EA580C]" />
          <span className="font-semibold text-sm">Đang phân tích và đối chiếu từng dòng dữ liệu...</span>
        </div>
      )}

      {errorMsg && (
        <div className="panel mt-4 border-red-200 bg-red-50 text-sm text-red-600">
          <b>Lỗi:</b> {errorMsg}
        </div>
      )}

      {report && (
        <div className="mt-6 space-y-6">
          <div className="panel flex items-center gap-4">
            <FileSpreadsheet className="size-8 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <b className="text-sm text-[#0F172A]">{file?.name}</b>
              <div className="mt-2 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div className="h-full w-full bg-[#EA580C]" />
              </div>
            </div>
            <CircleCheck className="size-6 text-emerald-500 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">Đã kiểm tra xong</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel flex items-center gap-4 border-emerald-200 bg-emerald-50/50">
              <CircleCheck className="size-10 text-emerald-500" />
              <div>
                <b className="text-2xl font-extrabold text-emerald-700">{report.validCount}</b>
                <p className="text-sm text-emerald-800 font-medium">Bản ghi hợp lệ (Sẵn sàng tạo)</p>
              </div>
            </div>

            <div className="panel flex items-center gap-4 border-red-200 bg-red-50/50">
              <X className="size-10 text-red-500" />
              <div>
                <b className="text-2xl font-extrabold text-red-600">{report.errorCount}</b>
                <p className="text-sm text-red-700 font-medium">Bản ghi phát hiện lỗi</p>
              </div>
            </div>
          </div>

          {report.validCount > 0 && (
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleCommitImport}
                disabled={committing}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl font-bold"
              >
                {committing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Đang tạo tài khoản...
                  </>
                ) : (
                  `Xác nhận Import ${report.validCount} học viên hợp lệ`
                )}
              </Button>
            </div>
          )}

          {report.errorCount > 0 && (
            <section className="panel">
              <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
                <h2 className="font-bold text-base text-red-600">
                  Chi tiết các dòng bị từ chối ({report.errorCount})
                </h2>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDownloadErrorReport}
                  className="rounded-xl"
                >
                  <Download className="mr-1.5 size-4" /> Tải file Excel báo cáo lỗi
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">STT</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Họ và tên</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Email</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Mã lớp</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Lý do từ chối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] bg-white">
                    {report.errorRows.map((r: any) => (
                      <tr key={r.stt} className="hover:bg-red-50/40">
                        <td className="px-4 py-3 font-mono text-xs">{r.stt}</td>
                        <td className="px-4 py-3 font-bold text-[#0F172A]">{r.fullName}</td>
                        <td className="px-4 py-3 text-[#64748B]">{r.email}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.classCode}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

/* =========================================================================
   8. SETTINGS VIEW (MY PROFILE + DYNAMIC RBAC PERMISSION MATRIX)
   ========================================================================= */

function SettingsPageView({
  currentUser,
  permissions,
  onRefreshPermissions,
  onProfileUpdated,
}: {
  currentUser: any;
  permissions: any[];
  onRefreshPermissions: () => void;
  onProfileUpdated: (updated?: any) => void;
}) {
  const canManageSettings =
    currentUser?.role === "ADMIN" ||
    permissions.some(
      (p) =>
        p.featureKey === "SYSTEM_SETTINGS" &&
        p.allowedRoles?.includes(currentUser?.role as RoleCode)
    );

  const [tab, setTab] = useState<"profile" | "matrix" | "system">(
    canManageSettings ? "matrix" : "profile"
  );
  const [isPending, startTransition] = useTransition();

  // State cho Ma trận quyền
  const [localPermissions, setLocalPermissions] = useState(permissions);
  const [saveMsg, setSaveMsg] = useState("");
  const [addPermOpen, setAddPermOpen] = useState(false);

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  const rolesList: { code: RoleCode; label: string }[] = [
    { code: "ADMIN", label: "Quản trị viên" },
    { code: "SCHOOL_MANAGER", label: "Quản nhiệm" },
    { code: "TEACHER", label: "Giáo viên" },
    { code: "TEACHING_ASSISTANT", label: "Trợ giảng" },
    { code: "STUDENT", label: "Học sinh" },
  ];

  const togglePermission = (featureKey: string, roleCode: RoleCode) => {
    setLocalPermissions((prev) =>
      prev.map((p) => {
        if (p.featureKey !== featureKey) return p;
        const exists = p.allowedRoles.includes(roleCode);
        const newRoles = exists
          ? p.allowedRoles.filter((r: any) => r !== roleCode)
          : [...p.allowedRoles, roleCode];
        return { ...p, allowedRoles: newRoles };
      })
    );
  };

  const handleSavePermissionMatrix = () => {
    setSaveMsg("");
    startTransition(async () => {
      for (const p of localPermissions) {
        await updateSystemPermissionAction(p.featureKey, p.allowedRoles);
      }
      onRefreshPermissions();
      setSaveMsg("Đã lưu ma trận phân quyền thành công vào cơ sở dữ liệu!");
    });
  };

  const [deletePermData, setDeletePermData] = useState<{ featureKey: string; name: string } | null>(null);
  const [permError, setPermError] = useState("");

  const handleCreatePermission = async (data: {
    featureKey: string;
    name: string;
    category?: string;
    allowedRoles: RoleCode[];
  }) => {
    setPermError("");
    const res = await createSystemPermissionAction(data);
    if (!res.success) {
      setPermError(res.error || "Không thể tạo tính năng mới!");
      return;
    }
    setSaveMsg(`Đã thêm màn hình '${data.name}' (${data.featureKey}) thành công!`);
    onRefreshPermissions();
    setAddPermOpen(false);
  };

  const confirmDeletePermission = async () => {
    if (!deletePermData) return;
    setPermError("");
    const { featureKey, name } = deletePermData;
    const res = await deleteSystemPermissionAction(featureKey);
    setDeletePermData(null);
    if (!res.success) {
      setPermError(res.error || "Không thể xóa quyền này!");
      return;
    }
    setSaveMsg(`Đã xóa quyền '${name}' thành công!`);
    onRefreshPermissions();
  };

  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  // State đổi mật khẩu
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
    const address = formData.get("address")?.toString() || "";

    startTransition(async () => {
      const res = await updateProfileAction(currentUser.userId, {
        fullName,
        address,
        phoneNumber: formData.get("phoneNumber")?.toString(),
        dateOfBirth: formData.get("dateOfBirth")?.toString(),
        gender: formData.get("gender")?.toString() as any,
      });

      if (!res.success) {
        setProfileError(res.error || "Không thể cập nhật hồ sơ!");
        return;
      }

      setProfileMsg("Đã cập nhật thông tin hồ sơ thành công!");
      onProfileUpdated({
        fullName,
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
        <section className="panel">
          <div className="mb-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="font-bold text-base text-[#0F172A]">Ma trận phân quyền hệ thống</h2>
              <p className="text-xs text-[#64748B]">
                Tích chọn quyền truy cập cho từng vai trò trên giao diện. Quản trị viên có thể thêm trực tiếp màn hình mới mà không cần sửa code.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button
                variant="outline"
                onClick={() => setAddPermOpen(true)}
                className="rounded-xl border-[#CBD5E1] text-[#0F172A] hover:border-[#EA580C]"
              >
                <Plus className="size-4 mr-1.5 text-[#EA580C]" /> Thêm màn hình / Quyền mới
              </Button>
              <Button
                onClick={handleSavePermissionMatrix}
                disabled={isPending}
                className="bg-[#EA580C] text-white rounded-xl shadow-sm"
              >
                {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Lưu phân quyền
              </Button>
            </div>
          </div>

          {permError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium">
              {permError}
            </div>
          )}

          {saveMsg && (
            <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl font-medium">
              {saveMsg}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Tính năng / Màn hình</th>
                  {rolesList.map((r) => (
                    <th key={r.code} className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-center">
                      {r.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {localPermissions.map((p) => {
                  const isBasePerm = DEFAULT_PERMISSIONS.some(
                    (dp) => dp.featureKey === p.featureKey
                  );
                  return (
                    <tr key={p.featureKey} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <b className="block text-[#0F172A]">{p.name}</b>
                              {p.category && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                                  {p.category}
                                </span>
                              )}
                            </div>
                            <code className="text-[11px] text-[#94A3B8] font-mono">{p.featureKey}</code>
                          </div>
                          {!isBasePerm && (
                            <button
                              type="button"
                              onClick={() => setDeletePermData({ featureKey: p.featureKey, name: p.name })}
                              title="Xóa quyền này khỏi hệ thống"
                              className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      {rolesList.map((r) => {
                        const checked = p.allowedRoles.includes(r.code);
                        return (
                          <td key={r.code} className="px-4 py-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(p.featureKey, r.code)}
                              className="size-4 rounded border-[#CBD5E1] text-[#EA580C] focus:ring-[#EA580C]"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AddPermissionModal
            open={addPermOpen}
            onOpenChange={setAddPermOpen}
            onCreated={handleCreatePermission}
          />

          <ConfirmDialog
            open={!!deletePermData}
            onOpenChange={(open) => !open && setDeletePermData(null)}
            title="Xóa quyền / màn hình hệ thống"
            description={`Bạn có chắc chắn muốn xóa màn hình / quyền "${deletePermData?.name}" (${deletePermData?.featureKey}) khỏi hệ thống?`}
            confirmText="Xóa quyền"
            onConfirm={confirmDeletePermission}
          />
        </section>
      )}

      {tab === "profile" && (
        <div className="space-y-6 max-w-3xl">
          {/* Card hiển thị rõ Vai trò của người dùng */}
          <div className="rounded-2xl border border-orange-200 bg-[#FFF7ED] p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <span className="text-xs font-bold text-[#EA580C] uppercase tracking-wider block">
                Vai trò tài khoản (Role)
              </span>
              <b className="text-base text-[#0F172A] mt-0.5 block">
                {rolesList.find((r) => r.code === currentUser.role)?.label || currentUser.role} ({currentUser.role})
              </b>
              <span className="text-xs text-[#64748B]">
                Vai trò được quản lý theo cấu trúc RBAC để phân quyền chức năng và dữ liệu.
              </span>
            </div>
            <span className="px-3.5 py-1.5 bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-sm">
              Đang hoạt động
            </span>
          </div>

          {/* Form thông tin cá nhân & Tên đăng nhập */}
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
                  defaultValue={currentUser.fullName}
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
                    defaultValue={currentUser.username}
                    className="field bg-slate-100 text-[#64748B] cursor-not-allowed font-mono"
                    title="Mã định danh tài khoản được cố định bởi hệ thống và không thể thay đổi."
                  />
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Mã định danh duy nhất do hệ thống quản lý (Không thể sửa)
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="email"
                  label="Email đăng ký (Cố định, không thể thay đổi)"
                  defaultValue={currentUser.email}
                  disabled
                />
                <Field
                  name="phoneNumber"
                  label="Số điện thoại"
                  placeholder="0987xxxxxx"
                  defaultValue={currentUser.phoneNumber || currentUser.profile?.phoneNumber || ""}
                />
              </div>

              <Field
                name="address"
                label="Địa chỉ cư trú"
                placeholder="VD: 123 Giải Phóng, Hai Bà Trưng, Hà Nội"
                defaultValue={currentUser.address || currentUser.profile?.address || ""}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="dateOfBirth"
                  label="Ngày sinh"
                  type="date"
                  defaultValue={currentUser.dateOfBirth || currentUser.profile?.dateOfBirth ? new Date(currentUser.dateOfBirth || currentUser.profile?.dateOfBirth).toISOString().split("T")[0] : ""}
                />
                <label className="block text-sm font-semibold text-[#0F172A]">
                  Giới tính
                  <select name="gender" className="field mt-2" defaultValue={currentUser.gender || currentUser.profile?.gender || "MALE"}>
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

          {/* Form Đổi mật khẩu */}
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

/* =========================================================================
   9. POPUPS: DYNAMIC ADD USER, CLASS, SCHOOL, EDIT MODALS & EMAIL PREVIEW
   ========================================================================= */

function UserDialog({
  open,
  onOpenChange,
  schools,
  classes,
  onAddClassShortcut,
  onCreatedSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schools: any[];
  classes: any[];
  onAddClassShortcut: () => void;
  onCreatedSuccess: (acc: any) => void;
}) {
  const [modalMode, setModalMode] = useState<"manual" | "excel">("manual");
  const [selectedRole, setSelectedRole] = useState<RoleCode>("STUDENT");
  const [previewCode, setPreviewCode] = useState<string>("HV1001");
  const [emailValue, setEmailValue] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  // Multi-assignment dynamic lists với dấu (+)
  const [managerSchools, setManagerSchools] = useState<string[]>([""]);
  const [staffClasses, setStaffClasses] = useState<string[]>([""]);
  const [studentClasses, setStudentClasses] = useState<string[]>([""]);

  // Cập nhật preview mã tài khoản khi đổi vai trò (BUG_08)
  useEffect(() => {
    let active = true;
    getNextUserCodeAction(selectedRole).then((res) => {
      if (active && res.success && res.code) {
        setPreviewCode(res.code);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedRole]);

  // Kiểm tra email theo chuẩn RFC 5322 (BUG_17)
  const validateEmail = (val: string) => {
    setEmailValue(val);
    if (!val.trim()) {
      setEmailError("");
      return;
    }
    const clean = val.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(clean)) {
      setEmailError("Email sai định dạng (phải có tên miền hợp lệ như .com, .vn, .edu.vn)");
    } else {
      setEmailError("");
    }
  };

  // State cho Excel Import tích hợp
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [analyzingExcel, setAnalyzingExcel] = useState(false);
  const [committingExcel, setCommittingExcel] = useState(false);
  const [excelReport, setExcelReport] = useState<any>(null);
  const [excelError, setExcelError] = useState("");

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setExcelFile(selected);
    setExcelError("");
    setExcelReport(null);
    setAnalyzingExcel(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const res = await parseAndValidateExcelAction(base64);
      if (!res.success) {
        setExcelError(res.error || "Lỗi xử lý file Excel!");
      } else {
        setExcelReport(res);
      }
    } catch (err: any) {
      setExcelError("Không thể đọc file: " + err.message);
    } finally {
      setAnalyzingExcel(false);
    }
  };

  const handleCommitExcel = async () => {
    if (!excelReport?.validRows || excelReport.validRows.length === 0) return;
    setCommittingExcel(true);
    try {
      const res = await commitImportUsersAction(
        excelReport.validRows,
        excelFile?.name || "import.xlsx"
      );
      if (!res.success) {
        setExcelError(res.error || "Lỗi khi lưu dữ liệu!");
      } else {
        onCreatedSuccess({
          fullName: `Đã nhập thành công ${excelReport.validCount} học viên`,
          username: "HV...",
          email: "Đã tạo tài khoản từ Excel",
          role: "Học sinh",
          tempPassword: "Simpace@2026",
        });
      }
    } catch (err: any) {
      setExcelError("Lỗi khi lưu học viên: " + err.message);
    } finally {
      setCommittingExcel(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        STT: 1,
        "Họ và tên": "Nguyễn Văn An",
        Email: "an.nguyen@gmail.com",
        "Mã lớp IELTS": classes[0]?.code || "IELTS_TD_01",
        "Số điện thoại": "0987654321",
        "Ngày sinh": "15/08/2008",
        "Giới tính": "Nam",
      },
      {
        STT: 2,
        "Họ và tên": "Trần Thị Mai",
        Email: "mai.tran@gmail.com",
        "Mã lớp IELTS": classes[0]?.code || "IELTS_TD_01",
        "Số điện thoại": "0912345678",
        "Ngày sinh": "20/11/2008",
        "Giới tính": "Nữ",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hoc_Vien");
    XLSX.writeFile(wb, "SIMPACE_Mau_Import_Hoc_Vien.xlsx");
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailValue.trim().toLowerCase())) {
      setErrorMsg("Email không đúng định dạng chuẩn có tên miền (VD: name@simpace.edu.vn)!");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const schoolIds = managerSchools.filter(Boolean);
    const classIds =
      selectedRole === "STUDENT"
        ? studentClasses.filter(Boolean)
        : staffClasses.filter(Boolean);

    startTransition(async () => {
      const res = await createUserAction({
        fullName: formData.get("fullName")?.toString() || "",
        email: emailValue.trim().toLowerCase(),
        roleCode: selectedRole,
        phoneNumber: formData.get("phoneNumber")?.toString(),
        address: formData.get("address")?.toString(),
        schoolIds: selectedRole === "SCHOOL_MANAGER" ? schoolIds : undefined,
        classIds:
          selectedRole === "TEACHER" ||
          selectedRole === "TEACHING_ASSISTANT" ||
          selectedRole === "STUDENT"
            ? classIds
            : undefined,
      });

      if (!res.success || !res.user) {
        setErrorMsg(res.error || "Không thể tạo người dùng!");
        return;
      }

      form.reset();
      onCreatedSuccess({
        fullName: res.user.profile?.fullName,
        username: res.user.username,
        email: res.user.email,
        role: res.user.role?.name,
        tempPassword: res.tempPassword,
        mailResult: res.mailResult,
      });
    });
  };

  const roleOptions: { code: RoleCode; label: string; desc: string; prefix: string }[] = [
    { code: "STUDENT", label: "Học sinh", desc: "Theo học các lớp đối tác", prefix: "HV" },
    { code: "TEACHER", label: "Giáo viên", desc: "Giảng dạy chuyên môn", prefix: "GV" },
    { code: "TEACHING_ASSISTANT", label: "Trợ giảng (TA)", desc: "Hỗ trợ học tập & lớp", prefix: "TG" },
    { code: "SCHOOL_MANAGER", label: "Quản nhiệm", desc: "Quản lý trường học đối tác", prefix: "QN" },
    { code: "ADMIN", label: "Quản trị viên", desc: "Toàn quyền hệ thống", prefix: "AD" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0F172A]">Thêm người dùng mới</DialogTitle>
          <DialogDescription>
            Tạo tài khoản đơn lẻ theo vai trò hoặc tải danh sách học viên hàng loạt từ Excel.
          </DialogDescription>
        </DialogHeader>

        {/* Chuyển đổi giữa 2 chế độ: Thủ công & Excel */}
        <div className="flex border-b border-[#E2E8F0] gap-4 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setModalMode("manual")}
            className={`pb-2.5 transition border-b-2 ${
              modalMode === "manual"
                ? "border-[#EA580C] text-[#EA580C]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Thêm thủ công (Từng người)
          </button>
          <button
            type="button"
            onClick={() => setModalMode("excel")}
            className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
              modalMode === "excel"
                ? "border-[#EA580C] text-[#EA580C]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <FileSpreadsheet className="size-4" /> Nhập hàng loạt từ Excel
          </button>
        </div>

        {/* ========================================================
            CHẾ ĐỘ 1: THÊM THỦ CÔNG (ROLE-FIRST DYNAMIC FORM)
            ======================================================== */}
        {modalMode === "manual" ? (
          <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {errorMsg}
              </div>
            )}

            {/* BƯỚC 1: CHỌN VAI TRÒ TRƯỚC TIÊN (ROLE-FIRST) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                  1. Chọn Vai trò người dùng *
                </label>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-orange-50 text-[#EA580C] rounded-lg border border-orange-200">
                  Mã dự kiến: <b className="font-mono">{previewCode}</b>
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roleOptions.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setSelectedRole(r.code)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      selectedRole === r.code
                        ? "border-[#EA580C] bg-[#FFF1EB] text-[#EA580C] shadow-sm ring-1 ring-[#EA580C]"
                        : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1]"
                    }`}
                  >
                    <span className="font-bold text-xs">{r.label}</span>
                    <span className="text-[10px] text-[#64748B] mt-0.5 line-clamp-1">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* BƯỚC 2: THÔNG TIN CÁ NHÂN CƠ BẢN */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                2. Thông tin cá nhân cơ bản
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  name="fullName"
                  label="Họ và tên *"
                  placeholder="Nhập họ và tên đầy đủ"
                  required
                />
                <div>
                  <label className="text-sm font-semibold">
                    Địa chỉ Email *
                    <input
                      name="email"
                      type="email"
                      className="field mt-2"
                      placeholder="name@simpace.edu.vn"
                      value={emailValue}
                      onChange={(e) => validateEmail(e.target.value)}
                      required
                    />
                  </label>
                  {emailError && (
                    <span className="text-xs text-rose-500 mt-1 block font-medium">
                      {emailError}
                    </span>
                  )}
                </div>
                <Field
                  name="phoneNumber"
                  label="Số điện thoại"
                  placeholder="0987xxxxxx"
                />
                <Field
                  name="address"
                  label="Địa chỉ thường trú"
                  placeholder="Số nhà, đường, quận/huyện..."
                />
              </div>
            </div>

            {/* BƯỚC 3: CÁC TRƯỜNG ĐẶC THÙ & GÁN ĐA NHIỆM (+) THEO VAI TRÒ */}
            <div className="pt-2 border-t border-[#E2E8F0]">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                3. Phân công & Nhiệm vụ theo vị trí
              </label>

              {/* A. QUẢN NHIỆM: GÁN NHIỀU TRƯỜNG PHỤ TRÁCH DẤU (+) */}
              {selectedRole === "SCHOOL_MANAGER" && (
                <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">
                        Trường học phụ trách (Quản lý đa trường)
                      </h4>
                      <p className="text-xs text-[#64748B]">
                        Quản nhiệm có thể được giao quản lý nhiều trường học đối tác cùng lúc.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setManagerSchools((prev) => [...prev, ""])}
                      className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                    >
                      <Plus className="size-3.5 mr-1" /> Thêm trường
                    </Button>
                  </div>

                  <div className="space-y-2 mt-2">
                    {managerSchools.map((schId, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className="field text-sm"
                          value={schId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManagerSchools((prev) => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                        >
                          <option value="">-- Chọn trường học phụ trách #{idx + 1} --</option>
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                        {managerSchools.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setManagerSchools((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* B. GIÁO VIÊN: GÁN NHIỀU LỚP GIẢNG DẠY DẤU (+) */}
              {selectedRole === "TEACHER" && (
                <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">
                        Lớp học phụ trách giảng dạy
                      </h4>
                      <p className="text-xs text-[#64748B]">
                        Giáo viên có thể đảm nhiệm giảng dạy nhiều lớp cùng lúc.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStaffClasses((prev) => [...prev, ""])}
                      className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                    >
                      <Plus className="size-3.5 mr-1" /> Thêm lớp
                    </Button>
                  </div>

                  <div className="space-y-2 mt-2">
                    {staffClasses.map((cId, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className="field text-sm"
                          value={cId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStaffClasses((prev) => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                        >
                          <option value="">-- Chọn lớp học #{idx + 1} --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code}) - {c.school?.name}
                            </option>
                          ))}
                        </select>
                        {staffClasses.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setStaffClasses((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* C. TRỢ GIẢNG: GÁN NHIỀU LỚP TRỢ GIẢNG DẤU (+) */}
              {selectedRole === "TEACHING_ASSISTANT" && (
                <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">
                        Lớp học phụ trách trợ giảng
                      </h4>
                      <p className="text-xs text-[#64748B]">
                        Trợ giảng có thể phụ trách hỗ trợ nhiều lớp học.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStaffClasses((prev) => [...prev, ""])}
                      className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                    >
                      <Plus className="size-3.5 mr-1" /> Thêm lớp
                    </Button>
                  </div>

                  <div className="space-y-2 mt-2">
                    {staffClasses.map((cId, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className="field text-sm"
                          value={cId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStaffClasses((prev) => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                        >
                          <option value="">-- Chọn lớp trợ giảng #{idx + 1} --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code}) - {c.school?.name}
                            </option>
                          ))}
                        </select>
                        {staffClasses.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setStaffClasses((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* D. HỌC SINH: GHI DANH VÀO LỚP HỌC DẤU (+) */}
              {selectedRole === "STUDENT" && (
                <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">Ghi danh vào lớp học</h4>
                      <p className="text-xs text-[#64748B]">
                        Chọn một hoặc nhiều lớp học mà học viên này theo học.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStudentClasses((prev) => [...prev, ""])}
                        className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                      >
                        <Plus className="size-3.5 mr-1" /> Thêm lớp
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onAddClassShortcut}
                        title="Tạo nhanh lớp mới"
                        className="text-xs h-7"
                      >
                        <CirclePlus className="size-3.5 mr-1 text-[#EA580C]" /> Tạo lớp mới
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-2">
                    {studentClasses.map((cId, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          className="field text-sm"
                          value={cId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStudentClasses((prev) => {
                              const next = [...prev];
                              next[idx] = val;
                              return next;
                            });
                          }}
                        >
                          <option value="">-- Chọn lớp học #{idx + 1} --</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.code}) - {c.school?.name}
                            </option>
                          ))}
                        </select>
                        {studentClasses.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setStudentClasses((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* E. QUẢN TRỊ VIÊN */}
              {selectedRole === "ADMIN" && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  <b>Lưu ý:</b> Tài khoản Quản trị viên có toàn quyền kiểm soát toàn bộ trường học,
                  lớp học, phân quyền và cấu hình hệ thống mà không bị giới hạn trường lớp.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending || !!emailError}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white"
              >
                {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Tạo tài khoản
              </Button>
            </div>
          </form>
        ) : (
          /* ========================================================
             CHẾ ĐỘ 2: NHẬP HÀNG LOẠT TỪ EXCEL (TÍCH HỢP)
             ======================================================== */
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-[#0F172A]">File mẫu Excel chuẩn SIMPACE</h4>
                <p className="text-xs text-[#64748B]">
                  Bao gồm các cột: STT, Họ và tên, Email, Mã lớp IELTS, SĐT, Ngày sinh, Giới tính.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadSample}
                className="text-xs border-[#CBD5E1] text-[#0F172A] hover:border-[#EA580C]"
              >
                <Download className="size-3.5 mr-1 text-[#EA580C]" /> Tải file mẫu (.xlsx)
              </Button>
            </div>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#EA580C] rounded-2xl p-6 text-center transition bg-[#F8FAFC]">
              <FileSpreadsheet className="size-10 mx-auto text-[#EA580C] mb-2" />
              <p className="text-sm font-semibold text-[#0F172A]">
                {excelFile ? excelFile.name : "Kéo thả file Excel học viên vào đây hoặc duyệt file"}
              </p>
              <p className="text-xs text-[#94A3B8] mt-1">Hỗ trợ định dạng .xlsx, .xls</p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleExcelChange}
                className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FFF1EB] file:text-[#EA580C] hover:file:bg-[#FFE5D6] cursor-pointer"
              />
            </div>

            {analyzingExcel && (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#EA580C] font-medium">
                <Loader2 className="size-5 animate-spin" /> Đang phân tích và kiểm tra tính hợp lệ...
              </div>
            )}

            {excelError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
                {excelError}
              </div>
            )}

            {/* Kết quả phân tích */}
            {excelReport && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                    <span className="text-xs text-slate-500 block">Tổng số dòng</span>
                    <b className="text-lg text-slate-800">{excelReport.totalRows}</b>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs text-emerald-600 block">Hợp lệ để nhập</span>
                    <b className="text-lg text-emerald-700">{excelReport.validCount}</b>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-xs text-rose-500 block">Bị lỗi từ chối</span>
                    <b className="text-lg text-rose-600">{excelReport.errorCount}</b>
                  </div>
                </div>

                {excelReport.errorRows?.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 space-y-1">
                    <b className="block font-bold">Danh sách dòng không hợp lệ:</b>
                    {excelReport.errorRows.map((err: any, idx: number) => (
                      <div key={idx}>
                        • Dòng {err.stt}: {err.fullName} ({err.email}) — <i>{err.reason}</i>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    disabled={committingExcel || excelReport.validCount === 0}
                    onClick={handleCommitExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {committingExcel ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Check className="mr-1.5 size-4" />
                    )}
                    Xác nhận nhập {excelReport.validCount} học viên
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AccountCreatedEmailDialog({
  info,
  onClose,
}: {
  info: any;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    navigator.clipboard.writeText(
      `Tài khoản SIMPACE LMS:\nEmail: ${info.email}\nTên đăng nhập: ${info.username}\nMật khẩu tạm thời: ${info.tempPassword}\nLink đăng nhập: http://localhost:3000`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <Mail className="size-5" /> Thông tin Email kích hoạt tài khoản
          </DialogTitle>
          <DialogDescription>
            Hệ thống đã chuẩn bị email kích hoạt gửi đến người dùng mới.
          </DialogDescription>
        </DialogHeader>

        {info.mailResult?.sent ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
            <CircleCheck className="size-5 text-emerald-600 shrink-0" />
            <span>
              <b>Email đã được gửi thành công:</b> Hệ thống đã gửi thư kích hoạt kèm thông tin đăng nhập trực tiếp đến hòm thư <b>{info.email}</b>.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <Bell className="size-4 text-amber-600 shrink-0" />
              <span>Chưa cấu hình tài khoản gửi Gmail (Môi trường phát triển)</span>
            </div>
            <p className="text-[11.5px] text-amber-700 leading-relaxed">
              Hệ thống chưa gửi mail thực tế do file <code>.env</code> chưa điền <code>SMTP_USER</code> và <code>SMTP_PASS</code> (Mật khẩu ứng dụng 16 ký tự của Google). Bạn có thể bấm nút <b>"Sao chép thông tin"</b> bên dưới để bàn giao cho người dùng.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm space-y-2.5 font-sans">
          <p className="text-[#64748B]">
            Người nhận: <b>{info.fullName}</b> ({info.role})
          </p>
          <div className="border-t border-[#E2E8F0] pt-2.5 space-y-1.5">
            <p>
              Tên đăng nhập / Mã: <b className="font-mono text-[#0F172A]">{info.username}</b>
            </p>
            <p>
              Email đăng ký: <b className="font-mono text-[#0F172A]">{info.email}</b>
            </p>
            <p>
              Mật khẩu tạm thời:{" "}
              <b className="font-mono bg-amber-100 px-2 py-0.5 rounded text-amber-800">
                {info.tempPassword}
              </b>
            </p>
            <p className="text-xs text-[#64748B] italic pt-1">
              * Người dùng sẽ được yêu cầu xác thực OTP và đổi mật khẩu mới trong lần đăng nhập đầu tiên.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3">
          <Button variant="outline" size="sm" onClick={copyText} className="gap-1.5">
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            {copied ? "Đã sao chép!" : "Sao chép thông tin"}
          </Button>
          <Button onClick={onClose} className="bg-[#EA580C] text-white">
            Hoàn tất
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClassDialog({
  open,
  onOpenChange,
  schools,
  teachers,
  tas,
  onAddSchoolShortcut,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schools: any[];
  teachers: any[];
  tas: any[];
  onAddSchoolShortcut: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("IELTS");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(30);

  // Gán đa nhiệm GV và TA (+)
  const [teacherIds, setTeacherIds] = useState<string[]>([""]);
  const [taIds, setTaIds] = useState<string[]>([""]);

  // Date & Time Picker
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [customSchedule, setCustomSchedule] = useState("");

  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  // Khi chọn thứ hoặc giờ -> tự cập nhật chuỗi thời khóa biểu
  useEffect(() => {
    if (selectedDays.length > 0) {
      const dayStr = selectedDays.join(", ");
      const timeStr = startTime && endTime ? ` • ${startTime} - ${endTime}` : "";
      setCustomSchedule(`${dayStr}${timeStr}`);
    }
  }, [selectedDays, startTime, endTime]);

  // Tự sinh mã lớp học khi chọn Trường hoặc Chương trình đào tạo (BUG_07)
  useEffect(() => {
    if (selectedSchoolId) {
      getNextClassCodeAction(selectedSchoolId, selectedProgram).then((res) => {
        if (res && res.success && res.code) {
          setCode(res.code);
        }
      });
    } else {
      setCode("");
    }
  }, [selectedSchoolId, selectedProgram]);

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleAddTeacher = () => setTeacherIds((prev) => [...prev, ""]);
  const handleRemoveTeacher = (idx: number) => setTeacherIds((prev) => prev.filter((_, i) => i !== idx));
  const handleTeacherChange = (idx: number, val: string) => {
    setTeacherIds((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleAddTa = () => setTaIds((prev) => [...prev, ""]);
  const handleRemoveTa = (idx: number) => setTaIds((prev) => prev.filter((_, i) => i !== idx));
  const handleTaChange = (idx: number, val: string) => {
    setTaIds((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedSchoolId) {
      setErrorMsg("Vui lòng chọn trường học đối tác!");
      return;
    }
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên lớp học!");
      return;
    }

    startTransition(async () => {
      const res = await createClassAction({
        code: code.trim(),
        name: name.trim(),
        schoolId: selectedSchoolId,
        program: selectedProgram as any,
        capacity: Number(capacity) || 30,
        teacherIds: teacherIds.filter(Boolean),
        taIds: taIds.filter(Boolean),
        schedule: customSchedule.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể tạo lớp học!");
        return;
      }

      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo lớp học mới</DialogTitle>
          <DialogDescription>
            Lớp học sẽ trực thuộc trường học đối tác, hỗ trợ tự sinh mã lớp, bộ chọn lịch học thông minh và gán đa giáo viên / trợ giảng.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Trường học & Thêm nhanh trường */}
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                Trường học đối tác *
              </label>
              <div className="flex gap-2">
                <select
                  required
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="field flex-1"
                >
                  <option value="">-- Chọn trường học đối tác --</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onAddSchoolShortcut}
                  title="Thêm nhanh trường học mới"
                  className="shrink-0"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>

            {/* Chương trình đào tạo */}
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                Chương trình đào tạo
              </label>
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="field"
              >
                <option value="IELTS">IELTS</option>
                <option value="SAT">SAT</option>
                <option value="CAMBRIDGE">Cambridge</option>
                <option value="OTHER">Chương trình khác</option>
              </select>
            </div>

            {/* Sĩ số tối đa */}
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                Sĩ số tối đa
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="field"
              />
            </div>

            {/* Mã lớp học (Tự sinh hoặc sửa) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-[#0F172A]">Mã lớp học *</label>
                <span className="text-[11px] text-[#EA580C] font-semibold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  Tự động sinh mã
                </span>
              </div>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: IELTS_TD_01"
                className="field font-mono font-bold uppercase"
              />
              <p className="text-[11px] text-[#64748B] mt-1">
                Quy chuẩn: [Chương trình]_[MãTrường]_[STT]
              </p>
            </div>

            {/* Tên lớp học */}
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                Tên lớp học *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: IELTS Bứt Phá - 10A1"
                className="field"
              />
            </div>
          </div>

          {/* KHỐI BỘ CHỌN LỊCH HỌC & THỜI KHÓA BIỂU (DATE TIME PICKER) */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3.5">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[#EA580C]" />
              <h3 className="text-sm font-bold text-[#0F172A]">Thời khóa biểu &amp; Lịch học</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">
                  Ngày khai giảng / bắt đầu
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="field text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] block mb-1">
                  Ngày bế giảng / kết thúc
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="field text-sm"
                />
              </div>
            </div>

            {/* Pills chọn ngày trong tuần */}
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1.5">
                Các buổi học trong tuần:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {daysOfWeek.map((day) => {
                  const active = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        active
                          ? "bg-[#EA580C] text-white shadow-sm"
                          : "bg-white border border-[#CBD5E1] text-[#64748B] hover:border-[#EA580C]"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Picker */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[#475569] flex items-center gap-1 mb-1">
                  <Clock className="size-3.5 text-[#EA580C]" /> Giờ bắt đầu
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="field text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#475569] flex items-center gap-1 mb-1">
                  <Clock className="size-3.5 text-[#EA580C]" /> Giờ kết thúc
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="field text-sm"
                />
              </div>
            </div>

            {/* Chuỗi tóm tắt lịch học */}
            <div>
              <label className="text-xs font-semibold text-[#475569] block mb-1">
                Chuỗi tóm tắt lịch học (Tự động cập nhật hoặc sửa trực tiếp)
              </label>
              <input
                type="text"
                value={customSchedule}
                onChange={(e) => setCustomSchedule(e.target.value)}
                placeholder="VD: Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00"
                className="field text-sm bg-white font-medium"
              />
            </div>
          </div>

          {/* GÁN ĐA GIÁO VIÊN & ĐA TRỢ GIẢNG (+) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Danh sách giáo viên */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#0F172A]">
                  Giáo viên giảng dạy
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTeacher}
                  className="h-6 text-xs text-[#EA580C] hover:bg-orange-50 font-semibold px-2"
                >
                  <Plus className="size-3 mr-1" /> Thêm GV (+)
                </Button>
              </div>
              {teacherIds.map((tid, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <select
                    value={tid}
                    onChange={(e) => handleTeacherChange(idx, e.target.value)}
                    className="field text-sm flex-1"
                  >
                    <option value="">-- Chọn giáo viên --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.profile?.fullName || t.username} ({t.username})
                      </option>
                    ))}
                  </select>
                  {teacherIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTeacher(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa giáo viên này"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Danh sách trợ giảng */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#0F172A]">
                  Trợ giảng (TA) phụ trách
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTa}
                  className="h-6 text-xs text-[#EA580C] hover:bg-orange-50 font-semibold px-2"
                >
                  <Plus className="size-3 mr-1" /> Thêm TA (+)
                </Button>
              </div>
              {taIds.map((tid, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <select
                    value={tid}
                    onChange={(e) => handleTaChange(idx, e.target.value)}
                    className="field text-sm flex-1"
                  >
                    <option value="">-- Chọn trợ giảng --</option>
                    {tas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.profile?.fullName || t.username} ({t.username})
                      </option>
                    ))}
                  </select>
                  {taIds.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTa(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                      title="Xóa trợ giảng này"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Tạo lớp học
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SchoolSheet({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [codePreview, setCodePreview] = useState("SCH_SIM");

  useEffect(() => {
    if (schoolName.trim()) {
      getNextSchoolCodeAction(schoolName.trim()).then((res) => {
        if (res.success && res.code) setCodePreview(res.code);
      });
    } else {
      setCodePreview("SCH_SIM");
    }
  }, [schoolName]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createSchoolAction({
        name: schoolName.trim(),
        type: (formData.get("type")?.toString() as any) || "THPT",
        contactPhone: formData.get("contactPhone")?.toString(),
        address: formData.get("address")?.toString(),
        contactName: formData.get("contactName")?.toString(),
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể tạo trường học!");
        return;
      }

      form.reset();
      setSchoolName("");
      onDone();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Thêm trường học mới</SheetTitle>
          <SheetDescription>
            Tạo trường học đối tác mới (Quản nhiệm sẽ được gán tại Quản lý người dùng).
          </SheetDescription>
        </SheetHeader>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-semibold text-[#0F172A] block">
              Tên trường học *
              <input
                name="name"
                required
                className="field mt-2"
                placeholder="VD: THPT Trương Định"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </label>
          </div>

          <div>
            <label className="text-sm font-semibold text-[#0F172A] block">
              Mã trường học (Tự động sinh)
              <input
                name="code"
                readOnly
                disabled
                className="field mt-2 bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
                value={codePreview}
                title="Mã trường học được hệ thống tự động sinh theo quy tắc viết tắt"
              />
            </label>
            <p className="text-[11px] text-[#64748B] mt-1">
              * Hệ thống tự động sinh mã viết tắt chuẩn hóa khi lưu.
            </p>
          </div>

          <label className="block text-sm font-semibold">
            Khối / Cấp học
            <select name="type" className="field mt-2" defaultValue="THPT">
              <option value="THPT">THPT</option>
              <option value="THCS">THCS</option>
              <option value="UNIVERSITY">Đại học</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>

          <Field name="contactPhone" label="Số điện thoại liên hệ BGH" placeholder="0987xxxxxx" />
          <Field name="contactName" label="Đại diện liên hệ BGH" placeholder="Thầy/Cô..." />
          <Field name="address" label="Địa chỉ trường học" placeholder="Địa chỉ chi tiết..." />

          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Thêm trường
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function EditSchoolModal({
  school,
  managers,
  onClose,
  onDone,
}: {
  school: any;
  managers: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateSchoolAction(school.id, {
        name: formData.get("name")?.toString(),
        type: formData.get("type")?.toString() as any,
        managerId: formData.get("managerId")?.toString(),
        contactPhone: formData.get("contactPhone")?.toString(),
        address: formData.get("address")?.toString(),
      });
      onDone();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa trường học</DialogTitle>
          <DialogDescription>Mã trường: {school.code}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-4">
          <Field name="name" label="Tên trường học" defaultValue={school.name} required />
          <label className="block text-sm font-semibold">
            Khối / Cấp học
            <select name="type" className="field mt-2" defaultValue={school.type}>
              <option value="THPT">THPT</option>
              <option value="THCS">THCS</option>
              <option value="UNIVERSITY">Đại học</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Quản nhiệm phụ trách
            <select name="managerId" className="field mt-2" defaultValue={school.managerId || ""}>
              <option value="">-- Chưa gán quản nhiệm --</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.fullName || m.username}
                </option>
              ))}
            </select>
          </label>
          <Field name="contactPhone" label="Số điện thoại" defaultValue={school.contactPhone} />
          <Field name="address" label="Địa chỉ" defaultValue={school.address} />

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Lưu thay đổi
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditClassModal({
  classItem,
  teachers,
  tas,
  onClose,
  onDone,
}: {
  classItem: any;
  teachers: any[];
  tas: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const currentTeacherId = classItem.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.userId;
  const currentTaId = classItem.assignments?.find((a: any) => a.roleInClass === "TEACHING_ASSISTANT")?.userId;

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateClassAction(classItem.id, {
        name: formData.get("name")?.toString(),
        program: formData.get("program")?.toString() as any,
        capacity: Number(formData.get("capacity")) || 30,
        status: formData.get("status")?.toString() as any,
        teacherId: formData.get("teacherId")?.toString(),
        taId: formData.get("taId")?.toString(),
        schedule: formData.get("schedule")?.toString(),
        startDate: formData.get("startDate")?.toString(),
        endDate: formData.get("endDate")?.toString(),
      });
      onDone();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa lớp học</DialogTitle>
          <DialogDescription>Mã lớp: {classItem.code} • Trường: {classItem.school?.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-4">
          <Field name="name" label="Tên lớp học" defaultValue={classItem.name} required />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Trạng thái
              <select name="status" className="field mt-2" defaultValue={classItem.status}>
                <option value="ACTIVE">Đang diễn ra</option>
                <option value="UPCOMING">Sắp khai giảng</option>
                <option value="FINISHED">Đã kết thúc</option>
              </select>
            </label>
            <Field name="capacity" label="Sĩ số tối đa" type="number" defaultValue={classItem.capacity} />
          </div>

          <Field
            name="schedule"
            label="Lịch học / Thời khóa biểu"
            placeholder="VD: Thứ 2, 4, 6 • 18:30 - 20:30"
            defaultValue={classItem.description || ""}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="startDate"
              label="Ngày bắt đầu"
              type="date"
              defaultValue={
                classItem.startDate
                  ? new Date(classItem.startDate).toISOString().split("T")[0]
                  : ""
              }
            />
            <Field
              name="endDate"
              label="Ngày kết thúc"
              type="date"
              defaultValue={
                classItem.endDate
                  ? new Date(classItem.endDate).toISOString().split("T")[0]
                  : ""
              }
            />
          </div>

          <label className="block text-sm font-semibold">
            Giáo viên phụ trách
            <select name="teacherId" className="field mt-2" defaultValue={currentTeacherId || ""}>
              <option value="">-- Chưa phân công --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.profile?.fullName || t.username}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Trợ giảng (TA)
            <select name="taId" className="field mt-2" defaultValue={currentTaId || ""}>
              <option value="">-- Chưa phân công --</option>
              {tas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.profile?.fullName || t.username}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Lưu thay đổi
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserModal({
  user,
  schools = [],
  classes = [],
  onClose,
  onDone,
}: {
  user: any;
  schools?: any[];
  classes?: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleCode>(user.role?.code || "STUDENT");

  // Khởi tạo danh sách gán trường / lớp ban đầu của user
  const initialSchools =
    user.managedSchools?.map((s: any) => s.id) || (user.managedSchools?.length ? [] : [""]);
  const initialClasses =
    user.role?.code === "STUDENT"
      ? user.classEnrollments?.map((e: any) => e.classId) || [""]
      : user.classAssignments?.map((a: any) => a.classId) || [""];

  const [managerSchools, setManagerSchools] = useState<string[]>(
    initialSchools.length > 0 ? initialSchools : [""]
  );
  const [assignedClasses, setAssignedClasses] = useState<string[]>(
    initialClasses.length > 0 ? initialClasses : [""]
  );

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);

    const schoolIds = managerSchools.filter(Boolean);
    const classIds = assignedClasses.filter(Boolean);

    startTransition(async () => {
      const res = await updateUserAction(user.id, {
        fullName: formData.get("fullName")?.toString()?.trim(),
        email: formData.get("email")?.toString()?.trim(),
        phoneNumber: formData.get("phoneNumber")?.toString()?.trim(),
        address: formData.get("address")?.toString()?.trim(),
        roleCode: selectedRole,
        schoolIds: selectedRole === "SCHOOL_MANAGER" ? schoolIds : undefined,
        classIds:
          selectedRole === "TEACHER" ||
          selectedRole === "TEACHING_ASSISTANT" ||
          selectedRole === "STUDENT"
            ? classIds
            : undefined,
        newPassword: formData.get("newPassword")?.toString()?.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể cập nhật người dùng!");
        return;
      }

      onDone();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông tin người dùng</DialogTitle>
          <DialogDescription>
            Cập nhật hồ sơ, vai trò, phân công trường/lớp hoặc đặt lại mật khẩu.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              name="fullName"
              label="Họ và tên *"
              defaultValue={user.profile?.fullName || user.username}
              required
            />
            <Field
              name="email"
              type="email"
              label="Địa chỉ Email *"
              defaultValue={user.email}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* BUG_12: Username là READ-ONLY / DISABLED tuyệt đối */}
            <div>
              <label className="text-sm font-semibold text-[#0F172A] block">
                Mã tài khoản (Cố định)
                <input
                  name="username"
                  defaultValue={user.username}
                  disabled
                  readOnly
                  className="field mt-2 bg-slate-100 text-slate-500 cursor-not-allowed font-mono"
                  title="Mã tài khoản định danh không thể chỉnh sửa"
                />
              </label>
            </div>
            <Field
              name="phoneNumber"
              label="Số điện thoại"
              defaultValue={user.profile?.phoneNumber || ""}
              placeholder="0987xxxxxx"
            />
          </div>

          {/* Bổ sung ô Địa chỉ (BUG_16) */}
          <Field
            name="address"
            label="Địa chỉ thường trú"
            defaultValue={user.profile?.address || ""}
            placeholder="Số nhà, đường, quận/huyện..."
          />

          <label className="block text-sm font-semibold">
            Vai trò
            <select
              name="roleCode"
              className="field mt-2"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as RoleCode)}
            >
              <option value="STUDENT">Học sinh</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="TEACHING_ASSISTANT">Trợ giảng</option>
              <option value="SCHOOL_MANAGER">Quản nhiệm</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </label>

          {/* PHÂN CÔNG ĐA NHIỆM (+) CHO QUẢN NHIỆM */}
          {selectedRole === "SCHOOL_MANAGER" && (
            <div className="space-y-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs">
              <div className="flex justify-between items-center">
                <b className="text-slate-800">Trường học phụ trách (Quản lý đa trường):</b>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setManagerSchools((prev) => [...prev, ""])}
                  className="h-6 text-[11px] border-[#EA580C] text-[#EA580C]"
                >
                  <Plus className="size-3 mr-1" /> Thêm trường
                </Button>
              </div>
              {managerSchools.map((schId, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="field text-xs"
                    value={schId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManagerSchools((prev) => {
                        const next = [...prev];
                        next[idx] = val;
                        return next;
                      });
                    }}
                  >
                    <option value="">-- Chọn trường học phụ trách --</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  {managerSchools.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setManagerSchools((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="size-7 text-slate-400 hover:text-rose-500 shrink-0"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* PHÂN CÔNG ĐA NHIỆM (+) CHO GV, TA HOẶC HỌC SINH */}
          {(selectedRole === "TEACHER" ||
            selectedRole === "TEACHING_ASSISTANT" ||
            selectedRole === "STUDENT") && (
            <div className="space-y-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-xs">
              <div className="flex justify-between items-center">
                <b className="text-slate-800">
                  {selectedRole === "STUDENT"
                    ? "Lớp học theo học (Ghi danh đa lớp):"
                    : "Lớp học phụ trách (Đảm nhiệm đa lớp):"}
                </b>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignedClasses((prev) => [...prev, ""])}
                  className="h-6 text-[11px] border-[#EA580C] text-[#EA580C]"
                >
                  <Plus className="size-3 mr-1" /> Thêm lớp
                </Button>
              </div>
              {assignedClasses.map((cId, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="field text-xs"
                    value={cId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssignedClasses((prev) => {
                        const next = [...prev];
                        next[idx] = val;
                        return next;
                      });
                    }}
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) - {c.school?.name}
                      </option>
                    ))}
                  </select>
                  {assignedClasses.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setAssignedClasses((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="size-7 text-slate-400 hover:text-rose-500 shrink-0"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2">
            <label className="block text-sm font-semibold text-[#0F172A]">
              Đặt lại mật khẩu mới (Tùy chọn)
            </label>
            <div className="relative">
              <input
                name="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Để trống nếu không muốn đổi mật khẩu"
                className="field pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[11.5px] text-[#64748B]">
              * Nếu bạn điền mật khẩu mới (tối thiểu 6 ký tự), mật khẩu của tài khoản này sẽ được cập nhật trực tiếp ngay lập tức.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Lưu thay đổi
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   UI HELPER COMPONENTS
   ========================================================================= */

function ConfirmDialog({
  open,
  onOpenChange,
  title = "Xác nhận xóa",
  description = "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?",
  confirmText = "Xóa",
  cancelText = "Hủy",
  onConfirm,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Trash2 className="size-5" />
          </div>
          <div className="flex-1 space-y-1">
            <DialogTitle className="text-base font-bold text-[#0F172A]">{title}</DialogTitle>
            <DialogDescription className="text-sm text-[#64748B] leading-relaxed pt-1">
              {description}
            </DialogDescription>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="border-[#CBD5E1]"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700 shadow-sm"
          >
            {isPending ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  type = "text",
  defaultValue,
  disabled,
}: {
  name?: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-[#0F172A]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="field mt-2 disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]"
      />
    </label>
  );
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel">
      <h2 className="font-bold text-base text-[#0F172A]">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.map((x, i) => (
          <div key={x} className="flex items-center gap-3 text-sm">
            <span className="grid size-8 place-items-center rounded-xl bg-[#FFF1EB] text-[#EA580C] shrink-0">
              {i === 0 ? <UserRound className="size-4" /> : <BookOpen className="size-4" />}
            </span>
            <span className="truncate text-[#334155]">{x}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#FFF1EB] px-2.5 py-1 text-xs font-bold text-[#EA580C]">
      {children}
    </span>
  );
}

function Status({
  children,
  tone = "success",
}: {
  children: React.ReactNode;
  tone?: "success" | "warn" | "neutral";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        tone === "success"
          ? "bg-emerald-50 text-emerald-700"
          : tone === "warn"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function subtitle(view: View) {
  return {
    users: "Quản lý tài khoản, phân quyền và dữ liệu học viên/giáo viên trên toàn hệ thống.",
    schools: "Quản lý thông tin và phân công quản nhiệm tại các trường học đối tác.",
    classes: "Theo dõi lớp đang diễn ra, sắp khai giảng và lịch sử các khóa học đã bế giảng.",
    "class-detail": "Thông tin chi tiết lớp học, nhân sự phụ trách và danh sách học viên.",
    schedule: "Thời khóa biểu các lớp học đang diễn ra trong kỳ học.",
    import: "Tải lên file Excel chuẩn 7 cột để thêm học viên và ghi danh vào lớp tự động.",
    settings: "Thiết lập cấu hình hệ thống, hồ sơ cá nhân và ma trận phân quyền RBAC.",
    "custom-module": "Màn hình chức năng mở rộng được phân quyền động từ cơ sở dữ liệu.",
    dashboard: "",
  }[view];
}

function AddPermissionModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (data: {
    featureKey: string;
    name: string;
    category?: string;
    allowedRoles: RoleCode[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [featureKey, setFeatureKey] = useState("");
  const [category, setCategory] = useState("Đào tạo");
  const [selectedRoles, setSelectedRoles] = useState<RoleCode[]>([
    "ADMIN",
    "SCHOOL_MANAGER",
  ]);
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  const handleNameChange = (val: string) => {
    setName(val);
    const clean = val
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
    setFeatureKey("VIEW_" + clean);
  };

  const toggleRole = (rc: RoleCode) => {
    setSelectedRoles((prev) =>
      prev.includes(rc) ? prev.filter((r) => r !== rc) : [...prev, rc]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !featureKey.trim()) {
      setErr("Vui lòng điền đủ tên và mã tính năng!");
      return;
    }
    startTransition(async () => {
      try {
        await onCreated({
          featureKey,
          name: name.trim(),
          category: category.trim(),
          allowedRoles: selectedRoles,
        });
      } catch (e: any) {
        setErr(e.message || "Lỗi tạo tính năng");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm tính năng / Màn hình mới</DialogTitle>
          <DialogDescription>
            Tạo mới tính năng trực tiếp trên hệ thống mà không cần sửa code. Phân quyền sẽ được lưu vào cơ sở dữ liệu.
          </DialogDescription>
        </DialogHeader>

        {err && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-[#0F172A]">
            Tên tính năng / Màn hình *
            <input
              className="field mt-1.5"
              placeholder="VD: Quản lý Điểm danh & Chuyên cần"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm font-semibold text-[#0F172A]">
            Mã định danh (Feature Key) *
            <input
              className="field mt-1.5 font-mono"
              placeholder="VD: VIEW_ATTENDANCE"
              value={featureKey}
              onChange={(e) => setFeatureKey(e.target.value.toUpperCase())}
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Quy ước viết hoa không dấu, nối bằng dấu gạch dưới (VD: VIEW_EXAM).
            </span>
          </label>

          <label className="block text-sm font-semibold text-[#0F172A]">
            Phân nhóm
            <select
              className="field mt-1.5"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Đào tạo">Đào tạo</option>
              <option value="Học viên">Học viên</option>
              <option value="Khảo thí & Điểm số">Khảo thí & Điểm số</option>
              <option value="Báo cáo">Báo cáo</option>
              <option value="Hệ thống">Hệ thống</option>
              <option value="Mở rộng">Mở rộng khác</option>
            </select>
          </label>

          <div>
            <span className="block text-sm font-semibold text-[#0F172A] mb-2">
              Các vai trò được phép truy cập ban đầu:
            </span>
            <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
              {[
                { code: "ADMIN" as RoleCode, label: "Quản trị viên" },
                { code: "SCHOOL_MANAGER" as RoleCode, label: "Quản nhiệm" },
                { code: "TEACHER" as RoleCode, label: "Giáo viên" },
                { code: "TEACHING_ASSISTANT" as RoleCode, label: "Trợ giảng" },
                { code: "STUDENT" as RoleCode, label: "Học sinh" },
              ].map((r) => (
                <label key={r.code} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r.code)}
                    onChange={() => toggleRole(r.code)}
                    className="size-4 rounded text-[#EA580C] focus:ring-[#EA580C]"
                  />
                  <span className="text-xs font-medium text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null} Thêm tính năng
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomModuleView({
  perm,
  currentUser,
  onNavigateBack,
}: {
  perm: any;
  currentUser: any;
  onNavigateBack: () => void;
}) {
  return (
    <section className="panel max-w-3xl">
      <div className="flex items-center gap-3.5 border-b border-[#E2E8F0] pb-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-orange-100 text-[#EA580C]">
          <ShieldCheck className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-[#0F172A]">{perm.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold">
              Nhóm: {perm.category || "Mở rộng"}
            </span>
            <code className="text-xs text-slate-400 font-mono">Mã: {perm.featureKey}</code>
          </div>
        </div>
      </div>

      <div className="py-6 space-y-4">
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <p className="font-semibold">
            ✓ Vai trò của bạn ({currentUser.role}) đã được cấp quyền truy cập màn hình này.
          </p>
          <p className="text-xs text-emerald-700 mt-1">
            Màn hình này được khởi tạo và phân quyền hoàn toàn thông qua giao diện Quản trị viên (Dynamic RBAC), không cần can thiệp mã nguồn.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm">
          <h3 className="font-bold text-[#0F172A] mb-2">Các vai trò được phép truy cập theo CSDL:</h3>
          <div className="flex flex-wrap gap-2">
            {perm.allowedRoles?.map((r: string) => (
              <span
                key={r}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-[#0F172A]"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 italic">
          * Các tính năng xử lý dữ liệu chi tiết của phân hệ này sẽ được đồng hành phát triển theo lộ trình của các Sprint tiếp theo.
        </p>
      </div>

      <div className="border-t border-[#E2E8F0] pt-4">
        <Button variant="outline" onClick={onNavigateBack} className="rounded-xl">
          ← Quay lại Tổng quan
        </Button>
      </div>
    </section>
  );
}
