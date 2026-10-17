"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createIeltsLevelAction,
  updateIeltsClassAllocationAction,
  updateIeltsLevelAction,
} from "@/actions/ielts-levels";

export function IeltsLevelModal({
  open,
  onOpenChange,
  level,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  level?: any;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name")?.toString()?.trim() || "";
    const minScore = Number(formData.get("minScore"));
    const maxScore = Number(formData.get("maxScore"));
    const description = formData.get("description")?.toString()?.trim();
    const targetClassCount = Number(formData.get("targetClassCount")) || 1;
    const isActive = formData.get("isActive") === "on";

    if (!name) {
      setErrorMsg("Tên trình độ không được để trống!");
      return;
    }
    if (isNaN(minScore) || isNaN(maxScore) || minScore < 0 || maxScore > 9.0 || minScore >= maxScore) {
      setErrorMsg("Điểm IELTS phải từ 0.0 đến 9.0 và Điểm tối thiểu phải nhỏ hơn Điểm tối đa!");
      return;
    }

    startTransition(async () => {
      let res;
      if (level?.id) {
        res = await updateIeltsLevelAction(level.id, {
          name,
          minScore,
          maxScore,
          description,
          targetClassCount,
          isActive,
        });
      } else {
        res = await createIeltsLevelAction({
          name,
          minScore,
          maxScore,
          description,
          targetClassCount,
        });
      }

      if (!res.success) {
        setErrorMsg(res.error || "Không thể lưu cấu hình trình độ!");
        return;
      }

      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {level ? "Chỉnh sửa trình độ IELTS" : "Thêm mới trình độ IELTS"}
          </DialogTitle>
          <DialogDescription>
            Cấu hình thang điểm và thông tin hiển thị của trình độ IELTS.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tên trình độ *
            </label>
            <input
              name="name"
              defaultValue={level?.name || ""}
              placeholder="VD: Cơ bản, Trung bình, Nâng cao"
              required
              className="field text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Điểm tối thiểu * (0.0 - 9.0)
              </label>
              <input
                name="minScore"
                type="number"
                step="0.5"
                min="0"
                max="9.0"
                defaultValue={level?.minScore ?? 0.0}
                required
                className="field text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Điểm tối đa * (0.0 - 9.0)
              </label>
              <input
                name="maxScore"
                type="number"
                step="0.5"
                min="0"
                max="9.0"
                defaultValue={level?.maxScore ?? 4.0}
                required
                className="field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Số lớp phân bổ mặc định
            </label>
            <input
              name="targetClassCount"
              type="number"
              min="1"
              defaultValue={level?.targetClassCount || 1}
              required
              className="field text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Mô tả trình độ
            </label>
            <textarea
              name="description"
              defaultValue={level?.description || ""}
              placeholder="Mô tả mục tiêu đầu ra hoặc đối tượng phù hợp..."
              rows={2}
              className="field text-sm"
            />
          </div>

          {level && (
            <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs font-medium text-slate-700">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={level?.isActive ?? true}
                className="size-4 rounded text-[#EA580C] focus:ring-[#EA580C]"
              />
              <span>Trạng thái đang hoạt động</span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} size="sm" className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Lưu trình độ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IeltsAllocationModal({
  level,
  onClose,
  onSaved,
}: {
  level: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [newCount, setNewCount] = useState<number>(level?.targetClassCount || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const count = Math.floor(Number(newCount));
    if (isNaN(count) || count < 1) {
      setErrorMsg("Số lớp phải là số nguyên dương lớn hơn hoặc bằng 1!");
      return;
    }

    startTransition(async () => {
      const res = await updateIeltsClassAllocationAction(level.id, count);
      if (!res.success) {
        setErrorMsg(res.error || "Không thể cập nhật cấu hình số lớp!");
        return;
      }
      onClose();
      onSaved();
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="size-5 text-[#EA580C]" /> Chỉnh sửa cấu hình phân lớp
          </DialogTitle>
          <DialogDescription>
            Thiết lập số lớp được phân bổ cho trình độ <b>{level?.name}</b> khi nhập hàng loạt.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Trình độ:</span>
              <b className="text-slate-800">{level?.name}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thang điểm IELTS:</span>
              <b className="font-mono text-slate-800">{level?.minScore} - {level?.maxScore}</b>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số lớp hiện tại:</span>
              <b className="text-[#EA580C]">{level?.targetClassCount} lớp</b>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Số lớp cấu hình mới * (Số nguyên dương ≥ 1)
            </label>
            <input
              type="number"
              min="1"
              value={newCount}
              onChange={(e) => setNewCount(Math.max(1, parseInt(e.target.value) || 1))}
              required
              className="field text-sm font-bold"
            />
            <p className="text-[11.5px] text-slate-500 mt-1">
              Học sinh thuộc trình độ này sẽ được tự động chia đều vào <b>{newCount}</b> lớp khi nhập hàng loạt.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <b>Cảnh báo an toàn:</b> Cấu hình này làm căn cứ phân bổ cho những lần nhập hàng loạt tiếp theo. Hệ thống không tự động thay đổi hoặc xóa các lớp học chính thức đã tồn tại.
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending} size="sm" className="bg-[#EA580C] text-white">
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null} Lưu cấu hình số lớp
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
