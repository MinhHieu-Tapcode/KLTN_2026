"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  getAssignmentForEditAction,
  editAssignmentAction,
  regradeAfterEditAction,
} from "@/actions/assignment-search";
import {
  AssignmentEditQuestionCard,
  type EditableQuestion,
} from "@/components/assignments/assignment-edit-question-card";

interface ClassSchedule {
  classId: string;
  name: string;
  code: string;
  startDate: string;
  dueDate: string;
}

interface Props {
  assignmentId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

/** ISO (UTC) -> giá trị cho <input type="datetime-local"> theo giờ máy người dùng */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

/** Form sửa bài tập dành cho Admin và Giáo viên. */
export function AssignmentEditModal({ assignmentId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [submissionCount, setSubmissionCount] = useState(0);
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);

  useEffect(() => {
    if (!assignmentId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const res: any = await getAssignmentForEditAction(assignmentId);
      if (cancelled) return;
      if (!res?.success) {
        setError(res?.error || "Không thể tải bài tập!");
      } else {
        const a = res.assignment;
        setUpdatedAt(a.updatedAt);
        setSubmissionCount(a.submissionCount);
        setTitle(a.title);
        setInstruction(a.instruction || "");
        setDuration(a.durationMinutes ? String(a.durationMinutes) : "");
        setSchedules(
          a.classes.map((c: any) => ({
            classId: c.classId,
            name: c.name,
            code: c.code,
            startDate: toLocalInput(c.startDate),
            dueDate: toLocalInput(c.dueDate),
          }))
        );
        setQuestions(a.questions);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  const updateSchedule = (i: number, patch: Partial<ClassSchedule>) =>
    setSchedules((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const addFillInQuestion = () =>
    setQuestions((qs) => [
      ...qs,
      {
        prompt: "",
        passageText: null,
        type: "FILL_IN_BLANK",
        ieltsQuestionType: null,
        groupTitle: null,
        points: 1,
        correctAnswer: "",
        explanation: null,
        answerCount: 0,
        options: [],
      },
    ]);

  const handleSave = async () => {
    if (!assignmentId) return;
    setSaving(true);
    setError("");
    const res: any = await editAssignmentAction({
      assignmentId,
      expectedUpdatedAt: updatedAt,
      title,
      instruction,
      durationMinutes: duration ? Number(duration) : null,
      classSchedules: schedules.map((s) => ({
        classId: s.classId,
        startDate: toIso(s.startDate),
        dueDate: toIso(s.dueDate),
      })),
      questions: questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        passageText: q.passageText,
        type: q.type,
        ieltsQuestionType: q.ieltsQuestionType,
        groupTitle: q.groupTitle,
        points: q.points,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        options: q.options,
      })),
    });
    setSaving(false);
    if (!res?.success) {
      setError(res?.error || "Không thể lưu thay đổi!");
      return;
    }
    if (
      res.needsRegrade &&
      window.confirm(
        `Bạn vừa đổi đáp án/điểm của câu đã có bài làm (${res.submissionCount} bài nộp). Chấm lại tự động các bài trắc nghiệm theo đáp án mới?`
      )
    ) {
      const r: any = await regradeAfterEditAction(assignmentId);
      if (!r?.success) window.alert(r?.error || "Chấm lại thất bại, bạn có thể chấm lại thủ công sau.");
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!assignmentId} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa bài tập</DialogTitle>
          <DialogDescription>
            {submissionCount > 0
              ? `Bài này đã có ${submissionCount} bài nộp. Sửa nội dung sẽ không làm mất bài làm của học viên.`
              : "Cập nhật tiêu đề, thời hạn và nội dung câu hỏi."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 grid place-items-center text-slate-500">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-600">Tiêu đề</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="field w-full text-sm" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-600">Thời lượng (phút)</span>
                <input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Không giới hạn"
                  className="field w-full text-sm"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600">Hướng dẫn làm bài</span>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={2}
                className="field w-full text-sm"
              />
            </label>

            {schedules.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Thời hạn theo từng lớp</span>
                {schedules.map((s, i) => (
                  <div key={s.classId} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end rounded-xl border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-700">
                      <span className="font-mono text-slate-500">{s.code}</span> {s.name}
                    </div>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-slate-500">Bắt đầu</span>
                      <input type="datetime-local" value={s.startDate} onChange={(e) => updateSchedule(i, { startDate: e.target.value })} className="field w-full text-xs" />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-slate-500">Hạn nộp</span>
                      <input type="datetime-local" value={s.dueDate} onChange={(e) => updateSchedule(i, { dueDate: e.target.value })} className="field w-full text-xs" />
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700">Câu hỏi ({questions.length})</span>
              {questions.map((q, i) => (
                <AssignmentEditQuestionCard
                  key={q.id ?? `new-${i}`}
                  index={i}
                  question={q}
                  onChange={(next) => setQuestions((qs) => qs.map((x, k) => (k === i ? next : x)))}
                  onRemove={() => setQuestions((qs) => qs.filter((_, k) => k !== i))}
                />
              ))}
              <Button type="button" variant="outline" onClick={addFillInQuestion} className="h-9 text-xs gap-1.5">
                <Plus className="size-4" /> Thêm câu điền khuyết
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-9 text-xs">
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="h-9 text-xs bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
