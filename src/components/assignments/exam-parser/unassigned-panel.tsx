"use client";

import React, { useState } from "react";
import { FileQuestion, ChevronDown, ChevronUp } from "lucide-react";

/**
 * Nội dung AI thấy trong tệp nhưng không thuộc phần thi đã chọn (vd đề Writing lẫn cuối file Reading).
 * Ẩn header/footer/số trang vì không có giá trị với GV.
 */

const NOISE_KINDS = /^(header|footer|header\/footer|page[_\s-]?number|watermark)$/i;

export function UnassignedPanel({ items }: { items?: Array<{ page: number; kind: string; text: string }> }) {
  const [open, setOpen] = useState(false);
  const useful = (items || []).filter((i) => !NOISE_KINDS.test(i.kind.trim()) && i.text.trim().length > 0);
  if (useful.length === 0) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 font-bold text-blue-900">
        <span className="flex items-center gap-2">
          <FileQuestion className="size-4 text-blue-600" /> Nội dung không thuộc phần thi đã chọn ({useful.length})
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-blue-800">
            Phần dưới đây không được đưa vào bài tập. Nếu cần, hãy bóc tách lại tệp với đúng kỹ năng (ví dụ chọn Writing cho đề Writing).
          </p>
          {useful.map((u, i) => (
            <div key={i} className="rounded-lg border border-blue-100 bg-white p-2">
              <div className="text-[10px] font-semibold uppercase text-blue-700">
                Trang {u.page} · {u.kind.replace(/_/g, " ")}
              </div>
              <div className="mt-1 whitespace-pre-line text-slate-700">{u.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
