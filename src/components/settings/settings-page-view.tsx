"use client";

import React, { useState, useEffect } from "react";
import { Layers, ShieldCheck } from "lucide-react";
import { RbacMatrixSection } from "@/components/settings/rbac-matrix-section";
import { IeltsLevelsSection } from "@/components/settings/ielts-config-section";

export function SettingsPageView({
  currentUser,
  permissions,
  onRefreshPermissions,
  ieltsLevels = [],
  onRefreshLevels = () => {},
  initialTab = "matrix",
}: {
  currentUser: any;
  users?: any[];
  permissions: any[];
  onRefreshPermissions: () => void;
  onProfileUpdated?: (updated?: any) => void;
  ieltsLevels?: any[];
  onRefreshLevels?: () => void;
  initialTab?: "matrix" | "ielts-levels";
}) {
  const [tab, setTab] = useState<"matrix" | "ielts-levels">(initialTab);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  return (
    <div className="space-y-6">
      {/* 2 Tab Quản trị hệ thống duy nhất: Ma trận phân quyền & Cấu hình IELTS */}
      <div className="flex flex-wrap gap-2.5 pb-1">
        <button
          onClick={() => setTab("matrix")}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
            tab === "matrix"
              ? "bg-[#EA580C] text-white shadow-sm"
              : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#EA580C]"
          }`}
        >
          <ShieldCheck className="size-4" />
          <span>Ma trận phân quyền (Dynamic RBAC)</span>
        </button>

        <button
          onClick={() => setTab("ielts-levels")}
          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
            tab === "ielts-levels"
              ? "bg-[#EA580C] text-white shadow-sm"
              : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#FFF7ED] hover:text-[#EA580C]"
          }`}
        >
          <Layers className="size-4" />
          <span>Cấu hình trình độ IELTS</span>
        </button>
      </div>

      {tab === "matrix" && (
        <RbacMatrixSection
          permissions={permissions}
          onRefreshPermissions={onRefreshPermissions}
        />
      )}

      {tab === "ielts-levels" && (
        <IeltsLevelsSection
          ieltsLevels={ieltsLevels}
          onRefreshLevels={onRefreshLevels}
        />
      )}
    </div>
  );
}
