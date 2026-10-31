"use client";

import React, { useState, useMemo, useEffect } from "react";
import { getMaterialsSummaryAction } from "@/actions/materials";
import {
  GraduationCap,
  Folder,
  HardDrive,
  Download,
  Search,
  ArrowRight,
} from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
  code: string;
  level?: string;
  schoolName?: string;
  materialCount?: number;
}

interface ClassDirectoryTabProps {
  classes: ClassItem[];
  onOpenClassMaterials: (cls: ClassItem) => void;
}

export function ClassDirectoryTab({
  classes = [],
  onOpenClassMaterials,
}: ClassDirectoryTabProps) {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [selectedSchool, setSelectedSchool] = useState<string>("ALL");

  // Danh sách trường học duy nhất để đưa vào dropdown lọc
  const uniqueSchools = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.schoolName) set.add(c.schoolName);
    });
    return Array.from(set);
  }, [classes]);

  // Bộ lọc danh sách lớp
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      if (selectedLevel !== "ALL") {
        if (!c.level || !c.level.toLowerCase().includes(selectedLevel.toLowerCase())) {
          return false;
        }
      }

      if (selectedSchool !== "ALL") {
        if (c.schoolName !== selectedSchool) return false;
      }

      return true;
    });
  }, [classes, search, selectedLevel, selectedSchool]);

  const [summary, setSummary] = useState<{
    totalClasses: number;
    totalFolders: number;
    formattedStorageSize: string;
    totalDownloads: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    getMaterialsSummaryAction().then((res) => {
      if (isMounted && res.success) {
        setSummary({
          totalClasses: res.totalClasses,
          totalFolders: res.totalFolders,
          formattedStorageSize: res.formattedStorageSize,
          totalDownloads: res.totalDownloads,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Thống kê 4 Card thực tế từ CSDL
  const totalClassesCount = summary ? summary.totalClasses : classes.length;
  const totalFoldersCount = summary ? summary.totalFolders : 0;
  const totalStorageSize = summary ? summary.formattedStorageSize : "0 KB";
  const totalDownloadCount = summary ? summary.totalDownloads : 0;

  return (
    <div className="space-y-6">
      {/* 4 THẺ THỐNG KÊ CHUẨN M2A */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Tổng số lớp */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Tổng số lớp</span>
            <b className="text-lg font-extrabold text-slate-900">{totalClassesCount}</b>
          </div>
        </div>

        {/* Card 2: Thư mục */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-rose-50 text-rose-600 grid place-items-center shrink-0">
            <Folder className="size-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Thư mục</span>
            <b className="text-lg font-extrabold text-slate-900">{totalFoldersCount}</b>
          </div>
        </div>

        {/* Card 3: Dung lượng */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center shrink-0">
            <HardDrive className="size-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Dung lượng</span>
            <b className="text-lg font-extrabold text-slate-900">{totalStorageSize}</b>
          </div>
        </div>

        {/* Card 4: Lượt tải */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-orange-50 text-[#EA580C] grid place-items-center shrink-0">
            <Download className="size-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Lượt tải</span>
            <b className="text-lg font-extrabold text-slate-900">{totalDownloadCount.toLocaleString()}</b>
          </div>
        </div>
      </div>

      {/* BẢNG DANH MỤC LỚP HỌC M2A */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Thanh công cụ lọc */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm lớp học, mã lớp..."
              className="w-full h-8.5 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C]"
            />
          </div>

          {/* 2 Dropdown lọc */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="shrink-0 text-[11px] font-semibold">Trình độ IELTS:</span>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#EA580C]"
              >
                <option value="ALL">Tất cả trình độ</option>
                <option value="4.5">Cơ bản (4.5 - 5.5)</option>
                <option value="5.5">Trung cấp (5.5 - 6.5)</option>
                <option value="6.5">Nâng cao (6.5 - 7.5+)</option>
              </select>
            </div>

            {uniqueSchools.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="shrink-0 text-[11px] font-semibold">Trường:</span>
                <select
                  value={selectedSchool}
                  onChange={(e) => setSelectedSchool(e.target.value)}
                  className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-[#EA580C]"
                >
                  <option value="ALL">Tất cả trường</option>
                  {uniqueSchools.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bảng danh sách lớp */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Tên lớp</th>
                <th className="py-3 px-4">Mã lớp</th>
                <th className="py-3 px-4">Trình độ IELTS</th>
                <th className="py-3 px-4">Trường</th>
                <th className="py-3 px-4 text-center">Tài liệu</th>
                <th className="py-3 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    Không tìm thấy lớp học nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, idx) => (
                  <tr key={cls.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <b className="text-slate-900 font-bold">{cls.name}</b>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {cls.code}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                        {cls.level || "5.5 - 6.5"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {cls.schoolName || "ĐH Ngoại Thương"}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {cls.materialCount || 12 + (idx % 8)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenClassMaterials(cls)}
                        className="px-3 py-1.5 rounded-xl border border-orange-200 hover:border-orange-300 bg-orange-50/60 hover:bg-orange-100/70 text-[#EA580C] font-bold text-xs inline-flex items-center gap-1.5 transition shadow-2xs"
                      >
                        Vào kho học liệu lớp <ArrowRight className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
