"use client";

import React from "react";
import { AlertTriangle, Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ManagerChangeModalState {
  school: any;
  newManager: any;
  otherSchools: any[];
  selectedSwapSchoolId: string;
}

export interface ConflictErrorModalState {
  open: boolean;
  title: string;
  message: string;
}

export function SchoolUpsertModals({
  managerChangeModal,
  setManagerChangeModal,
  isChangingManager,
  onExecuteChangeManager,
  conflictErrorModal,
  setConflictErrorModal,
}: {
  managerChangeModal: ManagerChangeModalState | null;
  setManagerChangeModal: React.Dispatch<React.SetStateAction<ManagerChangeModalState | null>>;
  isChangingManager: boolean;
  onExecuteChangeManager: (actionType: "SWAP" | "OVERWRITE") => void;
  conflictErrorModal: ConflictErrorModalState | null;
  setConflictErrorModal: React.Dispatch<React.SetStateAction<ConflictErrorModalState | null>>;
}) {
  return (
    <>
      {managerChangeModal && (
        <Dialog
          open={true}
          onOpenChange={(op) => !isChangingManager && !op && setManagerChangeModal(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="size-5 text-[#EA580C]" /> Thay đổi Quản nhiệm phụ trách trường
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Xác nhận phân công, hoán đổi hoặc ghi đè quản nhiệm cho trường học.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Trường học:</span>
                  <span className="font-bold text-slate-800">{managerChangeModal.school.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Quản nhiệm hiện tại:</span>
                  <span className="font-semibold text-slate-700">
                    {managerChangeModal.school.manager?.profile?.fullName ||
                      managerChangeModal.school.manager?.username ||
                      "Chưa phân công"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Quản nhiệm mới:</span>
                  <span className="font-bold text-[#EA580C]">
                    {managerChangeModal.newManager.profile?.fullName ||
                      managerChangeModal.newManager.username}
                  </span>
                </div>
              </div>

              {managerChangeModal.otherSchools.length > 0 && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-800 space-y-2">
                  <div className="font-medium">
                    Quản nhiệm này hiện đang phụ trách:{" "}
                    <b>{managerChangeModal.otherSchools.map((s: any) => s.name).join(", ")}</b>.
                  </div>
                  {managerChangeModal.school.managerId && (
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-900 mb-1">
                        Chọn trường để hoán đổi quản nhiệm (nếu chọn Hoán đổi):
                      </label>
                      <select
                        value={managerChangeModal.selectedSwapSchoolId}
                        onChange={(e) =>
                          setManagerChangeModal((prev) =>
                            prev ? { ...prev, selectedSwapSchoolId: e.target.value } : null
                          )
                        }
                        className="w-full text-xs font-medium px-2 py-1.5 rounded-lg border border-blue-300 bg-white text-slate-800"
                      >
                        {managerChangeModal.otherSchools.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                💡 <b>Các lựa chọn xử lý:</b>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>
                    <b>Ghi đè:</b> Quản nhiệm mới sẽ tiếp quản trường {managerChangeModal.school.name}. Quản nhiệm cũ sẽ
                    được gỡ khỏi trường này.
                  </li>
                  {managerChangeModal.otherSchools.length > 0 && managerChangeModal.school.managerId && (
                    <li>
                      <b>Hoán đổi 2 quản nhiệm:</b> Quản nhiệm mới nhận trường này, và Quản nhiệm cũ chuyển sang phụ trách
                      trường đối tác tương ứng.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                disabled={isChangingManager}
                onClick={() => setManagerChangeModal(null)}
                className="text-xs"
              >
                Hủy đổi
              </Button>

              {managerChangeModal.otherSchools.length > 0 && managerChangeModal.school.managerId && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isChangingManager}
                  onClick={() => onExecuteChangeManager("SWAP")}
                  className="text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                >
                  {isChangingManager ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                  Hoán đổi 2 quản nhiệm
                </Button>
              )}

              <Button
                size="sm"
                disabled={isChangingManager}
                onClick={() => onExecuteChangeManager("OVERWRITE")}
                className="text-xs font-semibold bg-[#EA580C] hover:bg-[#C2410C] text-white"
              >
                {isChangingManager ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                Ghi đè
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {conflictErrorModal && (
        <Dialog open={true} onOpenChange={() => setConflictErrorModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="size-5 text-rose-600" /> {conflictErrorModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 space-y-2">
                <p className="font-medium">{conflictErrorModal.message}</p>
                <p className="text-[11px] text-rose-900 italic pt-1 border-t border-rose-200">
                  Ràng buộc hệ thống: Một quản nhiệm có thể phụ trách nhiều lớp trong cùng 1 trường, nhưng không thể quản
                  nhiệm 2 trường khác nhau nếu có các lớp diễn ra trùng khung giờ và ngày học.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                size="sm"
                onClick={() => setConflictErrorModal(null)}
                className="text-xs bg-slate-800 text-white hover:bg-slate-900"
              >
                Đã hiểu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
