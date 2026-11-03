"use client";

import React, { useState } from "react";
import {
  BookOpen,
  FileText,
  Music,
  Plus,
  Search,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LevelFolderItem {
  id: string;
  name: string;
  description?: string;
  ieltsLevelId?: string;
  levelName?: string;
  levelCode?: string;
  minScore?: number;
  maxScore?: number;
  fileCount: number;
  subFolderCount: number;
  author?: string;
  audioCount?: number;
  createdAt?: string;
  materials?: any[];
}

interface LevelRepositoryTabProps {
  levelFolders: LevelFolderItem[];
  ieltsLevels?: Array<{
    id: string;
    name: string;
    code: string;
    minScore?: number;
    maxScore?: number;
  }>;
  isAdmin?: boolean;
  onOpenQuickAdd?: () => void;
  onDeleteFolder?: (folderId: string, folderName: string) => void;
  onSelectFolderToPreview?: (folder: LevelFolderItem) => void;
}

export function LevelRepositoryTab({
  levelFolders = [],
  ieltsLevels = [],
  isAdmin = false,
  onOpenQuickAdd,
  onDeleteFolder,
  onSelectFolderToPreview,
}: LevelRepositoryTabProps) {
  const [selectedLevelId, setSelectedLevelId] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const sourceLevels =
    ieltsLevels && ieltsLevels.length > 0
      ? ieltsLevels
      : [
          { id: "lvl-basic", code: "BASIC", name: "Cơ bản", minScore: 0.0, maxScore: 4.5 },
          { id: "lvl-medium", code: "INTERMEDIATE", name: "Trung bình", minScore: 4.5, maxScore: 6.5 },
          { id: "lvl-advanced", code: "ADVANCED", name: "Nâng cao", minScore: 6.5, maxScore: 9.0 },
        ];

  const matchFolderToLevel = (f: LevelFolderItem, lvl: any) => {
    if (f.ieltsLevelId === lvl.id) return true;
    if (f.levelCode && lvl.code && f.levelCode.toLowerCase() === lvl.code.toLowerCase()) return true;
    if (f.levelName && lvl.name && f.levelName.toLowerCase().includes(lvl.name.toLowerCase())) return true;
    return false;
  };

  const levels = sourceLevels.map((lvl) => {
    const min = lvl.minScore !== undefined ? lvl.minScore : 0;
    const max = lvl.maxScore !== undefined ? lvl.maxScore : 9;
    const band = `${min} - ${max}`;
    const count = levelFolders.filter((f) => matchFolderToLevel(f, lvl)).length;

    return {
      id: lvl.id,
      code: lvl.code,
      name: lvl.name,
      band,
      count,
      raw: lvl,
    };
  });

  const filteredMaterials = levelFolders.filter((f) => {
    const matchesLevel =
      selectedLevelId === "ALL" ||
      (() => {
        const targetLvl = levels.find((l) => l.id === selectedLevelId);
        return targetLvl ? matchFolderToLevel(f, targetLvl.raw) : true;
      })();

    const cleanSearch = search.trim().toLowerCase();
    const matchesSearch =
      !cleanSearch ||
      f.name.toLowerCase().includes(cleanSearch) ||
      (f.description || "").toLowerCase().includes(cleanSearch) ||
      (f.levelName || "").toLowerCase().includes(cleanSearch);

    return matchesLevel && matchesSearch;
  });

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  return (
    <section className="panel space-y-4">
      {/* Thanh chọn Trình độ IELTS đồng bộ tông Cam - Xám của hệ thống */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedLevelId("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedLevelId === "ALL"
                ? "bg-[#EA580C] text-white shadow-sm"
                : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
            }`}
          >
            Tất cả trình độ ({levelFolders.length})
          </button>

          {levels.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setSelectedLevelId(lvl.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedLevelId === lvl.id
                  ? "bg-[#EA580C] text-white shadow-sm"
                  : "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
              }`}
            >
              {lvl.name} ({lvl.band}) • {lvl.count}
            </button>
          ))}
        </div>

        <span className="text-xs text-[#64748B]">
          Các lớp thuộc trình độ tương ứng sẽ tự động được kế thừa tài liệu tại đây
        </span>
      </div>

      {/* Thanh công cụ tìm kiếm & Nút Thêm học liệu duy nhất */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm giáo trình, tài liệu mẫu..."
            className="field field-search border-[#CBD5E1]"
          />
        </div>

        {isAdmin && onOpenQuickAdd && (
          <Button
            onClick={onOpenQuickAdd}
            className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
          >
            <Plus className="size-4 mr-1.5" /> Thêm học liệu chung
          </Button>
        )}
      </div>

      {/* Bảng danh sách giáo trình & tài liệu chuẩn */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3.5 w-14 text-center text-xs font-bold text-[#64748B] uppercase">
                STT
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">
                Tên bộ học liệu / Giáo trình
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">
                Trình độ áp dụng
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">
                Thành phần tệp
              </th>
              <th className="px-4 py-3.5 text-xs font-bold text-[#64748B] uppercase">
                Người đăng &amp; Ngày tạo
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-bold text-[#64748B] uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {filteredMaterials.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-[#64748B]">
                  Chưa có học liệu chung nào cho trình độ này. Bấm &ldquo;+ Thêm học liệu chung&rdquo; để tải lên.
                </td>
              </tr>
            ) : (
              filteredMaterials.map((item, idx) => {
                const docCount = item.fileCount || 0;
                const audioCount = item.audioCount || 0;
                const cleanTitle = item.name.replace(/^[📚📝📄🎧]+\s*/, "");

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectFolderToPreview?.(item)}
                    className="hover:bg-[#F8FAFC] transition cursor-pointer"
                  >
                    <td className="px-4 py-3.5 text-center text-xs text-[#64748B] font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-orange-50 text-[#EA580C] border border-orange-200/70 grid place-items-center shrink-0">
                          <BookOpen className="size-4" />
                        </div>
                        <div>
                          <b className="text-[#0F172A] font-bold block">{cleanTitle}</b>
                          {item.description && (
                            <span className="text-xs text-[#64748B] line-clamp-1">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-[#F1F5F9] text-[#334155] text-xs font-semibold">
                        {item.levelName || "Tất cả trình độ"}
                        {item.minScore !== undefined && item.maxScore !== undefined
                          ? ` (${item.minScore} - ${item.maxScore})`
                          : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          <FileText className="size-3.5 text-[#EA580C]" />
                          {docCount} tệp tài liệu
                        </span>
                        {audioCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-[#EA580C] font-medium">
                            <Music className="size-3.5" />
                            {audioCount} file nghe
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#475569]">
                      <div className="font-semibold text-[#1E293B]">
                        {item.author || "Quản trị viên"}
                      </div>
                      <div className="text-[#64748B]">{formatDate(item.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectFolderToPreview?.(item)}
                          className="px-3 py-1.5 rounded-xl border border-orange-200 hover:border-orange-300 bg-orange-50/70 hover:bg-orange-100/80 text-[#EA580C] font-bold text-xs inline-flex items-center gap-1.5 transition"
                        >
                          <Eye className="size-3.5" /> Xem tài liệu
                        </button>
                        {isAdmin && onDeleteFolder && (
                          <button
                            type="button"
                            onClick={() => onDeleteFolder(item.id, cleanTitle)}
                            title="Xóa bộ học liệu"
                            className="p-1.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
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
