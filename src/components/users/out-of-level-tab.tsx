import React, { useState } from "react";
import { ValidatedStudentRow, ProposedClass } from "@/actions/bulk-allocation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, XCircle, Search, Check, AlertCircle, Trash2 } from "lucide-react";

export interface OutOfLevelTabProps {
  students: ValidatedStudentRow[];
  allClasses: ProposedClass[];
  onApprove: (student: ValidatedStudentRow, targetClassId: string, reason: string) => void;
  onReject: (student: ValidatedStudentRow) => void;
}

export function OutOfLevelTab({
  students,
  allClasses,
  onApprove,
  onReject,
}: OutOfLevelTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<ValidatedStudentRow | null>(null);
  const [targetClassId, setTargetClassId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phoneNumber && s.phoneNumber.includes(q))
    );
  });

  const handleOpenApproveModal = (st: ValidatedStudentRow) => {
    setSelectedStudent(st);
    setTargetClassId(allClasses[0]?.tempId || "");
    setOverrideReason("Phụ huynh có đơn cam kết nỗ lực theo học và bổ trợ thêm kiến thức");
  };

  const handleConfirmApprove = () => {
    if (!selectedStudent || !targetClassId || !overrideReason.trim()) return;
    onApprove(selectedStudent, targetClassId, overrideReason.trim());
    setSelectedStudent(null);
    setTargetClassId("");
    setOverrideReason("");
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Thông báo nghiệp vụ rõ ràng, sư phạm */}
      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
        <AlertCircle className="size-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold">Học sinh chưa được gán lớp: </span>
          <span>
            Danh sách học sinh có điểm dưới chuẩn đầu vào (&lt; 3.5) hoặc cần xét duyệt thêm trước khi gán lớp. Quản trị viên có thể xem xét <b>Gán vào lớp</b> phù hợp (kèm ghi chú/lý do) hoặc <b>Loại bỏ</b> khỏi đợt phân lớp này.
          </span>
        </div>
      </div>

      {/* Thanh tìm kiếm & bộ đếm Responsive */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-full sm:max-w-xs">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên, email học sinh..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#EA580C] w-full bg-white"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium flex items-center justify-between sm:justify-end gap-2">
          <span>Tổng số: <b className="text-amber-700">{students.length}</b> học sinh</span>
        </div>
      </div>

      {/* Bảng danh sách học sinh có thanh cuộn ngang mượt mà trên mobile/tablet */}
      <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
        <table className="w-full text-xs text-left min-w-[720px]">
          <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200 z-10">
            <tr>
              <th className="py-2.5 px-3 w-10 text-center">STT</th>
              <th className="py-2.5 px-3 min-w-[140px]">Họ và tên</th>
              <th className="py-2.5 px-3 min-w-[160px]">Email & SĐT</th>
              <th className="py-2.5 px-3 text-center min-w-[120px]">4 Kỹ năng (L / R / W / S)</th>
              <th className="py-2.5 px-3 text-center min-w-[90px]">Điểm đầu vào</th>
              <th className="py-2.5 px-3 min-w-[140px]">Trạng thái</th>
              <th className="py-2.5 px-3 text-right min-w-[150px]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  {students.length === 0
                    ? "Tất cả học sinh đã được gán vào lớp học."
                    : "Không tìm thấy học sinh nào phù hợp với từ khóa tìm kiếm."}
                </td>
              </tr>
            ) : (
              filteredStudents.map((st, idx) => {
                const isApproved = st.status === "NGOAI_LE";
                const isRejected = st.status === "TU_CHOI";

                return (
                  <tr key={st.email} className="hover:bg-amber-50/30 transition">
                    <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{st.fullName}</td>
                    <td className="py-2.5 px-3 text-slate-500">
                      <div className="truncate max-w-[180px]" title={st.email}>{st.email}</div>
                      {st.phoneNumber && <div className="text-[11px] text-slate-400">{st.phoneNumber}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                      {st.scoreListening !== undefined ? (
                        <span>
                          {st.scoreListening} / {st.scoreReading} / {st.scoreWriting} / {st.scoreSpeaking}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {st.ieltsScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isApproved ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="size-3" /> Đã gán vào lớp
                          </span>
                          {st.overrideReason && (
                            <p className="text-[10px] text-slate-500 italic max-w-xs truncate" title={st.overrideReason}>
                              {st.overrideReason}
                            </p>
                          )}
                        </div>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          <Trash2 className="size-3" /> Đã xóa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="size-3" /> Chưa được gán lớp
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenApproveModal(st)}
                          className="h-7 px-2.5 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold gap-1"
                        >
                          <UserCheck className="size-3" />
                          {isApproved ? "Đổi lớp" : "Gán vào lớp"}
                        </Button>
                        {!isRejected && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onReject(st)}
                            className="h-7 px-2.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold transition inline-flex items-center gap-1 rounded-lg"
                            title="Xóa học sinh này khỏi đợt phân lớp"
                          >
                            <Trash2 className="size-3.5" /> Xóa
                          </Button>
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

      {/* Modal Gán học sinh vào lớp học - Responsive */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-1">
              <UserCheck className="size-5 text-emerald-600" />
              <span>Gán học sinh vào lớp học</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Học sinh: <b className="text-slate-800">{selectedStudent.fullName}</b> • Điểm đầu vào:{" "}
              <b className="text-amber-700">{selectedStudent.ieltsScore.toFixed(1)}</b> (&lt; 3.5)
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chọn lớp học muốn gán học sinh vào:
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                >
                  {allClasses.map((c) => (
                    <option key={c.tempId} value={c.tempId}>
                      {c.name} ({c.levelName}) • Sĩ số: {c.students.length}/{c.capacity} HV
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Ghi chú / Lý do gán lớp (bắt buộc):
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Ví dụ: Phụ huynh có đơn cam kết nỗ lực theo học; Học sinh làm bài kiểm tra bổ trợ đạt yêu cầu..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedStudent(null)}
                className="w-full sm:w-auto"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!targetClassId || !overrideReason.trim()}
                onClick={handleConfirmApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full sm:w-auto"
              >
                Xác nhận gán vào lớp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
