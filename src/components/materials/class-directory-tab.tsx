"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowRight,
  Plus,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClassItem {
  id: string;
  name: string;
  code: string;
  level?: string;
  schoolName?: string;
  school?: { name?: string };
  materialCount?: number;
  materialFolders?: Array<{
    id: string;
    _count?: { materials?: number };
  }>;
  _count?: {
    materialFolders?: number;
  };
}

interface ClassDirectoryTabProps {
  classes: ClassItem[];
  canAddMaterial?: boolean;
  onOpenQuickAdd?: () => void;
  onOpenClassMaterials: (cls: ClassItem) => void;
}

export function ClassDirectoryTab({
  classes = [],
  canAddMaterial = false,
  onOpenQuickAdd,
  onOpenClassMaterials,
}: ClassDirectoryTabProps) {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedSchool, setSelectedSchool] = useState("ALL");

  // Lấy danh sách trường thực tế từ các lớp học
  const uniqueSchools = useMemo(() => {
    const schools = classes
      .map((c) => c.school?.name || c.schoolName)
      .filter((s): s is string => Boolean(s));
    return Array.from(new Set(schools));
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const sName = c.school?.name || c.schoolName || "";
      const matchSearch =
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        sName.toLowerCase().includes(search.toLowerCase());

      const matchLevel =
        selectedLevel === "ALL" ||
        (c.level && c.level.toLowerCase().includes(selectedLevel.toLowerCase()));

      const matchSchool =
        selectedSchool === "ALL" || sName === selectedSchool;

      return matchSearch && matchLevel && matchSchool;
    });
  }, [classes, search, selectedLevel, selectedSchool]);

  return (
    <section className="panel">
      {/* Thanh công cụ đồng bộ chuẩn với trang Trường học & Lớp học */}
      <div className="mb-4 flex flex-wrap lg:flex-nowrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên lớp, mã lớp, trường..."
            className="field field-search border-[#CBD5E1]"
          />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="field text-xs bg-white border-[#CBD5E1] !w-[170px] shrink-0"
          >
            <option value="ALL">-- Tất cả trình độ --</option>
            <option value="4.5">Cơ bản (0 - 4.5)</option>
            <option value="5.5">Trung bình (4.5 - 6.5)</option>
            <option value="6.5">Nâng cao (6.5 - 9.0)</option>
          </select>

          {uniqueSchools.length > 0 && (
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="field text-xs bg-white border-[#CBD5E1] !w-[180px] shrink-0"
            >
              <option value="ALL">-- Tất cả trường học --</option>
              {uniqueSchools.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {canAddMaterial && onOpenQuickAdd && (
            <Button
              onClick={onOpenQuickAdd}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm shrink-0 whitespace-nowrap"
            >
              <Plus className="size-4 mr-1.5" /> Thêm học liệu
            </Button>
          )}
        </div>
      </div>

      {/* Bảng danh sách lớp học */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3.5 w-14 text-center text-xs font-bold text-[#64748B] uppercase">
                STT
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">
                Mã lớp
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">
                Tên lớp học
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">
                Trình độ IELTS
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">
                Trường đối tác
              </th>
              <th className="px-4 py-3.5 text-center text-xs font-bold text-[#64748B] uppercase">
                Học liệu hiện có
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-[#64748B] uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {filteredClasses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-[#64748B]">
                  Không tìm thấy lớp học nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredClasses.map((cls, idx) => {
                const realSchoolName = cls.school?.name || cls.schoolName || "Chưa gán trường";
                const folderCount =
                  cls.materialFolders?.length ?? cls._count?.materialFolders ?? 0;
                const fileCount = (cls.materialFolders || []).reduce(
                  (acc, f) => acc + (f._count?.materials || 0),
                  0
                );

                return (
                  <tr
                    key={cls.id}
                    onClick={() => onOpenClassMaterials(cls)}
                    className="hover:bg-[#F8FAFC] transition cursor-pointer"
                  >
                    <td className="px-4 py-3.5 text-center text-xs text-[#64748B] font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-[#475569]">
                      {cls.code}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#0F172A]">
                      {cls.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#F1F5F9] text-[#334155] font-mono text-xs font-semibold">
                        {cls.level || "IELTS"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#475569]">
                      {realSchoolName}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {folderCount > 0 || fileCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-[#EA580C] text-xs font-semibold border border-orange-200/70">
                          <FolderOpen className="size-3.5" />
                          {folderCount} thư mục • {fileCount} tệp
                        </span>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">Chưa có tài liệu</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onOpenClassMaterials(cls)}
                        className="px-3 py-1.5 rounded-xl border border-orange-200 hover:border-orange-300 bg-orange-50/70 hover:bg-orange-100/80 text-[#EA580C] font-bold text-xs inline-flex items-center gap-1.5 transition"
                      >
                        Mở kho lớp <ArrowRight className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
