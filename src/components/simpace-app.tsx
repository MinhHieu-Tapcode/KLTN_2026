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
      getSchoolsAction(),
      getClassesAction(),
      getUsersAction(),
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
            {hasPerm("IMPORT_EXCEL") && (
              <NavItem
                icon={Upload}
                label="Import / Export Excel"
                active={view === "import"}
                onClick={() => navigate("import")}
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
                {view === "schools" && (
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
                onRefresh={refreshAll}
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
                  name="password"
                  required
                  className="field pr-11"
                  type={showPassword ? "text" : "password"}
                  defaultValue="simpace2026"
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
  onRefresh,
  onEditUser,
}: {
  users: any[];
  onRefresh: () => void;
  onEditUser: (u: any) => void;
}) {
  const [tab, setTab] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();

  const filtered = users.filter((u) => {
    const matchesTab =
      tab === "Tất cả" ||
      (tab === "Quản trị viên" && u.role?.code === "ADMIN") ||
      (tab === "Quản nhiệm" && u.role?.code === "SCHOOL_MANAGER") ||
      (tab === "Giáo viên" && u.role?.code === "TEACHER") ||
      (tab === "Trợ giảng" && u.role?.code === "TEACHING_ASSISTANT") ||
      (tab === "Học sinh" && u.role?.code === "STUDENT");

    const matchesSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.profile?.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase());

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
      description: `Bạn có chắc chắn muốn xóa ${selectedIds.length} người dùng đã chọn? Thao tác này sẽ chuyển trạng thái người dùng sang không hoạt động.`,
      action: async () => {
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
      description: `Bạn có chắc chắn muốn xóa người dùng ${name ? `"${name}"` : "này"}? Thao tác này sẽ chuyển trạng thái người dùng sang không hoạt động.`,
      action: async () => {
        await deleteUserAction(id);
        onRefresh();
      },
    });
  };

  return (
    <section className="panel overflow-hidden">
      <div className="mb-5 flex gap-6 overflow-x-auto border-b border-[#E2E8F0]">
        {["Tất cả", "Quản trị viên", "Quản nhiệm", "Giáo viên", "Trợ giảng", "Học sinh"].map((t) => (
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

      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="field field-search border-[#CBD5E1]"
            placeholder="Tìm kiếm người dùng..."
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
            <Trash2 className="size-4 mr-1.5" /> Xóa ({selectedIds.length}) mục đã chọn
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
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Họ và tên</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Email / Mã</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Vai trò</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trường / Lớp</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {filtered.length > 0 ? (
              filtered.map((u) => (
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
                      <span>{u.profile?.fullName || u.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[#475569]">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <Badge>{u.role?.name || u.role?.code}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-[#64748B] text-xs">
                    {u.classEnrollments?.[0]?.class?.name || u.managedSchools?.[0]?.name || "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <Status tone={u.isActive ? "success" : "neutral"}>
                      {u.isActive ? "Hoạt động" : "Tạm khóa"}
                    </Status>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[#64748B] hover:text-[#0F172A]"
                        onClick={() => onEditUser(u)}
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[#64748B] hover:text-[#EF4444]"
                        onClick={() => handleDeleteSingle(u.id, u.profile?.fullName || u.username)}
                        title="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();

  const filtered = schools.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

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
      description: `Bạn có chắc chắn muốn xóa ${selectedIds.length} trường học đã chọn? Thao tác này sẽ chuyển trạng thái các trường học sang không hoạt động.`,
      action: async () => {
        await deleteMultipleSchoolsAction(selectedIds);
        setSelectedIds([]);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (id: string, name?: string) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa trường học",
      description: `Bạn có chắc chắn muốn xóa trường học ${name ? `"${name}"` : "này"}? Thao tác này sẽ chuyển trạng thái trường học sang không hoạt động.`,
      action: async () => {
        await deleteSchoolAction(id);
        onRefresh();
      },
    });
  };

  return (
    <section className="panel">
      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="field field-search border-[#CBD5E1]"
            placeholder="Tìm kiếm trường học theo tên, mã..."
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
                <tr key={s.id} className="hover:bg-[#F8FAFC] transition">
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      className="rounded border-[#CBD5E1]"
                    />
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#0F172A]">{s.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#64748B]">{s.code}</td>
                  <td className="px-4 py-3.5 text-[#475569]">{s.type}</td>
                  <td className="px-4 py-3.5 text-[#0F172A] font-medium">
                    {s.manager?.profile?.fullName || s.manager?.username || (
                      <span className="text-[#94A3B8] italic">Chưa phân công</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#EA580C]">{s._count?.classes || 0} lớp</td>
                  <td className="px-4 py-3.5">
                    <Status tone="success">Hoạt động</Status>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1">
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
                        onClick={() => handleDeleteSingle(s.id, s.name)}
                        title="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();

  const classTabs = [
    ["ALL", "Tất cả"],
    ["ACTIVE", "Đang diễn ra"],
    ["UPCOMING", "Sắp khai giảng"],
    ["FINISHED", "Lịch sử"],
  ] as const;

  const filtered = classes.filter((c) => {
    const matchesStatus = status === "ALL" || c.status === status;
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.school?.name || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
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
      description: `Bạn có chắc chắn muốn xóa ${selectedIds.length} lớp học đã chọn? Thao tác này sẽ chuyển trạng thái các lớp học sang không hoạt động.`,
      action: async () => {
        await deleteMultipleClassesAction(selectedIds);
        setSelectedIds([]);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (id: string, name?: string) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa lớp học",
      description: `Bạn có chắc chắn muốn xóa lớp học ${name ? `"${name}"` : "này"}? Thao tác này sẽ chuyển trạng thái lớp học sang không hoạt động.`,
      action: async () => {
        await deleteClassAction(id);
        onRefresh();
      },
    });
  };

  return (
    <section className="panel">
      {/* Pills Tabs - giống 100% Mockup */}
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {classTabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              status === key
                ? "bg-[#EA580C] text-white shadow-sm"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
            }`}
          >
            {label}
          </button>
        ))}
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
                <tr key={c.id} className="hover:bg-[#F8FAFC] transition">
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
                    {c.assignments?.[0]?.staff?.profile?.fullName || "Chưa phân công"}
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#0F172A]">
                    {c._count?.enrollments || 0}/{c.capacity}
                  </td>
                  <td className="px-4 py-3.5">
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
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1">
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
                        onClick={() => handleDeleteSingle(c.id, c.name)}
                        title="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
    const username = formData.get("username")?.toString() || "";

    startTransition(async () => {
      const res = await updateProfileAction(currentUser.userId, {
        fullName,
        username,
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
        username,
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
                <Field
                  name="username"
                  label="Tên đăng nhập / Mã tài khoản *"
                  defaultValue={currentUser.username}
                  placeholder="Nhập tên đăng nhập"
                  required
                />
              </div>

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
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="dateOfBirth"
                  label="Ngày sinh"
                  type="date"
                />
                <label className="block text-sm font-semibold text-[#0F172A]">
                  Giới tính
                  <select name="gender" className="field mt-2">
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
  const [selectedRole, setSelectedRole] = useState<RoleCode>("STUDENT");
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const availableClasses = classes.filter(
    (c) => !selectedSchoolId || c.schoolId === selectedSchoolId
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createUserAction({
        fullName: formData.get("fullName")?.toString() || "",
        email: formData.get("email")?.toString() || "",
        roleCode: selectedRole,
        phoneNumber: formData.get("phoneNumber")?.toString(),
        classId: formData.get("classId")?.toString(),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Thêm người dùng mới</DialogTitle>
          <DialogDescription>
            Tài khoản và email thông tin kích hoạt sẽ được khởi tạo trong hệ thống.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="fullName" label="Họ và tên *" placeholder="Nhập họ và tên đầy đủ" required />
            <Field name="email" type="email" label="Email *" placeholder="email@example.com" required />

            <label className="block text-sm font-semibold">
              Vai trò *
              <select
                name="roleCode"
                className="field mt-2"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as RoleCode)}
              >
                <option value="STUDENT">Học sinh</option>
                <option value="TEACHER">Giáo viên</option>
                <option value="TEACHING_ASSISTANT">Trợ giảng (TA)</option>
                <option value="SCHOOL_MANAGER">Quản nhiệm</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
            </label>

            <Field name="phoneNumber" label="Số điện thoại" placeholder="0987xxxxxx" />

            {/* DYNAMIC FIELD THEO ROLE */}
            {selectedRole === "STUDENT" && (
              <>
                <div>
                  <label className="text-sm font-semibold">Trường học</label>
                  <select
                    className="field mt-2"
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                  >
                    <option value="">-- Tất cả các trường --</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold">Ghi danh vào Lớp học</label>
                  <div className="mt-2 flex gap-2">
                    <select name="classId" className="field">
                      <option value="">-- Chọn lớp học --</option>
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onAddClassShortcut}
                      className="shrink-0"
                    >
                      <CirclePlus className="size-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {(selectedRole === "TEACHER" || selectedRole === "TEACHING_ASSISTANT") && (
              <div className="sm:col-span-2">
                <label className="text-sm font-semibold">Phân công lớp đầu tiên (Tùy chọn)</label>
                <select name="classId" className="field mt-2">
                  <option value="">-- Chưa phân công lớp lúc này --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.school?.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Tạo tài khoản
            </Button>
          </div>
        </form>
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createClassAction({
        code: formData.get("code")?.toString() || "",
        name: formData.get("name")?.toString() || "",
        schoolId: formData.get("schoolId")?.toString() || "",
        program: (formData.get("program")?.toString() as any) || "IELTS",
        level: formData.get("level")?.toString(),
        capacity: Number(formData.get("capacity")) || 30,
        teacherId: formData.get("teacherId")?.toString(),
        taId: formData.get("taId")?.toString(),
        schedule: formData.get("schedule")?.toString(),
        startDate: formData.get("startDate")?.toString(),
        endDate: formData.get("endDate")?.toString(),
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể tạo lớp học!");
        return;
      }

      form.reset();
      onDone();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo lớp học mới</DialogTitle>
          <DialogDescription>
            Lớp học sẽ trực thuộc trường học đối tác và có thể phân công giáo viên/trợ giảng.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="code" label="Mã lớp IELTS *" placeholder="VD: IELTS_TD_01" required />
            <Field name="name" label="Tên lớp học *" placeholder="VD: IELTS Bứt Phá - 10A1" required />

            <div className="sm:col-span-2">
              <label className="text-sm font-semibold">Trường học đối tác *</label>
              <div className="mt-2 flex gap-2">
                <select name="schoolId" required className="field">
                  <option value="">-- Chọn trường học --</option>
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

            <div className="sm:col-span-2">
              <Field
                name="schedule"
                label="Lịch học / Thời khóa biểu"
                placeholder="VD: Thứ 2, 4, 6 • 18:30 - 20:30"
              />
            </div>

            <Field name="startDate" label="Ngày bắt đầu" type="date" />
            <Field name="endDate" label="Ngày kết thúc" type="date" />

            <label className="block text-sm font-semibold">
              Giáo viên phụ trách
              <select name="teacherId" className="field mt-2">
                <option value="">-- Chọn giáo viên (Gán sau) --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.profile?.fullName || t.username}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Trợ giảng (TA) phụ trách
              <select name="taId" className="field mt-2">
                <option value="">-- Chọn trợ giảng (Gán sau) --</option>
                {tas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.profile?.fullName || t.username}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold">
              Chương trình đào tạo
              <select name="program" className="field mt-2" defaultValue="IELTS">
                <option value="IELTS">IELTS</option>
                <option value="SAT">SAT</option>
                <option value="CAMBRIDGE">Cambridge</option>
              </select>
            </label>

            <Field name="capacity" label="Sĩ số tối đa" type="number" defaultValue="30" />
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
  managers,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  managers: any[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createSchoolAction({
        code: formData.get("code")?.toString() || "",
        name: formData.get("name")?.toString() || "",
        type: (formData.get("type")?.toString() as any) || "THPT",
        managerId: formData.get("managerId")?.toString(),
        contactPhone: formData.get("contactPhone")?.toString(),
        address: formData.get("address")?.toString(),
        contactName: formData.get("contactName")?.toString(),
      });

      if (!res.success) {
        setErrorMsg(res.error || "Không thể tạo trường học!");
        return;
      }

      form.reset();
      onDone();
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Thêm trường học mới</SheetTitle>
          <SheetDescription>
            Tạo nhanh trường học đối tác và gán Quản nhiệm phụ trách.
          </SheetDescription>
        </SheetHeader>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field name="name" label="Tên trường học *" placeholder="VD: THPT Trương Định" required />
          <Field name="code" label="Mã trường *" placeholder="VD: THPT_TD" required />

          <label className="block text-sm font-semibold">
            Khối / Cấp học
            <select name="type" className="field mt-2" defaultValue="THPT">
              <option value="THPT">THPT</option>
              <option value="THCS">THCS</option>
              <option value="UNIVERSITY">Đại học</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Quản nhiệm phụ trách (Mỗi trường 1 quản nhiệm)
            <select name="managerId" className="field mt-2">
              <option value="">-- Chọn Quản nhiệm (Gán sau) --</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.fullName || m.username} ({m.email})
                </option>
              ))}
            </select>
          </label>

          <Field name="contactPhone" label="Số điện thoại liên hệ" placeholder="0987xxxxxx" />
          <Field name="contactName" label="Đại diện liên hệ trường" placeholder="Thầy/Cô..." />
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
  onClose,
  onDone,
}: {
  user: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateUserAction(user.id, {
        fullName: formData.get("fullName")?.toString()?.trim(),
        email: formData.get("email")?.toString()?.trim(),
        username: formData.get("username")?.toString()?.trim(),
        phoneNumber: formData.get("phoneNumber")?.toString()?.trim(),
        roleCode: formData.get("roleCode")?.toString() as any,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông tin người dùng</DialogTitle>
          <DialogDescription>
            Cập nhật họ tên, tài khoản, email hoặc đặt lại mật khẩu người dùng.
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
            <Field
              name="username"
              label="Tên đăng nhập / Mã tài khoản *"
              defaultValue={user.username}
              required
            />
            <Field
              name="phoneNumber"
              label="Số điện thoại"
              defaultValue={user.profile?.phoneNumber || ""}
              placeholder="0987xxxxxx"
            />
          </div>

          <label className="block text-sm font-semibold">
            Vai trò
            <select name="roleCode" className="field mt-2" defaultValue={user.role?.code}>
              <option value="STUDENT">Học sinh</option>
              <option value="TEACHER">Giáo viên</option>
              <option value="TEACHING_ASSISTANT">Trợ giảng</option>
              <option value="SCHOOL_MANAGER">Quản nhiệm</option>
              <option value="ADMIN">Quản trị viên</option>
            </select>
          </label>

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
