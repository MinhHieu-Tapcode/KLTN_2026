"use client";

import React, { useState, useTransition } from "react";
import {
  ManualAssignmentBuilderModal,
  buildDefaultQuestionsForSkill,
} from "@/components/assignments/manual-assignment-builder-modal";
import { createMultipleAssignmentsAction } from "@/actions/assignments";
import { uploadMaterialFileClient } from "@/lib/upload-material-client";
import { validateAssignmentMediaRequirements } from "@/lib/exam-parser/question-media-detector";
import { AnswerVisibilityMode, validateAssignmentConfig } from "@/lib/assignment-config";

interface MultiClassManualBuilderModalProps {
  open: boolean;
  onClose: () => void;
  targetClassIds: string[];
  classes: Array<{ id: string; name: string }>;
  onSuccess: (count: number, targetClassIds?: string[]) => void;
  showAlert?: (title: string, msg: string, type: "success" | "warning" | "error") => void;
}

export function MultiClassManualBuilderModal({
  open,
  onClose,
  targetClassIds,
  classes,
  onSuccess,
  showAlert,
}: MultiClassManualBuilderModalProps) {
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState<"READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS">("READING");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [dueDate, setDueDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [answerVisibility, setAnswerVisibility] = useState<AnswerVisibilityMode>("AFTER_SUBMIT");
  const [answerVisibleAt, setAnswerVisibleAt] = useState("");

  const [audioSourceType, setAudioSourceType] = useState<"file" | "url">("file");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFileName, setAudioFileName] = useState("");
  const [audioFileSize, setAudioFileSize] = useState("");

  const [questions, setQuestions] = useState<any[]>(() => buildDefaultQuestionsForSkill("READING"));

  const targetClassNames = classes
    .filter((c) => targetClassIds.includes(c.id))
    .map((c) => c.name)
    .join(", ");

  const handleSkillChange = (newSkill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS") => {
    setSkill(newSkill);
    setQuestions(buildDefaultQuestionsForSkill(newSkill));
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("audio") && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      showAlert?.("Sai định dạng", "Vui lòng chọn tệp âm thanh hợp lệ (.mp3, .wav, .ogg, .m4a)", "error");
      return;
    }

    try {
      const res = await uploadMaterialFileClient(file);
      if (res.success && res.url) {
        setAudioUrl(res.url);
        setAudioFileName(file.name);
        setAudioFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      } else {
        showAlert?.("Lỗi tải tệp", res.error || "Không thể tải file âm thanh lên máy chủ", "error");
      }
    } catch (err: any) {
      showAlert?.("Lỗi tải tệp", err.message || "Đã xảy ra sự cố khi tải tệp âm thanh", "error");
    }
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_manual_${Date.now()}_${prev.length + 1}`,
        questionNumber: prev.length + 1,
        type: skill === "WRITING" ? "ESSAY" : skill === "SPEAKING" ? "SPEAKING_RECORD" : "MULTIPLE_CHOICE",
        prompt: `Câu hỏi số ${prev.length + 1}`,
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        points: 1,
        passageText: "",
      },
    ]);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx];
    if (!target) return;
    const duplicated = {
      ...target,
      id: `q_dup_${Date.now()}`,
      questionNumber: questions.length + 1,
      prompt: `${target.prompt} (Bản sao)`,
    };
    setQuestions((prev) => [...prev, duplicated]);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      showAlert?.("Không thể xóa", "Bài tập phải có tối thiểu 1 câu hỏi!", "warning");
      return;
    }
    setQuestions((prev) =>
      prev
        .filter((_, i) => i !== idx)
        .map((q, i) => ({ ...q, questionNumber: i + 1 }))
    );
  };

  const handleSave = () => {
    if (targetClassIds.length === 0) {
      showAlert?.("Chưa chọn lớp", "Vui lòng chọn ít nhất 1 lớp học mục tiêu để giao bài!", "warning");
      return;
    }

    if (!title.trim()) {
      showAlert?.("Thiếu tiêu đề bài tập", "Vui lòng nhập tên/tiêu đề cho bài tập!", "warning");
      return;
    }

    const isListening = skill === "LISTENING" || skill === "ALL_SKILLS";
    if (isListening && !audioUrl.trim()) {
      showAlert?.(
        "Thiếu tệp âm thanh",
        "Bài tập có phần Nghe (Listening) bắt buộc phải có tệp Audio MP3 để học viên nghe làm bài!",
        "warning"
      );
      return;
    }

    if (questions.length === 0) {
      showAlert?.("Chưa có câu hỏi", "Vui lòng tạo ít nhất 1 câu hỏi cho bài tập!", "warning");
      return;
    }

    const mediaCheck = validateAssignmentMediaRequirements(
      questions.map((q, i) => ({ ...q, questionNumber: i + 1 })),
      skill
    );
    if (!mediaCheck.valid) {
      const missingNums = mediaCheck.missingRequired.map((m) => `Câu ${m.questionNumber}`).join(", ");
      showAlert?.(
        "Thiếu hình ảnh bắt buộc (Map / Diagram / Biểu đồ)",
        `Các câu hỏi (${missingNums}) thuộc dạng Bản đồ, Sơ đồ hoặc Biểu đồ bắt buộc phải có hình ảnh minh họa để học viên quan sát làm bài!`,
        "error"
      );
      return;
    }

    const valResult = validateAssignmentConfig({
      durationMinutes,
      startDate: startDate || null,
      dueDate: dueDate || null,
      maxAttempts,
      answerVisibility,
      answerVisibleAt: answerVisibleAt || null,
    });
    if (valResult.error) {
      showAlert?.("Lỗi cấu hình bài tập", valResult.error, "error");
      return;
    }

    startTransition(async () => {
      const payload = targetClassIds.map((cId) => ({
        classId: cId,
        title: title.trim(),
        description: `Giao đồng bộ cho các lớp: ${targetClassNames || targetClassIds.join(", ")}`,
        skill,
        type: "HOMEWORK",
        durationMinutes,
        dueDate: dueDate || null,
        startDate: startDate || null,
        maxAttempts: valResult.maxAttempts,
        answerVisibility: valResult.answerVisibility,
        answerVisibleAt: valResult.answerVisibleAt ? valResult.answerVisibleAt.toISOString() : null,
        audioUrl: audioUrl.trim() || null,
        enableProctoring: true,
        maxTabSwitches: 3,
        questions,
      }));

      const res = await createMultipleAssignmentsAction(payload);
      if (res.success) {
        onSuccess(res.count || targetClassIds.length, targetClassIds);
        onClose();
      } else {
        showAlert?.("Lỗi giao bài tập", res.error || "Không thể giao bài tập cho các lớp đã chọn!", "error");
      }
    });
  };

  return (
    <ManualAssignmentBuilderModal
      open={open}
      onClose={onClose}
      isPending={isPending}
      manualTitle={title}
      setManualTitle={setTitle}
      manualSkill={skill}
      setManualSkill={handleSkillChange}
      manualDuration={durationMinutes}
      setManualDuration={setDurationMinutes}
      manualDueDate={dueDate}
      setManualDueDate={setDueDate}
      manualStartDate={startDate}
      setManualStartDate={setStartDate}
      manualMaxAttempts={maxAttempts}
      setManualMaxAttempts={setMaxAttempts}
      manualAnswerVisibility={answerVisibility}
      setManualAnswerVisibility={setAnswerVisibility}
      manualAnswerVisibleAt={answerVisibleAt}
      setManualAnswerVisibleAt={setAnswerVisibleAt}
      manualAudioSourceType={audioSourceType}
      setManualAudioSourceType={setAudioSourceType}
      manualAudioUrl={audioUrl}
      setManualAudioUrl={setAudioUrl}
      manualAudioFileName={audioFileName}
      manualAudioFileSize={audioFileSize}
      onAudioUpload={handleAudioUpload}
      manualQuestions={questions}
      setManualQuestions={setQuestions}
      onAddQuestion={handleAddQuestion}
      onDuplicateQuestion={handleDuplicateQuestion}
      onDeleteQuestion={handleDeleteQuestion}
      onSave={handleSave}
    />
  );
}
