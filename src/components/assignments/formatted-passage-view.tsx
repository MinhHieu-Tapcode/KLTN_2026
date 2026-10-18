"use client";

import React from "react";

interface FormattedPassageViewProps {
  text?: string | null;
  fallbackText?: string;
}

/**
 * Render inline formatting:
 * - **bold** -> <strong>
 * - *italic* -> <em>
 * - IELTS uppercase constraints (ONE WORD ONLY, TRUE, FALSE, NOT GIVEN, NO MORE THAN..., etc.) -> <strong>
 * - Blank lines (______) -> highlighted blank badge
 */
function renderInlineFormattedText(raw: string, isInstructionLine = false): React.ReactNode {
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

/**
 * Component hiển thị Đề bài / Passage chuẩn định dạng đề thi IELTS (áp dụng tổng quát cho mọi file PDF/Word)
 */
export function FormattedPassageView({
  text,
  fallbackText = "Vui lòng đọc kỹ các câu hỏi bên cột phải và hoàn thành bài tập theo đúng thời lượng quy định.",
}: FormattedPassageViewProps) {
  const cleanSource = (text || "").trim();
  if (!cleanSource) {
    return <p className="text-xs text-slate-500 italic">{fallbackText}</p>;
  }

  // Tách nếu có nhiều phần (ngăn cách bởi đường kẻ ngang)
  const sections = cleanSource.split(/\n*━{5,}\n*/);

  return (
    <div className="space-y-6 font-serif text-slate-800">
      {sections.map((secText, secIdx) => {
        const rawLines = secText
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        // Gom các dòng bảng | ... | liên tiếp thành 1 khối table
        const blocks: Array<
          | { type: "table"; rows: string[][] }
          | { type: "line"; content: string; index: number }
        > = [];

        let i = 0;
        while (i < rawLines.length) {
          const line = rawLines[i];
          if (line.startsWith("|") && line.endsWith("|")) {
            const tableRows: string[][] = [];
            while (
              i < rawLines.length &&
              rawLines[i].startsWith("|") &&
              rawLines[i].endsWith("|")
            ) {
              const cells = rawLines[i]
                .slice(1, -1)
                .split("|")
                .map((c) => c.trim());
              // Bỏ qua dòng phân cách markdown |---|---|
              if (!cells.every((c) => /^[-:]+$/.test(c))) {
                tableRows.push(cells);
              }
              i++;
            }
            if (tableRows.length > 0) {
              blocks.push({ type: "table", rows: tableRows });
            }
          } else {
            blocks.push({ type: "line", content: line, index: i });
            i++;
          }
        }

        return (
          <div
            key={secIdx}
            className={secIdx > 0 ? "pt-6 border-t-2 border-dashed border-slate-200 space-y-3.5" : "space-y-3.5"}
          >
            {blocks.map((block, bIdx) => {
              // 1. Khối Bảng biểu (Table Completion / Note / Form)
              if (block.type === "table") {
                return (
                  <div
                    key={bIdx}
                    className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm font-sans"
                  >
                    <table className="w-full text-xs text-left border-collapse">
                      <tbody>
                        {block.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={
                              rIdx === 0
                                ? "bg-slate-100/90 font-bold text-slate-900 border-b border-slate-200"
                                : "border-b border-slate-100 odd:bg-white even:bg-slate-50/50"
                            }
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`py-2.5 px-3.5 ${
                                  cIdx === 0 && rIdx > 0 ? "font-semibold text-slate-800 w-1/3" : "text-slate-700"
                                }`}
                              >
                                {renderInlineFormattedText(cell, false)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              const line = block.content;
              const plainLine = line.replace(/\*\*/g, "").replace(/\*/g, "").trim();

              // 2. Tiêu đề Phần thi lớn (Part 1, Reading Passage 1, Section 1, Writing Task 2...)
              const isPartHeader =
                plainLine.length <= 95 &&
                /^(?:part\s+(?:\d+|one|two|three|four|i|ii|iii|iv)|reading\s+passage\s+(?:\d+|one|two|three|i|ii|iii)|passage\s+(?:\d+|one|two|three)|section\s+(?:\d+|one|two|three|four)|listening\s*(?:section|part)?\s*\d*|writing\s+task\s+(?:\d+|one|two)|speaking\s+part\s+(?:\d+|one|two|three))\b/i.test(
                  plainLine
                );

              if (isPartHeader) {
                return (
                  <h3
                    key={bIdx}
                    className="text-lg font-extrabold text-slate-900 font-serif tracking-tight pt-1 pb-1.5 border-b border-slate-200/80"
                  >
                    {plainLine}
                  </h3>
                );
              }

              // 3. Dòng chỉ dẫn / câu hỏi định hướng (Instructions / Rubric / Writing Prompt Question)
              const isInstruction =
                /^(?:you should spend|questions?\s+\d+|write\s+(?:true|yes|one|no\s+more|at\s+least)|choose\s+(?:the\s+correct|one|two|three)|complete\s+the\s+(?:form|notes?|table|sentences?|summary)|do\s+the\s+following\s+statements|give\s+reasons\s+for\s+your\s+answer|to\s+what\s+extent\s+do\s+you|discuss\s+both\s+(?:these\s+)?views|original\s+practice\s+texts)/i.test(
                  plainLine
                );

              if (isInstruction) {
                return (
                  <p
                    key={bIdx}
                    className="text-[13px] leading-relaxed text-slate-700 italic bg-slate-50/80 border-l-3 border-[#EA580C] pl-3 py-1.5 rounded-r-lg font-sans"
                  >
                    {renderInlineFormattedText(line, true)}
                  </p>
                );
              }

              // 4. Dòng Biểu mẫu / Ghi chú điền từ (Form / Note Completion lines có dấu chấm đầu dòng hoặc chỗ trống)
              const isFormFieldLine =
                /^([•\-*]\s*)?[A-Za-z][A-Za-z\s\/()]{1,35}:\s*.+/.test(plainLine) ||
                (/_{3,}/.test(plainLine) && plainLine.length < 120);

              if (isFormFieldLine) {
                const colonIdx = plainLine.indexOf(":");
                if (colonIdx > 0 && colonIdx < 38) {
                  const fieldLabel = plainLine.slice(0, colonIdx).replace(/^[•\-*]\s*/, "").trim();
                  const fieldVal = plainLine.slice(colonIdx + 1).trim();
                  return (
                    <div
                      key={bIdx}
                      className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-2 px-3.5 rounded-xl bg-slate-50 border border-slate-200/80 font-sans text-[13px]"
                    >
                      <span className="font-bold text-slate-800 sm:min-w-[150px] shrink-0">
                        {fieldLabel}:
                      </span>
                      <span className="text-slate-700 font-medium">
                        {renderInlineFormattedText(fieldVal, false)}
                      </span>
                    </div>
                  );
                }
              }

              // 5. Tiêu đề Bài đọc / Chủ đề (Article Title / Subheading: dòng ngắn, không kết thúc bằng dấu chấm câu thường)
              const isSubheading =
                plainLine.length >= 4 &&
                plainLine.length <= 105 &&
                (!/[.;,]$/.test(plainLine) || /\?$/.test(plainLine)) &&
                !/^[A-Z]\s+[A-Z]/.test(plainLine) &&
                (bIdx <= 3 || plainLine === plainLine.toUpperCase() || /\?$/.test(plainLine) || /–|-|:/.test(plainLine));

              if (isSubheading) {
                return (
                  <h4
                    key={bIdx}
                    className="text-[15.5px] font-bold text-slate-900 font-serif leading-snug pt-1"
                  >
                    {renderInlineFormattedText(line, false)}
                  </h4>
                );
              }

              // 6. Đoạn văn có nhãn chữ cái đầu đoạn chuẩn IELTS Reading (A, B, C, D, E... hoặc Paragraph A:)
              const paraLabelMatch =
                plainLine.match(/^([A-Z])(?:\.|\s)\s+([A-Z][\s\S]+)$/) ||
                plainLine.match(/^(Paragraph\s+[A-Z])\s*[:.\-]\s*([\s\S]+)$/i);

              if (paraLabelMatch) {
                const label = paraLabelMatch[1].replace(/^Paragraph\s+/i, "").trim();
                const body = paraLabelMatch[2].trim();
                return (
                  <p
                    key={bIdx}
                    className="text-[13.5px] leading-[1.8] text-slate-700 text-justify"
                  >
                    <strong className="font-sans font-extrabold text-slate-950 text-[14px] mr-1.5">
                      {label}
                    </strong>
                    {renderInlineFormattedText(body, false)}
                  </p>
                );
              }

              // 7. Đoạn văn tiêu chuẩn
              return (
                <p
                  key={bIdx}
                  className="text-[13.5px] leading-[1.8] text-slate-700 text-justify"
                >
                  {renderInlineFormattedText(line, false)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
