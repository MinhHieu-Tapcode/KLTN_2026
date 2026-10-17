"use client";

import React, { useState } from "react";
import { Edit2, Layers, Plus, Sliders, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteIeltsLevelAction } from "@/actions/ielts-levels";
import { ConfirmDialog } from "@/components/shared/common-widgets";
import {
  IeltsAllocationModal,
  IeltsLevelModal,
} from "@/components/import/ielts-modals";

export function IeltsLevelsSection({
  ieltsLevels,
  onRefreshLevels,
}: {
  ieltsLevels: any[];
  onRefreshLevels: () => void;
}) {
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<any>(null);
  const [deleteLevelData, setDeleteLevelData] = useState<any>(null);
  const [levelError, setLevelError] = useState("");
  const [levelSuccess, setLevelSuccess] = useState("");

  return (
    <section className="panel space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
            <Layers className="size-5 text-[#EA580C]" /> Cấu hình trình độ IELTS
          </h2>
          <p className="text-xs text-[#64748B]">
            Xác định thang điểm IELTS đầu vào tương ứng với từng trình độ (Cơ bản, Trung bình, Nâng cao...). Hệ thống tự động kiểm tra các khoảng điểm không bị chồng lấn.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingLevel(null);
            setLevelModalOpen(true);
          }}
          className="bg-[#EA580C] text-white text-xs h-8 gap-1.5"
        >
          <Plus className="size-3.5" /> Thêm trình độ mới
        </Button>
      </div>

      {levelSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium border border-emerald-200">
          {levelSuccess}
        </div>
      )}
      {levelError && (
        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-200">
          {levelError}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Tên trình độ</th>
              <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Mã</th>
              <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Thang điểm IELTS</th>
              <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Mô tả</th>
              <th className="px-4 py-3 text-xs font-bold text-[#64748B] text-center">Trạng thái</th>
              <th className="px-4 py-3 text-xs font-bold text-[#64748B] text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {ieltsLevels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400">
                  Chưa có cấu hình trình độ IELTS nào. Vui lòng bấm &quot;Thêm trình độ mới&quot; để thiết lập.
                </td>
              </tr>
            ) : (
              ieltsLevels.map((lvl) => (
                <tr key={lvl.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 font-bold text-[#0F172A]">{lvl.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{lvl.code}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono font-bold bg-orange-50 text-[#EA580C] px-2 py-0.5 rounded text-xs border border-orange-200">
                      {Number(lvl.minScore).toFixed(1)} - {Number(lvl.maxScore).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 max-w-xs truncate">
                    {lvl.description || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        lvl.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {lvl.isActive ? "Hoạt động" : "Tạm dừng"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingLevel(lvl);
                          setLevelModalOpen(true);
                        }}
                        title="Chỉnh sửa trình độ"
                        className="size-7 text-slate-500 hover:text-slate-800"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteLevelData(lvl)}
                        title="Xóa trình độ"
                        className="size-7 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <IeltsLevelModal
        open={levelModalOpen}
        onOpenChange={setLevelModalOpen}
        level={editingLevel}
        onSaved={() => {
          setLevelSuccess("Đã lưu cấu hình trình độ IELTS thành công!");
          onRefreshLevels();
        }}
      />

      <ConfirmDialog
        open={!!deleteLevelData}
        onOpenChange={(open) => !open && setDeleteLevelData(null)}
        title="Xóa cấu hình trình độ IELTS"
        description={`Bạn có chắc chắn muốn xóa trình độ "${deleteLevelData?.name}" (${deleteLevelData?.minScore} - ${deleteLevelData?.maxScore}) khỏi hệ thống?`}
        confirmText="Xác nhận xóa"
        onConfirm={async () => {
          if (!deleteLevelData) return;
          setLevelError("");
          setLevelSuccess("");
          const res = await deleteIeltsLevelAction(deleteLevelData.id);
          if (!res.success) {
            setLevelError(res.error || "Không thể xóa trình độ!");
          } else {
            setLevelSuccess("Đã xóa trình độ thành công!");
            onRefreshLevels();
          }
          setDeleteLevelData(null);
        }}
      />
    </section>
  );
}

export function IeltsAllocationSection({
  ieltsLevels,
  onRefreshLevels,
}: {
  ieltsLevels: any[];
  onRefreshLevels: () => void;
}) {
  const [allocationModalLevel, setAllocationModalLevel] = useState<any>(null);
  const [allocationSuccess, setAllocationSuccess] = useState("");

  return (
    <section className="panel space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
            <Sliders className="size-5 text-[#EA580C]" /> Cấu hình phân lớp IELTS
          </h2>
          <p className="text-xs text-[#64748B]">
            Xác định số lớp được phân bổ cho từng trình độ IELTS khi nhập hàng loạt. Sĩ số thực tế của từng lớp được xác định từ tổng số học sinh thuộc trình độ chia đều cho số lớp.
          </p>
        </div>
      </div>

      {allocationSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl font-medium border border-emerald-200">
          {allocationSuccess}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Tên trình độ</th>
              <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Thang điểm IELTS</th>
              <th className="px-4 py-3 text-xs font-bold text-[#64748B] text-center">Số lớp cấu hình</th>
              <th className="px-4 py-3 text-xs font-bold text-[#64748B] text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {ieltsLevels.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                  Chưa có trình độ IELTS nào. Vui lòng thiết lập tại tab &quot;Cấu hình trình độ IELTS&quot; trước.
                </td>
              </tr>
            ) : (
              ieltsLevels.map((lvl) => (
                <tr key={lvl.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3.5 font-bold text-[#0F172A]">{lvl.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                    {Number(lvl.minScore).toFixed(1)} - {Number(lvl.maxScore).toFixed(1)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 font-mono inline-block">
                      {lvl.targetClassCount || 1} lớp
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAllocationModalLevel(lvl)}
                      className="text-xs h-7 border-[#EA580C] text-[#EA580C] hover:bg-orange-50 gap-1"
                    >
                      <Edit2 className="size-3" /> Chỉnh sửa
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {allocationModalLevel && (
        <IeltsAllocationModal
          level={allocationModalLevel}
          onClose={() => setAllocationModalLevel(null)}
          onSaved={() => {
            setAllocationSuccess("Đã cập nhật cấu hình số lớp phân bổ thành công!");
            onRefreshLevels();
          }}
        />
      )}
    </section>
  );
}
