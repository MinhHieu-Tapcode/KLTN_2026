"use client";

import React from "react";
import { renderInlineFormattedText } from "./inline-text-formatter";

interface FormattedPassageViewProps {
  text?: string | null;
  fallbackText?: string;
}



/**
 * Component hiển thị Đề bài / Passage chuẩn định dạng đề thi IELTS (áp dụng tổng quát cho mọi file PDF/Word)
 */
export function FormattedPassageView({
  text,
  fallbackText = "Vui lòng đọc kỹ các câu hỏi bên cột phải và hoàn thành bài tập theo đúng thời lượng quy định.",
}: FormattedPassageViewProps) {
  const [fontSize, setFontSize] = React.useState<"normal" | "large">("normal");
  const cleanSource = (text || "").trim();
  if (!cleanSource) {
    return <p className="text-xs text-slate-500 italic">{fallbackText}</p>;
  }

  // Tách nếu có nhiều phần (ngăn cách bởi đường kẻ ngang)
  const sections = cleanSource.split(/\n*━{5,}\n*/);

  return (
    <div className={`space-y-4 font-serif text-slate-800 ${fontSize === "large" ? "text-[15.5px]" : "text-[13px]"}`}>
      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-tight font-sans">
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">1.1 PASSAGE</span>
          <span>Bài đọc hiểu</span>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 font-sans">
          <button
            type="button"
            onClick={() => setFontSize("normal")}
            className={`px-2 py-0.5 rounded text-xs font-bold transition ${
              fontSize === "normal" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Cỡ chữ chuẩn"
          >
            A
          </button>
          <button
            type="button"
            onClick={() => setFontSize("large")}
            className={`px-2 py-0.5 rounded text-xs font-bold transition ${
              fontSize === "large" ? "bg-white text-[#EA580C] shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-800"
            }`}
            title="Phóng to cỡ chữ"
          >
            A+
          </button>
        </div>
      </div>
      {sections.map((secText, secIdx) => {
        // Dọn dẹp dòng rác: watermark website, link PDF, số trang rác
        const filteredLines: string[] = [];
        const lines = secText
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        for (const line of lines) {
          if (
            /^(?:https?:\s*\/|\/\/[a-z0-9\-\.]+\.[a-z]{2,}|www\.[a-z0-9\-]+|trendinggyan|ieltscuecard)/i.test(line) ||
            /^(?:page\s+\d+|trang\s+\d+|-\s*\d+\s*-|\d+\s*\/\s*\d+)$/i.test(line) ||
            /(?:https?:\s*\/|trendinggyan|ieltscuecard).*page\s*\d+/i.test(line)
          ) {
            continue;
          }
          filteredLines.push(line);
        }

        // Nối các dòng bị ngắt câu giữa chừng (ví dụ: dòng trước kết thúc bằng "whether a vision is" và dòng sau bắt đầu bằng chữ thường)
        const rawLines: string[] = [];
        for (const line of filteredLines) {
          if (
            rawLines.length > 0 &&
            !rawLines[rawLines.length - 1].startsWith("|") &&
            !line.startsWith("|") &&
            !/^[A-Z][.:]|\bParagraph\s+[A-Z]/i.test(line) &&
            !/^(?:part\s+\d|reading\s+passage|section\s+\d|writing\s+task|questions?\s+\d)/i.test(line) &&
            (!/[.?!:"]$/.test(rawLines[rawLines.length - 1]) || /^[a-z]/.test(line))
          ) {
            rawLines[rawLines.length - 1] = `${rawLines[rawLines.length - 1]} ${line}`;
          } else {
            rawLines.push(line);
          }
        }

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
                    className="text-base font-extrabold text-slate-900 font-sans tracking-tight uppercase pb-1.5 mb-2 border-b border-slate-200"
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
                    <span className="inline-flex items-center justify-center size-6 rounded-md bg-slate-100 border border-slate-200 font-sans font-bold text-xs text-slate-900 mr-2 shrink-0 select-none">
                      {label}
                    </span>
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
