"use client";

import { useState, useEffect, useCallback } from "react";
import { ParsedExamResult } from "@/lib/exam-parser/types";

export interface ExamParserDraftData {
  classId: string;
  parserTitle: string;
  parserSkill: string;
  parserDuration: number;
  parsedEbookData: ParsedExamResult;
  selectedQuestionNumbers: number[];
  isQuestionsFinalized: boolean;
  activeEbookSectionId: string;
  savedAt: string;
}

const STORAGE_PREFIX = "SIMPACE_EXAM_DRAFT_";

export function useExamParserDraft(classId: string) {
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [savedTime, setSavedTime] = useState<string | null>(null);

  const storageKey = `${STORAGE_PREFIX}${classId || "global"}`;

  // Kiểm tra xem có bản nháp nào trước đó không
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: ExamParserDraftData = JSON.parse(raw);
        if (parsed && parsed.parsedEbookData && parsed.parsedEbookData.questions?.length > 0) {
          setHasDraft(true);
          setSavedTime(parsed.savedAt ? new Date(parsed.savedAt).toLocaleTimeString("vi-VN") : null);
          return;
        }
      }
    } catch {
      // Bỏ qua nếu dữ liệu JSON hỏng
    }
    setHasDraft(false);
    setSavedTime(null);
  }, [storageKey]);

  // Lưu bản nháp (an toàn, chỉ lưu JSON cấu trúc)
  const saveDraft = useCallback(
    (data: Omit<ExamParserDraftData, "savedAt" | "classId">) => {
      if (typeof window === "undefined" || !data.parsedEbookData) return;
      try {
        const payload: ExamParserDraftData = {
          ...data,
          classId,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setHasDraft(true);
        setSavedTime(new Date().toLocaleTimeString("vi-VN"));
      } catch (err: any) {
        console.warn("[useExamParserDraft] Không thể lưu nháp vào localStorage (có thể vượt dung lượng):", err);
      }
    },
    [classId, storageKey]
  );

  // Đọc lại bản nháp
  const getDraft = useCallback((): ExamParserDraftData | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as ExamParserDraftData;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Xóa bản nháp
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setSavedTime(null);
    } catch {
      // Bỏ qua lỗi xóa
    }
  }, [storageKey]);

  return {
    hasDraft,
    savedTime,
    saveDraft,
    getDraft,
    clearDraft,
  };
}
