"use client";

import React, { useState } from "react";
import { AlertTriangle, Award, BookOpen, Headphones, Mic, PenTool } from "lucide-react";
import { ReportHorizontalBars, ReportKpiCard } from "./report-shared-widgets";

export interface QuestionTypeStatItem {
  code: string;
  label: string;
  correctCount: number;
  totalCount: number;
  accuracyPercent: number | null;
  isLowData: boolean;
}

export interface CriteriaSubmissionItem {
  submissionId: string;
  assignmentTitle: string;
  taskOrPartLabel: string;
  submittedAt: string | null;
  overallBand: number;
  criteriaScores: Record<string, number>;
  feedback: string | null;
}

export interface StudentQuestionTypeAnalysisData {
  reading: QuestionTypeStatItem[];
  listening: QuestionTypeStatItem[];
  writing: {
    overallBand: number | null;
    task1Band: number | null;
    task2Band: number | null;
    criteriaBreakdown: Array<{
      code: string;
      label: string;
      shortLabel: string;
      averageBand: number | null;
    }>;
    submissions: CriteriaSubmissionItem[];
  };
  speaking: {
    part1Band: number | null;
    part2Band: number | null;
    part3Band: number | null;
    criteriaBreakdown: Array<{
      code: string;
      label: string;
      shortLabel: string;
      averageBand: number | null;
    }>;
    submissions: CriteriaSubmissionItem[];
  };
}

export function StudentQuestionTypesTab({
  analysis,
}: {
  analysis: StudentQuestionTypeAnalysisData;
}) {
  const [activeSkill, setActiveSkill] = useState<
    "READING" | "LISTENING" | "WRITING" | "SPEAKING"
  >("READING");

  const renderObjectiveSkill = (
    skillTitle: string,
    items: QuestionTypeStatItem[]
  ) => {
    const practiced = items.filter((i) => i.totalCount > 0);
    const weakTypes = practiced.filter((i) => (i.accuracyPercent ?? 0) < 55);

    return (
      <div className="space-y-5">
        {weakTypes.length > 0 && (
          <div className="rounded-[var(--rp-radius-md)] border border-[var(--rp-watch-border)] bg-[var(--rp-watch-surface)] p-4 text-xs text-[var(--rp-watch)]">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-4 w-4 text-[var(--rp-watch)]" />
              Các dạng câu hỏi {skillTitle} có độ chính xác thấp (&lt; 55%) cần ưu tiên luyện tập:
            </div>
            <p className="mt-1 text-[var(--rp-text)]">
              {weakTypes
                .map(
                  (w) =>
                    `${w.label} (Đúng ${w.correctCount}/${w.totalCount} câu — ${w.accuracyPercent}%)`
                )
                .join(" • ")}
            </p>
          </div>
        )}

        <ReportHorizontalBars
          title={`Tỷ lệ trả lời đúng theo từng dạng câu hỏi ${skillTitle} (IELTS Academic)`}
          subtitle="Các dạng câu hỏi mới làm dưới 10 câu sẽ gắn nhãn 'Ít dữ liệu' để tham khảo khách quan"
          displayMode="accuracy"
          items={items.map((item) => ({
            id: item.code,
            label: item.label,
            percent: item.accuracyPercent,
            isLowData: item.totalCount > 0 && item.isLowData,
            rightText:
              item.totalCount > 0
                ? `Đúng ${item.correctCount}/${item.totalCount} câu (${item.accuracyPercent}%)`
                : "Chưa làm (0 câu)",
          }))}
        />
      </div>
    );
  };

  const renderSubjectiveSkill = (mode: "WRITING" | "SPEAKING") => {
    const isWriting = mode === "WRITING";
    const criteriaList = isWriting
      ? analysis.writing.criteriaBreakdown
      : analysis.speaking.criteriaBreakdown;
    const submissions = isWriting
      ? analysis.writing.submissions
      : analysis.speaking.submissions;

    return (
      <div className="space-y-5">
        {isWriting ? (
          <div className="rp-kpi-grid sm:grid-cols-3">
            <ReportKpiCard
              label="Overall Writing Band"
              value={
                analysis.writing.overallBand !== null
                  ? `Band ${analysis.writing.overallBand.toFixed(1)} / 9.0`
                  : "Chưa đủ Task 1 & 2"
              }
              subtext="Công thức chuẩn IELTS: (Task 1 + 2 × Task 2) / 3"
              tone="brand"
            />
            <ReportKpiCard
              label="Điểm TB Writing Task 1"
              value={
                analysis.writing.task1Band !== null
                  ? `Band ${analysis.writing.task1Band.toFixed(1)} / 9.0`
                  : "Chưa có điểm"
              }
              subtext="Báo cáo biểu đồ / bản đồ (Trọng số 1/3)"
              tone="good"
            />
            <ReportKpiCard
              label="Điểm TB Writing Task 2"
              value={
                analysis.writing.task2Band !== null
                  ? `Band ${analysis.writing.task2Band.toFixed(1)} / 9.0`
                  : "Chưa có điểm"
              }
              subtext="Bài luận học thuật (Trọng số 2/3)"
              tone="brand"
            />
          </div>
        ) : (
          <div className="rp-kpi-grid sm:grid-cols-3">
            <ReportKpiCard
              label="Speaking Part 1 (Interview)"
              value={
                analysis.speaking.part1Band !== null
                  ? `Band ${analysis.speaking.part1Band.toFixed(1)} / 9.0`
                  : "Chưa có điểm"
              }
              subtext="Trung bình các bài Part 1 đã chấm"
              tone="brand"
            />
            <ReportKpiCard
              label="Speaking Part 2 (Cue Card)"
              value={
                analysis.speaking.part2Band !== null
                  ? `Band ${analysis.speaking.part2Band.toFixed(1)} / 9.0`
                  : "Chưa có điểm"
              }
              subtext="Trung bình các bài Part 2 đã chấm"
              tone="good"
            />
            <ReportKpiCard
              label="Speaking Part 3 (Discussion)"
              value={
                analysis.speaking.part3Band !== null
                  ? `Band ${analysis.speaking.part3Band.toFixed(1)} / 9.0`
                  : "Chưa có điểm"
              }
              subtext="Trung bình các bài Part 3 đã chấm"
              tone="brand"
            />
          </div>
        )}

        <ReportHorizontalBars
          title={`Điểm trung bình 4 tiêu chí chấm ${
            isWriting ? "Writing" : "Speaking"
          } (Thang Band 0.0 – 9.0)`}
          subtitle="Tổng hợp từ điểm thành phần giáo viên chấm ở từng bài nộp"
          displayMode="band"
          items={criteriaList.map((c) => ({
            id: c.code,
            label: c.label,
            percent:
              c.averageBand !== null ? Number(((c.averageBand / 9) * 100).toFixed(1)) : null,
            badgeText: c.shortLabel,
            rightText:
              c.averageBand !== null
                ? `Band ${c.averageBand.toFixed(1)} / 9.0`
                : "Chưa có bài chấm",
          }))}
        />

        <div className="rp-card overflow-hidden">
          <div className="border-b border-[var(--rp-border)] px-5 py-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-[var(--rp-brand)]" />
            <div>
              <h3 className="rp-title">
                Bảng chi tiết điểm 4 tiêu chí &amp; Nhận xét từng bài{" "}
                {isWriting ? "Writing" : "Speaking"}
              </h3>
              <p className="rp-sub">
                Hiển thị điểm thành phần của từng bài đã được giáo viên chấm hoàn tất
              </p>
            </div>
          </div>

          {submissions.length === 0 ? (
            <p className="py-8 text-center text-xs text-[var(--rp-text-muted)]">
              Chưa có bài {isWriting ? "Writing" : "Speaking"} nào được chấm điểm 4 tiêu chí trong kỳ này.
            </p>
          ) : (
            <div className="rp-table-wrap">
              <table className="rp-table">
                <thead>
                  <tr>
                    <th className="text-left">Bài tập</th>
                    <th className="text-center">Phần thi</th>
                    {criteriaList.map((c) => (
                      <th key={c.code} className="text-center">
                        {c.shortLabel}
                      </th>
                    ))}
                    <th className="text-center">Band Tổng</th>
                    <th className="text-left">Nhận xét của Giáo viên</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, idx) => (
                    <tr key={`${sub.submissionId}-${idx}`} className="transition">
                      <td className="font-bold text-[var(--rp-text)]">
                        {sub.assignmentTitle}
                      </td>
                      <td className="text-center text-[var(--rp-text-dim)]">
                        {sub.taskOrPartLabel}
                      </td>
                      {criteriaList.map((c) => (
                        <td
                          key={c.code}
                          className="text-center font-mono font-bold text-[var(--rp-text)]"
                        >
                          {sub.criteriaScores[c.code] !== undefined
                            ? sub.criteriaScores[c.code].toFixed(1)
                            : "—"}
                        </td>
                      ))}
                      <td className="text-center font-bold font-mono text-[var(--rp-brand)]">
                        Band {sub.overallBand.toFixed(1)}
                      </td>
                      <td className="text-[var(--rp-text-dim)] max-w-xs">
                        {sub.feedback || "Không có ghi chú thêm"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="rp-card flex flex-wrap items-center gap-2 p-2">
        <button
          type="button"
          onClick={() => setActiveSkill("READING")}
          className={`inline-flex items-center gap-1.5 rounded-[var(--rp-radius-md)] px-4 py-2 text-xs transition ${
            activeSkill === "READING"
              ? "bg-[var(--rp-brand)] text-white font-bold shadow-sm"
              : "font-semibold text-[var(--rp-text-muted)] hover:text-[var(--rp-text)] hover:bg-[var(--rp-surface-muted)]"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Reading (10 dạng bài)
        </button>
        <button
          type="button"
          onClick={() => setActiveSkill("LISTENING")}
          className={`inline-flex items-center gap-1.5 rounded-[var(--rp-radius-md)] px-4 py-2 text-xs transition ${
            activeSkill === "LISTENING"
              ? "bg-[var(--rp-brand)] text-white font-bold shadow-sm"
              : "font-semibold text-[var(--rp-text-muted)] hover:text-[var(--rp-text)] hover:bg-[var(--rp-surface-muted)]"
          }`}
        >
          <Headphones className="h-3.5 w-3.5" />
          Listening (6 dạng bài)
        </button>
        <button
          type="button"
          onClick={() => setActiveSkill("WRITING")}
          className={`inline-flex items-center gap-1.5 rounded-[var(--rp-radius-md)] px-4 py-2 text-xs transition ${
            activeSkill === "WRITING"
              ? "bg-[var(--rp-brand)] text-white font-bold shadow-sm"
              : "font-semibold text-[var(--rp-text-muted)] hover:text-[var(--rp-text)] hover:bg-[var(--rp-surface-muted)]"
          }`}
        >
          <PenTool className="h-3.5 w-3.5" />
          Writing (4 tiêu chí TA/TR, CC, LR, GRA)
        </button>
        <button
          type="button"
          onClick={() => setActiveSkill("SPEAKING")}
          className={`inline-flex items-center gap-1.5 rounded-[var(--rp-radius-md)] px-4 py-2 text-xs transition ${
            activeSkill === "SPEAKING"
              ? "bg-[var(--rp-brand)] text-white font-bold shadow-sm"
              : "font-semibold text-[var(--rp-text-muted)] hover:text-[var(--rp-text)] hover:bg-[var(--rp-surface-muted)]"
          }`}
        >
          <Mic className="h-3.5 w-3.5" />
          Speaking (4 tiêu chí FC, LR, GRA, P)
        </button>
      </div>

      {activeSkill === "READING" && renderObjectiveSkill("Reading", analysis.reading)}
      {activeSkill === "LISTENING" && renderObjectiveSkill("Listening", analysis.listening)}
      {activeSkill === "WRITING" && renderSubjectiveSkill("WRITING")}
      {activeSkill === "SPEAKING" && renderSubjectiveSkill("SPEAKING")}
    </div>
  );
}
