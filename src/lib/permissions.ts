import { RoleCode } from "@prisma/client";

export const DEFAULT_PERMISSIONS = [
  {
    featureKey: "VIEW_DASHBOARD",
    name: "Xem Tổng quan (Dashboard)",
    category: "Chung",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER", "TEACHER", "TEACHING_ASSISTANT", "STUDENT"] as RoleCode[],
  },
  {
    featureKey: "VIEW_USERS",
    name: "Quản lý Người dùng (Danh sách, Thêm, Sửa, Xóa)",
    category: "Người dùng",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER"] as RoleCode[],
  },
  {
    featureKey: "VIEW_SCHOOLS",
    name: "Quản lý Trường học (Danh sách, Thêm, Sửa, Xóa)",
    category: "Trường học",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER"] as RoleCode[],
  },
  {
    featureKey: "VIEW_CLASSES",
    name: "Quản lý Lớp học (Danh sách, Chi tiết, Tạo lớp)",
    category: "Lớp học",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER", "TEACHER", "TEACHING_ASSISTANT"] as RoleCode[],
  },
  {
    featureKey: "VIEW_SCHEDULE",
    name: "Xem Lịch học & Giảng dạy",
    category: "Đào tạo",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER", "TEACHER", "TEACHING_ASSISTANT", "STUDENT"] as RoleCode[],
  },
  {
    featureKey: "IMPORT_EXCEL",
    name: "Import Excel Học viên hàng loạt",
    category: "Nhập liệu",
    allowedRoles: ["ADMIN", "SCHOOL_MANAGER"] as RoleCode[],
  },
  {
    featureKey: "SYSTEM_SETTINGS",
    name: "Cấu hình Hệ thống & Phân quyền động",
    category: "Cài đặt",
    allowedRoles: ["ADMIN"] as RoleCode[],
  },
];
