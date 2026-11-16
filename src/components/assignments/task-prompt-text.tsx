"use client";

import React from "react";

/**
 * Hiển thị đề bài Writing/Speaking: giữ xuống dòng như đề gốc, in đậm chữ được đánh dấu **...**
 * (bộ đọc đề đánh dấu đúng phần in đậm trên PDF) và tự in đậm các dòng yêu cầu quan trọng.
 */

const TIME_LINE = /^you should spend about\s+\d+\s+minutes?\s+on\s+this\s+task\.?$/i;
const AUTO_BOLD_LINES = [
  /^(?:you should\s+)?write at least\s+\d+\s+words\.?$/i,
  /^write about the following topic:?$/i,
  /^summari[sz]e the information by selecting and reporting the main features.*$/i,
  /^give reasons for your answer and include any relevant examples.*$/i,
];

/** Tách dòng "You should spend about N minutes on this task." ra làm tiêu đề, phần còn lại là đề bài */
export function splitTimeInstruction(prompt: string, fallbackHeader: string): { header: string; body: string } {
  const lines = (prompt || "").split(/\r?\n/);
  let header = "";
  const body: string[] = [];
  for (const line of lines) {
    const plain = line.replace(/\*\*/g, "").trim();
    if (TIME_LINE.test(plain)) {
      if (!header) header = plain;
      continue; // bỏ mọi dòng thời gian lặp lại
    }
    // Nhãn "Task 2 –" / "Writing Task 1:" đứng riêng một dòng đã có ở tiêu đề khung
    if (/^(?:writing\s+)?task\s*[12]\s*[–:\-]?\s*$/i.test(plain)) continue;
    body.push(line);
  }
  return { header: header || fallbackHeader, body: body.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}

/**
 * Gộp passageText và prompt của câu Writing mà không lặp: trước đây hai trường cùng chứa đề bài
 * nên học viên thấy đề 2 lần. Bỏ câu nhắc chung kiểu "Viết bài luận hoàn chỉnh theo đề ở cột bên trái."
 */
export function mergeWritingPrompt(passageText?: string | null, prompt?: string | null): string {
  const norm = (s: string) => s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const p = (passageText || "").trim();
  let q = (prompt || "").trim();
  if (/^(viết bài|ghi âm)/i.test(q)) q = "";
  if (!p) return q;
  if (!q) return p;
  const np = norm(p);
  const nq = norm(q);
  if (np === nq || np.includes(nq)) return p;
  if (nq.includes(np)) return q;
  return `${p}\n\n${q}`;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? (
      <strong key={`${keyPrefix}-${i}`} className="font-bold text-slate-900">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
    )
  );
}

export function TaskPromptText({ text, className = "" }: { text: string; className?: string }) {
  const lines = (text || "").split(/\r?\n/);
  return (
    <div className={`space-y-1.5 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        const autoBold = AUTO_BOLD_LINES.some((re) => re.test(trimmed.replace(/\*\*/g, "")));
        return (
          <p key={idx} className={autoBold ? "font-bold text-slate-900" : undefined}>
            {renderInline(trimmed, String(idx))}
          </p>
        );
      })}
    </div>
  );
}
