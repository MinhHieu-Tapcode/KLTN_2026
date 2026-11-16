"use client";

import { useCallback, useState } from "react";
import { ParsedExamResult } from "@/lib/exam-parser/types";
import { cropFigureAndUpload } from "@/lib/exam-parser/pdf-crop-client";
import { applyImageToGroup, listParsedGroups } from "@/lib/exam-parser/parsed-groups";

/**
 * Sau khi bóc tách bằng Claude: tự cắt ảnh đề gốc cho các nhóm cần ảnh
 * (nhóm dạng ảnh, Map/Diagram, Writing Task 1 có biểu đồ) và gán vào câu hỏi.
 * Không ghi đè ảnh GV đã gắn. Không ghi CSDL (chỉ tải ảnh lên /api/materials/upload).
 */

type SetData = (updater: (prev: any) => any) => void;
type ShowAlert = (title: string, desc: string, type?: "success" | "error" | "warning" | "info") => void;

export interface AutoCropStatus {
  running: boolean;
  done: number;
  total: number;
}

export function useAutoFigureCrop(setParsedEbookData: SetData, showAlert: ShowAlert) {
  const [status, setStatus] = useState<AutoCropStatus>({ running: false, done: 0, total: 0 });

  const runAutoCrop = useCallback(
    async (data: ParsedExamResult, pdfFile: File | null) => {
      if (!pdfFile || !pdfFile.name.toLowerCase().endsWith(".pdf")) return;
      const sectionIds = data.sections && data.sections.length > 0 ? data.sections.map((s) => s.id) : [undefined];
      const targets = sectionIds
        .flatMap((id) => listParsedGroups(data, id))
        .filter((g) => g.needsImage && !g.imageUrl && g.figurePage && g.figureBox);
      if (targets.length === 0) return;

      setStatus({ running: true, done: 0, total: targets.length });
      let failed = 0;
      let notPersisted = 0;
      for (let i = 0; i < targets.length; i++) {
        const g = targets[i];
        try {
          const res = await cropFigureAndUpload(pdfFile, g.figurePage!, g.figureBox!, `${g.sectionKey || "de"}_${g.title}`);
          if (!res.persisted) notPersisted++;
          setParsedEbookData((prev) => (prev ? applyImageToGroup(prev, g.sectionKey, g.numbers, res.url) : prev));
        } catch (err) {
          failed++;
          console.warn("[useAutoFigureCrop] Không cắt được ảnh nhóm", g.title, err);
        }
        setStatus({ running: i < targets.length - 1, done: i + 1, total: targets.length });
      }

      if (failed > 0) {
        showAlert(
          "Chưa tự cắt được một số ảnh",
          `Không tự cắt được ảnh cho ${failed}/${targets.length} nhóm câu. Vui lòng dùng nút "Chỉnh vùng ảnh" hoặc tải ảnh thủ công cho các nhóm này.`,
          "warning"
        );
      } else if (notPersisted > 0) {
        showAlert(
          "Ảnh chỉ lưu tạm",
          "Máy chủ chưa nhận tệp ảnh nên ảnh đang là bản tạm của trình duyệt và sẽ mất khi tải lại trang. Hãy thử lại trước khi phát hành.",
          "warning"
        );
      }
    },
    [setParsedEbookData, showAlert]
  );

  return { autoCropStatus: status, runAutoCrop };
}
