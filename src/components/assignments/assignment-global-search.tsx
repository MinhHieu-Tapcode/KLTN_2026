"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, Pencil, Loader2, ExternalLink } from "lucide-react";
import { searchAssignmentsAction } from "@/actions/assignment-search";
import { AssignmentEditModal } from "@/components/assignments/assignment-edit-modal";

const SKILL_LABELS: Record<string, string> = {
  ALL_SKILLS: "Đủ 4 kỹ năng",
  LISTENING: "Nghe",
  SPEAKING: "Nói",
  READING: "Đọc",
  WRITING: "Viết",
};

interface Props {
  currentUser: { role: string };
  /** Danh sách lớp người dùng được phép thấy, dùng cho ô lọc lớp */
  classes: { id: string; name: string; code: string }[];
  /** Mở danh sách bài tập của một lớp */
  onOpenClass: (classId: string) => void;
  /** Nội dung mặc định (các thẻ lớp) khi chưa nhập từ khóa hay bộ lọc */
  children: React.ReactNode;
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("vi-VN") : "Không có hạn");

/** Thanh tìm kiếm bài tập xuyên lớp, đặt đầu trang "Quản lý bài tập". */
export function AssignmentGlobalSearch({ currentUser, classes, onOpenClass, children }: Props) {
  const [keyword, setKeyword] = useState("");
  const [classId, setClassId] = useState("");
  const [skill, setSkill] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const reqId = useRef(0);

  const isStudent = currentUser.role === "STUDENT";
  const canEdit = currentUser.role === "ADMIN" || currentUser.role === "TEACHER";
  const active = keyword.trim() !== "" || classId !== "" || skill !== "";
  const pageSize = 20;

  const runSearch = async (targetPage = page) => {
    const my = ++reqId.current;
    setLoading(true);
    setError("");
    const res: any = await searchAssignmentsAction({
      keyword: keyword.trim() || undefined,
      classId: classId || undefined,
      skill: skill || undefined,
      page: targetPage,
      pageSize,
    });
    if (my !== reqId.current) return; // bỏ qua kết quả của lần gõ cũ
    if (!res.success) {
      setError(res.error || "Không thể tìm kiếm bài tập!");
      setItems([]);
      setTotal(0);
    } else {
      setItems(res.items);
      setTotal(res.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    setPage(1);
  }, [keyword, classId, skill]);

  useEffect(() => {
    if (isStudent || !active) return;
    const t = setTimeout(() => runSearch(page), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, classId, skill, page]);

  if (isStudent) return <>{children}</>;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={100}
            placeholder="Tìm bài tập theo tên hoặc mô tả..."
            className="field field-search border-[#CBD5E1]"
          />
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="field text-xs bg-white border-[#CBD5E1] !w-[200px] shrink-0"
          >
            <option value="">-- Tất cả lớp --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
          <select
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="field text-xs bg-white border-[#CBD5E1] !w-[160px] shrink-0"
          >
            <option value="">-- Mọi kỹ năng --</option>
            {Object.entries(SKILL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!active ? (
        children
      ) : (
        <div className="space-y-3">
          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
          {loading && (
            <div className="py-6 grid place-items-center text-slate-500">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Không tìm thấy bài tập nào phù hợp với bộ lọc.
            </div>
          )}
          {!loading &&
            items.map((it) => (
              <div key={it.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 truncate">{it.title}</span>
                    <span className="text-[10px] font-bold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded">
                      {SKILL_LABELS[it.skill] || it.skill}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {it.questionCount} câu hỏi · {it.submissionCount} bài nộp
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {it.classes.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onOpenClass(c.id)}
                        title={`Hạn nộp: ${fmt(c.dueDate)}. Bấm để mở lớp`}
                        className="text-[11px] bg-slate-100 hover:bg-orange-50 text-slate-700 px-2 py-0.5 rounded"
                      >
                        {c.code} · {fmt(c.dueDate)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {it.classes[0] && (
                    <button
                      type="button"
                      onClick={() => onOpenClass(it.classes[0].id)}
                      className="h-8 px-2.5 text-xs rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="size-3.5" /> Mở lớp
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setEditingId(it.id)}
                      className="h-8 px-2.5 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold inline-flex items-center gap-1"
                    >
                      <Pencil className="size-3.5" /> Sửa
                    </button>
                  )}
                </div>
              </div>
            ))}

          {total > pageSize && (
            <div className="flex items-center justify-center gap-3 text-xs text-slate-600">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">
                Trước
              </button>
              <span>
                Trang {page}/{totalPages} ({total} bài tập)
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <AssignmentEditModal
          assignmentId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => runSearch(page)}
        />
      )}
    </div>
  );
}
