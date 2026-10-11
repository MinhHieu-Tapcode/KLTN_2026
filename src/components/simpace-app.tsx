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
  List,
  ArrowRightLeft,
  AlertTriangle,
  Sparkles,
  Sliders,
  Layers,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  getSchoolManagersAction,
  checkSchoolManagerScheduleConflictAction,
  changeSchoolManagerAction,
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
  enrollStudentToClassAction,
  removeStudentFromClassAction,
  getAvailableStudentsForClassAction,
  transferStudentClassAction,
  getSchoolClassesWithStudentsAction,
  getEligibleSchoolStudentsForClassAction,
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
  getTeachersAction,
  getTAsAction,
} from "@/actions/users";
import {
  updateSystemPermissionAction,
  getSystemPermissionsAction,
  createSystemPermissionAction,
  deleteSystemPermissionAction,
} from "@/actions/permissions";
import {
  getIeltsLevelsAction,
  determineIeltsLevelAction,
  createIeltsLevelAction,
  updateIeltsLevelAction,
  updateIeltsClassAllocationAction,
  deleteIeltsLevelAction,
} from "@/actions/ielts-levels";
import {
  parseAndValidateBulkStudentsAction,
  generateBulkClassSuggestionAction,
  rebalanceOnStudentTransferAction,
  rebalanceOnClassCountChangeAction,
  commitBulkAllocationAction,
  ValidatedStudentRow,
  InvalidStudentRow,
  ProposedClass,
  LevelAllocationPlan,
  BulkAllocationSuggestion,
} from "@/actions/bulk-allocation";
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
            {(hasPerm("VIEW_CLASSES") || hasPerm("VIEW_SCHEDULE")) && (
              <NavItem
                icon={GraduationCap}
                label="Quản lý lớp học"
                active={view === "classes" || view === "class-detail" || view === "schedule"}
                onClick={() => navigate("classes")}
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
                {view === "users" && (currentUser?.role === "ADMIN" || currentUser?.role === "SCHOOL_MANAGER") && (
                  <Button
                    onClick={() => setAddUserOpen(true)}
                    className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl shadow-sm"
                  >
                    <Plus className="size-4 mr-1.5" /> Thêm người dùng
                  </Button>
                )}
                {view === "schools" && currentUser?.role === "ADMIN" && (
                  <Button
                    onClick={() => setAddSchoolOpen(true)}
                    className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl shadow-sm"
                  >
                    <Plus className="size-4 mr-1.5" /> Thêm trường học
                  </Button>
                )}
                {view === "classes" && (currentUser?.role === "ADMIN" || currentUser?.role === "SCHOOL_MANAGER") && (
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
        ieltsLevels={ieltsLevels}
        onAddClassShortcut={() => setAddClassOpen(true)}
        onAddSchoolShortcut={() => setAddSchoolOpen(true)}
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

  // Dành riêng cho Học viên (STUDENT)
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
                  const ta = cls.assignments?.find((a: any) => a.roleInClass === "TEACHING_ASSISTANT")?.staff?.profile?.fullName;

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
                        <div><b>Giáo viên:</b> {teacher || "Đang cập nhật"}</div>
                        <div><b>Trợ giảng:</b> {ta || "Đang cập nhật"}</div>
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

  // Dành cho Quản trị viên & Quản nhiệm & Giáo viên
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
  onViewUser,
}: {
  users: any[];
  currentUser?: any;
  schools?: any[];
  classes?: any[];
  onRefresh: () => void;
  onOpenAddUser?: () => void;
  onEditUser: (u: any) => void;
  onViewUser?: (u: any) => void;
}) {
  const [tab, setTab] = useState("Tất cả");
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
    // 1. Chỉ hiển thị tài khoản đang hoạt động (Bỏ trạng thái & thùng rác theo phản hồi)
    if (!u.isActive) return false;

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
    const idsToDelete = [...selectedIds];
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa người dùng đã chọn",
      description: `Bạn có chắc chắn muốn xóa ${idsToDelete.length} người dùng đã chọn khỏi hệ thống?`,
      action: async () => {
        setLocalUsers((prev) => prev.filter((u) => !idsToDelete.includes(u.id)));
        setSelectedIds([]);
        await deleteMultipleUsersAction(idsToDelete);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (id: string, name?: string) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa người dùng",
      description: `Bạn có chắc chắn muốn xóa tài khoản ${name ? `"${name}"` : "này"} khỏi hệ thống?`,
      action: async () => {
        setLocalUsers((prev) => prev.filter((u) => u.id !== id));
        await deleteUserAction(id);
        onRefresh();
      },
    });
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

      {/* Toolbar: Tìm kiếm & Xóa chọn */}
      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="field field-search border-[#CBD5E1]"
            placeholder="Tìm kiếm theo họ tên, email, mã..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
              <Trash2 className="size-4 mr-1.5" /> Xóa ({selectedIds.length}) người dùng đã chọn
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[750px] border-collapse text-left text-sm">
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
                let assignmentText = "Chưa phân công";
                if (u.role?.code === "ADMIN") {
                  assignmentText = "Toàn hệ thống";
                } else if (u.role?.code === "SCHOOL_MANAGER" && u.managedSchools?.length > 0) {
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
                    <td className="px-4 py-3.5 text-xs max-w-[220px] truncate" title={assignmentText}>
                      {assignmentText === "Chưa phân công" ? (
                        <span className="text-amber-600 font-medium italic">Chưa phân công</span>
                      ) : assignmentText === "Toàn hệ thống" ? (
                        <span className="text-[#64748B] font-medium">Toàn hệ thống</span>
                      ) : (
                        <span className="text-[#0F172A] font-medium">{assignmentText}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[#64748B] hover:text-[#EA580C]"
                          onClick={() => onViewUser?.(u)}
                          title="Xem chi tiết tài khoản (Chỉ xem)"
                        >
                          <Eye className="size-4" />
                        </Button>
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
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-[#94A3B8] italic">
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
          const action = confirmModal.action;
          setConfirmModal((prev) => ({ ...prev, open: false }));
          startTransition(async () => {
            await action();
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
  managers = [],
  currentUser,
  onRefresh,
  onAdd,
  onEditSchool,
  onEditClass,
  onOpenAddClass,
}: {
  schools: any[];
  managers?: any[];
  currentUser?: any;
  onRefresh: () => void;
  onAdd: () => void;
  onEditSchool: (s: any) => void;
  onEditClass?: (cls: any) => void;
  onOpenAddClass?: (schoolId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "ALL">("ACTIVE");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();
  const [localSchools, setLocalSchools] = useState(schools);
  const [selectedSchoolDetail, setSelectedSchoolDetail] = useState<any>(null);
  const [selectedSchoolForClasses, setSelectedSchoolForClasses] = useState<any>(null);
  const [managersList, setManagersList] = useState<any[]>(managers);

  const [managerChangeModal, setManagerChangeModal] = useState<{
    school: any;
    newManager: any;
    otherSchools: any[];
    selectedSwapSchoolId: string;
  } | null>(null);

  const [conflictErrorModal, setConflictErrorModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  } | null>(null);

  const [isChangingManager, setIsChangingManager] = useState(false);

  useEffect(() => {
    setLocalSchools(schools);
  }, [schools]);

  useEffect(() => {
    if (managers && managers.length > 0) {
      setManagersList(managers);
    } else {
      getSchoolManagersAction().then((m) => {
        if (m) setManagersList(m);
      });
    }
  }, [managers]);

  const handleManagerChangeRequest = async (school: any, newManagerId: string) => {
    if (!newManagerId || newManagerId === school.managerId) return;

    // 1. Kiểm tra xung đột lịch học của quản nhiệm mới với các trường đang phụ trách
    const checkRes = await checkSchoolManagerScheduleConflictAction(school.id, newManagerId);
    if (checkRes.hasConflict) {
      setConflictErrorModal({
        open: true,
        title: "Không thể đổi quản nhiệm (Xung đột lịch học)",
        message:
          checkRes.error ||
          "Phát hiện xung đột lịch học giữa các trường mà quản nhiệm đang phụ trách!",
      });
      return;
    }

    const newMgr = managersList.find((m: any) => m.id === newManagerId);
    const otherSchools = checkRes.otherSchools || newMgr?.managedSchools || [];

    setManagerChangeModal({
      school,
      newManager: newMgr || { id: newManagerId, username: checkRes.managerName },
      otherSchools,
      selectedSwapSchoolId: otherSchools.length > 0 ? otherSchools[0].id : "",
    });
  };

  const executeChangeManager = async (actionType: "SWAP" | "OVERWRITE") => {
    if (!managerChangeModal) return;
    setIsChangingManager(true);
    try {
      const res = await changeSchoolManagerAction({
        schoolId: managerChangeModal.school.id,
        newManagerId: managerChangeModal.newManager.id,
        actionType,
        swapWithSchoolId:
          actionType === "SWAP" ? managerChangeModal.selectedSwapSchoolId : undefined,
      });

      if (res.success) {
        setManagerChangeModal(null);
        onRefresh();
      } else {
        setConflictErrorModal({
          open: true,
          title: "Không thể đổi quản nhiệm",
          message: res.error || "Đã xảy ra lỗi khi thay đổi quản nhiệm!",
        });
      }
    } finally {
      setIsChangingManager(false);
    }
  };

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
    const idsToDelete = [...selectedIds];
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa các trường học đã chọn",
      description: `Bạn có chắc chắn muốn xóa ${idsToDelete.length} trường học đã chọn khỏi hệ thống?`,
      action: async () => {
        setLocalSchools((prev) => prev.filter((s) => !idsToDelete.includes(s.id)));
        setSelectedIds([]);
        await deleteMultipleSchoolsAction(idsToDelete);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (id: string, name: string, code: string) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa trường học",
      description: `Bạn có chắc chắn muốn xóa trường "${name}" (Mã trường: ${code}) khỏi hệ thống?`,
      action: async () => {
        setLocalSchools((prev) => prev.filter((s) => s.id !== id));
        await deleteSchoolAction(id);
        onRefresh();
      },
    });
  };

  return (
    <section className="panel">
      <div className="mb-4 flex flex-wrap gap-3 justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            className="field field-search border-[#CBD5E1]"
            placeholder="Tìm kiếm trường học theo tên, mã, địa chỉ..."
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
        <table className="w-full min-w-[750px] border-collapse text-left text-sm">
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
                  <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                    <span>{s.name}</span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#64748B]">{s.code}</td>
                  <td className="px-4 py-3.5 text-[#475569]">{s.type}</td>
                  <td className="px-4 py-3.5 text-[#0F172A] font-medium" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={s.managerId || ""}
                      onChange={(e) => handleManagerChangeRequest(s, e.target.value)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-orange-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-800 transition max-w-[210px] truncate shadow-xs cursor-pointer"
                      title="Nhấp để thay đổi Quản nhiệm phụ trách trường"
                    >
                      {!s.managerId && <option value="">-- Chưa phân công --</option>}
                      {managersList.map((m: any) => {
                        const mName = m.profile?.fullName || m.username;
                        const schoolCount = m.managedSchools?.length || 0;
                        return (
                          <option key={m.id} value={m.id}>
                            {mName} {schoolCount > 0 ? `(${schoolCount} trường)` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-[#EA580C]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSchoolForClasses(s);
                      }}
                      className="hover:underline inline-flex items-center gap-1 font-semibold text-[#EA580C]"
                      title="Xem danh sách lớp của trường này"
                    >
                      {s._count?.classes || s.classes?.length || 0} lớp
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[#64748B] hover:text-[#EA580C]"
                        onClick={() => setSelectedSchoolDetail(s)}
                        title="Xem thông tin trường học (Cấu hình BGH, SĐT, Quản nhiệm)"
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[#64748B] hover:text-[#0F172A]"
                        onClick={() => onEditSchool(s)}
                        title="Chỉnh sửa thông tin trường học"
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
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-sm text-[#94A3B8] italic">
                  Không tìm thấy trường học phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL XEM CHI TIẾT TRƯỜNG HỌC (CHỈ XEM THÔNG TIN CẤU HÌNH TRƯỜNG) */}
      <SchoolDetailDrawer
        school={selectedSchoolDetail}
        open={!!selectedSchoolDetail}
        onOpenChange={(op) => !op && setSelectedSchoolDetail(null)}
        onEditSchool={onEditSchool}
        onViewClasses={(sch) => setSelectedSchoolForClasses(sch)}
      />

      {/* MODAL QUẢN LÝ DANH SÁCH LỚP HỌC & ĐIỀU CHUYỂN HỌC SINH THEO TRƯỜNG */}
      <SchoolClassesModal
        school={selectedSchoolForClasses}
        open={!!selectedSchoolForClasses}
        onOpenChange={(op) => !op && setSelectedSchoolForClasses(null)}
        onEditClass={onEditClass}
        onOpenAddClass={onOpenAddClass}
        onRefresh={onRefresh}
      />

      <ConfirmDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        isPending={isDeleting}
        onConfirm={() => {
          const action = confirmModal.action;
          setConfirmModal((prev) => ({ ...prev, open: false }));
          startTransition(async () => {
            await action();
          });
        }}
      />

      {/* MODAL XÁC NHẬN ĐỔI QUẢN NHIỆM (HỦY ĐỔI / HOÁN ĐỔI / GHI ĐÈ) */}
      {managerChangeModal && (
        <Dialog
          open={true}
          onOpenChange={(op) => !isChangingManager && !op && setManagerChangeModal(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="size-5 text-[#EA580C]" /> Thay đổi Quản nhiệm phụ trách trường
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Xác nhận phân công, hoán đổi hoặc ghi đè quản nhiệm cho trường học.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Trường học:</span>
                  <span className="font-bold text-slate-800">{managerChangeModal.school.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Quản nhiệm hiện tại:</span>
                  <span className="font-semibold text-slate-700">
                    {managerChangeModal.school.manager?.profile?.fullName ||
                      managerChangeModal.school.manager?.username ||
                      "Chưa phân công"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Quản nhiệm mới:</span>
                  <span className="font-bold text-[#EA580C]">
                    {managerChangeModal.newManager.profile?.fullName ||
                      managerChangeModal.newManager.username}
                  </span>
                </div>
              </div>

              {managerChangeModal.otherSchools.length > 0 && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-800 space-y-2">
                  <div className="font-medium">
                    Quản nhiệm này hiện đang phụ trách:{" "}
                    <b>{managerChangeModal.otherSchools.map((s: any) => s.name).join(", ")}</b>.
                  </div>
                  {managerChangeModal.school.managerId && (
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                        Chọn trường để hoán đổi quản nhiệm (nếu chọn Hoán đổi):
                      </label>
                      <select
                        value={managerChangeModal.selectedSwapSchoolId}
                        onChange={(e) =>
                          setManagerChangeModal((prev) =>
                            prev ? { ...prev, selectedSwapSchoolId: e.target.value } : null
                          )
                        }
                        className="w-full text-xs font-medium px-2 py-1.5 rounded-lg border border-blue-300 bg-white text-slate-800"
                      >
                        {managerChangeModal.otherSchools.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                💡 <b>Các lựa chọn xử lý:</b>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>
                    <b>Ghi đè:</b> Quản nhiệm mới sẽ tiếp quản trường {managerChangeModal.school.name}. Quản nhiệm cũ sẽ được gỡ khỏi trường này.
                  </li>
                  {managerChangeModal.otherSchools.length > 0 && managerChangeModal.school.managerId && (
                    <li>
                      <b>Hoán đổi 2 quản nhiệm:</b> Quản nhiệm mới nhận trường này, và Quản nhiệm cũ chuyển sang phụ trách trường đối tác tương ứng.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isChangingManager}
                onClick={() => setManagerChangeModal(null)}
                className="text-xs"
              >
                Hủy đổi
              </Button>

              {managerChangeModal.otherSchools.length > 0 && managerChangeModal.school.managerId && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isChangingManager}
                  onClick={() => executeChangeManager("SWAP")}
                  className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                >
                  {isChangingManager ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                  Hoán đổi 2 quản nhiệm
                </Button>
              )}

              <Button
                size="sm"
                disabled={isChangingManager}
                onClick={() => executeChangeManager("OVERWRITE")}
                className="text-xs font-semibold bg-[#EA580C] hover:bg-[#C2410C] text-white"
              >
                {isChangingManager ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                Ghi đè
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL CẢNH BÁO XUNG ĐỘT LỊCH HỌC */}
      {conflictErrorModal && (
        <Dialog open={true} onOpenChange={() => setConflictErrorModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="size-5 text-rose-600" /> {conflictErrorModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 space-y-2">
                <p className="font-medium">{conflictErrorModal.message}</p>
                <p className="text-[11px] text-rose-900 italic pt-1 border-t border-rose-200">
                  Ràng buộc hệ thống: Một quản nhiệm có thể phụ trách nhiều lớp trong cùng 1 trường, nhưng không thể quản nhiệm 2 trường khác nhau nếu có các lớp diễn ra trùng khung giờ và ngày học.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                size="sm"
                onClick={() => setConflictErrorModal(null)}
                className="text-xs bg-slate-800 text-white hover:bg-slate-900"
              >
                Đã hiểu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

/* =========================================================================
   DRAWER CHI TIẾT TRƯỜNG HỌC (XEM THÔNG TIN CẤU HÌNH TRƯỜNG)
   ========================================================================= */

function SchoolDetailDrawer({
  school,
  open,
  onOpenChange,
  onEditSchool,
  onViewClasses,
}: {
  school: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditSchool?: (s: any) => void;
  onViewClasses?: (s: any) => void;
}) {
  if (!school) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
              {school.code}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
              {school.type}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-[#0F172A] mt-1">
            {school.name}
          </DialogTitle>
          <DialogDescription>
            Thông tin đối tác đào tạo và thông tin liên hệ đại diện trường.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4 text-sm">
          {/* Thông tin liên hệ */}
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-4 space-y-2">
            <b className="text-xs uppercase text-slate-500 tracking-wider block">
              Thông tin liên hệ trường học
            </b>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Đại diện BGH / Giáo vụ:</span>
                <span className="font-semibold text-slate-800">
                  {school.contactName || "Chưa cập nhật"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Số điện thoại:</span>
                <span className="font-semibold text-slate-800">
                  {school.contactPhone || "Chưa cập nhật"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Địa chỉ:</span>
                <span className="font-semibold text-slate-800">
                  {school.address || "Chưa cập nhật"}
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
                "Chưa phân công quản nhiệm"}
            </p>
            {school.manager?.email && (
              <p className="text-xs text-slate-600">
                Email: {school.manager.email}
              </p>
            )}
            {school.manager?.profile?.phone && (
              <p className="text-xs text-slate-600">
                SĐT Quản nhiệm: {school.manager.profile.phone}
              </p>
            )}
          </div>

          {/* Danh sách lớp trực thuộc */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <b className="text-xs uppercase text-slate-500 tracking-wider">
                Danh sách lớp học tại trường ({school.classes?.length || 0})
              </b>
              {onViewClasses && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onViewClasses(school);
                  }}
                  className="text-xs font-semibold text-[#EA580C] hover:underline inline-flex items-center gap-1"
                >
                  <BookOpen className="size-3.5" /> Quản lý danh sách lớp & học sinh
                </button>
              )}
            </div>
            {school.classes && school.classes.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            {onEditSchool && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onEditSchool(school);
                }}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white"
              >
                <Edit2 className="size-4 mr-1.5" /> Chỉnh sửa thông tin
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   MODAL QUẢN LÝ DANH SÁCH LỚP HỌC & ĐIỀU CHUYỂN HỌC SINH THEO TRƯỜNG
   ========================================================================= */

function SchoolClassesModal({
  school,
  open,
  onOpenChange,
  onEditClass,
  onOpenAddClass,
  onRefresh,
}: {
  school: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClass?: (cls: any) => void;
  onOpenAddClass?: (schoolId: string) => void;
  onRefresh: () => void;
}) {
  const [activeClassId, setActiveClassId] = useState<string>("");
  const [schoolData, setSchoolData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal chuyển lớp
  const [transferModal, setTransferModal] = useState<{
    open: boolean;
    student: any;
    currentClass: any;
  } | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");

  // Modal rút học viên
  const [removeModal, setRemoveModal] = useState<{
    open: boolean;
    student: any;
    currentClass: any;
  } | null>(null);

  // Modal thêm học viên cùng trường
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);

  // Tải chi tiết trường và danh sách học sinh theo lớp
  const loadSchoolClasses = React.useCallback(async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const res = await getSchoolClassesWithStudentsAction(school.id);
      if (res.success && res.school) {
        setSchoolData(res.school);
        const classesList = res.school.classes || [];
        if (classesList.length > 0) {
          setActiveClassId((prev) => {
            const exists = classesList.some((c: any) => c.id === prev);
            return exists ? prev : classesList[0].id;
          });
        } else {
          setActiveClassId("");
        }
      }
    } catch (err) {
      console.error("Lỗi tải danh sách lớp của trường:", err);
    } finally {
      setIsLoading(false);
    }
  }, [school?.id]);

  useEffect(() => {
    if (open && school?.id) {
      loadSchoolClasses();
      setNotice(null);
    }
  }, [open, school?.id, loadSchoolClasses]);

  if (!open || !school) return null;

  const classes: any[] = schoolData?.classes || school.classes || [];
  const currentClass = classes.find((c: any) => c.id === activeClassId) || classes[0];
  const otherClassesInSameSchool = classes.filter(
    (c: any) => c.id !== currentClass?.id && c.isActive
  );

  const assignedTeachers = currentClass?.assignments?.filter((a: any) => a.roleInClass === "TEACHER") || [];
  const assignedTAs = currentClass?.assignments?.filter((a: any) => a.roleInClass === "TEACHING_ASSISTANT") || [];
  const enrollments = currentClass?.enrollments || [];
  const capacity = currentClass?.capacity || 30;
  const enrollCount = enrollments.length;

  // Thực hiện chuyển lớp học sinh
  const handleConfirmTransfer = () => {
    if (!transferModal || !targetClassId) return;
    startTransition(async () => {
      const res = await transferStudentClassAction(
        transferModal.currentClass.id,
        targetClassId,
        transferModal.student.id
      );
      if (res.success) {
        setNotice({ type: "success", message: res.message || "Chuyển lớp học sinh thành công!" });
        setTransferModal(null);
        setTargetClassId("");
        await loadSchoolClasses();
        onRefresh();
      } else {
        setNotice({ type: "error", message: res.error || "Không thể chuyển lớp cho học sinh!" });
      }
    });
  };

  // Thực hiện rút học sinh khỏi lớp
  const handleConfirmRemove = () => {
    if (!removeModal) return;
    startTransition(async () => {
      const res = await removeStudentFromClassAction(
        removeModal.currentClass.id,
        removeModal.student.id
      );
      if (res.success) {
        setNotice({
          type: "success",
          message: `Đã rút học viên "${removeModal.student.profile?.fullName || removeModal.student.username}" khỏi lớp!`,
        });
        setRemoveModal(null);
        await loadSchoolClasses();
        onRefresh();
      } else {
        setNotice({ type: "error", message: res.error || "Không thể rút học viên khỏi lớp!" });
      }
    });
  };

  // Mở modal thêm học sinh cùng trường
  const handleOpenAddStudent = async () => {
    if (!currentClass) return;
    setAddStudentOpen(true);
    setStudentSearch("");
    setSelectedStudent(null);
    setIsLoadingEligible(true);
    try {
      const res = await getEligibleSchoolStudentsForClassAction(currentClass.id);
      if (res.success) {
        setEligibleStudents(res.students || []);
      } else {
        setEligibleStudents([]);
      }
    } catch (e) {
      console.error(e);
      setEligibleStudents([]);
    } finally {
      setIsLoadingEligible(false);
    }
  };

  // Xác nhận thêm / chuyển học sinh từ lớp khác cùng trường
  const handleConfirmAddStudent = () => {
    if (!selectedStudent || !currentClass) return;
    startTransition(async () => {
      const studentClassInSameSchool = selectedStudent.classEnrollments?.find(
        (e: any) => e.class?.schoolId === school.id
      );

      let res;
      if (studentClassInSameSchool?.classId) {
        // Học sinh đã ở lớp khác trong cùng trường -> Chuyển lớp
        res = await transferStudentClassAction(
          studentClassInSameSchool.classId,
          currentClass.id,
          selectedStudent.id
        );
      } else {
        // Ghi danh mới vào lớp
        res = await enrollStudentToClassAction(
          currentClass.id,
          selectedStudent.id
        );
      }

      if (res.success) {
        setNotice({
          type: "success",
          message: `Đã thêm học viên "${selectedStudent.profile?.fullName || selectedStudent.username}" vào lớp "${currentClass.name}" thành công!`,
        });
        setAddStudentOpen(false);
        setSelectedStudent(null);
        await loadSchoolClasses();
        onRefresh();
      } else {
        setNotice({ type: "error", message: res.error || "Không thể thêm học viên vào lớp!" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* HEADER MODAL */}
        <DialogHeader className="border-b border-[#F1F5F9] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
                  {school.code}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                  {school.type}
                </span>
                <span className="text-xs text-[#64748B]">
                  • Quản nhiệm: <b className="text-[#0F172A]">{school.manager?.profile?.fullName || school.manager?.username || "Chưa phân công"}</b>
                </span>
              </div>
              <DialogTitle className="text-xl font-bold text-[#0F172A] mt-1.5 flex items-center gap-2">
                <Building2 className="size-5 text-[#EA580C]" />
                Danh sách lớp học tại {school.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#64748B]">
                Xem cấu hình chi tiết các lớp học và quản lý điều chuyển học sinh giữa các lớp trong trường.
              </DialogDescription>
            </div>

            {onOpenAddClass && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onOpenAddClass(school.id);
                }}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <Plus className="size-3.5 mr-1" /> Mở lớp học mới
              </Button>
            )}
          </div>

          {/* Thông báo Alert */}
          {notice && (
            <div
              className={`mt-3 p-3 rounded-xl text-xs flex items-center justify-between transition ${
                notice.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}
            >
              <span>{notice.message}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
            <Loader2 className="size-5 animate-spin text-[#EA580C]" /> Đang tải dữ liệu lớp học và học sinh...
          </div>
        ) : classes.length === 0 ? (
          /* TRƯỜNG HỢP CHƯA CÓ LỚP NÀO */
          <div className="py-16 text-center space-y-4">
            <div className="size-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-[#EA580C]">
              <BookOpen className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[#0F172A]">Chưa có lớp học nào tại trường</h3>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Trường {school.name} hiện chưa mở lớp đào tạo nào. Bạn có thể bấm nút bên dưới để tạo lớp học đầu tiên.
              </p>
            </div>
            {onOpenAddClass && (
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenAddClass(school.id);
                }}
                className="bg-[#EA580C] text-white rounded-xl text-xs font-semibold"
              >
                <Plus className="size-4 mr-1.5" /> Tạo lớp học mới cho trường này
              </Button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-3">
            {/* THANH CHỌN LỚP (TABS / PILLS) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#F1F5F9]">
              <span className="text-xs font-bold text-[#64748B] uppercase shrink-0 mr-1">
                Các lớp ({classes.length}):
              </span>
              {classes.map((cls: any) => {
                const enrCount = cls.enrollments?.length || cls._count?.enrollments || 0;
                const isActive = cls.id === currentClass?.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setActiveClassId(cls.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition border flex items-center gap-2 ${
                      isActive
                        ? "bg-[#EA580C] text-white border-[#EA580C] shadow-xs"
                        : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-orange-50/50 hover:border-orange-200"
                    }`}
                  >
                    <span>{cls.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {cls.code}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        isActive ? "text-orange-100" : "text-[#EA580C]"
                      }`}
                    >
                      ({enrCount}/{cls.capacity})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* KHU VỰC 1: THÔNG TIN CẤU HÌNH LỚP (DẠNG VIEW) */}
            {currentClass && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50/30 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-100 text-[#EA580C]">
                      {currentClass.code}
                    </span>
                    <h3 className="font-bold text-base text-[#0F172A]">{currentClass.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                      {currentClass.program}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        currentClass.status === "IN_PROGRESS"
                          ? "bg-emerald-100 text-emerald-800"
                          : currentClass.status === "UPCOMING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {currentClass.status === "IN_PROGRESS"
                        ? "Đang diễn ra"
                        : currentClass.status === "UPCOMING"
                        ? "Sắp khai giảng"
                        : "Đã kết thúc"}
                    </span>
                  </div>

                  {onEditClass && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onEditClass(currentClass)}
                      className="h-7 text-xs font-semibold text-[#EA580C] border-orange-200 hover:bg-orange-100 rounded-lg shadow-xs"
                    >
                      <Edit2 className="size-3 mr-1" /> Chỉnh sửa cấu hình lớp
                    </Button>
                  )}
                </div>

                {/* Grid chi tiết cấu hình lớp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Giáo viên phụ trách:</span>
                    <div className="font-semibold text-slate-800">
                      {assignedTeachers.length > 0 ? (
                        assignedTeachers.map((t: any) => (
                          <div key={t.id} className="truncate">
                            {t.staff?.profile?.fullName || t.staff?.username}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân công</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Trợ giảng (TA):</span>
                    <div className="font-semibold text-slate-800">
                      {assignedTAs.length > 0 ? (
                        assignedTAs.map((ta: any) => (
                          <div key={ta.id} className="truncate">
                            {ta.staff?.profile?.fullName || ta.staff?.username}
                          </div>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân công</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Lịch học / Thời gian:</span>
                    <div className="font-semibold text-slate-800">
                      <div>{currentClass.description || "Chưa thiết lập"}</div>
                      {currentClass.startDate && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {new Date(currentClass.startDate).toLocaleDateString("vi-VN")}
                          {currentClass.endDate ? ` → ${new Date(currentClass.endDate).toLocaleDateString("vi-VN")}` : ""}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-orange-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-400 font-medium">Sĩ số học viên:</span>
                      <span className="font-bold text-[#EA580C]">
                        {enrollCount}/{capacity}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          enrollCount >= capacity ? "bg-rose-500" : "bg-[#EA580C]"
                        }`}
                        style={{ width: `${Math.min(100, (enrollCount / (capacity || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {enrollCount >= capacity ? "⚠️ Lớp đã đầy sĩ số" : `Còn trống ${capacity - enrollCount} chỗ`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* KHU VỰC 2: DANH SÁCH HỌC SINH CỦA LỚP & ĐIỀU CHUYỂN */}
            {currentClass && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A] flex items-center gap-1.5">
                      <Users className="size-4 text-[#EA580C]" />
                      Danh sách học sinh trong lớp ({enrollCount})
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Học sinh có thể được chuyển sang lớp khác cùng trường hoặc thêm học sinh từ các lớp khác sang.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAddStudent}
                    disabled={enrollCount >= capacity}
                    className="text-xs rounded-xl text-[#EA580C] border-orange-200 hover:bg-orange-50 font-semibold shadow-xs"
                  >
                    <Plus className="size-3.5 mr-1" /> Thêm học sinh từ lớp khác sang
                  </Button>
                </div>

                {/* BẢNG DANH SÁCH HỌC SINH */}
                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                  <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                        <th className="px-3.5 py-3 w-10 text-slate-500 uppercase font-bold">#</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Họ và tên</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Mã học viên</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Email</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Ngày vào lớp</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase">Trạng thái</th>
                        <th className="px-3.5 py-3 font-bold text-slate-600 uppercase text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] bg-white">
                      {enrollments.length > 0 ? (
                        enrollments.map((enr: any, idx: number) => {
                          const student = enr.student;
                          const studentName = student?.profile?.fullName || student?.username;
                          return (
                            <tr key={enr.id} className="hover:bg-[#F8FAFC] transition">
                              <td className="px-3.5 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                              <td className="px-3.5 py-2.5 font-bold text-[#0F172A]">{studentName}</td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-600">{student?.username}</td>
                              <td className="px-3.5 py-2.5 text-slate-500">{student?.email}</td>
                              <td className="px-3.5 py-2.5 text-slate-500">
                                {new Date(enr.enrolledAt).toLocaleDateString("vi-VN")}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {enr.status === "STUDYING" ? "Đang học" : enr.status}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* NÚT CHUYỂN LỚP TRONG CÙNG TRƯỜNG */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTransferModal({
                                        open: true,
                                        student,
                                        currentClass,
                                      });
                                      setTargetClassId("");
                                    }}
                                    className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition inline-flex items-center gap-1"
                                    title="Chuyển học viên sang lớp khác trong cùng trường"
                                  >
                                    <ArrowRightLeft className="size-3" /> Chuyển lớp
                                  </button>

                                  {/* NÚT GỠ KHỎI LỚP */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRemoveModal({
                                        open: true,
                                        student,
                                        currentClass,
                                      })
                                    }
                                    className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition inline-flex items-center gap-1"
                                    title="Rút học viên khỏi lớp"
                                  >
                                    <Trash2 className="size-3" /> Gỡ
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-xs text-[#94A3B8] italic">
                            Chưa có học viên nào trong lớp này. Hãy bấm &quot;Thêm học sinh từ lớp khác sang&quot; để gán học sinh vào lớp!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9] mt-auto">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>

      {/* MODAL 1: CHUYỂN LỚP CHO HỌC VIÊN TRONG CÙNG TRƯỜNG */}
      {transferModal && (
        <Dialog open={true} onOpenChange={() => setTransferModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0F172A]">
                <ArrowRightLeft className="size-5 text-[#EA580C]" /> Chuyển lớp cho học sinh
              </DialogTitle>
              <DialogDescription className="text-xs">
                Chuyển học viên <b>{transferModal.student.profile?.fullName || transferModal.student.username}</b> (Mã: {transferModal.student.username}) từ lớp <b>{transferModal.currentClass.name}</b> sang lớp khác thuộc trường <b>{school.name}</b>.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                🔒 <b>Quy tắc hệ thống:</b> Học sinh chỉ được phép chuyển giữa các lớp trong cùng trường <b>{school.name}</b>. Không được chuyển sang lớp của trường khác.
              </div>

              <div>
                <label className="label text-xs font-semibold block mb-1">
                  Chọn lớp đích chuyển đến (Cùng trường {school.name}):
                </label>
                {otherClassesInSameSchool.length > 0 ? (
                  <select
                    className="field text-xs bg-white border-[#CBD5E1]"
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                  >
                    <option value="">-- Chọn lớp học đích ({otherClassesInSameSchool.length} lớp) --</option>
                    {otherClassesInSameSchool.map((c: any) => {
                      const count = c.enrollments?.length || c._count?.enrollments || 0;
                      const isFull = count >= c.capacity;
                      return (
                        <option key={c.id} value={c.id} disabled={isFull}>
                          {c.name} ({c.code}) - Sĩ số: {count}/{c.capacity} {isFull ? "(Đã đầy sĩ số)" : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    Trường hiện chỉ có 1 lớp duy nhất nên không có lớp nào khác để chuyển đến. Bạn cần tạo thêm lớp mới cho trường này trước.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <Button type="button" variant="outline" onClick={() => setTransferModal(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={!targetClassId || isPending}
                className="bg-[#EA580C] text-white text-xs font-semibold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Xác nhận chuyển lớp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: THÊM HỌC VIÊN TỪ LỚP KHÁC CÙNG TRƯỜNG SANG */}
      {addStudentOpen && currentClass && (
        <Dialog open={true} onOpenChange={() => setAddStudentOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Plus className="size-4 text-[#EA580C]" /> Thêm học sinh vào lớp {currentClass.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Chỉ hiển thị các học sinh thuộc trường <b>{school.name}</b>. Sĩ số lớp: {enrollCount}/{capacity}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  className="field field-search text-xs pl-9"
                  placeholder="Tìm học sinh theo tên, email, mã HV..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              {isLoadingEligible ? (
                <div className="py-8 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-[#EA580C]" /> Đang tải danh sách học sinh cùng trường...
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y divide-[#F1F5F9]">
                  {eligibleStudents
                    .filter((st: any) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.trim().toLowerCase();
                      return (
                        (st.profile?.fullName || "").toLowerCase().includes(q) ||
                        st.username.toLowerCase().includes(q) ||
                        st.email.toLowerCase().includes(q)
                      );
                    })
                    .map((st: any) => {
                      const classInSchool = st.classEnrollments?.find(
                        (e: any) => e.class?.schoolId === school.id
                      );
                      const isSelected = selectedStudent?.id === st.id;
                      return (
                        <label
                          key={st.id}
                          className={`flex items-center justify-between p-3 cursor-pointer hover:bg-orange-50/50 transition ${
                            isSelected ? "bg-orange-50 border-l-4 border-l-[#EA580C]" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="selectedEligibleStudent"
                              checked={isSelected}
                              onChange={() => setSelectedStudent(st)}
                              className="text-[#EA580C] focus:ring-[#EA580C]"
                            />
                            <div>
                              <b className="text-xs text-[#0F172A] block font-semibold">
                                {st.profile?.fullName || st.username}
                              </b>
                              <span className="text-[11px] text-[#64748B] block">
                                {st.email} • Mã: <span className="font-mono">{st.username}</span>
                              </span>
                              {classInSchool?.class?.name ? (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  Đang học tại: {classInSchool.class.name} ({classInSchool.class.code})
                                </span>
                              ) : (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                                  Học sinh trường {school.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  {eligibleStudents.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#94A3B8] italic">
                      Không có học sinh nào khác trong trường {school.name} khả dụng để thêm.
                    </div>
                  )}
                </div>
              )}

              {selectedStudent && (
                <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900">
                  ℹ️ Xác nhận điều chuyển học viên <b>{selectedStudent.profile?.fullName || selectedStudent.username}</b> vào lớp <b>{currentClass.name}</b>.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <Button type="button" variant="outline" onClick={() => setAddStudentOpen(false)}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAddStudent}
                disabled={!selectedStudent || isPending}
                className="bg-[#EA580C] text-white text-xs font-semibold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Xác nhận thêm vào lớp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG XÁC NHẬN GỠ HỌC VIÊN */}
      <ConfirmDialog
        open={!!removeModal}
        onOpenChange={(op) => !op && setRemoveModal(null)}
        title="Rút học sinh khỏi lớp học"
        description={`Bạn có chắc muốn rút học sinh "${removeModal?.student?.profile?.fullName || removeModal?.student?.username}" khỏi lớp "${removeModal?.currentClass?.name}"?`}
        confirmText="Rút khỏi lớp"
        isPending={isPending}
        onConfirm={handleConfirmRemove}
      />
    </Dialog>
  );
}

/* =========================================================================
   5. CLASSES PAGE VIEW & DETAIL VIEW (ASSIGN / UNASSIGN STAFF)
   ========================================================================= */

function ClassesPageView({
  classes,
  currentUser,
  onRefresh,
  onOpenDetail,
  onEditClass,
  schools = [],
  onOpenAddClass,
}: {
  classes: any[];
  currentUser?: any;
  onRefresh: () => void;
  onOpenDetail: (c: any) => void;
  onEditClass: (c: any) => void;
  schools?: any[];
  onOpenAddClass?: (schoolId?: string) => void;
}) {
  const canManageClass = currentUser?.role === "ADMIN" || currentUser?.role === "SCHOOL_MANAGER";
  const [viewMode, setViewMode] = useState<"LIST" | "TIMETABLE">("LIST");
  const [lifecycleStatus, setLifecycleStatus] = useState("ALL");
  const [selectedSchoolId, setSelectedSchoolId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, startTransition] = useTransition();
  const [localClasses, setLocalClasses] = useState(classes);

  useEffect(() => {
    setLocalClasses(classes);
  }, [classes]);

  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  const classTabs = [
    ["ALL", "Tất cả"],
    ["ACTIVE", "Đang diễn ra"],
    ["UPCOMING", "Sắp khai giảng"],
    ["FINISHED", "Đã kết thúc"],
  ] as const;

  const filtered = localClasses.filter((c) => {
    // Chỉ hiển thị lớp học còn hoạt động (không hiện thùng rác)
    if (!c.isActive) return false;

    // Lọc theo trường học
    const matchesSchool = selectedSchoolId === "ALL" || c.schoolId === selectedSchoolId;

    // Lọc theo chu kỳ lớp học
    const matchesLifecycle = lifecycleStatus === "ALL" || c.status === lifecycleStatus;

    // Tìm kiếm .trim()
    const cleanSearch = search.trim().toLowerCase();
    const matchesSearch =
      !cleanSearch ||
      c.name.toLowerCase().includes(cleanSearch) ||
      c.code.toLowerCase().includes(cleanSearch) ||
      (c.school?.name || "").toLowerCase().includes(cleanSearch);

    return matchesSchool && matchesLifecycle && matchesSearch;
  });

  // Danh sách lớp dùng cho Thời khóa biểu tuần
  const scheduleClasses = localClasses.filter((c) => {
    if (!c.isActive || c.status === "FINISHED") return false;
    if (selectedSchoolId !== "ALL" && c.schoolId !== selectedSchoolId) return false;
    return true;
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
    const toDeleteIds = [...selectedIds];
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa các lớp học đã chọn",
      description: `Bạn có chắc chắn muốn xóa ${toDeleteIds.length} lớp học đã chọn? Các lớp học này sẽ ngừng hoạt động và bị xóa khỏi hệ thống.`,
      action: async () => {
        setLocalClasses((prev) => prev.filter((c) => !toDeleteIds.includes(c.id)));
        setSelectedIds([]);
        await deleteMultipleClassesAction(toDeleteIds);
        onRefresh();
      },
    });
  };

  const handleDeleteSingle = (cls: any) => {
    setConfirmModal({
      open: true,
      title: "Xác nhận xóa lớp học",
      description: `Bạn có chắc chắn muốn xóa lớp học "${cls.name}" (Mã lớp: ${cls.code})? Lớp học sẽ ngừng hoạt động và bị xóa khỏi hệ thống.`,
      action: async () => {
        setLocalClasses((prev) => prev.filter((c) => c.id !== cls.id));
        await deleteClassAction(cls.id);
        onRefresh();
      },
    });
  };

  return (
    <section className="panel space-y-4">
      {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM: DANH SÁCH LỚP HỌC vs THỜI KHÓA BIỂU TUẦN */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setViewMode("LIST")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              viewMode === "LIST"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <List className="size-4" /> Danh sách lớp học
          </button>
          <button
            type="button"
            onClick={() => setViewMode("TIMETABLE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              viewMode === "TIMETABLE"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            <CalendarDays className="size-4" /> Thời khóa biểu tuần
          </button>
        </div>

        {/* Lọc nhanh theo trường học dùng chung cho cả 2 chế độ */}
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-[#94A3B8]" />
          <select
            className="field text-xs max-w-xs bg-white border-[#CBD5E1]"
            value={selectedSchoolId}
            onChange={(e) => setSelectedSchoolId(e.target.value)}
          >
            <option value="ALL">-- Tất cả trường học ({schools.filter((s: any) => s.isActive).length} trường) --</option>
            {schools
              .filter((s: any) => s.isActive)
              .map((s: any) => {
                const count = localClasses.filter((c: any) => c.schoolId === s.id && c.isActive).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.name} ({count} lớp)
                  </option>
                );
              })}
          </select>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: DANH SÁCH LỚP HỌC (BẢNG TRUYỀN THỐNG) */}
      {viewMode === "LIST" && (
        <div className="space-y-4">
          {/* Hàng: Tabs Chu kỳ lớp học (Tất cả / Đang diễn ra / Sắp khai giảng / Đã kết thúc) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
            <div className="flex gap-2 overflow-x-auto">
              {classTabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setLifecycleStatus(key)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                    lifecycleStatus === key
                      ? "bg-[#EA580C] text-white shadow-sm"
                      : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="relative max-w-sm flex-1 min-w-[220px]">
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
                        <Status
                          tone={
                            c.status === "FINISHED" ? "neutral" : c.status === "UPCOMING" ? "warn" : "success"
                          }
                        >
                          {c.status === "ACTIVE"
                            ? "Đang diễn ra"
                            : c.status === "UPCOMING"
                            ? "Sắp khai giảng"
                            : "Đã kết thúc"}
                        </Status>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold text-[#EA580C] bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300 rounded-lg inline-flex items-center gap-1.5 transition shadow-xs"
                            onClick={() => onOpenDetail(c)}
                            title="Xem danh sách lớp"
                          >
                            <Eye className="size-3.5" />
                            <span>Xem danh sách lớp</span>
                          </Button>
                          {canManageClass && (
                            <>
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
                                title="Xóa lớp học"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm">
                      {selectedSchoolId !== "ALL" ? (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C]">
                            <Building2 className="size-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-[#0F172A]">
                              Trường &quot;{schools.find((s: any) => s.id === selectedSchoolId)?.name}&quot; hiện chưa có lớp học nào
                            </p>
                            <p className="text-xs text-[#64748B]">
                              Mỗi trường học quản lý các lớp học riêng biệt. Bạn hãy tạo lớp học mới để gán cho trường này.
                            </p>
                          </div>
                          {canManageClass && onOpenAddClass && (
                            <Button
                              size="sm"
                              onClick={() => onOpenAddClass(selectedSchoolId)}
                              className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
                            >
                              <Plus className="size-3.5 mr-1" /> + Tạo lớp học cho trường này
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] italic">Không tìm thấy lớp học nào.</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: THỜI KHÓA BIỂU TUẦN (GRID VIEW) */}
      {viewMode === "TIMETABLE" && (
        scheduleClasses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
            <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C]">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-[#0F172A]">
                {selectedSchoolId !== "ALL"
                  ? `Trường "${schools.find((s: any) => s.id === selectedSchoolId)?.name}" hiện chưa có lịch học nào`
                  : "Chưa có lịch học nào trong hệ thống"}
              </p>
              <p className="text-xs text-[#64748B]">
                Tạo lớp học mới và chọn các thứ trong tuần để lịch học tự động hiển thị trên bảng thời khóa biểu.
              </p>
            </div>
            {canManageClass && onOpenAddClass && (
              <Button
                size="sm"
                onClick={() => onOpenAddClass(selectedSchoolId !== "ALL" ? selectedSchoolId : undefined)}
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                <Plus className="size-3.5 mr-1" /> + Tạo lớp học mới
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              {daysOfWeek.map((day) => {
                const classesForDay = scheduleClasses.filter((c) => {
                  if (!c.description) return false;
                  return c.description.toLowerCase().includes(day.toLowerCase());
                });

                return (
                  <div
                    key={day}
                    className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm flex flex-col min-h-[220px]"
                  >
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F5F9]">
                      <span className="font-bold text-sm text-[#0F172A]">{day}</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          classesForDay.length > 0
                            ? "bg-orange-100 text-[#EA580C] border border-orange-200"
                            : "bg-slate-100 text-[#94A3B8]"
                        }`}
                      >
                        {classesForDay.length > 0 ? `${classesForDay.length} ca học` : "Nghỉ"}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2.5 flex-1">
                      {classesForDay.length > 0 ? (
                        classesForDay.map((cls) => {
                          const teacherName =
                            cls.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.staff
                              ?.profile?.fullName || "Chưa phân công";
                          const taName = cls.assignments?.find(
                            (a: any) => a.roleInClass === "TEACHING_ASSISTANT"
                          )?.staff?.profile?.fullName;

                          return (
                            <div
                              key={cls.id}
                              onClick={() => onOpenDetail(cls)}
                              className="rounded-xl border border-orange-200/80 bg-[#FFF7ED]/40 p-3 hover:border-[#EA580C] hover:shadow-md transition group cursor-pointer"
                              title="Bấm để xem chi tiết lớp học này"
                            >
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="font-mono text-[11px] font-bold text-[#EA580C] bg-orange-100/70 px-1.5 py-0.5 rounded">
                                  {cls.code}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-500">
                                  {cls.program || "IELTS"}
                                </span>
                              </div>

                              <b className="block text-xs font-bold text-[#0F172A] group-hover:text-[#EA580C] transition leading-snug">
                                {cls.name}
                              </b>

                              <div className="mt-2 space-y-1 text-[11px] text-[#475569]">
                                <div className="flex items-center gap-1.5 font-semibold text-[#EA580C]">
                                  <Clock className="size-3 shrink-0" />
                                  <span>{cls.description}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[#64748B]">
                                  <Building2 className="size-3 shrink-0" />
                                  <span className="truncate">{cls.school?.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[#64748B]">
                                  <GraduationCap className="size-3 shrink-0" />
                                  <span className="truncate">GV: {teacherName}</span>
                                </div>
                                {taName && (
                                  <div className="text-[10px] text-[#94A3B8] pl-4">TA: {taName}</div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="grid place-items-center h-full py-8 text-center text-xs text-[#94A3B8] italic">
                          Không có ca học
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hiển thị các lớp học có lịch đặc thù / chưa gán cố định thứ */}
            {scheduleClasses.some((c) => !daysOfWeek.some((d) => c.description?.includes(d))) && (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B] mb-3">
                  Các lớp học đang diễn ra (Lịch học linh hoạt):
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {scheduleClasses
                    .filter((c) => !daysOfWeek.some((d) => c.description?.includes(d)))
                    .map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => onOpenDetail(cls)}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs hover:border-[#EA580C] transition cursor-pointer"
                        title="Bấm để xem chi tiết lớp học này"
                      >
                        <b className="text-[#0F172A] block font-bold hover:text-[#EA580C] transition">
                          {cls.name} ({cls.code})
                        </b>
                        <p className="text-[#64748B] mt-1">Trường: {cls.school?.name}</p>
                        <p className="text-[#EA580C] font-semibold mt-1">
                          Lịch: {cls.description || "Chưa xếp lịch cụ thể"}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      <ConfirmDialog
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal((prev) => ({ ...prev, open }))}
        title={confirmModal.title}
        description={confirmModal.description}
        isPending={isDeleting}
        onConfirm={() => {
          const action = confirmModal.action;
          setConfirmModal((prev) => ({ ...prev, open: false }));
          startTransition(async () => {
            await action();
          });
        }}
      />
    </section>
  );
}

function ClassDetailView({
  classItem,
  classes = [],
  teachers,
  tas,
  onBack,
  onRefreshDetail,
  onEditClass,
}: {
  classItem: any;
  classes?: any[];
  teachers: any[];
  tas: any[];
  onBack: () => void;
  onRefreshDetail: () => void;
  onEditClass?: (c: any) => void;
}) {
  const [assignRole, setAssignRole] = useState<"TEACHER" | "TEACHING_ASSISTANT" | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isPending, startTransition] = useTransition();

  // State quản lý thêm / bớt học viên
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [removeStudentTarget, setRemoveStudentTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);

  // State chuyển lớp cho học viên
  const [transferTarget, setTransferTarget] = useState<{
    studentId: string;
    studentName: string;
  } | null>(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  if (!classItem) return null;

  const sameSchoolClasses = (classes || []).filter(
    (c: any) => c.schoolId === classItem.schoolId && c.id !== classItem.id && c.isActive
  );

  const assignedTeachers = classItem.assignments?.filter((a: any) => a.roleInClass === "TEACHER") || [];
  const assignedTAs = classItem.assignments?.filter((a: any) => a.roleInClass === "TEACHING_ASSISTANT") || [];

  const handleAssign = () => {
    if (!assignRole || !selectedStaffId) return;
    startTransition(async () => {
      const res = await assignStaffToClassAction(classItem.id, selectedStaffId, assignRole);
      if (res.success) {
        setAssignRole(null);
        setSelectedStaffId("");
        onRefreshDetail();
      } else {
        alert(res.error || "Không thể gán nhân sự vào lớp!");
      }
    });
  };

  const handleConfirmTransfer = async () => {
    if (!transferTarget || !targetClassId) return;
    setTransferError(null);
    setIsTransferring(true);
    try {
      const res = await transferStudentClassAction(
        classItem.id,
        targetClassId,
        transferTarget.studentId
      );
      if (res.success) {
        setTransferTarget(null);
        onRefreshDetail();
      } else {
        setTransferError(res.error || "Không thể chuyển lớp cho học viên!");
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const [unassignTarget, setUnassignTarget] = useState<{ userId: string; roleName: string } | null>(null);

  const handleUnassign = (userId: string, roleName: string) => {
    setUnassignTarget({ userId, roleName });
  };

  const confirmUnassign = () => {
    if (!unassignTarget) return;
    const target = unassignTarget;
    setUnassignTarget(null);
    startTransition(async () => {
      await removeStaffFromClassAction(classItem.id, target.userId);
      onRefreshDetail();
    });
  };

  // Mở modal thêm học viên vào lớp
  const handleOpenAddStudent = async () => {
    setAddStudentOpen(true);
    setIsLoadingStudents(true);
    setSelectedStudentId("");
    setStudentSearch("");
    const res = await getAvailableStudentsForClassAction(classItem.id);
    if (res && res.success) {
      setAvailableStudents(res.students);
    }
    setIsLoadingStudents(false);
  };

  // Xác nhận thêm học viên
  const handleEnrollStudent = () => {
    if (!selectedStudentId) return;
    startTransition(async () => {
      const res = await enrollStudentToClassAction(classItem.id, selectedStudentId);
      if (res.success) {
        setAddStudentOpen(false);
        setSelectedStudentId("");
        onRefreshDetail();
      } else {
        alert(res.error || "Không thể thêm học viên!");
      }
    });
  };

  // Rút học viên khỏi lớp
  const handleRemoveStudent = (studentId: string, studentName: string) => {
    setRemoveStudentTarget({ studentId, studentName });
  };

  const confirmRemoveStudent = () => {
    if (!removeStudentTarget) return;
    const target = removeStudentTarget;
    setRemoveStudentTarget(null);
    startTransition(async () => {
      await removeStudentFromClassAction(classItem.id, target.studentId);
      onRefreshDetail();
    });
  };

  const statusLabel =
    classItem.status === "ACTIVE"
      ? "Đang diễn ra"
      : classItem.status === "UPCOMING"
      ? "Sắp khai giảng"
      : "Đã kết thúc";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-[#64748B] hover:text-[#EA580C] transition"
        >
          <ChevronLeft className="size-4" /> Quay lại danh sách lớp học
        </button>

        {onEditClass && (
          <Button
            onClick={() => onEditClass(classItem)}
            className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
          >
            <Edit2 className="size-3.5 mr-1.5" /> Chỉnh sửa thông tin lớp
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          title="Thông tin lớp học & Thời khóa biểu"
          items={[
            `Mã lớp: ${classItem.code}`,
            `Khóa học: ${classItem.program || "IELTS"}`,
            `Trường học: ${classItem.school?.name || "Chưa gán"}`,
            `Sĩ số: ${classItem.enrollments?.length || 0}/${classItem.capacity} học viên`,
            `Lịch học: ${classItem.description || "Chưa xếp lịch cụ thể"}`,
            ...(classItem.startDate || classItem.endDate
              ? [
                  `Thời gian: ${
                    classItem.startDate
                      ? new Date(classItem.startDate).toLocaleDateString("vi-VN")
                      : "---"
                  } → ${
                    classItem.endDate
                      ? new Date(classItem.endDate).toLocaleDateString("vi-VN")
                      : "---"
                  }`,
                ]
              : []),
            `Trạng thái: ${statusLabel}`,
          ]}
        />

        {/* Card Giáo viên với nút Gán thêm giáo viên */}
        <section className="panel flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-base text-[#0F172A]">
                Giáo viên phụ trách ({assignedTeachers.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-lg text-[#EA580C] border-orange-200 hover:bg-orange-50"
                onClick={() => {
                  setAssignRole("TEACHER");
                  setSelectedStaffId("");
                }}
              >
                <Plus className="size-3 mr-1" /> Gán thêm GV
              </Button>
            </div>
            {assignedTeachers.length > 0 ? (
              <div className="space-y-2.5">
                {assignedTeachers.map((tch: any) => (
                  <div
                    key={tch.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex justify-between items-start"
                  >
                    <div className="space-y-1 text-sm">
                      <b className="text-[#0F172A] block text-sm">
                        {tch.staff?.profile?.fullName || tch.staff?.username}
                      </b>
                      <p className="text-[#64748B] text-xs">{tch.staff?.email}</p>
                      <Badge>Giáo viên giảng dạy</Badge>
                    </div>
                    {assignedTeachers.length > 1 && (
                      <button
                        onClick={() => handleUnassign(tch.userId, "giáo viên")}
                        className="text-xs font-semibold text-rose-600 hover:underline ml-2"
                        title="Hủy phân công giáo viên này"
                      >
                        Gỡ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] italic">Chưa phân công giáo viên</p>
            )}
          </div>
        </section>

        {/* Card Trợ giảng với nút Gán thêm trợ giảng */}
        <section className="panel flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-base text-[#0F172A]">
                Trợ giảng (TA) phụ trách ({assignedTAs.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 rounded-lg text-purple-600 border-purple-200 hover:bg-purple-50"
                onClick={() => {
                  setAssignRole("TEACHING_ASSISTANT");
                  setSelectedStaffId("");
                }}
              >
                <Plus className="size-3 mr-1" /> Gán thêm TA
              </Button>
            </div>
            {assignedTAs.length > 0 ? (
              <div className="space-y-2.5">
                {assignedTAs.map((ta: any) => (
                  <div
                    key={ta.id}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex justify-between items-start"
                  >
                    <div className="space-y-1 text-sm">
                      <b className="text-[#0F172A] block text-sm">
                        {ta.staff?.profile?.fullName || ta.staff?.username}
                      </b>
                      <p className="text-[#64748B] text-xs">{ta.staff?.email}</p>
                      <Badge>Trợ giảng hỗ trợ lớp</Badge>
                    </div>
                    {assignedTAs.length > 1 && (
                      <button
                        onClick={() => handleUnassign(ta.userId, "trợ giảng")}
                        className="text-xs font-semibold text-rose-600 hover:underline ml-2"
                        title="Hủy phân công trợ giảng này"
                      >
                        Gỡ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] italic">Chưa phân công trợ giảng</p>
            )}
          </div>
        </section>
      </div>

      <section className="panel mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-base text-[#0F172A]">
              Danh sách học viên theo học ({classItem.enrollments?.length || 0}/{classItem.capacity})
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Quản lý và cập nhật danh sách học sinh ghi danh trong lớp học này
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenAddStudent}
            className="text-xs rounded-xl text-[#EA580C] border-orange-200 hover:bg-orange-50 font-semibold shadow-xs"
          >
            <Plus className="size-3.5 mr-1" /> Thêm học viên vào lớp
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Họ và tên</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Email</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Mã học viên</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Ngày vào lớp</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">Trạng thái</th>
                <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase text-right">Thao tác</th>
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
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end items-center gap-3">
                        {sameSchoolClasses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTransferTarget({
                                studentId: enr.studentId,
                                studentName: enr.student?.profile?.fullName || enr.student?.username,
                              });
                              setTransferError(null);
                              setTargetClassId(sameSchoolClasses[0].id);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                            title={`Chuyển học viên sang lớp khác thuộc cùng trường ${classItem.school?.name || ""}`}
                          >
                            <ArrowRightLeft className="size-3.5" /> Chuyển lớp
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleRemoveStudent(
                              enr.studentId,
                              enr.student?.profile?.fullName || enr.student?.username
                            )
                          }
                          className="text-xs font-semibold text-rose-600 hover:underline inline-flex items-center gap-1"
                          title="Rút học viên khỏi lớp"
                        >
                          <Trash2 className="size-3.5" /> Gỡ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-[#94A3B8] italic">
                    Chưa có học viên trong lớp. Bấm &quot;Thêm học viên vào lớp&quot; hoặc dùng tính năng Import Excel để thêm học viên!
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
                {assignRole === "TEACHER" ? "Gán thêm Giáo viên" : "Gán thêm Trợ giảng (TA)"}
              </DialogTitle>
              <DialogDescription>
                Chọn nhân sự để gán thêm vào lớp {classItem.name} ({classItem.code})
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
                {(assignRole === "TEACHER" ? teachers : tas)
                  .filter((s: any) => !classItem.assignments?.some((a: any) => a.userId === s.id))
                  .map((s: any) => (
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

      {/* MODAL THÊM HỌC VIÊN VÀO LỚP */}
      {addStudentOpen && (
        <Dialog open={true} onOpenChange={() => setAddStudentOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thêm học viên vào lớp</DialogTitle>
              <DialogDescription>
                Chọn học viên để ghi danh vào lớp {classItem.name} ({classItem.code}). Sĩ số: {classItem.enrollments?.length || 0}/{classItem.capacity}.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  className="field field-search text-xs pl-9"
                  placeholder="Tìm học viên theo họ tên, email, mã HV..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              {isLoadingStudents ? (
                <div className="py-8 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Đang tải danh sách học viên...
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y divide-[#F1F5F9]">
                  {availableStudents
                    .filter((st: any) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.trim().toLowerCase();
                      return (
                        (st.profile?.fullName || "").toLowerCase().includes(q) ||
                        st.username.toLowerCase().includes(q) ||
                        st.email.toLowerCase().includes(q)
                      );
                    })
                    .map((st: any) => (
                      <label
                        key={st.id}
                        className={`flex items-center justify-between p-3 cursor-pointer hover:bg-orange-50/50 transition ${
                          selectedStudentId === st.id ? "bg-orange-50 border-l-4 border-l-[#EA580C]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="selectedStudent"
                            checked={selectedStudentId === st.id}
                            onChange={() => setSelectedStudentId(st.id)}
                            className="text-[#EA580C] focus:ring-[#EA580C]"
                          />
                          <div>
                            <b className="text-xs text-[#0F172A] block font-semibold">
                              {st.profile?.fullName || st.username}
                            </b>
                            <span className="text-[11px] text-[#64748B] block">
                              {st.email} • Mã: <span className="font-mono">{st.username}</span>
                              {st.classEnrollments?.[0]?.class?.school?.name ? ` • Trường: ${st.classEnrollments[0].class.school.name}` : ""}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  {availableStudents.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#94A3B8] italic">
                      Không có học viên nào khả dụng để thêm.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
              <Button variant="outline" onClick={() => setAddStudentOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleEnrollStudent}
                disabled={!selectedStudentId || isPending}
                className="bg-[#EA580C] text-white"
              >
                {isPending ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Xác nhận thêm vào lớp
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* DIALOG XÁC NHẬN HỦY PHÂN CÔNG NHÂN SỰ */}
      <ConfirmDialog
        open={!!unassignTarget}
        onOpenChange={(open) => !open && setUnassignTarget(null)}
        title={`Hủy phân công ${unassignTarget?.roleName || "nhân sự"}`}
        description={`Bạn có chắc muốn hủy phân công ${unassignTarget?.roleName || "nhân sự này"} khỏi lớp học? Thao tác này sẽ gỡ nhân sự khỏi lớp.`}
        confirmText="Hủy phân công"
        isPending={isPending}
        onConfirm={confirmUnassign}
      />

      {/* DIALOG XÁC NHẬN RÚT HỌC VIÊN */}
      <ConfirmDialog
        open={!!removeStudentTarget}
        onOpenChange={(open) => !open && setRemoveStudentTarget(null)}
        title="Rút học viên khỏi lớp học"
        description={`Bạn có chắc muốn rút học viên "${removeStudentTarget?.studentName}" khỏi lớp "${classItem.name}"? Thao tác này sẽ hủy ghi danh của học viên trong lớp.`}
        confirmText="Rút khỏi lớp"
        isPending={isPending}
        onConfirm={confirmRemoveStudent}
      />

      {/* DIALOG CHUYỂN LỚP HỌC VIÊN CÙNG TRƯỜNG */}
      {transferTarget && (
        <Dialog open={true} onOpenChange={() => !isTransferring && setTransferTarget(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="size-5 text-[#EA580C]" /> Chuyển học viên sang lớp khác
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Chuyển học viên sang lớp khác trong cùng trường <b>{classItem.school?.name}</b>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                <div>
                  <span className="text-slate-500">Học viên:</span>{" "}
                  <b className="text-slate-800">{transferTarget.studentName}</b>
                </div>
                <div>
                  <span className="text-slate-500">Lớp hiện tại:</span>{" "}
                  <b className="text-slate-800">{classItem.name} ({classItem.code})</b>
                </div>
                <div>
                  <span className="text-slate-500">Trường học:</span>{" "}
                  <b className="text-[#EA580C]">{classItem.school?.name}</b>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn lớp chuyển đến (Cùng trường {classItem.school?.name}):
                </label>
                {sameSchoolClasses.length > 0 ? (
                  <select
                    value={targetClassId}
                    onChange={(e) => setTargetClassId(e.target.value)}
                    className="w-full text-xs font-medium px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  >
                    {sameSchoolClasses.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.code}) • {cls.description || "Chưa có lịch"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 italic">
                    Trường này hiện không có lớp học nào khác đang hoạt động để chuyển học sinh.
                  </p>
                )}
              </div>

              {transferError && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <b className="block">Không thể chuyển lớp:</b>
                    <p className="mt-0.5">{transferError}</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isTransferring}
                onClick={() => setTransferTarget(null)}
                className="text-xs"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                disabled={!targetClassId || isTransferring || sameSchoolClasses.length === 0}
                onClick={handleConfirmTransfer}
                className="text-xs font-semibold bg-[#EA580C] hover:bg-[#C2410C] text-white"
              >
                {isTransferring ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                Xác nhận chuyển lớp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* =========================================================================
   6. SCHEDULE PAGE VIEW (LỌC THEO ROLE CHÍNH XÁC)
   ========================================================================= */

function SchedulePageView({
  classes,
  currentUser,
  schools = [],
  onOpenAddClass,
}: {
  classes: any[];
  currentUser: any;
  schools?: any[];
  onOpenAddClass?: (schoolId?: string) => void;
}) {
  const [selectedSchool, setSelectedSchool] = useState("ALL");
  const [viewMode, setViewMode] = useState<"TIMETABLE" | "LIST">("TIMETABLE");

  const currentUid = currentUser?.userId || currentUser?.id;

  // Lọc các lớp học liên quan đến vai trò của người dùng
  const relevantClasses = classes.filter((c) => {
    // Chỉ loại bỏ các lớp đã kết thúc hoặc đã bị xóa
    if (c.status === "FINISHED" || !c.isActive) return false;

    if (currentUser?.role === "ADMIN") return true;

    if (currentUser?.role === "SCHOOL_MANAGER") {
      // Xem lớp của trường mình quản lý
      return c.school?.managerId === currentUid;
    }

    if (currentUser?.role === "TEACHER" || currentUser?.role === "TEACHING_ASSISTANT") {
      // Xem lớp mình được phân công giảng dạy / trợ giảng
      return c.assignments?.some(
        (a: any) =>
          a.userId === currentUid ||
          a.staff?.id === currentUid ||
          a.staff?.username === currentUser?.username
      );
    }

    if (currentUser?.role === "STUDENT") {
      // Xem lớp mình ghi danh học tập (cả từ server filter lẫn client check)
      if (c.enrollments && c.enrollments.length > 0) {
        return c.enrollments.some(
          (e: any) =>
            e.studentId === currentUid ||
            e.student?.id === currentUid ||
            e.student?.username === currentUser?.username
        );
      }
      return true;
    }

    return true;
  });

  const displayed = relevantClasses.filter(
    (c) => selectedSchool === "ALL" || c.schoolId === selectedSchool
  );

  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  return (
    <section className="space-y-4">
      {/* Banner chào mừng & Thông tin phạm vi học tập */}
      <div className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50/50 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#EA580C] text-white shadow-md shadow-orange-500/20">
              <CalendarDays className="size-6" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                {currentUser?.role === "STUDENT"
                  ? "Thời khóa biểu học tập của bạn"
                  : "Lịch học & Giảng dạy các lớp"}
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                {currentUser?.role === "STUDENT"
                  ? `Xin chào ${currentUser?.fullName || "Học viên"}! Bạn đang theo học ${displayed.length} lớp học tại SIMPACE.`
                  : "Thời khóa biểu các lớp học đang hoạt động trong phạm vi phụ trách của bạn."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chuyển đổi chế độ xem: Thời khóa biểu tuần vs Danh sách */}
            <div className="inline-flex rounded-xl bg-white border border-[#E2E8F0] p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("TIMETABLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "TIMETABLE"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <CalendarDays className="size-3.5" /> Bảng thời khóa biểu tuần
              </button>
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === "LIST"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <List className="size-3.5" /> Danh sách lớp học
              </button>
            </div>

            {(currentUser?.role === "ADMIN" || currentUser?.role === "SCHOOL_MANAGER") && (
              <select
                className="field text-xs max-w-xs bg-white border-[#CBD5E1]"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
              >
                <option value="ALL">-- Tất cả các trường ({schools.filter((s: any) => s.isActive).length} trường) --</option>
                {schools
                  .filter((s: any) => s.isActive)
                  .map((s: any) => {
                    const count = relevantClasses.filter((c: any) => c.schoolId === s.id && c.isActive).length;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({count} lớp)
                      </option>
                    );
                  })}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: BẢNG THỜI KHÓA BIỂU THEO TUẦN (TIMETABLE GRID) */}
      {viewMode === "TIMETABLE" && (
        displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-10 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
            <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C]">
              <Building2 className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-[#0F172A]">
                {selectedSchool !== "ALL"
                  ? `Trường "${schools.find((s: any) => s.id === selectedSchool)?.name}" hiện chưa có lịch học nào`
                  : "Chưa có lịch học nào trong phạm vi quản lý của bạn"}
              </p>
              <p className="text-xs text-[#64748B]">
                Tạo lớp học mới và chọn các thứ trong tuần để lịch học tự động hiển thị trên bảng thời khóa biểu.
              </p>
            </div>
            {onOpenAddClass && (
              <Button
                size="sm"
                onClick={() => onOpenAddClass(selectedSchool !== "ALL" ? selectedSchool : undefined)}
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                <Plus className="size-3.5 mr-1" /> + Tạo lớp học mới
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            {daysOfWeek.map((day) => {
              // Tìm các lớp học diễn ra vào thứ này (dựa trên chuỗi lịch học đã tạo bởi Date Time Picker)
              const classesForDay = displayed.filter((c) => {
                if (!c.description) return false;
                return c.description.toLowerCase().includes(day.toLowerCase());
              });

              return (
                <div
                  key={day}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm flex flex-col min-h-[220px]"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#F1F5F9]">
                    <span className="font-bold text-sm text-[#0F172A]">{day}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        classesForDay.length > 0
                          ? "bg-orange-100 text-[#EA580C] border border-orange-200"
                          : "bg-slate-100 text-[#94A3B8]"
                      }`}
                    >
                      {classesForDay.length > 0 ? `${classesForDay.length} ca học` : "Nghỉ"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5 flex-1">
                    {classesForDay.length > 0 ? (
                      classesForDay.map((cls) => {
                        const teacherName =
                          cls.assignments?.find((a: any) => a.roleInClass === "TEACHER")?.staff
                            ?.profile?.fullName || "Chưa phân công";
                        const taName = cls.assignments?.find(
                          (a: any) => a.roleInClass === "TEACHING_ASSISTANT"
                        )?.staff?.profile?.fullName;

                        return (
                          <div
                            key={cls.id}
                            className="rounded-xl border border-orange-200/80 bg-[#FFF7ED]/40 p-3 hover:border-[#EA580C] transition group shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="font-mono text-[11px] font-bold text-[#EA580C] bg-orange-100/70 px-1.5 py-0.5 rounded">
                                {cls.code}
                              </span>
                              <span className="text-[10px] uppercase font-bold text-slate-500">
                                {cls.program || "IELTS"}
                              </span>
                            </div>

                            <b className="block text-xs font-bold text-[#0F172A] group-hover:text-[#EA580C] transition leading-snug">
                              {cls.name}
                            </b>

                            <div className="mt-2 space-y-1 text-[11px] text-[#475569]">
                              <div className="flex items-center gap-1.5 font-semibold text-[#EA580C]">
                                <Clock className="size-3 shrink-0" />
                                <span>{cls.description}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#64748B]">
                                <Building2 className="size-3 shrink-0" />
                                <span className="truncate">{cls.school?.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#64748B]">
                                <GraduationCap className="size-3 shrink-0" />
                                <span className="truncate">GV: {teacherName}</span>
                              </div>
                              {taName && (
                                <div className="text-[10px] text-[#94A3B8] pl-4">TA: {taName}</div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="grid place-items-center h-full py-8 text-center text-xs text-[#94A3B8] italic">
                        Không có ca học
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hiển thị các lớp học có lịch đặc thù / chưa gán cố định thứ */}
          {displayed.some((c) => !daysOfWeek.some((d) => c.description?.includes(d))) && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B] mb-3">
                Các lớp học đang diễn ra (Lịch học linh hoạt):
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {displayed
                  .filter((c) => !daysOfWeek.some((d) => c.description?.includes(d)))
                  .map((cls) => (
                    <div
                      key={cls.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <b className="text-[#0F172A] block font-bold">{cls.name} ({cls.code})</b>
                      <p className="text-[#64748B] mt-1">Trường: {cls.school?.name}</p>
                      <p className="text-[#EA580C] font-semibold mt-1">
                        Lịch: {cls.description || "Chưa xếp lịch cụ thể"}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
          </div>
        )
      )}

      {/* CHẾ ĐỘ 2: DANH SÁCH BẢNG BIỂU CHI TIẾT (LIST VIEW) */}
      {viewMode === "LIST" && (
        <div className="panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] border-collapse text-left text-sm">
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
                        <div className="font-semibold text-[#EA580C]">{c.description || "Chưa xếp lịch cụ thể"}</div>
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
                    <td colSpan={6} className="text-center py-12 text-sm">
                      {selectedSchool !== "ALL" ? (
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center text-[#EA580C]">
                            <Building2 className="size-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-bold text-[#0F172A]">
                              Trường &quot;{schools.find((s: any) => s.id === selectedSchool)?.name}&quot; hiện chưa có lớp học nào
                            </p>
                            <p className="text-xs text-[#64748B]">
                              Tạo lớp học mới và chọn ngày giờ để lịch học tự động xuất hiện tại đây.
                            </p>
                          </div>
                          {onOpenAddClass && (
                            <Button
                              size="sm"
                              onClick={() => onOpenAddClass(selectedSchool)}
                              className="bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-semibold shadow-sm"
                            >
                              <Plus className="size-3.5 mr-1" /> + Tạo lớp học cho trường này
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#94A3B8] italic">
                          Không có lịch học nào phù hợp với phạm vi quản lý của bạn.
                        </span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
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

function IeltsLevelModal({
  open,
  onOpenChange,
  level,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  level?: any;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString()?.trim() || "";
    const minScore = Number(formData.get("minScore"));
    const maxScore = Number(formData.get("maxScore"));
    const description = formData.get("description")?.toString()?.trim();
    const targetClassCount = Number(formData.get("targetClassCount")) || 1;
    const isActive = formData.get("isActive") === "on";

    if (!name) {
      setErrorMsg("Tên trình độ không được để trống!");
      return;
    }
    if (isNaN(minScore) || isNaN(maxScore) || minScore < 0 || maxScore > 9.0 || minScore >= maxScore) {
      setErrorMsg("Điểm IELTS phải từ 0.0 đến 9.0 và Điểm tối thiểu phải nhỏ hơn Điểm tối đa!");
      return;
    }

    startTransition(async () => {
      let res;
      if (level?.id) {
        res = await updateIeltsLevelAction(level.id, {
          name,
          minScore,
          maxScore,
          description,
          targetClassCount,
          isActive,
        });
      } else {
        res = await createIeltsLevelAction({
          name,
          minScore,
          maxScore,
          description,
          targetClassCount,
        });
      }

      if (!res.success) {
        setErrorMsg(res.error || "Không thể lưu cấu hình trình độ!");
        return;
      }

      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {level ? "Chỉnh sửa trình độ IELTS" : "Thêm mới trình độ IELTS"}
          </DialogTitle>
          <DialogDescription>
            Cấu hình thang điểm và thông tin hiển thị của trình độ IELTS.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tên trình độ *
            </label>
            <input
              name="name"
              defaultValue={level?.name || ""}
              placeholder="VD: Cơ bản, Trung bình, Nâng cao"
              required
              className="field text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Điểm tối thiểu * (0.0 - 9.0)
              </label>
              <input
                name="minScore"
                type="number"
                step="0.5"
                min="0"
                max="9.0"
                defaultValue={level?.minScore ?? 0.0}
                required
                className="field text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Điểm tối đa * (0.0 - 9.0)
              </label>
              <input
                name="maxScore"
                type="number"
                step="0.5"
                min="0"
                max="9.0"
                defaultValue={level?.maxScore ?? 4.0}
                required
                className="field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Số lớp phân bổ mặc định
            </label>
            <input
              name="targetClassCount"
              type="number"
              min="1"
              defaultValue={level?.targetClassCount || 1}
              required
              className="field text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Mô tả trình độ
            </label>
            <textarea
              name="description"
              defaultValue={level?.description || ""}
              placeholder="Mô tả mục tiêu đầu ra hoặc đối tượng phù hợp..."
              rows={2}
              className="field text-sm"
            />
          </div>

          {level && (
            <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs font-medium text-slate-700">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={level?.isActive ?? true}
                className="size-4 rounded text-[#EA580C] focus:ring-[#EA580C]"
              />
              <span>Trạng thái đang hoạt động</span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} size="sm" className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Lưu trình độ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function IeltsAllocationModal({
  level,
  onClose,
  onSaved,
}: {
  level: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [newCount, setNewCount] = useState<number>(level?.targetClassCount || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const count = Math.floor(Number(newCount));
    if (isNaN(count) || count < 1) {
      setErrorMsg("Số lớp phải là số nguyên dương lớn hơn hoặc bằng 1!");
      return;
    }

    startTransition(async () => {
      const res = await updateIeltsClassAllocationAction(level.id, count);
      if (!res.success) {
        setErrorMsg(res.error || "Không thể cập nhật cấu hình số lớp!");
        return;
      }
      onClose();
      onSaved();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="size-5 text-[#EA580C]" /> Chỉnh sửa cấu hình phân lớp
          </DialogTitle>
          <DialogDescription>
            Thiết lập số lớp được phân bổ cho trình độ <b>{level?.name}</b> khi nhập hàng loạt.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Trình độ:</span>
              <b className="text-slate-800">{level?.name}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thang điểm IELTS:</span>
              <b className="font-mono text-slate-800">{level?.minScore} - {level?.maxScore}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số lớp hiện tại:</span>
              <b className="text-[#EA580C]">{level?.targetClassCount} lớp</b>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Số lớp cấu hình mới * (Số nguyên dương ≥ 1)
            </label>
            <input
              type="number"
              min="1"
              value={newCount}
              onChange={(e) => setNewCount(Math.max(1, parseInt(e.target.value) || 1))}
              required
              className="field text-sm font-bold"
            />
            <p className="text-[11.5px] text-slate-500 mt-1">
              Học sinh thuộc trình độ này sẽ được tự động chia đều vào <b>{newCount}</b> lớp khi nhập hàng loạt.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <b>Cảnh báo an toàn:</b> Cấu hình này làm căn cứ phân bổ cho những lần nhập hàng loạt tiếp theo. Hệ thống không tự động thay đổi hoặc xóa các lớp học chính thức đã tồn tại.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} size="sm" className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Lưu cấu hình số lớp
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   8. SETTINGS VIEW (MY PROFILE + DYNAMIC RBAC PERMISSION MATRIX + IELTS CONFIG)
   ========================================================================= */

function SettingsPageView({
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

  // State quản lý Trình độ IELTS
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [deleteLevelData, setDeleteLevelData] = useState<any>(null);
  const [levelError, setLevelError] = useState("");
  const [levelSuccess, setLevelSuccess] = useState("");

  // State quản lý Cấu hình phân lớp IELTS
  const [allocationModalLevel, setAllocationModalLevel] = useState<any>(null);
  const [allocationSuccess, setAllocationSuccess] = useState("");

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
        <section className="panel">
          <div className="mb-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="font-bold text-base text-[#0F172A]">Ma trận phân quyền hệ thống</h2>
              <p className="text-xs text-[#64748B]">
                Tích chọn quyền truy cập cho từng vai trò trên giao diện. Quản trị viên bấm &quot;Lưu phân quyền&quot; sau khi điều chỉnh.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
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

      {/* MỤC 2.1: CẤU HÌNH TRÌNH ĐỘ IELTS */}
      {canManageSettings && tab === "ielts-levels" && (
        <section className="panel space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Layers className="size-5 text-[#EA580C]" /> Cấu hình trình độ IELTS
              </h2>
              <p className="text-xs text-[#64748B]">
                Xác định thang điểm IELTS đầu vào tương ứng với từng trình độ (Cơ bản, Trung bình, Nâng cao...). Hệ thống tự động kiểm tra các khoảng điểm không bị chồng lấn.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setEditingLevel(null);
                setLevelModalOpen(true);
              }}
              className="bg-[#EA580C] text-white text-xs h-8 gap-1.5"
            >
              <Plus className="size-3.5" /> Thêm trình độ mới
            </Button>
          </div>

          {levelSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium border border-emerald-200">
              {levelSuccess}
            </div>
          )}
          {levelError && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-200">
              {levelError}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Tên trình độ</th>
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Mã</th>
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Thang điểm IELTS</th>
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Mô tả</th>
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B] text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {ieltsLevels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                      Chưa có cấu hình trình độ IELTS nào. Vui lòng bấm &quot;Thêm trình độ mới&quot; để thiết lập.
                    </td>
                  </tr>
                ) : (
                  ieltsLevels.map((lvl) => (
                    <tr key={lvl.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 font-bold text-[#0F172A]">{lvl.name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{lvl.code}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold bg-orange-50 text-[#EA580C] px-2 py-0.5 rounded text-xs border border-orange-200">
                          {Number(lvl.minScore).toFixed(1)} - {Number(lvl.maxScore).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate">
                        {lvl.description || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            lvl.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {lvl.isActive ? "Hoạt động" : "Tạm dừng"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingLevel(lvl);
                              setLevelModalOpen(true);
                            }}
                            title="Chỉnh sửa trình độ"
                            className="size-7 text-slate-500 hover:text-slate-800"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteLevelData(lvl)}
                            title="Xóa trình độ"
                            className="size-7 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <IeltsLevelModal
            open={levelModalOpen}
            onOpenChange={setLevelModalOpen}
            level={editingLevel}
            onSaved={() => {
              setLevelSuccess("Đã lưu cấu hình trình độ IELTS thành công!");
              onRefreshLevels();
            }}
          />

          <ConfirmDialog
            open={!!deleteLevelData}
            onOpenChange={(open) => !open && setDeleteLevelData(null)}
            title="Xóa cấu hình trình độ IELTS"
            description={`Bạn có chắc chắn muốn xóa trình độ "${deleteLevelData?.name}" (${deleteLevelData?.minScore} - ${deleteLevelData?.maxScore}) khỏi hệ thống?`}
            confirmText="Xác nhận xóa"
            onConfirm={async () => {
              if (!deleteLevelData) return;
              setLevelError("");
              setLevelSuccess("");
              const res = await deleteIeltsLevelAction(deleteLevelData.id);
              if (!res.success) {
                setLevelError(res.error || "Không thể xóa trình độ!");
              } else {
                setLevelSuccess("Đã xóa trình độ thành công!");
                onRefreshLevels();
              }
              setDeleteLevelData(null);
            }}
          />
        </section>
      )}

      {/* MỤC 2.2: CẤU HÌNH PHÂN LỚP IELTS */}
      {canManageSettings && tab === "ielts-allocation" && (
        <section className="panel space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Sliders className="size-5 text-[#EA580C]" /> Cấu hình phân lớp IELTS
              </h2>
              <p className="text-xs text-[#64748B]">
                Xác định số lớp được phân bổ cho từng trình độ IELTS khi nhập hàng loạt. Sĩ số thực tế của từng lớp được xác định từ tổng số học sinh thuộc trình độ chia đều cho số lớp.
              </p>
            </div>
          </div>

          {allocationSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium border border-emerald-200">
              {allocationSuccess}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Tên trình độ</th>
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Thang điểm IELTS</th>
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B] text-center">Số lớp cấu hình</th>
                  <th className="px-4 py-3 text-xs font-bold text-[#64748B] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {ieltsLevels.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                      Chưa có trình độ IELTS nào. Vui lòng thiết lập tại tab &quot;Cấu hình trình độ IELTS&quot; trước.
                    </td>
                  </tr>
                ) : (
                  ieltsLevels.map((lvl) => (
                    <tr key={lvl.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3.5 font-bold text-[#0F172A]">{lvl.name}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                        {Number(lvl.minScore).toFixed(1)} - {Number(lvl.maxScore).toFixed(1)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 font-mono inline-block">
                          {lvl.targetClassCount || 1} lớp
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAllocationModalLevel(lvl)}
                          className="text-xs h-7 border-[#EA580C] text-[#EA580C] hover:bg-orange-50 gap-1"
                        >
                          <Edit2 className="size-3" /> Chỉnh sửa
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {allocationModalLevel && (
            <IeltsAllocationModal
              level={allocationModalLevel}
              onClose={() => setAllocationModalLevel(null)}
              onSaved={() => {
                setAllocationSuccess("Đã cập nhật cấu hình số lớp phân bổ thành công!");
                onRefreshLevels();
              }}
            />
          )}
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
  ieltsLevels = [],
  onAddClassShortcut,
  onAddSchoolShortcut,
  onCreatedSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schools: any[];
  classes: any[];
  ieltsLevels?: any[];
  onAddClassShortcut: () => void;
  onAddSchoolShortcut?: () => void;
  onCreatedSuccess: (acc: any) => void;
}) {
  const [modalMode, setModalMode] = useState<"manual" | "excel">("manual");
  const [selectedRole, setSelectedRole] = useState<RoleCode>("STUDENT");
  const [previewCode, setPreviewCode] = useState<string>("HV1001");
  const [emailValue, setEmailValue] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  // Điểm IELTS đầu vào cho học sinh khi nhập thủ công
  const [entryIeltsScoreInput, setEntryIeltsScoreInput] = useState<string>("");

  // Tự động xác định trình độ IELTS từ cấu hình hiện tại (Admin không được tự ý sửa)
  const parsedManualScore = parseFloat(entryIeltsScoreInput);
  const detectedManualLevel =
    !isNaN(parsedManualScore) && parsedManualScore >= 0 && parsedManualScore <= 9
      ? (ieltsLevels || []).find(
          (l: any) => l.isActive && parsedManualScore >= l.minScore && parsedManualScore <= l.maxScore
        )
      : null;

  // Multi-assignment dynamic lists với dấu (+)
  const [managerSchools, setManagerSchools] = useState<string[]>([""]);
  const [staffClasses, setStaffClasses] = useState<string[]>([""]);
  const [studentClasses, setStudentClasses] = useState<string[]>([""]);

  // ==========================================================
  // STATE CHO QUY TRÌNH NHẬP HÀNG LOẠT & PHÂN LỚP IELTS
  // ==========================================================
  const [excelStep, setExcelStep] = useState<"upload" | "suggestion">("upload");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || "");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [analyzingExcel, setAnalyzingExcel] = useState(false);
  const [committingExcel, setCommittingExcel] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [allocationSuggestion, setAllocationSuggestion] = useState<BulkAllocationSuggestion | null>(null);
  const [invalidRowsList, setInvalidRowsList] = useState<InvalidStudentRow[]>([]);
  const [actionNotification, setActionNotification] = useState<string>("");

  // Sub-dialog states for Suggestion screen
  const [selectedClassDetail, setSelectedClassDetail] = useState<ProposedClass | null>(null);
  const [transferStudent, setTransferStudent] = useState<ValidatedStudentRow | null>(null);
  const [targetClassTempId, setTargetClassTempId] = useState<string>("");
  const [transferError, setTransferError] = useState<string>("");
  const [adjustClassLevel, setAdjustClassLevel] = useState<LevelAllocationPlan | null>(null);
  const [newClassCountInput, setNewClassCountInput] = useState<number>(1);
  const [confirmCommitOpen, setConfirmCommitOpen] = useState(false);
  const [showInvalidListModal, setShowInvalidListModal] = useState(false);

  // Sync default school if empty
  useEffect(() => {
    if (!selectedSchoolId && schools.length > 0) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  // Cập nhật preview mã tài khoản khi đổi vai trò
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

  // Kiểm tra email theo chuẩn RFC 5322
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

  // Tải file mẫu mới (có Điểm IELTS đầu vào, KHÔNG có Địa chỉ và Trình độ)
  const handleDownloadSample = () => {
    const sampleData = [
      {
        STT: 1,
        "Họ và tên": "Nguyễn Văn An",
        Email: "an.nguyen@gmail.com",
        "Điểm IELTS": 5.5,
        "Số điện thoại": "0987654321",
        "Ngày sinh": "15/08/2008",
        "Giới tính": "Nam",
      },
      {
        STT: 2,
        "Họ và tên": "Trần Thị Mai",
        Email: "mai.tran@gmail.com",
        "Điểm IELTS": 7.0,
        "Số điện thoại": "0912345678",
        "Ngày sinh": "20/11/2008",
        "Giới tính": "Nữ",
      },
      {
        STT: 3,
        "Họ và tên": "Lê Hoàng Long",
        Email: "long.le@gmail.com",
        "Điểm IELTS": 3.5,
        "Số điện thoại": "0901234567",
        "Ngày sinh": "10/05/2008",
        "Giới tính": "Nam",
      },
      {
        STT: 4,
        "Họ và tên": "Phạm Quỳnh Anh",
        Email: "quynhanh.pham@gmail.com",
        "Điểm IELTS": 5.0,
        "Số điện thoại": "0934567890",
        "Ngày sinh": "12/03/2008",
        "Giới tính": "Nữ",
      },
      {
        STT: 5,
        "Họ và tên": "Hoàng Đức Minh",
        Email: "ducminh.hoang@gmail.com",
        "Điểm IELTS": 6.5,
        "Số điện thoại": "0945678901",
        "Ngày sinh": "25/09/2008",
        "Giới tính": "Nam",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hoc_Vien_IELTS");
    XLSX.writeFile(wb, "SIMPACE_Mau_Import_Hoc_Vien_IELTS.xlsx");
  };

  // Xử lý upload file Excel -> Validate -> Sinh gợi ý phân lớp Suggestion
  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setExcelFile(selected);
    setExcelError("");
    setAllocationSuggestion(null);
    setInvalidRowsList([]);
    setActionNotification("");
    setAnalyzingExcel(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const res = await parseAndValidateBulkStudentsAction(base64);
      if (!res.success) {
        setExcelError(res.error || "Lỗi xử lý tệp Excel/CSV!");
        return;
      }

      setInvalidRowsList(res.invalidRows || []);

      if (!res.validRows || res.validRows.length === 0) {
        setExcelError("Không tìm thấy dòng học sinh hợp lệ nào để phân lớp! Vui lòng kiểm tra danh sách lỗi bên dưới.");
        return;
      }

      // Tạo phương án phân lớp đề xuất
      const sugRes = await generateBulkClassSuggestionAction(res.validRows, selectedSchoolId);
      if (!sugRes.success || !sugRes.suggestion) {
        setExcelError(sugRes.error || "Không thể tạo phương án đề xuất phân lớp!");
        return;
      }

      setAllocationSuggestion(sugRes.suggestion);
      setExcelStep("suggestion");
    } catch (err: any) {
      setExcelError("Không thể đọc tệp: " + (err.message || String(err)));
    } finally {
      setAnalyzingExcel(false);
    }
  };

  // Điều chỉnh số lớp của 1 trình độ & chia đều lại toàn bộ
  const handleConfirmAdjustClassCount = async () => {
    if (!adjustClassLevel || !allocationSuggestion) return;

    const count = Math.floor(newClassCountInput);
    if (count < 1) return;

    const school = schools.find((s) => s.id === selectedSchoolId);
    const schoolCode = school ? school.code.replace(/[^a-zA-Z0-9]/g, "") : "TD";

    const res = await rebalanceOnClassCountChangeAction(
      adjustClassLevel,
      count,
      schoolCode
    );

    if (!res.success || !res.updatedPlan) {
      alert(res.error || "Không thể điều chỉnh số lớp!");
      return;
    }

    const nextPlans = allocationSuggestion.levelPlans.map((p) =>
      p.levelId === res.updatedPlan!.levelId ? res.updatedPlan! : p
    );

    const newTotalClasses = nextPlans.reduce((acc, p) => acc + p.classes.length, 0);

    setAllocationSuggestion({
      ...allocationSuggestion,
      summary: {
        ...allocationSuggestion.summary,
        totalClasses: newTotalClasses,
      },
      levelPlans: nextPlans,
    });

    setActionNotification(res.message || "Đã điều chỉnh số lớp và phân bổ lại toàn bộ học sinh!");
    setAdjustClassLevel(null);
  };

  // Chuyển học sinh giữa các lớp cùng trình độ & chia đều lại
  const handleConfirmTransfer = async () => {
    if (!transferStudent || !targetClassTempId || !allocationSuggestion) return;
    setTransferError("");

    const currentPlan = allocationSuggestion.levelPlans.find(
      (p) => p.levelId === transferStudent.levelId
    );
    if (!currentPlan) {
      setTransferError("Không tìm thấy kế hoạch phân lớp cho trình độ này!");
      return;
    }

    const targetClass = currentPlan.classes.find((c) => c.tempId === targetClassTempId);
    if (!targetClass) {
      setTransferError("Chỉ được chuyển học sinh sang lớp cùng trình độ IELTS!");
      return;
    }

    const school = schools.find((s) => s.id === selectedSchoolId);
    const schoolCode = school ? school.code.replace(/[^a-zA-Z0-9]/g, "") : "TD";

    const res = await rebalanceOnStudentTransferAction(
      currentPlan,
      transferStudent.email,
      targetClassTempId,
      schoolCode
    );

    if (!res.success || !res.updatedPlan) {
      setTransferError(res.error || "Lỗi khi chuyển lớp!");
      return;
    }

    const nextPlans = allocationSuggestion.levelPlans.map((p) =>
      p.levelId === res.updatedPlan!.levelId ? res.updatedPlan! : p
    );

    setAllocationSuggestion({
      ...allocationSuggestion,
      levelPlans: nextPlans,
    });

    if (selectedClassDetail) {
      const updatedClass = res.updatedPlan.classes.find(
        (c) => c.classIndex === selectedClassDetail.classIndex
      );
      if (updatedClass) {
        setSelectedClassDetail(updatedClass);
      }
    }

    setActionNotification(res.message || "Đã chuyển học sinh và tự động cân bằng lại sĩ số các lớp trong trình độ!");
    setTransferStudent(null);
    setTargetClassTempId("");
  };

  // Xác nhận lưu phân lớp hàng loạt vào database
  const handleCommitAllocation = async () => {
    if (!allocationSuggestion || !selectedSchoolId) return;
    setCommittingExcel(true);
    try {
      const res = await commitBulkAllocationAction(
        allocationSuggestion.levelPlans,
        selectedSchoolId,
        excelFile?.name || "import_ielts.xlsx"
      );

      if (!res.success) {
        setExcelError(res.error || "Lỗi khi lưu dữ liệu phân lớp!");
        setConfirmCommitOpen(false);
      } else {
        setConfirmCommitOpen(false);
        onOpenChange(false);
        onCreatedSuccess({
          fullName: `Đã phân lớp và khởi tạo thành công ${allocationSuggestion.summary.totalAllocatedStudents} học viên vào ${allocationSuggestion.summary.totalClasses} lớp IELTS`,
          username: "HV...",
          email: "Đã gửi thông tin tài khoản qua email",
          role: "Học sinh",
          mailResult: { sent: true },
        });
      }
    } catch (err: any) {
      setExcelError("Lỗi hệ thống khi phân lớp: " + (err.message || String(err)));
      setConfirmCommitOpen(false);
    } finally {
      setCommittingExcel(false);
    }
  };

  // Submit form thêm thủ công
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

    if (selectedRole === "SCHOOL_MANAGER" && schoolIds.length === 0) {
      setErrorMsg("Quản nhiệm bắt buộc phải được phân công ít nhất 1 trường học phụ trách!");
      return;
    }
    if (selectedRole === "TEACHER" && classIds.length === 0) {
      setErrorMsg("Giáo viên bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!");
      return;
    }
    if (selectedRole === "TEACHING_ASSISTANT" && classIds.length === 0) {
      setErrorMsg("Trợ giảng bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!");
      return;
    }

    let parsedScore: number | undefined = undefined;
    let levelId: string | undefined = undefined;

    if (selectedRole === "STUDENT") {
      parsedScore = parseFloat(entryIeltsScoreInput);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 9) {
        setErrorMsg("Học sinh bắt buộc phải có Điểm IELTS đầu vào hợp lệ từ 0.0 đến 9.0!");
        return;
      }
      if (!detectedManualLevel) {
        setErrorMsg("Không tìm thấy trình độ IELTS phù hợp với điểm này trong Cài đặt! Vui lòng cấu hình khoảng điểm trước.");
        return;
      }
      levelId = detectedManualLevel.id;
    }

    startTransition(async () => {
      const res = await createUserAction({
        fullName: formData.get("fullName")?.toString() || "",
        email: emailValue.trim().toLowerCase(),
        roleCode: selectedRole,
        phoneNumber: formData.get("phoneNumber")?.toString(),
        address: selectedRole === "STUDENT" ? undefined : formData.get("address")?.toString(),
        dateOfBirth: formData.get("dateOfBirth")?.toString() || undefined,
        gender: (formData.get("gender")?.toString() as any) || undefined,
        schoolIds: selectedRole === "SCHOOL_MANAGER" ? schoolIds : undefined,
        classIds:
          selectedRole === "TEACHER" ||
          selectedRole === "TEACHING_ASSISTANT" ||
          (selectedRole === "STUDENT" && classIds.length > 0)
            ? classIds
            : undefined,
        entryIeltsScore: parsedScore,
        ieltsLevelId: levelId,
      });

      if (!res.success || !res.user) {
        setErrorMsg(res.error || "Không thể tạo người dùng!");
        return;
      }

      form.reset();
      setEntryIeltsScoreInput("");
      onCreatedSuccess({
        fullName: res.user.profile?.fullName,
        username: res.user.username,
        email: res.user.email,
        role: res.user.role?.name,
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`transition-all duration-200 ${
            modalMode === "excel" && excelStep === "suggestion" ? "max-w-5xl" : "max-w-2xl"
          } max-h-[92vh] overflow-y-auto`}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {modalMode === "excel" && excelStep === "suggestion"
                ? "Phương án đề xuất phân lớp học sinh IELTS"
                : "Thêm người dùng mới"}
            </DialogTitle>
            <DialogDescription>
              {modalMode === "excel" && excelStep === "suggestion"
                ? "Kiểm tra sĩ số, điều chỉnh số lớp, chuyển học sinh giữa các lớp cùng trình độ và xác nhận khởi tạo."
                : "Tạo tài khoản đơn lẻ theo vai trò hoặc tải danh sách học sinh hàng loạt để tự động phân lớp IELTS."}
            </DialogDescription>
          </DialogHeader>

          {/* Chuyển đổi giữa 2 chế độ: Thủ công & Excel */}
          <div className="flex border-b border-[#E2E8F0] gap-4 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setModalMode("manual");
                setExcelStep("upload");
              }}
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
              <FileSpreadsheet className="size-4" /> Nhập hàng loạt & Phân lớp IELTS
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

                  {/* Đối với Học sinh: BỎ trường Địa chỉ theo đặc tả; hiển thị Điểm IELTS đầu vào */}
                  {selectedRole === "STUDENT" ? (
                    <div>
                      <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                        Điểm IELTS đầu vào *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        placeholder="Nhập điểm từ 0.0 - 9.0 (VD: 5.5)"
                        className="field"
                        value={entryIeltsScoreInput}
                        onChange={(e) => setEntryIeltsScoreInput(e.target.value)}
                        required
                      />
                    </div>
                  ) : (
                    <Field
                      name="address"
                      label="Địa chỉ thường trú"
                      placeholder="Số nhà, đường, quận/huyện..."
                    />
                  )}

                  <div>
                    <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                      Ngày sinh
                    </label>
                    <input
                      name="dateOfBirth"
                      type="date"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                      Giới tính
                    </label>
                    <select name="gender" className="field" defaultValue="">
                      <option value="">-- Chọn giới tính --</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>

                  {/* Thẻ hiển thị Trình độ IELTS tự động suy ra cho Học sinh (Read-only) */}
                  {selectedRole === "STUDENT" && (
                    <div className="sm:col-span-2 rounded-xl border border-orange-200 bg-[#FFF7ED] p-3 text-xs">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="size-4 text-[#EA580C]" />
                        Trình độ IELTS tương ứng (Hệ thống tự động xác định - Read-only):
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        {detectedManualLevel ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs">
                            <Check className="size-3.5" />
                            {detectedManualLevel.name} ({detectedManualLevel.code}) — Thang điểm {Number(detectedManualLevel.minScore).toFixed(1)} - {Number(detectedManualLevel.maxScore).toFixed(1)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs">
                            {entryIeltsScoreInput
                              ? "Chưa có trình độ khớp khoảng điểm này trong Cài đặt"
                              : "Vui lòng nhập điểm IELTS để hệ thống tự xác định trình độ"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        * Theo quy tắc nghiệp vụ: Admin không được tự ý sửa trình độ do hệ thống xác định. Form thủ công không tự động đề xuất phân lớp.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* BƯỚC 3: CÁC TRƯỜNG ĐẶC THÙ & GÁN ĐA NHIỆM (+) THEO VAI TRÒ */}
              <div className="pt-2 border-t border-[#E2E8F0]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                  3. Phân công & Nhiệm vụ theo vị trí
                </label>

                {/* A. QUẢN NHIỆM */}
                {selectedRole === "SCHOOL_MANAGER" && (
                  <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          Trường học phụ trách (Quản lý đa trường) *
                        </h4>
                        <p className="text-xs text-[#64748B]">
                          Bắt buộc chọn ít nhất 1 trường đối tác quản lý.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setManagerSchools((prev) => [...prev, ""])}
                          className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                        >
                          <Plus className="size-3.5 mr-1" /> Thêm trường
                        </Button>
                        {onAddSchoolShortcut && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onAddSchoolShortcut}
                            title="Tạo nhanh trường mới"
                            className="text-xs h-7"
                          >
                            <CirclePlus className="size-3.5 mr-1 text-[#EA580C]" /> Tạo trường mới
                          </Button>
                        )}
                      </div>
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
                            <option value="">-- Chọn trường học phụ trách #{idx + 1} * --</option>
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

                {/* B. GIÁO VIÊN */}
                {selectedRole === "TEACHER" && (
                  <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          Lớp học phụ trách giảng dạy *
                        </h4>
                        <p className="text-xs text-[#64748B]">
                          Bắt buộc chọn ít nhất 1 lớp học giảng dạy.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStaffClasses((prev) => [...prev, ""])}
                          className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                        >
                          <Plus className="size-3.5 mr-1" /> Thêm lớp
                        </Button>
                        {onAddClassShortcut && (
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
                        )}
                      </div>
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
                            <option value="">-- Chọn lớp học #{idx + 1} * --</option>
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

                {/* C. TRỢ GIẢNG */}
                {selectedRole === "TEACHING_ASSISTANT" && (
                  <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          Lớp học phụ trách trợ giảng *
                        </h4>
                        <p className="text-xs text-[#64748B]">
                          Bắt buộc chọn ít nhất 1 lớp học trợ giảng.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStaffClasses((prev) => [...prev, ""])}
                          className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                        >
                          <Plus className="size-3.5 mr-1" /> Thêm lớp
                        </Button>
                        {onAddClassShortcut && (
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
                        )}
                      </div>
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
                            <option value="">-- Chọn lớp trợ giảng #{idx + 1} * --</option>
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

                {/* D. HỌC SINH (Gán lớp thủ công nếu muốn) */}
                {selectedRole === "STUDENT" && (
                  <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">Gán lớp học (Tùy chọn)</h4>
                        <p className="text-xs text-[#64748B]">
                          Nhập thủ công không tự động đề xuất phân lớp. Bạn có thể chọn lớp ngay hoặc gán sau.
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
                            <option value="">-- Chọn lớp học #{idx + 1} (Không bắt buộc) --</option>
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
                    <b>Lưu ý:</b> Tài khoản Quản trị viên có toàn quyền kiểm soát toàn bộ hệ thống.
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
               CHẾ ĐỘ 2: NHẬP HÀNG LOẠT & ĐỀ XUẤT PHÂN LỚP IELTS
               ======================================================== */
            <div className="space-y-4 pt-2">
              {actionNotification && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center justify-between">
                  <span>{actionNotification}</span>
                  <button
                    type="button"
                    onClick={() => setActionNotification("")}
                    className="text-emerald-600 hover:text-emerald-900 ml-2"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {excelError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200 flex items-center justify-between">
                  <span>{excelError}</span>
                  <button
                    type="button"
                    onClick={() => setExcelError("")}
                    className="text-red-500 hover:text-red-800 ml-2"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* BƯỚC 1: UPLOAD & VALIDATE FILE */}
              {excelStep === "upload" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-xs font-bold text-[#0F172A] block mb-1.5">
                        Trường học đối tác áp dụng *
                      </label>
                      <select
                        value={selectedSchoolId}
                        onChange={(e) => setSelectedSchoolId(e.target.value)}
                        className="field text-xs"
                      >
                        {schools.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Các lớp học IELTS được đề xuất sẽ thuộc về trường đối tác này.
                      </p>
                    </div>

                    <div className="flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">File mẫu Excel chuẩn SIMPACE</h4>
                        <p className="text-[11px] text-[#64748B]">
                          Gồm các cột: Họ và tên, Email, Điểm IELTS, SĐT, Ngày sinh, Giới tính (Không có Địa chỉ và Trình độ).
                        </p>
                      </div>
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadSample}
                          className="text-xs border-[#CBD5E1] text-[#0F172A] hover:border-[#EA580C] h-8 w-full sm:w-auto"
                        >
                          <Download className="size-3.5 mr-1.5 text-[#EA580C]" /> Tải file mẫu (.xlsx)
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Dropzone */}
                  <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#EA580C] rounded-2xl p-6 text-center transition bg-[#F8FAFC]">
                    <FileSpreadsheet className="size-10 mx-auto text-[#EA580C] mb-2" />
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {excelFile ? excelFile.name : "Kéo thả file Excel học viên vào đây hoặc duyệt file"}
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-1">Hỗ trợ định dạng .xlsx, .xls hoặc .csv</p>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelChange}
                      className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FFF1EB] file:text-[#EA580C] hover:file:bg-[#FFE5D6] cursor-pointer"
                    />
                  </div>

                  {analyzingExcel && (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#EA580C] font-medium">
                      <Loader2 className="size-5 animate-spin" /> Đang kiểm tra dữ liệu và tự động đề xuất phân lớp...
                    </div>
                  )}

                  {/* Bảng lỗi nếu có dòng lỗi trước khi phân lớp */}
                  {invalidRowsList.length > 0 && !allocationSuggestion && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-rose-700">
                          Phát hiện {invalidRowsList.length} dòng không hợp lệ:
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto text-xs text-rose-600 space-y-1">
                        {invalidRowsList.map((err, idx) => (
                          <div key={idx} className="border-b border-rose-100 pb-1">
                            • Dòng {err.rowNumber}: {err.fullName || "Chưa có tên"} ({err.email || "Không có email"}) — Điểm: {err.rawScore ?? "Trống"} — <i>{err.errorReason}</i>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BƯỚC 2: MÀN HÌNH SUGGESTION PHÂN LỚP TƯƠNG TÁC */}
              {excelStep === "suggestion" && allocationSuggestion && (
                <div className="space-y-4">
                  {/* Top bar điều hướng */}
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-600">
                      Đang xử lý tệp: <b className="text-slate-800">{excelFile?.name}</b> — Trường học:{" "}
                      <b className="text-slate-800">
                        {schools.find((s) => s.id === selectedSchoolId)?.name || "Chưa chọn"}
                      </b>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExcelStep("upload");
                        setAllocationSuggestion(null);
                        setExcelFile(null);
                      }}
                      className="text-xs h-7 gap-1"
                    >
                      <RotateCcw className="size-3" /> Tải tệp khác
                    </Button>
                  </div>

                  {/* 1. KHU VỰC TỔNG QUAN (6 CHỈ SỐ THEO ĐẶC TẢ) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                    {/* Chỉ số 1: Tổng HS hợp lệ */}
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-emerald-700">1. HS hợp lệ</span>
                      <b className="text-xl text-emerald-800 mt-1">{allocationSuggestion.summary.totalValid}</b>
                    </div>

                    {/* Chỉ số 2: Tổng HS chưa hợp lệ */}
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-medium text-rose-700">2. HS chưa hợp lệ</span>
                        {invalidRowsList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowInvalidListModal(true)}
                            className="text-[10px] text-rose-600 underline hover:text-rose-800"
                            title="Xem chi tiết các dòng lỗi"
                          >
                            Xem lỗi
                          </button>
                        )}
                      </div>
                      <b className="text-xl text-rose-800 mt-1">{invalidRowsList.length}</b>
                    </div>

                    {/* Chỉ số 3: Số trình độ IELTS */}
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-indigo-700">3. Số trình độ</span>
                      <b className="text-xl text-indigo-800 mt-1">{allocationSuggestion.levelPlans.length}</b>
                    </div>

                    {/* Chỉ số 4: Tổng số lớp dự kiến */}
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-[#EA580C]">4. Tổng lớp dự kiến</span>
                      <b className="text-xl text-orange-800 mt-1">{allocationSuggestion.summary.totalClasses}</b>
                    </div>

                    {/* Chỉ số 5: Tổng HS đã phân lớp */}
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-sky-700">5. Đã phân lớp</span>
                      <b className="text-xl text-sky-800 mt-1">{allocationSuggestion.summary.totalAllocatedStudents}</b>
                    </div>

                    {/* Chỉ số 6: HS chưa phân lớp */}
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-slate-600">6. Chưa phân lớp</span>
                      <b className="text-xl text-slate-800 mt-1">
                        {Math.max(
                          0,
                          allocationSuggestion.summary.totalValid -
                            allocationSuggestion.summary.totalAllocatedStudents
                        )}
                      </b>
                    </div>
                  </div>

                  {/* 2. KHU VỰC DANH SÁCH LỚP (NHÓM THEO TRÌNH ĐỘ IELTS) */}
                  <div className="space-y-4 pt-1">
                    {allocationSuggestion.levelPlans.map((plan) => (
                      <div
                        key={plan.levelId}
                        className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white shadow-sm"
                      >
                        {/* Header trình độ: Tên trình độ, Sĩ số, Số lớp cấu hình, Nút điều chỉnh số lớp */}
                        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-3.5 flex flex-wrap justify-between items-center gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 bg-orange-100 text-[#EA580C] font-bold text-xs rounded-lg">
                              {plan.levelCode}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-[#0F172A]">
                                Trình độ: {plan.levelName}
                              </h3>
                              <p className="text-xs text-[#64748B]">
                                Tổng số học sinh: <b>{plan.studentCount}</b> — Số lớp hiện tại:{" "}
                                <b>{plan.classCount}</b> (Sĩ số trung bình ~
                                {Math.round(plan.studentCount / Math.max(1, plan.classCount))} HV/lớp)
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdjustClassLevel(plan);
                              setNewClassCountInput(plan.classCount);
                            }}
                            className="text-xs border-[#CBD5E1] text-[#0F172A] hover:border-[#EA580C] h-7 gap-1"
                          >
                            <Sliders className="size-3.5 text-[#EA580C]" /> Điều chỉnh số lớp
                          </Button>
                        </div>

                        {/* Danh sách các lớp được đề xuất trong trình độ này */}
                        <div className="p-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {plan.classes.map((c) => (
                            <div
                              key={c.tempId}
                              className="rounded-xl border border-slate-200 bg-[#FAFAFA] hover:bg-white hover:border-[#EA580C]/50 transition p-3 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex justify-between items-start gap-1">
                                  <h4 className="font-bold text-xs text-[#0F172A] line-clamp-1">{c.name}</h4>
                                  <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-200 text-slate-700">
                                    {c.students.length} HV
                                  </span>
                                </div>
                                <p className="text-[11px] font-mono text-[#64748B] mt-0.5">{c.code}</p>

                                {/* Preview 2 học sinh đầu tiên */}
                                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1.5">
                                  {c.students.slice(0, 2).map((s, idx) => (
                                    <div key={idx} className="truncate">
                                      • {s.fullName} ({s.ieltsScore}đ)
                                    </div>
                                  ))}
                                  {c.students.length > 2 && (
                                    <div className="text-[10px] text-slate-400 italic">
                                      ... và {c.students.length - 2} học sinh khác
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedClassDetail(c)}
                                  className="text-xs text-[#EA580C] hover:bg-orange-50 h-7 px-2.5 gap-1 font-semibold"
                                >
                                  <Eye className="size-3.5" /> Chi tiết lớp
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Nút hành động cuối màn hình Suggestion */}
                  <div className="flex justify-between items-center pt-3 border-t border-[#E2E8F0]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setExcelStep("upload");
                      }}
                      className="text-xs"
                    >
                      <ChevronLeft className="size-3.5 mr-1" /> Quay lại Bước 1
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setConfirmCommitOpen(true)}
                      disabled={committingExcel || allocationSuggestion.summary.totalAllocatedStudents === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 gap-1.5 font-bold shadow-sm"
                    >
                      <Check className="size-4" /> Xác nhận phân lớp & Khởi tạo (
                      {allocationSuggestion.summary.totalAllocatedStudents} học viên)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================
          SUB-MODAL 1: CHI TIẾT LỚP HỌC (DANH SÁCH HỌC SINH & CHUYỂN LỚP)
          ======================================================== */}
      {selectedClassDetail && (
        <Dialog open={true} onOpenChange={() => setSelectedClassDetail(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center justify-between">
                <span>Chi tiết: {selectedClassDetail.name}</span>
                <span className="font-mono text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedClassDetail.code}
                </span>
              </DialogTitle>
              <DialogDescription>
                Trình độ: <b>{selectedClassDetail.levelName}</b> — Sĩ số dự kiến:{" "}
                <b>{selectedClassDetail.students.length} học sinh</b>
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2.5 font-bold text-slate-600">STT</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">Họ và tên</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">Email</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-center">Điểm IELTS</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">SĐT</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-center">Giới tính</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedClassDetail.students.map((st, idx) => (
                    <tr key={st.email} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{st.fullName}</td>
                      <td className="px-3 py-2 text-slate-600">{st.email}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 bg-orange-100 text-[#EA580C] font-bold rounded font-mono">
                          {st.ieltsScore}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{st.phoneNumber || "—"}</td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {st.gender === "FEMALE" ? "Nữ" : st.gender === "MALE" ? "Nam" : "Khác"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTransferStudent(st);
                            setTargetClassTempId("");
                            setTransferError("");
                          }}
                          className="text-[11px] h-6 px-2 border-slate-200 text-[#EA580C] hover:bg-orange-50 gap-1"
                        >
                          <ArrowRightLeft className="size-3" /> Chuyển lớp
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={() => setSelectedClassDetail(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          SUB-MODAL 2: CHUYỂN HỌC SINH SANG LỚP KHÁC CÙNG TRÌNH ĐỘ
          ======================================================== */}
      {transferStudent && (
        <Dialog open={true} onOpenChange={() => setTransferStudent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <ArrowRightLeft className="size-4 text-[#EA580C]" /> Chuyển lớp cho học sinh
              </DialogTitle>
              <DialogDescription>
                Chỉ cho phép chuyển học sinh sang lớp khác thuộc cùng trình độ IELTS ({transferStudent.levelName}).
              </DialogDescription>
            </DialogHeader>

            {transferError && (
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-200">
                {transferError}
              </div>
            )}

            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  Học sinh: <b className="text-slate-900">{transferStudent.fullName}</b> ({transferStudent.email})
                </div>
                <div>
                  Điểm IELTS: <b className="text-[#EA580C]">{transferStudent.ieltsScore}</b> — Trình độ:{" "}
                  <b className="text-slate-900">{transferStudent.levelName}</b>
                </div>
                <div>
                  Lớp hiện tại: <b className="text-slate-800">{selectedClassDetail?.name}</b>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chọn lớp đích (Cùng trình độ IELTS) *
                </label>
                {(() => {
                  const currentPlan = allocationSuggestion?.levelPlans.find(
                    (p) => p.levelId === transferStudent.levelId
                  );
                  const candidateClasses =
                    currentPlan?.classes.filter((c) => c.tempId !== selectedClassDetail?.tempId) || [];

                  if (candidateClasses.length === 0) {
                    return (
                      <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200">
                        Trình độ này hiện chỉ có 1 lớp duy nhất. Nếu muốn chia thêm lớp để chuyển học sinh, vui lòng
                        dùng tính năng &quot;Điều chỉnh số lớp&quot;.
                      </div>
                    );
                  }

                  return (
                    <select
                      className="field text-xs"
                      value={targetClassTempId}
                      onChange={(e) => setTargetClassTempId(e.target.value)}
                    >
                      <option value="">-- Chọn lớp tiếp nhận --</option>
                      {candidateClasses.map((cls) => (
                        <option key={cls.tempId} value={cls.tempId}>
                          {cls.name} ({cls.code}) — Hiện có {cls.students.length} HV
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-2.5 text-[11px] text-blue-800">
                <b>Quy tắc tự động chia lại:</b> Khi chuyển học sinh, hệ thống sẽ tự động tính toán và phân bổ lại toàn
                bộ học sinh thuộc trình độ này để đảm bảo sĩ số các lớp luôn cân bằng nhất.
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setTransferStudent(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                disabled={!targetClassTempId}
                onClick={handleConfirmTransfer}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white text-xs"
              >
                Xác nhận chuyển & Phân bổ lại
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          SUB-MODAL 3: ĐIỀU CHỈNH SỐ LỚP CỦA MỘT TRÌNH ĐỘ
          ======================================================== */}
      {adjustClassLevel && (
        <Dialog open={true} onOpenChange={() => setAdjustClassLevel(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Sliders className="size-4 text-[#EA580C]" /> Điều chỉnh số lớp: {adjustClassLevel.levelName}
              </DialogTitle>
              <DialogDescription>
                Thay đổi số lớp phân bổ cho trình độ này. Hệ thống sẽ tự động chia đều lại toàn bộ học sinh.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  Trình độ: <b className="text-slate-900">{adjustClassLevel.levelName}</b> ({adjustClassLevel.levelCode})
                </div>
                <div>
                  Tổng số học sinh thuộc trình độ: <b>{adjustClassLevel.studentCount}</b>
                </div>
                <div>
                  Số lớp hiện tại: <b>{adjustClassLevel.classCount}</b>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số lớp mới mong muốn (Số nguyên dương &ge; 1) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  className="field text-sm"
                  value={newClassCountInput}
                  onChange={(e) => setNewClassCountInput(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                <b>Cảnh báo:</b> Khi thay đổi số lớp, toàn bộ {adjustClassLevel.studentCount} học sinh của trình độ này
                sẽ được tự động chia đều lại vào {newClassCountInput} lớp mới (sĩ số ~
                {Math.floor(adjustClassLevel.studentCount / Math.max(1, newClassCountInput))} đến{" "}
                {Math.ceil(adjustClassLevel.studentCount / Math.max(1, newClassCountInput))} HV/lớp).
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAdjustClassLevel(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAdjustClassCount}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white text-xs"
              >
                Lưu & Phân bổ lại toàn bộ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          SUB-MODAL 4: XEM DANH SÁCH DÒNG LỖI CỤ THỂ
          ======================================================== */}
      {showInvalidListModal && (
        <Dialog open={true} onOpenChange={() => setShowInvalidListModal(false)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="size-4" /> Danh sách học sinh chưa hợp lệ ({invalidRowsList.length})
              </DialogTitle>
              <DialogDescription>
                Các dòng dữ liệu bị từ chối do thiếu thông tin hoặc sai định dạng theo quy tắc hệ thống.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-x-auto rounded-xl border border-rose-200 mt-2">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-rose-50 border-b border-rose-200">
                    <th className="px-3 py-2 font-bold text-rose-700">Dòng</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Họ và tên</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Email</th>
                    <th className="px-3 py-2 font-bold text-rose-700 text-center">Điểm thô</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Lý do từ chối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 bg-white">
                  {invalidRowsList.map((err, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/50">
                      <td className="px-3 py-2 font-mono text-slate-500">{err.rowNumber}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{err.fullName || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{err.email || "—"}</td>
                      <td className="px-3 py-2 text-center font-mono">{String(err.rawScore ?? "—")}</td>
                      <td className="px-3 py-2 text-rose-600 font-medium">{err.errorReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={() => setShowInvalidListModal(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          SUB-MODAL 5: POPUP TỔNG KẾT & XÁC NHẬN PHÂN LỚP (COMMIT)
          ======================================================== */}
      {confirmCommitOpen && allocationSuggestion && (
        <Dialog open={true} onOpenChange={() => setConfirmCommitOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Check className="size-5 text-emerald-600" /> Xác nhận phân lớp và khởi tạo
              </DialogTitle>
              <DialogDescription>
                Vui lòng kiểm tra lại phương án trước khi hệ thống ghi nhận vào cơ sở dữ liệu chính thức.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div>
                  Trường học tiếp nhận:{" "}
                  <b className="text-slate-900">
                    {schools.find((s) => s.id === selectedSchoolId)?.name || "Chưa chọn"}
                  </b>
                </div>
                <div>
                  Tổng số tài khoản học viên sẽ tạo:{" "}
                  <b className="text-emerald-700">{allocationSuggestion.summary.totalAllocatedStudents}</b>
                </div>
                <div>
                  Tổng số lớp học IELTS sẽ khởi tạo:{" "}
                  <b className="text-[#EA580C]">{allocationSuggestion.summary.totalClasses}</b>
                </div>
              </div>

              {/* Tóm tắt theo từng trình độ */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <b className="text-slate-800 block">Chi tiết phân bổ theo trình độ:</b>
                {allocationSuggestion.levelPlans.map((p) => (
                  <div key={p.levelId} className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-1">
                    <span>
                      Trình độ <b>{p.levelName}</b>:
                    </span>
                    <span>
                      <b>{p.classCount}</b> lớp ({p.studentCount} học viên)
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-800">
                <b>Bảo mật & Cấp tài khoản:</b> Mật khẩu khởi tạo chuẩn <code>Simpace@2026</code> sẽ được băm bảo mật và
                gửi tự động qua email cho từng học viên. Học viên sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={committingExcel}
                onClick={() => setConfirmCommitOpen(false)}
              >
                Quay lại kiểm tra
              </Button>
              <Button
                type="button"
                disabled={committingExcel}
                onClick={handleCommitAllocation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold"
              >
                {committingExcel ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Đồng ý khởi tạo & Phân lớp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
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
      `Tài khoản SIMPACE LMS:\nEmail: ${info.email}\nTên đăng nhập: ${info.username}\nMật khẩu khởi tạo: Đã gửi bảo mật đến email ${info.email}\nLink đăng nhập: http://localhost:3000`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck className="size-5" /> Thông tin khởi tạo tài khoản
          </DialogTitle>
          <DialogDescription>
            Tài khoản đã được tạo thành công. Mật khẩu khởi tạo được gửi bảo mật trực tiếp đến email người dùng.
          </DialogDescription>
        </DialogHeader>

        {info.mailResult?.sent ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
            <CircleCheck className="size-5 text-emerald-600 shrink-0" />
            <span>
              <b>Email đã được gửi thành công:</b> Hệ thống đã gửi thư kèm mật khẩu khởi tạo và hướng dẫn đăng nhập trực tiếp đến hòm thư <b>{info.email}</b>.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-bold text-blue-800">
              <ShieldCheck className="size-4 text-blue-600 shrink-0" />
              <span>Chính sách bảo mật mật khẩu khởi tạo</span>
            </div>
            <p className="text-[11.5px] text-blue-700 leading-relaxed">
              Mật khẩu khởi tạo được gửi bảo mật trực tiếp về hòm thư <b>{info.email}</b> của người dùng. Quản trị viên không thể xem mật khẩu này nhằm bảo vệ quyền riêng tư và an toàn thông tin theo chuẩn bảo mật.
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
            <p className="flex items-center gap-1.5 text-xs text-slate-700 pt-1">
              <Lock className="size-3.5 text-amber-600 shrink-0" />
              <span>
                Mật khẩu khởi tạo:{" "}
                <b className="font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Đã gửi bảo mật về email người nhận
                </b>
              </span>
            </p>
            <p className="text-xs text-[#64748B] italic pt-1">
              * Người dùng sẽ sử dụng mật khẩu nhận trong email để đăng nhập lần đầu, sau đó hệ thống sẽ yêu cầu xác thực OTP và đổi mật khẩu mới.
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

/* =========================================================================
   BỘ CHỌN THỜI KHÓA BIỂU & LỊCH HỌC TƯƠNG TÁC (SCHEDULE PICKER SECTION)
   ========================================================================= */

function SchedulePickerSection({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedDays,
  setSelectedDays,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  scheduleStr,
  setScheduleStr,
}: {
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  selectedDays: string[];
  setSelectedDays: React.Dispatch<React.SetStateAction<string[]>>;
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  scheduleStr: string;
  setScheduleStr: (v: string) => void;
}) {
  const daysOfWeek = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  interface ShiftItem {
    id: string;
    label: string;
    start: string;
    end: string;
  }

  const defaultShifts: ShiftItem[] = [
    { id: "s1", label: "Ca 1 (17:30 - 19:30)", start: "17:30", end: "19:30" },
    { id: "s2", label: "Ca 2 (18:00 - 20:00)", start: "18:00", end: "20:00" },
    { id: "s3", label: "Ca 3 (19:30 - 21:30)", start: "19:30", end: "21:30" },
    { id: "s4", label: "Ca Sáng (08:30 - 10:30)", start: "08:30", end: "10:30" },
  ];

  const [shifts, setShifts] = useState<ShiftItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("simpace_shifts");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return defaultShifts;
  });

  const [isAddingShift, setIsAddingShift] = useState(false);
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("14:00");
  const [newShiftEnd, setNewShiftEnd] = useState("16:00");

  const handleAddShift = () => {
    if (!newShiftName.trim() || !newShiftStart || !newShiftEnd) return;
    const label = `${newShiftName.trim()} (${newShiftStart} - ${newShiftEnd})`;
    const updated = [
      ...shifts,
      {
        id: `shift_${Date.now()}`,
        label,
        start: newShiftStart,
        end: newShiftEnd,
      },
    ];
    setShifts(updated);
    try {
      localStorage.setItem("simpace_shifts", JSON.stringify(updated));
    } catch {}
    applyShift(newShiftStart, newShiftEnd);
    setNewShiftName("");
    setIsAddingShift(false);
  };

  const handleDeleteShift = (id: string) => {
    const updated = shifts.filter((s) => s.id !== id);
    setShifts(updated);
    try {
      localStorage.setItem("simpace_shifts", JSON.stringify(updated));
    } catch {}
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      if (next.length > 0) {
        const timePart = startTime && endTime ? ` • ${startTime} - ${endTime}` : "";
        setScheduleStr(`${next.join(", ")}${timePart}`);
      } else {
        setScheduleStr("");
      }
      return next;
    });
  };

  const applyShift = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
    if (selectedDays.length > 0) {
      setScheduleStr(`${selectedDays.join(", ")} • ${start} - ${end}`);
    } else {
      setScheduleStr(`18:00 - 20:00`);
    }
  };

  return (
    <div className="rounded-2xl border border-orange-200/90 bg-[#FFF7ED]/50 p-4 space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-[#EA580C]" />
          <h3 className="text-sm font-bold text-[#0F172A]">Bộ chọn Lịch học &amp; Thời khóa biểu</h3>
        </div>
        <span className="text-[11px] font-semibold text-[#EA580C] bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
          Chọn tương tác
        </span>
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
            className="field text-sm bg-white"
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
            className="field text-sm bg-white"
          />
        </div>
      </div>

      {/* Pills chọn ngày trong tuần */}
      <div>
        <label className="text-xs font-semibold text-[#475569] block mb-1.5">
          1. Bấm chọn các buổi học trong tuần:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {daysOfWeek.map((day) => {
            const active = selectedDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                  active
                    ? "bg-[#EA580C] text-white shadow-orange-200"
                    : "bg-white border border-[#CBD5E1] text-[#64748B] hover:border-[#EA580C] hover:text-[#EA580C]"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ca học mẫu nhanh */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-[#475569] block">
            2. Chọn nhanh ca học hoặc chỉnh giờ tùy ý:
          </label>
          <button
            type="button"
            onClick={() => setIsAddingShift(!isAddingShift)}
            className="text-[11px] font-semibold text-[#EA580C] hover:underline flex items-center gap-1"
          >
            <Plus className="size-3" /> {isAddingShift ? "Đóng form" : "Tự thêm ca học"}
          </button>
        </div>

        {/* Form thêm ca học tùy biến */}
        {isAddingShift && (
          <div className="mb-2.5 p-2.5 rounded-xl border border-orange-200 bg-white shadow-xs space-y-2">
            <div className="text-xs font-bold text-[#0F172A]">Thêm ca học tùy chọn:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Tên ca (VD: Ca Chiều)"
                value={newShiftName}
                onChange={(e) => setNewShiftName(e.target.value)}
                className="field text-xs py-1 px-2.5"
              />
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#64748B]">Từ:</span>
                <input
                  type="time"
                  value={newShiftStart}
                  onChange={(e) => setNewShiftStart(e.target.value)}
                  className="field text-xs py-1 px-1.5"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#64748B]">Đến:</span>
                <input
                  type="time"
                  value={newShiftEnd}
                  onChange={(e) => setNewShiftEnd(e.target.value)}
                  className="field text-xs py-1 px-1.5"
                />
              </div>
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingShift(false)}
                className="px-2.5 py-1 text-xs text-[#64748B] hover:text-[#0F172A]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddShift}
                className="px-3 py-1 bg-[#EA580C] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#EA580C]/90"
              >
                Lưu ca học
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {shifts.map((shift) => {
            const isMatch = startTime === shift.start && endTime === shift.end;
            return (
              <div
                key={shift.id}
                className={`group inline-flex items-center rounded-lg border text-[11px] font-semibold transition overflow-hidden ${
                  isMatch
                    ? "bg-[#0F172A] border-[#0F172A] text-white"
                    : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => applyShift(shift.start, shift.end)}
                  className="px-2.5 py-1"
                >
                  {shift.label}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteShift(shift.id);
                  }}
                  className={`pr-2 pl-0.5 py-1 text-xs opacity-60 hover:opacity-100 hover:text-red-500 transition ${
                    isMatch ? "text-slate-300" : "text-[#94A3B8]"
                  }`}
                  title="Xóa ca học này"
                >
                  <X className="size-3" />
                </button>
              </div>
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
            onChange={(e) => {
              setStartTime(e.target.value);
              if (selectedDays.length > 0) {
                setScheduleStr(`${selectedDays.join(", ")} • ${e.target.value} - ${endTime}`);
              }
            }}
            className="field text-sm bg-white"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#475569] flex items-center gap-1 mb-1">
            <Clock className="size-3.5 text-[#EA580C]" /> Giờ kết thúc
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              if (selectedDays.length > 0) {
                setScheduleStr(`${selectedDays.join(", ")} • ${startTime} - ${e.target.value}`);
              }
            }}
            className="field text-sm bg-white"
          />
        </div>
      </div>

      {/* Khung giờ học dự kiến */}
      <div>
        <label className="text-xs font-semibold text-[#475569] block mb-1">
          Khung giờ học dự kiến (Đồng bộ theo thứ và ca học đã chọn):
        </label>
        <input
          type="text"
          value={scheduleStr}
          onChange={(e) => setScheduleStr(e.target.value)}
          placeholder="VD: Thứ 2, Thứ 4, Thứ 6 • 18:00 - 20:00 (hoặc chỉnh giờ học tùy ý)"
          className="field text-sm bg-white font-semibold text-[#0F172A] border-orange-300 focus:border-[#EA580C]"
        />
      </div>
    </div>
  );
}

/* =========================================================================
   MODAL XEM CHI TIẾT NGƯỜI DÙNG (READ-ONLY)
   ========================================================================= */

function ViewUserModal({
  user,
  open,
  onOpenChange,
  schools,
  classes,
}: {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schools?: any[];
  classes?: any[];
}) {
  if (!user) return null;

  const roleLabels: Record<string, string> = {
    ADMIN: "Quản trị viên toàn hệ thống",
    SCHOOL_MANAGER: "Quản nhiệm trường học",
    TEACHER: "Giáo viên giảng dạy",
    TEACHING_ASSISTANT: "Trợ giảng",
    STUDENT: "Học viên",
  };

  const managedSchools =
    user.managedSchools?.length > 0
      ? user.managedSchools
      : schools?.filter((s) => s.managerId === user.id) || [];

  const assignedClasses =
    user.classAssignments?.length > 0
      ? user.classAssignments.map((a: any) => a.class).filter(Boolean)
      : classes?.filter((c) =>
          c.assignments?.some((a: any) => a.userId === user.id)
        ) || [];

  const enrolledClasses =
    user.classEnrollments?.length > 0
      ? user.classEnrollments.map((e: any) => e.class).filter(Boolean)
      : classes?.filter((c) =>
          c.enrollments?.some((e: any) => e.studentId === user.id)
        ) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-orange-100 text-[#EA580C] rounded-xl">
              <Eye className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Chi tiết thông tin người dùng</DialogTitle>
              <DialogDescription>
                Chế độ chỉ xem thông tin tài khoản • Không chỉnh sửa dữ liệu
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Header Card với Avatar và Vai trò */}
          <div className="rounded-2xl border border-orange-200 bg-[#FFF7ED] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-full bg-[#EA580C] text-white font-bold text-lg shadow-sm">
                {user.profile?.fullName ? user.profile.fullName.trim()[0].toUpperCase() : user.username[0].toUpperCase()}
              </span>
              <div>
                <b className="text-base text-[#0F172A] block leading-tight">
                  {user.profile?.fullName || user.username}
                </b>
                <span className="text-xs text-[#EA580C] font-semibold mt-0.5 block">
                  {roleLabels[user.role?.code] || user.role?.name || user.role?.code}
                </span>
                <span className="font-mono text-xs text-[#64748B]">Mã tài khoản: {user.username}</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Đang hoạt động
            </span>
          </div>

          {/* Chi tiết thông tin liên lạc & cá nhân */}
          <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-[#E2E8F0] p-4 bg-[#F8FAFC] text-sm">
            <div>
              <span className="text-xs text-[#64748B] block">Email đăng ký:</span>
              <b className="text-[#0F172A] font-mono">{user.email}</b>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Số điện thoại:</span>
              <b className="text-[#0F172A]">{user.profile?.phoneNumber || "Chưa cập nhật"}</b>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-[#64748B] block">Địa chỉ cư trú:</span>
              <b className="text-[#0F172A]">{user.profile?.address || "Chưa cập nhật"}</b>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Ngày sinh:</span>
              <b className="text-[#0F172A]">
                {user.profile?.dateOfBirth
                  ? new Date(user.profile.dateOfBirth).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "Chưa cập nhật"}
              </b>
            </div>
            <div>
              <span className="text-xs text-[#64748B] block">Giới tính:</span>
              <b className="text-[#0F172A]">
                {user.profile?.gender === "MALE"
                  ? "Nam"
                  : user.profile?.gender === "FEMALE"
                  ? "Nữ"
                  : user.profile?.gender === "OTHER"
                  ? "Khác"
                  : "Chưa cập nhật"}
              </b>
            </div>
          </div>

          {/* Phạm vi phân công / Học tập */}
          <div className="rounded-xl border border-[#E2E8F0] p-4 bg-white text-sm space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#64748B]">
              Phạm vi phụ trách / Lớp theo học
            </h4>
            {user.role?.code === "ADMIN" && (
              <p className="text-xs text-[#64748B]">
                Toàn hệ thống (Quản trị viên có toàn quyền quản lý toàn bộ trường học và lớp học).
              </p>
            )}

            {user.role?.code === "SCHOOL_MANAGER" && (
              <div>
                <p className="text-xs text-[#64748B] mb-1.5">Các trường học đang quản lý:</p>
                {managedSchools.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {managedSchools.map((s: any) => (
                      <span
                        key={s.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {s.name} ({s.code})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#94A3B8] italic">Chưa phụ trách trường nào</span>
                )}
              </div>
            )}

            {(user.role?.code === "TEACHER" || user.role?.code === "TEACHING_ASSISTANT") && (
              <div>
                <p className="text-xs text-[#64748B] mb-1.5">Các lớp học được phân công:</p>
                {assignedClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {assignedClasses.map((c: any) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                      >
                        {c.name} ({c.code})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#94A3B8] italic">Chưa phân công lớp nào</span>
                )}
              </div>
            )}

            {user.role?.code === "STUDENT" && (
              <div>
                <p className="text-xs text-[#64748B] mb-1.5">Các lớp học đang theo học:</p>
                {enrolledClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {enrolledClasses.map((c: any) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        {c.name} ({c.code})
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#94A3B8] italic">Chưa ghi danh vào lớp nào</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
          <Button onClick={() => onOpenChange(false)} className="bg-[#0F172A] text-white">
            Đóng
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
  defaultSchoolId,
  onAddSchoolShortcut,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schools: any[];
  teachers: any[];
  tas: any[];
  defaultSchoolId?: string;
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

  // Khởi tạo trường học khi mở modal
  useEffect(() => {
    if (open) {
      if (defaultSchoolId) {
        setSelectedSchoolId(defaultSchoolId);
      } else {
        setSelectedSchoolId("");
      }
      setErrorMsg("");
      setName("");
      setSelectedDays([]);
      setCustomSchedule("");
    }
  }, [open, defaultSchoolId]);

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

    const validTeachers = teacherIds.filter(Boolean);
    const validTas = taIds.filter(Boolean);

    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên lớp học!");
      return;
    }
    if (!selectedSchoolId) {
      setErrorMsg("Vui lòng chọn trường học đối tác!");
      return;
    }
    if (validTeachers.length === 0) {
      setErrorMsg("Lớp học bắt buộc phải có ít nhất 1 Giáo viên giảng dạy!");
      return;
    }
    if (validTas.length === 0) {
      setErrorMsg("Lớp học bắt buộc phải có ít nhất 1 Trợ giảng (TA) phụ trách!");
      return;
    }

    startTransition(async () => {
      const res = await createClassAction({
        name: name.trim(),
        schoolId: selectedSchoolId,
        program: selectedProgram as any,
        capacity: Number(capacity) || 30,
        teacherIds: validTeachers,
        taIds: validTas,
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
            Lớp học sẽ trực thuộc trường học đối tác, tự động sinh mã lớp, bộ chọn lịch học thông minh và gán giáo viên / trợ giảng.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Tên lớp học */}
            <div className="sm:col-span-2">
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
          </div>

          {/* KHỐI BỘ CHỌN LỊCH HỌC & THỜI KHÓA BIỂU (DATE TIME PICKER) */}
          <SchedulePickerSection
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            selectedDays={selectedDays}
            setSelectedDays={setSelectedDays}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            scheduleStr={customSchedule}
            setScheduleStr={setCustomSchedule}
          />

          {/* GÁN ĐA GIÁO VIÊN & ĐA TRỢ GIẢNG (+) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Danh sách giáo viên */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#0F172A]">
                  Giáo viên giảng dạy *
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
                  Trợ giảng (TA) phụ trách *
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
  managers = [],
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  managers?: any[];
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [schoolName, setSchoolName] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const managerId = formData.get("managerId")?.toString();
    const contactName = formData.get("contactName")?.toString()?.trim();
    const contactPhone = formData.get("contactPhone")?.toString()?.trim();
    const address = formData.get("address")?.toString()?.trim();

    if (!schoolName.trim()) {
      setErrorMsg("Vui lòng nhập tên trường học!");
      return;
    }
    if (!managerId) {
      setErrorMsg("Trường học bắt buộc phải có Quản nhiệm phụ trách!");
      return;
    }
    if (!contactName) {
      setErrorMsg("Vui lòng nhập tên Đại diện BGH / Giáo vụ liên hệ!");
      return;
    }
    if (!contactPhone) {
      setErrorMsg("Vui lòng nhập Số điện thoại liên hệ BGH!");
      return;
    }
    if (!address) {
      setErrorMsg("Vui lòng nhập Địa chỉ trường học!");
      return;
    }

    startTransition(async () => {
      const res = await createSchoolAction({
        name: schoolName.trim(),
        type: (formData.get("type")?.toString() as any) || "THPT",
        managerId,
        contactName,
        contactPhone,
        address,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thêm trường học mới</DialogTitle>
          <DialogDescription>
            Tạo trường học đối tác mới (Mã trường sẽ được hệ thống tự động sinh).
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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

          <label className="block text-sm font-semibold">
            Khối / Cấp học *
            <select name="type" className="field mt-2" defaultValue="THPT">
              <option value="THPT">THPT</option>
              <option value="THCS">THCS</option>
              <option value="UNIVERSITY">Đại học</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>

          <label className="block text-sm font-semibold">
            Quản nhiệm phụ trách *
            <select name="managerId" required className="field mt-2" defaultValue="">
              <option value="">-- Chọn Quản nhiệm phụ trách --</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.fullName || m.username} ({m.username})
                </option>
              ))}
            </select>
          </label>

          <Field name="contactName" label="Đại diện liên hệ BGH / Giáo vụ *" placeholder="Thầy/Cô..." required />
          <Field name="contactPhone" label="Số điện thoại liên hệ BGH *" placeholder="0987xxxxxx" required />
          <Field name="address" label="Địa chỉ trường học *" placeholder="Địa chỉ chi tiết..." required />

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Thêm trường
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const managerId = formData.get("managerId")?.toString();
    const contactName = formData.get("contactName")?.toString()?.trim();
    const contactPhone = formData.get("contactPhone")?.toString()?.trim();
    const address = formData.get("address")?.toString()?.trim();

    if (!managerId) {
      setErrorMsg("Trường học bắt buộc phải có Quản nhiệm phụ trách!");
      return;
    }
    if (!contactName) {
      setErrorMsg("Vui lòng nhập tên Đại diện BGH / Giáo vụ liên hệ!");
      return;
    }
    if (!contactPhone) {
      setErrorMsg("Vui lòng nhập Số điện thoại liên hệ BGH!");
      return;
    }
    if (!address) {
      setErrorMsg("Vui lòng nhập Địa chỉ trường học!");
      return;
    }

    startTransition(async () => {
      const res = await updateSchoolAction(school.id, {
        name: formData.get("name")?.toString(),
        type: formData.get("type")?.toString() as any,
        managerId,
        contactName,
        contactPhone,
        address,
      });
      if (res && !res.success) {
        setErrorMsg(res.error || "Không thể cập nhật trường học!");
        return;
      }
      onDone();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa trường học</DialogTitle>
          <DialogDescription>Mã trường: {school.code}</DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <Field name="name" label="Tên trường học *" defaultValue={school.name} required />
          <label className="block text-sm font-semibold">
            Khối / Cấp học *
            <select name="type" className="field mt-2" defaultValue={school.type}>
              <option value="THPT">THPT</option>
              <option value="THCS">THCS</option>
              <option value="UNIVERSITY">Đại học</option>
              <option value="OTHER">Khác</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Quản nhiệm phụ trách *
            <select name="managerId" required className="field mt-2" defaultValue={school.managerId || ""}>
              <option value="">-- Chọn Quản nhiệm --</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.fullName || m.username} ({m.username})
                </option>
              ))}
            </select>
          </label>
          <Field name="contactName" label="Đại diện liên hệ BGH / Giáo vụ *" defaultValue={school.contactName} required />
          <Field name="contactPhone" label="Số điện thoại liên hệ BGH *" defaultValue={school.contactPhone} required />
          <Field name="address" label="Địa chỉ trường học *" defaultValue={school.address} required />

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
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
  const [errorMsg, setErrorMsg] = useState("");

  const initialTeacherIds = classItem.assignments
    ?.filter((a: any) => a.roleInClass === "TEACHER")
    .map((a: any) => a.userId) || [];
  const [teacherIds, setTeacherIds] = useState<string[]>(
    initialTeacherIds.length > 0 ? initialTeacherIds : [""]
  );

  const initialTaIds = classItem.assignments
    ?.filter((a: any) => a.roleInClass === "TEACHING_ASSISTANT")
    .map((a: any) => a.userId) || [];
  const [taIds, setTaIds] = useState<string[]>(
    initialTaIds.length > 0 ? initialTaIds : [""]
  );

  // Date & Time Picker
  const [startDate, setStartDate] = useState(
    classItem.startDate ? new Date(classItem.startDate).toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    classItem.endDate ? new Date(classItem.endDate).toISOString().split("T")[0] : ""
  );
  const [scheduleStr, setScheduleStr] = useState(classItem.description || "");

  const allDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
  const initialDays = allDays.filter((d: string) => classItem.description?.includes(d));
  const [selectedDays, setSelectedDays] = useState<string[]>(initialDays);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");

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

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const validTeachers = teacherIds.filter(Boolean);
    const validTas = taIds.filter(Boolean);

    if (validTeachers.length === 0) {
      setErrorMsg("Lớp học bắt buộc phải có ít nhất 1 Giáo viên giảng dạy!");
      return;
    }
    if (validTas.length === 0) {
      setErrorMsg("Lớp học bắt buộc phải có ít nhất 1 Trợ giảng (TA) phụ trách!");
      return;
    }

    startTransition(async () => {
      const res = await updateClassAction(classItem.id, {
        name: formData.get("name")?.toString(),
        program: formData.get("program")?.toString() as any,
        capacity: Number(formData.get("capacity")) || 30,
        status: formData.get("status")?.toString() as any,
        teacherIds: validTeachers,
        taIds: validTas,
        schedule: scheduleStr.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res && !res.success) {
        setErrorMsg(res.error || "Không thể cập nhật lớp học!");
        return;
      }
      onDone();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa lớp học</DialogTitle>
          <DialogDescription>
            Mã lớp: <b className="font-mono text-[#0F172A]">{classItem.code}</b> • Trường: <b className="text-[#0F172A]">{classItem.school?.name}</b>
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

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

          {/* KHỐI BỘ CHỌN LỊCH HỌC & THỜI KHÓA BIỂU (DATE TIME PICKER) */}
          <SchedulePickerSection
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            selectedDays={selectedDays}
            setSelectedDays={setSelectedDays}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            setEndTime={setEndTime}
            scheduleStr={scheduleStr}
            setScheduleStr={setScheduleStr}
          />

          {/* GÁN ĐA GIÁO VIÊN & ĐA TRỢ GIẢNG (+) */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Danh sách giáo viên */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-[#0F172A]">
                  Giáo viên giảng dạy *
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
                  Trợ giảng (TA) phụ trách *
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

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
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

    if (selectedRole === "SCHOOL_MANAGER" && schoolIds.length === 0) {
      setErrorMsg("Quản nhiệm bắt buộc phải được phân công ít nhất 1 trường học phụ trách!");
      return;
    }
    if (selectedRole === "TEACHER" && classIds.length === 0) {
      setErrorMsg("Giáo viên bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!");
      return;
    }
    if (selectedRole === "TEACHING_ASSISTANT" && classIds.length === 0) {
      setErrorMsg("Trợ giảng bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!");
      return;
    }
    if (selectedRole === "STUDENT" && classIds.length === 0) {
      setErrorMsg("Học sinh bắt buộc phải được ghi danh vào ít nhất 1 lớp học!");
      return;
    }

    startTransition(async () => {
      const res = await updateUserAction(user.id, {
        fullName: formData.get("fullName")?.toString()?.trim(),
        email: formData.get("email")?.toString()?.trim(),
        phoneNumber: formData.get("phoneNumber")?.toString()?.trim(),
        address: formData.get("address")?.toString()?.trim(),
        dateOfBirth: formData.get("dateOfBirth")?.toString() || undefined,
        gender: (formData.get("gender")?.toString() as any) || undefined,
        roleCode: selectedRole,
        schoolIds: selectedRole === "SCHOOL_MANAGER" ? schoolIds : undefined,
        classIds:
          selectedRole === "TEACHER" ||
          selectedRole === "TEACHING_ASSISTANT" ||
          selectedRole === "STUDENT"
            ? classIds
            : undefined,
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
            Cập nhật thông tin hồ sơ, địa chỉ email, vai trò và phân công phụ trách.
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

          {/* Bổ sung ô Ngày sinh & Giới tính */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                Ngày sinh
              </label>
              <input
                name="dateOfBirth"
                type="date"
                className="field"
                defaultValue={
                  user.profile?.dateOfBirth
                    ? new Date(user.profile.dateOfBirth).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                Giới tính
              </label>
              <select
                name="gender"
                className="field"
                defaultValue={user.profile?.gender || ""}
              >
                <option value="">-- Chọn giới tính --</option>
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
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

          {/* CHÍNH SÁCH BẢO MẬT: ADMIN CHỈ ĐƯỢC ĐỔI EMAIL, KHÔNG ĐƯỢC ĐỔI MẬT KHẨU NGƯỜI KHÁC */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-1.5 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-semibold text-blue-800">
              <ShieldCheck className="size-4 text-blue-600 shrink-0" />
              <span>Chính sách bảo mật tài khoản & Mật khẩu</span>
            </div>
            <p className="text-[12px] text-blue-700 leading-relaxed">
              Quản trị viên chỉ có quyền chỉnh sửa Email và hồ sơ cá nhân của người dùng. Để bảo đảm an toàn dữ liệu, Quản trị viên <b>không được phép xem hoặc thay đổi mật khẩu</b> của tài khoản khác. Người dùng tự đổi mật khẩu qua trang Cá nhân hoặc thông qua luồng Xác thực Email.
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
