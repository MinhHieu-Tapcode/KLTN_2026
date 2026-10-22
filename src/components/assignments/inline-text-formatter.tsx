import React from "react";

/**
 * Render inline formatting:
 * - **bold** -> <strong>
 * - *italic* -> <em>
 * - IELTS uppercase constraints (ONE WORD ONLY, TRUE, FALSE, NOT GIVEN, NO MORE THAN..., etc.) -> <strong>
 * - Blank lines (______) -> highlighted blank badge
 */
export function renderInlineFormattedText(raw: string, isInstructionLine = false): React.ReactNode {
  // Chuẩn hóa các cụm từ khóa quy định chuẩn của mọi đề IELTS để in đậm tự động
  let processed = raw;
  if (isInstructionLine) {
    processed = processed.replace(
      /\b(ONE WORD AND\/OR A NUMBER|NO MORE THAN (?:ONE|TWO|THREE|FOUR|\d+) WORDS?(?: AND\/OR A NUMBER)?|ONE WORD ONLY|TWO WORDS ONLY|TRUE|FALSE|NOT GIVEN|YES|NO|CHOOSE (?:ONE|TWO|THREE) LETTERS?|A,\s*B,\s*C\s*or\s*D|at least \d+ words)\b/g,
      "**$1**"
    );
  }

  // Tách theo token: **bold**, *italic*, hoặc chỗ trống điền từ (___+)
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*\n]+\*|\(\d{1,2}\)\s*_{2,}|\b\d{1,2}\s*_{3,}|_{3,})/g;
  const parts = processed.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (/_{3,}/.test(part)) {
      const numMatch = part.match(/\d{1,2}/);
      return (
        <span
          key={idx}
          className="inline-flex items-center px-2 py-0.5 mx-0.5 rounded bg-orange-50 border border-orange-200 text-[#EA580C] font-sans font-bold text-xs tracking-wider"
        >
          {numMatch ? `(${numMatch[0]}) ______` : "________"}
        </span>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}
