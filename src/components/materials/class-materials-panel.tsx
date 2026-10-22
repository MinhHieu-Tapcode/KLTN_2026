"use client";

import React from "react";
import { ClassMaterialsTab } from "./class-materials-tab";

export interface ClassMaterialsPanelProps {
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
 * Panel Học liệu dùng chung cho cả 2 cửa:
 * - Cửa 1: Từ trang Chi tiết lớp (mode="inside-class")
 * - Cửa 2: Từ Kho học liệu chung (mode="inside-global", kèm nút Quay lại)
 */
export function ClassMaterialsPanel(props: ClassMaterialsPanelProps) {
  return <ClassMaterialsTab {...props} />;
}
