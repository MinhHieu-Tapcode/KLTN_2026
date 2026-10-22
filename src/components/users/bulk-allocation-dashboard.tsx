"use client";

import React, { useState } from "react";
import { CheckCircle2, ChevronRight, Info, Minus, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LevelAllocationPlan, ProposedClass } from "@/actions/bulk-allocation";

const PALETTE = [
  "#EA580C", // SIMPACE Primary Orange
  "#F97316", // Orange 500
  "#FB923C", // Orange 400
  "#FDBA74", // Orange 300
  "#C2410C", // Orange 700
  "#9A3412", // Orange 800
  "#0284C7", // Sky 600
  "#0D9488", // Teal 600
];

export interface BulkAllocationDashboardProps {
  levelPlans: LevelAllocationPlan[];
  totalValid: number;
  totalClasses: number;
  maxCapacity: number;
  isRebalancing?: boolean;
  onUpdateCapacity: (newCapacity: number) => void;
  onOpenConfigureModal?: () => void;
  onSelectClassDetail: (cls: ProposedClass) => void;
  onSelectDeleteClass: (cls: ProposedClass) => void;
}

export function BulkAllocationDashboard({
  levelPlans,
  totalValid,
  totalClasses,
  maxCapacity,
  isRebalancing = false,
  onUpdateCapacity,
  onOpenConfigureModal,
  onSelectClassDetail,
  onSelectDeleteClass,
}: BulkAllocationDashboardProps) {
  const [capacityInput, setCapacityInput] = useState<number>(maxCapacity || 30);

  // Sắp xếp trình độ từ CAO xuống THẤP (Nâng cao -> Trung bình -> Cơ bản)
  const sortedLevelPlans = React.useMemo(() => {
    const order: Record<string, number> = { ADVANCED: 3, MEDIUM: 2, BASIC: 1 };
    return [...levelPlans].sort((a, b) => {
      const oA = order[a.levelCode] ?? 0;
      const oB = order[b.levelCode] ?? 0;
      return oB - oA;
    });
  }, [levelPlans]);

  // Flatten all classes (Chỉ lấy các lớp có học sinh, loại bỏ lớp rỗng)
  const allClasses: ProposedClass[] = [];
  for (const plan of sortedLevelPlans) {
    allClasses.push(...plan.classes.filter((c) => c.students.length > 0));
  }

  // Calculate SVG Donut segments
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const donutSegments = allClasses.map((cls, idx) => {
    const count = cls.students.length;
    const fraction = totalValid > 0 ? count / totalValid : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return {
      tempId: cls.tempId,
      name: cls.name,
      count,
      percent: Math.round(fraction * 100),
      color: PALETTE[idx % PALETTE.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="space-y-4 sticky top-2 self-start">
      {/* 1. KHỐI ĐIỀU CHỈNH SĨ SỐ TỐI ĐA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="size-3.5 text-[#EA580C]" /> Sĩ số tối đa / lớp
          </label>
          {onOpenConfigureModal ? (
            <button
              type="button"
              onClick={onOpenConfigureModal}
              className="text-[11px] text-[#EA580C] hover:underline font-bold flex items-center gap-0.5"
            >
              Cấu hình từng lớp →
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 font-medium">Khuyến nghị: 25 - 35</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={capacityInput <= 10 || isRebalancing}
              onClick={() => setCapacityInput((c) => Math.max(10, c - 1))}
              className="size-8 rounded-lg border-slate-200 bg-white hover:bg-slate-100"
            >
              <Minus className="size-3.5" />
            </Button>
            <input
              type="number"
              min={10}
              max={60}
              value={capacityInput}
              disabled={isRebalancing}
              onChange={(e) => setCapacityInput(Math.max(10, parseInt(e.target.value, 10) || 10))}
              className="w-full h-8 text-center font-bold text-sm bg-transparent focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={capacityInput >= 60 || isRebalancing}
              onClick={() => setCapacityInput((c) => Math.min(60, c + 1))}
              className="size-8 rounded-lg border-slate-200 bg-white hover:bg-slate-100"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <Button
            type="button"
            disabled={isRebalancing || capacityInput === maxCapacity}
            onClick={() => onUpdateCapacity(capacityInput)}
            className="h-10 px-3.5 text-xs font-semibold bg-[#EA580C] hover:bg-[#D94E07] text-white shrink-0 gap-1 rounded-xl shadow-sm"
          >
            <RefreshCw className={`size-3.5 ${isRebalancing ? "animate-spin" : ""}`} />
            Cập nhật & chia lại
          </Button>
        </div>
      </div>

      {/* 2. BIỂU ĐỒ PHÂN BỔ DONUT CHART (PURE SVG) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Biểu đồ phân bổ học sinh
        </h3>

        <div className="flex flex-col items-center justify-center pt-2 pb-1">
          <div className="relative size-44 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="11"
                fill="transparent"
              />
              {totalValid > 0 &&
                donutSegments.map((seg) => (
                  <circle
                    key={seg.tempId}
                    cx="50"
                    cy="50"
                    r={radius}
                    stroke={seg.color}
                    strokeWidth="11"
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    fill="transparent"
                    className="transition-all duration-500 ease-out"
                  />
                ))}
            </svg>

            {/* Nội dung trung tâm của Donut Chart */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {totalValid}
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">học sinh hợp lệ</span>
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-[#EA580C] border border-orange-200">
                {totalClasses} lớp
              </span>
            </div>
          </div>

          {/* Legend dưới biểu đồ */}
          <div className="w-full mt-3 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] max-h-28 overflow-y-auto pr-1">
            {donutSegments.map((seg) => (
              <div key={seg.tempId} className="flex items-center gap-1.5 truncate">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-slate-600 truncate flex-1">{seg.name}</span>
                <span className="font-semibold text-slate-800 shrink-0">
                  {seg.count} ({seg.percent}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TIẾN ĐỘ SĨ SỐ TỪNG LỚP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Sĩ số từng lớp đề xuất
          </h3>
          <span className="text-[11px] text-slate-400">Sĩ số mục tiêu: ~{maxCapacity}</span>
        </div>

        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {sortedLevelPlans.map((plan) => (
            <div key={plan.levelId} className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60 flex items-center justify-between">
                <span>{plan.levelName}</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {plan.studentCount} HS / {plan.classCount} lớp
                </span>
              </div>

              {plan.classes.filter((c) => c.students.length > 0).map((cls) => {
                const count = cls.students.length;
                const cap = cls.capacity || maxCapacity || 30;
                const ratio = Math.min(100, Math.round((count / cap) * 100));

                return (
                  <div
                    key={cls.tempId}
                    className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-800 truncate">{cls.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700 shrink-0">
                        <b className="text-[#EA580C]">{count}</b>/{cap} HS
                      </span>
                    </div>

                    {/* Thanh tiến độ */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-[#EA580C] rounded-full transition-all duration-300"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>

                    {/* Nút hành động cho lớp */}
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => onSelectClassDetail(cls)}
                        className="text-[11px] text-[#EA580C] hover:underline font-medium px-2 py-0.5"
                      >
                        Chi tiết lớp
                      </button>
                      {plan.classes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onSelectDeleteClass(cls)}
                          title="Xóa lớp và phân bổ lại học sinh"
                          className="text-[11px] text-slate-400 hover:text-rose-600 px-1 py-0.5 rounded transition"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 4. CHECKLIST QUY TẮC PHÂN LỚP TỰ ĐỘNG */}
      <div className="bg-orange-50/60 rounded-2xl border border-orange-200/80 p-3.5 text-xs space-y-2">
        <h4 className="font-bold text-[#EA580C] flex items-center gap-1.5">
          <Info className="size-3.5" /> Quy tắc phân lớp tự động
        </h4>
        <ul className="space-y-1.5 text-slate-600 text-[11px]">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>Chênh lệch sĩ số giữa các lớp cùng trình độ ≤ 1 học sinh</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>Phân lớp chính xác theo dải điểm IELTS đầu vào</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>Học sinh chuyển lớp được giữ nguyên trong cùng trình độ</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
