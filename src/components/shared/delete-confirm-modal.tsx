"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getDeleteImpactAction } from "@/actions/delete-impact";
import type { DeleteKind } from "@/services/delete-rules.service";

export interface DeleteExecuteResult {
  success: boolean;
  error?: string;
  requiresConfirm?: boolean;
  warnings?: string[];
  deletedFromAll?: boolean;
}

export interface DeleteTarget {
  kind: DeleteKind;
  ids: string[];
  classId?: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onExecute: (confirmed: boolean) => Promise<DeleteExecuteResult>;
  onSuccess?: (res: DeleteExecuteResult) => void | Promise<void>;
}

/**
 * Popup xác nhận xóa dùng chung cho toàn hệ thống SIMPACE (Trường, Lớp, Người dùng, Học liệu, Bài tập).
 * Tự động kiểm tra ràng buộc (số học viên, lớp, tài liệu, bài nộp...) ngay khi mở để hiển thị trong 1 popup duy nhất.
 */
export function DeleteConfirmModal({
  target,
  onClose,
}: {
  target: DeleteTarget | null;
  onClose: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [checkFailed, setCheckFailed] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setChecking(true);
    setSubmitting(false);
    setBlockers([]);
    setWarnings([]);
    setCheckFailed(false);
    setSubmitError("");

    getDeleteImpactAction({
      kind: target.kind,
      ids: target.ids,
      classId: target.classId,
    }).then((res) => {
      if (cancelled) return;
      setChecking(false);
      if (!res.success || !res.impact) {
        setCheckFailed(true);
        setSubmitError(res.error || "Không thể kiểm tra dữ liệu liên quan!");
        return;
      }
      setBlockers(res.impact.blockers);
      setWarnings(res.impact.warnings);
    });

    return () => {
      cancelled = true;
    };
  }, [target]);

  const isBlocked = blockers.length > 0 || checkFailed;
  const hasWarnings = warnings.length > 0;

  const handleConfirm = async () => {
    if (!target || checking || submitting || isBlocked) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await target.onExecute(hasWarnings);
      if (res?.requiresConfirm) {
        setWarnings(
          res.warnings && res.warnings.length > 0
            ? res.warnings
            : ["Đối tượng này còn dữ liệu liên quan."]
        );
        setSubmitting(false);
        return;
      }
      if (!res?.success) {
        setSubmitError(res?.error || "Không thể thực hiện thao tác xóa!");
        setSubmitting(false);
        return;
      }
      await target.onSuccess?.(res);
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || "Đã xảy ra lỗi khi xóa, vui lòng thử lại!");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
        <div className="flex items-start gap-4">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
              isBlocked
                ? "bg-rose-100 text-rose-600"
                : hasWarnings
                ? "bg-amber-100 text-amber-600"
                : "bg-red-100 text-red-600"
            }`}
          >
            {isBlocked ? (
              <ShieldAlert className="size-5" />
            ) : hasWarnings ? (
              <AlertTriangle className="size-5" />
            ) : (
              <Trash2 className="size-5" />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <DialogTitle className="text-base font-bold text-[#0F172A]">
              {isBlocked ? "Không thể xóa" : target?.title || "Xác nhận xóa"}
            </DialogTitle>
            <DialogDescription className="text-sm text-[#64748B] leading-relaxed pt-1">
              {target?.description}
            </DialogDescription>
          </div>
        </div>

        {checking && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
            <Loader2 className="size-3.5 animate-spin text-[#EA580C]" />
            <span>Đang kiểm tra dữ liệu liên quan...</span>
          </div>
        )}

        {!checking && blockers.length > 0 && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 space-y-1.5 text-xs text-rose-800">
            <p className="font-bold">Ràng buộc hệ thống:</p>
            <ul className="list-disc pl-4 space-y-1">
              {blockers.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {!checking && !isBlocked && hasWarnings && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 space-y-2 text-xs text-amber-900">
            <p className="font-bold text-amber-800">Cảnh báo dữ liệu liên quan:</p>
            <ul className="list-disc pl-4 space-y-1 max-h-48 overflow-y-auto pr-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-700 pt-1 border-t border-amber-200/70">
              Nếu xác nhận tiếp tục, dữ liệu sẽ được xóa mềm và lịch sử liên quan vẫn được bảo toàn.
            </p>
          </div>
        )}

        {submitError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
            {submitError}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="border-[#CBD5E1] rounded-xl text-xs h-9"
          >
            {isBlocked ? "Đóng" : "Hủy bỏ"}
          </Button>
          {!isBlocked && (
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={checking || submitting}
              className="bg-rose-600 text-white hover:bg-rose-700 shadow-sm rounded-xl text-xs font-semibold h-9"
            >
              {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {checking
                ? "Đang kiểm tra..."
                : submitting
                ? "Đang xóa..."
                : hasWarnings
                ? "Xác nhận vẫn xóa"
                : target?.confirmLabel || "Xóa"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
