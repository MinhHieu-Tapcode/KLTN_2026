"use client";

import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateModeChoiceModal({
  open,
  onClose,
  onSelectMode,
}: {
  open: boolean;
  onClose: () => void;
  onSelectMode: (mode: "manual" | "smart_parser") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Chọn phương thức giao bài tập IELTS
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Hệ thống hỗ trợ soạn thủ công từng câu hỏi hoặc bóc tách thông minh từ file đề thi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-3">
          <button
            onClick={() => onSelectMode("manual")}
            className="p-4 rounded-2xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-left transition flex items-start gap-3.5 group"
          >
            <div className="size-10 rounded-xl bg-slate-100 group-hover:bg-[#EA580C] group-hover:text-white grid place-items-center text-slate-700 transition">
              <Edit3 className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#EA580C]">
                1. Soạn bài tập thủ công
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Đầy đủ 7 dạng câu hỏi IELTS, hỗ trợ trường mô tả ngữ cảnh đoạn trích, tải file audio MP3 trực tiếp.
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectMode("smart_parser")}
            className="p-4 rounded-2xl border-2 border-orange-200 bg-orange-50/30 hover:bg-orange-50/80 text-left transition flex items-start gap-3.5 group"
          >
            <div className="size-10 rounded-xl bg-orange-100 group-hover:bg-[#EA580C] group-hover:text-white grid place-items-center text-[#EA580C] transition">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#EA580C]">
                  2. Bóc tách đề thi IELTS thông minh
                </h4>
                <Badge className="bg-[#EA580C] text-white text-[10px]">Ebook View</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tải file đề thi PDF → Hiện ngay Ebook 2 cột → Nạp Excel tự động điền đáp án → Tự động tách 4 kỹ năng!
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ExamResultModal({
  examResult,
  onClose,
}: {
  examResult: any | null;
  onClose: () => void;
}) {
  if (!examResult) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white">
        <div className="p-4 text-center space-y-4">
          {examResult.isCheated ? (
            <div className="size-16 rounded-full bg-rose-100 text-rose-600 grid place-items-center mx-auto">
              <ShieldAlert className="size-8" />
            </div>
          ) : (
            <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto">
              <CheckCircle2 className="size-8" />
            </div>
          )}

          <div>
            <h3 className="text-base font-bold text-slate-900">
              {examResult.isCheated
                ? "Bài làm đã bị thu hồi do vi phạm quy chế!"
                : "Chúc mừng bạn đã hoàn thành bài thi!"}
            </h3>
            {examResult.isCheated && (
              <p className="text-xs text-rose-600 mt-1">
                Lý do: Rời màn hình làm bài {examResult.tabSwitchCount} lần (Vượt mức cho phép).
              </p>
            )}
            {examResult.score !== null && (
              <p className="text-2xl font-black text-[#EA580C] mt-2">
                {examResult.score} / {examResult.totalPoints} điểm
              </p>
            )}
          </div>

          <Button onClick={onClose} className="text-xs rounded-xl bg-slate-900 text-white px-6 w-full">
            Đóng màn hình kết quả
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TabSwitchWarningModal({
  open,
  tabSwitchCount,
  onClose,
}: {
  open: boolean;
  tabSwitchCount: number;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-amber-300">
        <div className="text-center space-y-3">
          <div className="size-14 rounded-full bg-amber-100 text-amber-600 grid place-items-center mx-auto">
            <AlertTriangle className="size-7" />
          </div>
          <h3 className="text-base font-bold text-amber-700">NHẮC NHỞ: RỜI KHỎI MÀN HÌNH BÀI TẬP</h3>
          <p className="text-xs text-slate-600">
            Hệ thống phát hiện bạn vừa chuyển tab hoặc rời cửa sổ trình duyệt.
            <br />
            Đã ghi nhận lần thứ: <b className="text-amber-600 font-bold">{tabSwitchCount}</b>.
          </p>
          <p className="text-[11px] text-slate-500 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            Lưu ý: Số lần rời tab sẽ được lưu lại trong kết quả nộp bài để giáo viên theo dõi. Bạn vẫn có thể tiếp tục làm bài bình thường!
          </p>
          <Button
            size="sm"
            onClick={onClose}
            className="w-full rounded-xl bg-[#EA580C] hover:bg-[#EA580C]/90 text-white font-semibold text-xs"
          >
            Tôi đã hiểu và tiếp tục làm bài
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AssignmentAlertModal({
  alertModal,
  onClose,
}: {
  alertModal: {
    isOpen: boolean;
    title: string;
    message: string;
    type: "warning" | "error" | "success" | "info";
  } | null;
  onClose: () => void;
}) {
  if (!alertModal) return null;

  return (
    <Dialog open={alertModal.isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
        <div className="text-center space-y-3.5">
          <div
            className={`size-12 rounded-2xl grid place-items-center mx-auto ${
              alertModal.type === "error"
                ? "bg-rose-100 text-rose-600"
                : alertModal.type === "success"
                ? "bg-emerald-100 text-emerald-600"
                : alertModal.type === "info"
                ? "bg-blue-100 text-blue-600"
                : "bg-amber-100 text-amber-600"
            }`}
          >
            {alertModal.type === "error" ? (
              <AlertCircle className="size-6" />
            ) : alertModal.type === "success" ? (
              <CheckCircle2 className="size-6" />
            ) : alertModal.type === "info" ? (
              <HelpCircle className="size-6" />
            ) : (
              <AlertTriangle className="size-6" />
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">{alertModal.title}</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{alertModal.message}</p>
          </div>

          <Button
            onClick={onClose}
            className="w-full text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold h-9"
          >
            Đã hiểu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDeleteAssignmentModal({
  confirmDeleteModal,
  isPending,
  onClose,
  onConfirm,
}: {
  confirmDeleteModal: {
    isOpen: boolean;
    assignmentId: string;
    title: string;
    assignedClassCount?: number;
    assignedClassNames?: string[];
    deleteScope: "CURRENT_CLASS" | "ALL_CLASSES";
  } | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!confirmDeleteModal) return null;

  return (
    <Dialog open={confirmDeleteModal.isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
        <div className="text-center space-y-3.5">
          <div className="size-12 rounded-2xl bg-rose-100 text-rose-600 grid place-items-center mx-auto">
            <Trash2 className="size-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa bài tập</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Bạn có chắc muốn xóa bài tập <b className="text-slate-900 font-semibold">"{confirmDeleteModal.title}"</b>?
              Hệ thống sẽ chuyển trạng thái sang xóa mềm để bảo toàn lịch sử học tập.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-xs rounded-xl h-9">
              Hủy bỏ
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold h-9"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Xác nhận xóa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmRegradeAssignmentModal({
  regradeModal,
  isPending,
  onClose,
  onConfirm,
}: {
  regradeModal: {
    isOpen: boolean;
    assignmentId: string;
    title: string;
    submittedCount: number;
  } | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!regradeModal) return null;

  return (
    <Dialog open={regradeModal.isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
        <div className="text-center space-y-3.5">
          <div className="size-12 rounded-2xl bg-orange-100 text-[#EA580C] grid place-items-center mx-auto">
            <RefreshCw className="size-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">Chấm lại bài nộp tự động</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Hệ thống sẽ tự động chấm lại toàn bộ <b>{regradeModal.submittedCount}</b> bài nộp của bài tập{" "}
              <b className="text-slate-900 font-semibold">"{regradeModal.title}"</b> theo bộ đáp án chuẩn mới nhất.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 text-xs rounded-xl h-9">
              Hủy bỏ
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold h-9"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Chấm lại ngay
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
