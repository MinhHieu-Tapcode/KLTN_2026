"use client";

import React from "react";
import { ClassAssignmentsTab } from "./class-assignments-tab";

export interface ClassAssignmentsPanelProps {
  classId: string;
  className: string;
  currentUser: {
    id?: string;
    role: string;
    fullName?: string;
  };
  onBack?: () => void;
  mode?: "inside-class" | "inside-global";
}

/**
 * Panel Quản lý Bài tập dùng chung cho cả 2 cửa:
 * - Cửa 1: Từ trang Chi tiết lớp (mode="inside-class")
 * - Cửa 2: Từ Trung tâm Quản lý Bài tập (mode="inside-global", kèm nút Quay lại danh sách lớp)
 */
export function ClassAssignmentsPanel(props: ClassAssignmentsPanelProps) {
  return <ClassAssignmentsTab {...props} />;
}
