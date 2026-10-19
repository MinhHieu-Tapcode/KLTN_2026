"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Folder,
  FileText,
  Music,
  GraduationCap,
  BookOpen,
  ArrowRight,
  X,
  File,
} from "lucide-react";

export interface GlobalSearchItem {
  id: string;
  title: string;
  category: "COMMON" | "CLASS" | "FOLDER" | "FILE" | "ASSIGNMENT";
  categoryLabel: string;
  type?: string;
  size?: number;
  level?: string;
  classCode?: string;
  className?: string;
  teacherName?: string;
  fileUrl?: string;
}

interface MaterialsGlobalSearchProps {
  items: GlobalSearchItem[];
  onSelectItem: (item: GlobalSearchItem) => void;
  placeholder?: string;
}

export function MaterialsGlobalSearch({
  items,
  onSelectItem,
  placeholder = "Tìm kiếm học liệu, lớp học, file, bài tập...",
}: MaterialsGlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "ALL" | "COMMON" | "CLASS" | "FOLDER" | "FILE" | "ASSIGNMENT"
  >("ALL");

  // Lọc kết quả theo query và category
  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    return items.filter((item) => {
      const matchQuery =
        item.title.toLowerCase().includes(q) ||
        (item.className && item.className.toLowerCase().includes(q)) ||
        (item.classCode && item.classCode.toLowerCase().includes(q)) ||
        (item.teacherName && item.teacherName.toLowerCase().includes(q));

      if (!matchQuery) return false;
      if (activeTab === "ALL") return true;
      return item.category === activeTab;
    });
  }, [items, query, activeTab]);

  // Đếm số lượng theo danh mục cho thanh tabs kết quả
  const counts = useMemo(() => {
    if (!query.trim()) return { ALL: 0, COMMON: 0, CLASS: 0, FOLDER: 0, FILE: 0, ASSIGNMENT: 0 };
    const q = query.toLowerCase();
    const matched = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.className && item.className.toLowerCase().includes(q)) ||
        (item.classCode && item.classCode.toLowerCase().includes(q))
    );

    return {
      ALL: matched.length,
      COMMON: matched.filter((i) => i.category === "COMMON").length,
      CLASS: matched.filter((i) => i.category === "CLASS").length,
      FOLDER: matched.filter((i) => i.category === "FOLDER").length,
      FILE: matched.filter((i) => i.category === "FILE").length,
      ASSIGNMENT: matched.filter((i) => i.category === "ASSIGNMENT").length,
    };
  }, [items, query]);

  const getCategoryIcon = (category: string, type?: string) => {
    switch (category) {
      case "COMMON":
        return <BookOpen className="size-4 text-purple-600" />;
      case "CLASS":
        return <GraduationCap className="size-4 text-sky-600" />;
      case "FOLDER":
        return <Folder className="size-4 text-amber-500" />;
      case "ASSIGNMENT":
        return <FileText className="size-4 text-[#EA580C]" />;
      default:
        if (type === "AUDIO") return <Music className="size-4 text-purple-600" />;
        if (type === "PDF") return <FileText className="size-4 text-rose-600" />;
        return <File className="size-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      {/* Ô tìm kiếm chính */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-9 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition shadow-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-2.5 size-5 grid place-items-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* POPUP KẾT QUẢ TÌM KIẾM TOÀN CỤC (M8) */}
      {isOpen && query.trim().length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-12 left-0 right-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Thanh Tabs phân loại M8 */}
            <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto text-[11px] font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                  activeTab === "ALL"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "hover:bg-slate-200/60 text-slate-700"
                }`}
              >
                Tất cả ({counts.ALL})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("COMMON")}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                  activeTab === "COMMON"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "hover:bg-slate-200/60 text-slate-700"
                }`}
              >
                Học liệu dùng chung ({counts.COMMON})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("CLASS")}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                  activeTab === "CLASS"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "hover:bg-slate-200/60 text-slate-700"
                }`}
              >
                Lớp học ({counts.CLASS})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("FOLDER")}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                  activeTab === "FOLDER"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "hover:bg-slate-200/60 text-slate-700"
                }`}
              >
                Thư mục ({counts.FOLDER})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("FILE")}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                  activeTab === "FILE"
                    ? "bg-[#EA580C] text-white shadow-sm"
                    : "hover:bg-slate-200/60 text-slate-700"
                }`}
              >
                File ({counts.FILE})
              </button>
            </div>

            {/* Danh sách kết quả */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
              {filteredResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Không tìm thấy kết quả nào khớp với &quot;{query}&quot;
                </div>
              ) : (
                filteredResults.map((item) => (
                  <button
                    key={`${item.category}-${item.id}`}
                    type="button"
                    onClick={() => {
                      onSelectItem(item);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="w-full flex items-center justify-between p-2.5 hover:bg-orange-50/60 rounded-xl transition text-left group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-8 rounded-lg bg-slate-100 grid place-items-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition">
                        {getCategoryIcon(item.category, item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-[#EA580C] transition truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium shrink-0">
                            {item.categoryLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                          {item.className && <span>Lớp: {item.className}</span>}
                          {item.level && <span>• Trình độ: {item.level}</span>}
                          {item.size && <span>• {(item.size / (1024 * 1024)).toFixed(1)} MB</span>}
                          {item.teacherName && <span>• GV: {item.teacherName}</span>}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-slate-300 group-hover:text-[#EA580C] group-hover:translate-x-0.5 transition shrink-0 ml-2" />
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
