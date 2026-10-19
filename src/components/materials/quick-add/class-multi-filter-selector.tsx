"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, Check, GraduationCap } from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
  code: string;
  level?: string;
  ieltsLevelId?: string;
  program?: string;
}

interface ClassMultiFilterSelectorProps {
  classes: ClassItem[];
  ieltsLevels?: Array<{ id: string; name: string; code: string }>;
  selectedClassIds: string[];
  onToggleClass: (classId: string) => void;
  onSelectMultipleClasses: (classIds: string[]) => void;
}

export function ClassMultiFilterSelector({
  classes = [],
  ieltsLevels = [],
  selectedClassIds,
  onToggleClass,
  onSelectMultipleClasses,
}: ClassMultiFilterSelectorProps) {
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("ALL");
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("ALL");
  const [classSearch, setClassSearch] = useState<string>("");

  // Lấy danh sách các chương trình duy nhất từ danh sách lớp
  const availablePrograms = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.program) set.add(c.program);
    });
    if (set.size === 0) {
      return ["IELTS", "TOEIC", "Giao tiếp"];
    }
    return Array.from(set);
  }, [classes]);

  // Bộ lọc kết hợp 3 tiêu chí: Trình độ + Chương trình + Từ khóa tìm kiếm
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      // 1. Lọc theo Trình độ IELTS
      if (selectedLevelFilter !== "ALL") {
        const matchesLevelId = cls.ieltsLevelId === selectedLevelFilter;
        const matchingLevelObj = ieltsLevels.find((l) => l.id === selectedLevelFilter);
        const matchesLevelName =
          matchingLevelObj &&
          (cls.level?.toLowerCase().includes(matchingLevelObj.name.toLowerCase()) ||
            cls.name.toLowerCase().includes(matchingLevelObj.name.toLowerCase()));
        if (!matchesLevelId && !matchesLevelName) return false;
      }

      // 2. Lọc theo Chương trình đào tạo
      if (selectedProgramFilter !== "ALL") {
        if (cls.program && cls.program !== selectedProgramFilter) return false;
      }

      // 3. Lọc theo Từ khóa tìm kiếm
      if (classSearch.trim()) {
        const query = classSearch.toLowerCase();
        const matchesName = cls.name.toLowerCase().includes(query);
        const matchesCode = cls.code.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [classes, selectedLevelFilter, selectedProgramFilter, classSearch, ieltsLevels]);

  // Kiểm tra xem tất cả các lớp đang lọc đã được chọn chưa
  const allFilteredSelected =
    filteredClasses.length > 0 &&
    filteredClasses.every((cls) => selectedClassIds.includes(cls.id));

  const handleToggleSelectFiltered = () => {
    if (allFilteredSelected) {
      // Bỏ chọn các lớp đang hiển thị trong bộ lọc
      const filteredIds = new Set(filteredClasses.map((c) => c.id));
      onSelectMultipleClasses(selectedClassIds.filter((id) => !filteredIds.has(id)));
    } else {
      // Thêm tất cả các lớp đang lọc vào danh sách chọn
      const combined = Array.from(
        new Set([...selectedClassIds, ...filteredClasses.map((c) => c.id)])
      );
      onSelectMultipleClasses(combined);
    }
  };

  return (
    <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
      {/* 2 Ô DROPDOWN LỌC (Khớp với 2 ô đỏ yêu cầu trên ảnh 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Ô 1: Lọc theo Trình độ IELTS */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Lọc theo Trình độ IELTS:
          </label>
          <div className="relative">
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
            >
              <option value="ALL">Tất cả trình độ</option>
              {ieltsLevels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ô 2: Lọc theo Chương trình / Khóa học */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 block mb-1">
            Lọc theo Chương trình / Khóa:
          </label>
          <div className="relative">
            <select
              value={selectedProgramFilter}
              onChange={(e) => setSelectedProgramFilter(e.target.value)}
              className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
            >
              <option value="ALL">Tất cả chương trình</option>
              {availablePrograms.map((prog) => (
                <option key={prog} value={prog}>
                  Khóa {prog}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TÌM KIẾM THEO TÊN / MÃ LỚP */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
        <input
          type="text"
          value={classSearch}
          onChange={(e) => setClassSearch(e.target.value)}
          placeholder="Tìm nhanh theo tên hoặc mã lớp học..."
          className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C]"
        />
      </div>

      {/* TIÊU ĐỀ THỐNG KÊ & NÚT CHỌN NHANH TOÀN BỘ */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-bold text-slate-800">
          Danh sách lớp ({selectedClassIds.length}/{classes.length} đã chọn
          {filteredClasses.length !== classes.length && ` - đang lọc ${filteredClasses.length} lớp`}):
        </span>
        <button
          type="button"
          onClick={handleToggleSelectFiltered}
          disabled={filteredClasses.length === 0}
          className="text-xs text-[#EA580C] hover:text-[#C2410C] hover:underline font-bold transition disabled:opacity-50"
        >
          {allFilteredSelected
            ? "Bỏ chọn các lớp đang lọc"
            : `Chọn tất cả (${filteredClasses.length} lớp)`}
        </button>
      </div>

      {/* DANH SÁCH CHECKBOX CÁC LỚP */}
      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 p-1">
        {filteredClasses.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 italic">
            Không tìm thấy lớp học nào phù hợp với bộ lọc hiện tại
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const isChecked = selectedClassIds.includes(cls.id);
            return (
              <label
                key={cls.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer select-none transition ${
                  isChecked
                    ? "bg-orange-50 font-bold text-orange-950"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleClass(cls.id)}
                    className="size-3.5 accent-[#EA580C] rounded"
                  />
                  <span>{cls.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {cls.level && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                      {cls.level}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">{cls.code}</span>
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
