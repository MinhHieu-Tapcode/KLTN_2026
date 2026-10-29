"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  FileText,
  Plus,
  Clock,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Trash2,
  Loader2,
  BookOpen,
  Sparkles,
  ArrowLeft,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getClassAssignmentsAction,
  getAssignmentDetailAction,
  createAssignmentAction,
  deleteAssignmentAction,
  regradeAssignmentSubmissionsAction,
  submitAssignmentAction,
  getSubmissionsForAssignmentAction,
  gradeSubmissionAction,
} from "@/actions/assignments";
import { IeltsExamPlayer } from "@/components/assignments/ielts-exam-player";
import { SmartParserModal } from "@/components/assignments/exam-parser";
import { StudentSubmissionReviewModal } from "@/components/assignments/student-submission-review-modal";
import { IeltsTemplatesShowcase } from "@/components/assignments/ielts-templates-showcase";
import {
  IELTS_QUESTION_TYPES,
  ManualAssignmentBuilderModal,
} from "@/components/assignments/manual-assignment-builder-modal";
import {
  TeacherGradingAnswerState,
  TeacherGradingModal,
} from "@/components/assignments/teacher-grading-modal";
import {
  AssignmentAlertModal,
  ConfirmDeleteAssignmentModal,
  ConfirmRegradeAssignmentModal,
  CreateModeChoiceModal,
  ExamResultModal,
  TabSwitchWarningModal,
} from "@/components/assignments/assignment-action-modals";

export { IELTS_QUESTION_TYPES };

interface ClassAssignmentsTabProps {
  classId: string;
  className: string;
  currentUser: {
    id?: string;
    role: string;
    fullName?: string;
  };
  onBack?: () => void;
  mode?: "inside-class" | "inside-global";
}

export function ClassAssignmentsTab({
  classId,
  className,
  currentUser,
  onBack,
  mode = "inside-class",
}: ClassAssignmentsTabProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "warning" | "error" | "success" | "info";
  } | null>(null);

  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    assignmentId: string;
    title: string;
    assignedClassCount?: number;
    assignedClassNames?: string[];
    deleteScope: "CURRENT_CLASS" | "ALL_CLASSES";
  } | null>(null);

  const [regradeModal, setRegradeModal] = useState<{
    isOpen: boolean;
    assignmentId: string;
    title: string;
    submittedCount: number;
  } | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: "warning" | "error" | "success" | "info" = "warning"
  ) => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const [createMode, setCreateMode] = useState<null | "choice" | "manual" | "smart_parser">(null);
  const [isTemplatesShowcaseOpen, setIsTemplatesShowcaseOpen] = useState(false);

  // Form State: Tạo bài thủ công (Manual Builder)
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualSkill, setManualSkill] = useState<
    "READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS"
  >("READING");
  const [manualType] = useState<"HOMEWORK" | "QUIZ" | "MIDTERM" | "MOCK_EXAM">("HOMEWORK");
  const [manualDuration, setManualDuration] = useState<number>(60);
  const [manualDueDate, setManualDueDate] = useState("");
  const [manualStartDate, setManualStartDate] = useState("");
  const [manualAudioUrl, setManualAudioUrl] = useState("");
  const [manualAudioFileName, setManualAudioFileName] = useState("");
  const [manualAudioFileSize, setManualAudioFileSize] = useState("");
  const [manualAudioSourceType, setManualAudioSourceType] = useState<"file" | "url">("file");
  const [manualEnableProctoring] = useState(true);
  const [manualMaxTabSwitches] = useState(3);
  const [manualQuestions, setManualQuestions] = useState<any[]>([
    {
      questionNumber: 1,
      passageText:
        "Đoạn văn tham chiếu: Architecture has always been an accurate reflection of cultural values...",
      prompt: "What is considered an accurate reflection of cultural values in human history?",
      type: "MULTIPLE_CHOICE",
      points: 1.0,
      correctAnswer: "B",
      explanation: "Paragraph A explicitly confirms that architecture reflects cultural values.",
      options: [
        { optionLabel: "A", content: "Contemporary megacities", isCorrect: false },
        { optionLabel: "B", content: "Architecture and built environment", isCorrect: true },
        { optionLabel: "C", content: "Ancient neoclassical ornamentation", isCorrect: false },
        { optionLabel: "D", content: "Industrial plate glass manufacturing", isCorrect: false },
      ],
    },
    {
      questionNumber: 2,
      passageText:
        "Lưu ý: Choose TRUE if the statement agrees with the information, FALSE if it contradicts, or NOT GIVEN if there is no information.",
      prompt:
        "The concept 'form follows function' was championed by Le Corbusier in the early twentieth century.",
      type: "TRUE_FALSE_NG",
      points: 1.0,
      correctAnswer: "TRUE",
      explanation: "Directly stated in paragraph B.",
      options: [
        { optionLabel: "A", content: "TRUE", isCorrect: true },
        { optionLabel: "B", content: "FALSE", isCorrect: false },
        { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
      ],
    },
  ]);

  // State: Làm bài thi dạng Ebook (Student Exam Mode)
  const [examAssignment, setExamAssignment] = useState<any | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isExamFinished, setIsExamFinished] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);
  const [reviewAssignmentId, setReviewAssignmentId] = useState<string | null>(null);

  // State: Giáo viên Chấm bài (Teacher Grading Mode)
  const [gradingAssignment, setGradingAssignment] = useState<any | null>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [teacherGradingAnswers, setTeacherGradingAnswers] = useState<
    Record<string, TeacherGradingAnswerState>
  >({});
  const [overallFeedback, setOverallFeedback] = useState("");

  const canManage =
    currentUser.role === "ADMIN" ||
    currentUser.role === "TEACHER" ||
    currentUser.role === "SCHOOL_MANAGER";

  const loadAssignments = async () => {
    setIsLoading(true);
    const res = await getClassAssignmentsAction(classId);
    if (res.success) {
      setAssignments(res.assignments || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAssignments();
  }, [classId]);

  const handleDeleteAssignment = (assignment: any) => {
    setConfirmDeleteModal({
      isOpen: true,
      assignmentId: assignment.id,
      title: assignment.title,
      assignedClassCount: assignment.assignedClassCount || 1,
      assignedClassNames: assignment.assignedClassNames || [],
      deleteScope: "CURRENT_CLASS",
    });
  };

  const executeDeleteAssignment = () => {
    if (!confirmDeleteModal) return;
    const { assignmentId, deleteScope } = confirmDeleteModal;
    setConfirmDeleteModal(null);

    startTransition(async () => {
      const res = await deleteAssignmentAction(
        assignmentId,
        classId,
        deleteScope === "ALL_CLASSES"
      );
      if (res.success) {
        if (res.deletedFromAll) {
          showAlert("Thành công", "Đã xóa hoàn toàn bài tập ở tất cả các lớp học!", "success");
        } else {
          showAlert(
            "Thành công",
            "Đã gỡ bài tập khỏi lớp học hiện tại (các lớp khác vẫn giữ nguyên bài tập)!",
            "success"
          );
        }
        loadAssignments();
      } else {
        showAlert("Lỗi", res.error || "Xóa bài tập thất bại!", "error");
      }
    });
  };

  const handlePromptRegrade = (item: any) => {
    setRegradeModal({
      isOpen: true,
      assignmentId: item.id,
      title: item.title,
      submittedCount: item.submittedCount || 0,
    });
  };

  const executeRegrade = () => {
    if (!regradeModal) return;
    const { assignmentId } = regradeModal;
    setRegradeModal(null);

    startTransition(async () => {
      const res = await regradeAssignmentSubmissionsAction(assignmentId, classId);
      if (res.success) {
        showAlert("Thành công", res.message || "Đã chấm lại các bài nộp thành công!", "success");
        loadAssignments();
      } else {
        showAlert("Lỗi", res.error || "Chấm lại bài nộp thất bại!", "error");
      }
    });
  };

  const handleManualAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("audio") && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      showAlert(
        "Định dạng không hợp lệ",
        "Vui lòng chọn tệp âm thanh định dạng .mp3, .wav, .m4a hoặc .aac!",
        "warning"
      );
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setManualAudioUrl(blobUrl);
    setManualAudioFileName(file.name);
    setManualAudioFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
  };

  const handleSaveManualAssignment = () => {
    if (!manualTitle.trim()) {
      showAlert("Thiếu tiêu đề bài tập", "Vui lòng nhập tên/tiêu đề cho bài tập!", "warning");
      return;
    }

    const isListening = manualSkill === "LISTENING" || manualSkill === "ALL_SKILLS";
    if (isListening && !manualAudioUrl.trim()) {
      showAlert(
        "Thiếu tệp âm thanh",
        "Bài tập có phần Nghe (Listening) bắt buộc phải tải lên tệp Audio (.mp3, .wav) để học viên nghe làm bài!",
        "warning"
      );
      return;
    }

    if (manualQuestions.length === 0) {
      showAlert("Chưa có câu hỏi", "Vui lòng tạo ít nhất 1 câu hỏi cho bài tập!", "warning");
      return;
    }

    startTransition(async () => {
      const res = await createAssignmentAction({
        classId,
        title: manualTitle.trim(),
        description: manualDesc.trim() || undefined,
        skill: manualSkill,
        type: manualType,
        durationMinutes: manualDuration,
        dueDate: manualDueDate || null,
        startDate: manualStartDate || null,
        audioUrl: manualAudioUrl.trim() || null,
        enableProctoring: manualEnableProctoring,
        maxTabSwitches: manualMaxTabSwitches,
        questions: manualQuestions,
      });

      if (res.success) {
        setCreateMode(null);
        resetManualForm();
        loadAssignments();
        showAlert("Thành công", `Đã lưu và phát hành bài tập "${manualTitle}" thành công!`, "success");
      } else {
        showAlert("Lỗi lưu bài tập", res.error || "Không thể tạo bài tập!", "error");
      }
    });
  };

  const resetManualForm = () => {
    setManualTitle("");
    setManualDesc("");
    setManualSkill("READING");
    setManualDueDate("");
    setManualStartDate("");
    setManualAudioUrl("");
    setManualAudioFileName("");
    setManualAudioFileSize("");
    setManualQuestions([
      {
        questionNumber: 1,
        passageText: "",
        prompt: "Chọn đáp án đúng nhất cho câu sau:",
        type: "MULTIPLE_CHOICE",
        points: 1.0,
        correctAnswer: "A",
        explanation: "",
        options: [
          { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
          { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
          { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
          { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
        ],
      },
    ]);
  };

  const handleAddQuestion = (type: string = "MULTIPLE_CHOICE") => {
    const nextNum = manualQuestions.length + 1;
    let initialOptions: any[] = [];
    let initialCorrect = "";

    if (type === "MULTIPLE_CHOICE") {
      initialOptions = [
        { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
        { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
        { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
        { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
      ];
      initialCorrect = "A";
    } else if (type === "MULTIPLE_CHOICE_MULTI") {
      initialOptions = [
        { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
        { optionLabel: "B", content: "Lựa chọn B", isCorrect: true },
        { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
        { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
        { optionLabel: "E", content: "Lựa chọn E", isCorrect: false },
      ];
      initialCorrect = "A, B";
    } else if (type === "TRUE_FALSE_NG") {
      initialOptions = [
        { optionLabel: "A", content: "TRUE", isCorrect: true },
        { optionLabel: "B", content: "FALSE", isCorrect: false },
        { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
      ];
      initialCorrect = "TRUE";
    }

    setManualQuestions([
      ...manualQuestions,
      {
        questionNumber: nextNum,
        passageText: "",
        prompt: `Câu hỏi số ${nextNum}:`,
        type,
        points: type === "ESSAY" || type === "SPEAKING_RECORD" ? 9.0 : 1.0,
        correctAnswer: initialCorrect,
        explanation: "",
        options: initialOptions,
      },
    ]);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const target = manualQuestions[idx];
    const duplicated = {
      ...JSON.parse(JSON.stringify(target)),
      questionNumber: manualQuestions.length + 1,
      prompt: `${target.prompt} (Bản sao)`,
    };
    setManualQuestions([...manualQuestions, duplicated]);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (manualQuestions.length <= 1) {
      showAlert("Không thể xóa", "Bài tập phải có tối thiểu 1 câu hỏi!", "warning");
      return;
    }
    const updated = manualQuestions
      .filter((_, i) => i !== idx)
      .map((q, i) => ({ ...q, questionNumber: i + 1 }));
    setManualQuestions(updated);
  };

  const handleStartExam = async (assignmentId: string) => {
    setIsLoading(true);
    const res = await getAssignmentDetailAction(assignmentId);
    if (res.success && res.assignment) {
      setExamAssignment(res.assignment);
      setStudentAnswers({});
      setTabSwitchCount(0);
      setIsExamFinished(false);
      setExamResult(null);
    } else {
      showAlert("Lỗi tải bài thi", res.error || "Không thể tải nội dung bài tập!", "error");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (!examAssignment || isExamFinished || !examAssignment.enableProctoring) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setTabSwitchCount((prev) => {
          const nextCount = prev + 1;
          setShowWarningModal(true);
          return nextCount;
        });
      }
    };

    const handleWindowBlur = () => {
      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        setShowWarningModal(true);
        return nextCount;
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [examAssignment, isExamFinished]);

  const handleSubmitExam = (
    forceCheatingCount?: number,
    reason?: string,
    customAnswers?: Record<string, any>
  ) => {
    if (!examAssignment) return;

    const activeAnswers = customAnswers || studentAnswers;
    const answersArray = examAssignment.questions.map((q: any) => {
      const rawVal = activeAnswers[q.id] || activeAnswers[`q_${q.questionNumber}`] || "";
      const isSpeaking = q.type === "SPEAKING_RECORD" || examAssignment.skill === "SPEAKING";
      return {
        questionId: q.id,
        studentAnswer: isSpeaking ? "" : rawVal,
        audioUrl: isSpeaking ? rawVal : undefined,
      };
    });

    const finalTabCount = forceCheatingCount !== undefined ? forceCheatingCount : tabSwitchCount;
    const maxTabs = examAssignment.maxTabSwitches || 3;
    const isCheated = Boolean(finalTabCount > maxTabs || reason === "VIOLATED_TAB_SWITCH_LIMIT");

    startTransition(async () => {
      const res = await submitAssignmentAction({
        assignmentId: examAssignment.id,
        classId,
        answers: answersArray,
        tabSwitchCount: finalTabCount,
        isCheatingFlagged: isCheated,
        autoSubmittedReason: reason || undefined,
      });

      if (res.success) {
        setIsExamFinished(true);
        setExamResult({
          score: res.score,
          totalPoints: res.totalPoints,
          isCheated: res.isCheatingFlagged,
          tabSwitchCount: finalTabCount,
          reason,
        });
        loadAssignments();
      } else {
        showAlert("Lỗi nộp bài", res.error || "Nộp bài thất bại!", "error");
      }
    });
  };

  const handleOpenGradingView = async (assignment: any, preferredNextAfterId?: string) => {
    setGradingAssignment(assignment);
    setIsLoading(true);
    const res = await getSubmissionsForAssignmentAction(assignment.id);
    if (res.success) {
      const list = res.submissions || [];
      setSubmissionsList(list);
      if (list.length > 0) {
        if (preferredNextAfterId) {
          const nextPending = list.find(
            (s: any) => s.id !== preferredNextAfterId && s.status !== "GRADED"
          );
          const currentUpdated = list.find((s: any) => s.id === preferredNextAfterId);
          selectSubmissionForGrading(nextPending || currentUpdated || list[0]);
        } else {
          const firstPending = list.find((s: any) => s.status !== "GRADED");
          selectSubmissionForGrading(firstPending || list[0]);
        }
      }
    }
    setIsLoading(false);
  };

  const selectSubmissionForGrading = (sub: any) => {
    setSelectedSubmission(sub);
    const initialGrading: Record<string, TeacherGradingAnswerState> = {};
    (sub.answers || []).forEach((ans: any) => {
      const critMap: Record<string, number | null> = {};
      const critCommentsMap: Record<string, string> = {};
      if (Array.isArray(ans.criteriaScores)) {
        ans.criteriaScores.forEach((cs: any) => {
          const code = cs?.criterion || cs?.criterionCode;
          const scoreVal = typeof cs?.score === "number" ? cs.score : cs?.bandScore;
          if (code && typeof scoreVal === "number") {
            critMap[code] = scoreVal;
          }
          if (code && cs?.comment) {
            critCommentsMap[code] = cs.comment;
          }
        });
      }
      initialGrading[ans.id] = {
        points: ans.awardedPoints || 0,
        comment: ans.teacherComment || "",
        criteriaScores: critMap,
        criteriaComments: critCommentsMap,
        annotations: ans.gradingAnnotations?.annotations || [],
        speakingTranscript: ans.gradingAnnotations?.speakingTranscript || null,
      };
    });
    setTeacherGradingAnswers(initialGrading);
    setOverallFeedback(sub.teacherFeedback || "");
  };

  const handleSaveGrading = (isDraft: boolean = false) => {
    if (!selectedSubmission) return;

    startTransition(async () => {
      const gradedArray = Object.entries(teacherGradingAnswers).map(([ansId, val]) => {
        const critEntries = Object.entries(val.criteriaScores || {}).filter(
          ([, s]) => typeof s === "number" && Number.isFinite(s)
        ) as Array<[string, number]>;
        return {
          answerId: ansId,
          awardedPoints: Number(val.points) || 0,
          teacherComment: val.comment,
          criteriaScores:
            critEntries.length > 0
              ? critEntries.map(([criterion, score]) => ({
                  criterion,
                  score,
                  comment: val.criteriaComments?.[criterion] || "",
                }))
              : undefined,
          gradingAnnotations: {
            annotations: val.annotations || [],
            speakingTranscript: val.speakingTranscript || null,
          },
        };
      });

      const res = await gradeSubmissionAction({
        submissionId: selectedSubmission.id,
        isDraft,
        gradedAnswers: gradedArray,
        teacherFeedback: overallFeedback,
      });

      if (res.success) {
        showAlert(
          isDraft ? "Đã lưu nháp" : "Đã hoàn tất chấm bài",
          isDraft
            ? "Đã lưu nháp điểm, nhận xét và các ghi chú trên bài làm!"
            : "Kết quả chấm điểm 4 tiêu chí và các ghi chú trên bài đã được lưu thành công!",
          "success"
        );
        handleOpenGradingView(
          gradingAssignment,
          isDraft ? undefined : selectedSubmission.id
        );
      } else {
        showAlert("Lỗi lưu điểm", res.error || "Lưu kết quả chấm bài thất bại!", "error");
      }
    });
  };

  const renderSkillBadge = (skill: string) => {
    switch (skill) {
      case "READING":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Reading (Đọc)</Badge>;
      case "LISTENING":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Listening (Nghe)</Badge>;
      case "WRITING":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">Writing (Viết)</Badge>;
      case "SPEAKING":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Speaking (Nói)</Badge>;
      default:
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200">Full 4 Kỹ năng</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & THỐNG KÊ NHANH */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Quản lý bài tập & Đề thi IELTS ({assignments.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lớp học: <b className="text-slate-800">{className}</b> • Soạn đề 4 kỹ năng & Giám sát chuyển tab chống gian lận
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              size="sm"
              variant="outline"
              onClick={onBack}
              className="h-9 px-3 text-xs rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold gap-1.5 shadow-2xs"
            >
              <ArrowLeft className="size-3.5" /> Quay lại danh sách lớp
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTemplatesShowcaseOpen(true)}
            className="h-9 px-3.5 text-xs rounded-xl border-[#EA580C] text-[#EA580C] bg-orange-50 hover:bg-orange-100 font-bold gap-1.5 shadow-2xs"
          >
            <Sparkles className="size-3.5 text-[#EA580C]" />
            <span>Khuôn Mẫu Giao Diện IELTS (Design System)</span>
          </Button>

          {canManage && (
            <Button
              onClick={() => setCreateMode("choice")}
              className="h-9 px-4 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="size-4" /> Giao bài tập mới
            </Button>
          )}
        </div>
      </div>

      {/* 2. DANH SÁCH THẺ BÀI TẬP */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500 gap-2">
          <Loader2 className="size-6 animate-spin text-[#EA580C]" />
          <span className="text-xs font-semibold">Đang tải danh sách bài tập...</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-3">
          <FileText className="size-10 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Chưa có bài tập nào được giao cho lớp này.</p>
          <p className="text-xs text-slate-400">
            Giáo viên có thể tạo thủ công từng câu hỏi hoặc bóc tách tự động từ file đề thi IELTS.
          </p>
          {canManage && (
            <Button
              onClick={() => setCreateMode("choice")}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5"
            >
              <Plus className="size-3.5" /> Giao bài tập đầu tiên
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-orange-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  {renderSkillBadge(item.skill)}
                  {item.enableProctoring && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 flex items-center gap-1"
                    >
                      <ShieldCheck className="size-3 text-emerald-600" /> Giám sát chuyển tab
                    </Badge>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {item.description || "Luyện đề IELTS chuẩn format bài thi quốc tế."}
                </p>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5 text-slate-400" />
                    <span>{item.durationMinutes ? `${item.durationMinutes} phút` : "Tự do"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-slate-400" />
                    <span>
                      {item.questionCount} câu • {item.totalPoints}đ
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="size-3.5 text-slate-400" />
                    <span>
                      Hạn: {item.dueDate ? new Date(item.dueDate).toLocaleDateString("vi-VN") : "Không có"}
                    </span>
                  </div>
                </div>

                {item.flaggedCount > 0 && (
                  <div className="p-2 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-semibold">
                    <ShieldAlert className="size-4 shrink-0 text-rose-600" />
                    <span>Có {item.flaggedCount} bài vi phạm chuyển tab</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {currentUser.role === "STUDENT" ? (
                  item.mySubmission ? (
                    <div className="w-full flex items-center justify-between gap-2 flex-wrap">
                      {item.mySubmission.status === "GRADED" ? (
                        <Badge className="bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1">
                          Đã chấm: {item.mySubmission.score ?? 0}/{item.totalPoints}đ
                          {item.mySubmission.estimatedBand
                            ? ` (Band ~${item.mySubmission.estimatedBand.toFixed(1)})`
                            : ""}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] px-2 py-0.5 font-medium"
                        >
                          <Clock className="size-3 mr-1" /> Chờ chấm (BR-08)
                        </Badge>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        {!item.isOverdue &&
                          (item.myAttemptCount || 1) < (item.maxAttempts || 2) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartExam(item.id)}
                              className="text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                            >
                              Làm lại (Lần {(item.myAttemptCount || 1) + 1})
                            </Button>
                          )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewAssignmentId(item.id)}
                          className="text-xs rounded-xl border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold gap-1"
                        >
                          <Eye className="size-3.5" /> Xem bài & Lời phê
                        </Button>
                      </div>
                    </div>
                  ) : item.isOverdue ? (
                    <Button
                      size="sm"
                      disabled
                      className="w-full text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-semibold gap-1.5 opacity-90 cursor-not-allowed"
                    >
                      <Clock className="size-3.5" /> Đã quá hạn nộp bài (Khóa nộp - BR-05)
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleStartExam(item.id)}
                      className="w-full text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5"
                    >
                      <BookOpen className="size-3.5" /> Làm bài tập (Ebook View)
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenGradingView(item)}
                      className="text-xs rounded-xl border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold gap-1.5 flex-1"
                    >
                      <UserCheck className="size-3.5" /> Chấm bài ({item.submittedCount})
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartExam(item.id)}
                      className="text-xs rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold"
                      title="Xem trước giao diện làm bài của học sinh"
                    >
                      <Eye className="size-3.5" />
                    </Button>

                    {item.submittedCount > 0 && (
                      <button
                        onClick={() => handlePromptRegrade(item)}
                        className="size-8 grid place-items-center text-slate-400 hover:text-[#EA580C] rounded-xl hover:bg-orange-50 transition"
                        title="Tự động chấm lại toàn bộ bài nộp trắc nghiệm theo đáp án mới nhất"
                      >
                        <RefreshCw className="size-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteAssignment(item)}
                      className="size-8 grid place-items-center text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                      title="Xóa bài tập"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. MODALS TẠO ĐỀ, LÀM BÀI, CHẤM BÀI & THÔNG BÁO */}
      <CreateModeChoiceModal
        open={createMode === "choice"}
        onClose={() => setCreateMode(null)}
        onSelectMode={(nextMode) => setCreateMode(nextMode)}
      />

      <ManualAssignmentBuilderModal
        open={createMode === "manual"}
        onClose={() => setCreateMode(null)}
        isPending={isPending}
        manualTitle={manualTitle}
        setManualTitle={setManualTitle}
        manualSkill={manualSkill}
        setManualSkill={setManualSkill}
        manualDuration={manualDuration}
        setManualDuration={setManualDuration}
        manualDueDate={manualDueDate}
        setManualDueDate={setManualDueDate}
        manualStartDate={manualStartDate}
        setManualStartDate={setManualStartDate}
        manualAudioSourceType={manualAudioSourceType}
        setManualAudioSourceType={setManualAudioSourceType}
        manualAudioUrl={manualAudioUrl}
        setManualAudioUrl={setManualAudioUrl}
        manualAudioFileName={manualAudioFileName}
        manualAudioFileSize={manualAudioFileSize}
        onAudioUpload={handleManualAudioUpload}
        manualQuestions={manualQuestions}
        setManualQuestions={setManualQuestions}
        onAddQuestion={handleAddQuestion}
        onDuplicateQuestion={handleDuplicateQuestion}
        onDeleteQuestion={handleDeleteQuestion}
        onSave={handleSaveManualAssignment}
      />

      <SmartParserModal
        open={createMode === "smart_parser"}
        onOpenChange={(isOpen) => setCreateMode(isOpen ? "smart_parser" : null)}
        classId={classId}
        showAlert={showAlert}
        onSuccess={(msg) => {
          loadAssignments();
          showAlert("Thành công", msg, "success");
        }}
      />

      {examAssignment && !isExamFinished && (
        <IeltsExamPlayer
          assignment={examAssignment}
          onClose={() => setExamAssignment(null)}
          onSubmit={(answers, meta) => {
            setStudentAnswers(answers);
            handleSubmitExam(meta?.tabSwitchCount, meta?.autoSubmittedReason, answers);
          }}
          initialAnswers={studentAnswers}
        />
      )}

      {examAssignment && isExamFinished && examResult && (
        <ExamResultModal examResult={examResult} onClose={() => setExamAssignment(null)} />
      )}

      <TabSwitchWarningModal
        open={showWarningModal}
        tabSwitchCount={tabSwitchCount}
        onClose={() => setShowWarningModal(false)}
      />

      <TeacherGradingModal
        gradingAssignment={gradingAssignment}
        onClose={() => setGradingAssignment(null)}
        submissionsList={submissionsList}
        selectedSubmission={selectedSubmission}
        onSelectSubmission={selectSubmissionForGrading}
        teacherGradingAnswers={teacherGradingAnswers}
        setTeacherGradingAnswers={setTeacherGradingAnswers}
        overallFeedback={overallFeedback}
        setOverallFeedback={setOverallFeedback}
        isPending={isPending}
        onSaveGrading={handleSaveGrading}
      />

      <AssignmentAlertModal alertModal={alertModal} onClose={() => setAlertModal(null)} />

      <ConfirmDeleteAssignmentModal
        confirmDeleteModal={confirmDeleteModal}
        isPending={isPending}
        onClose={() => setConfirmDeleteModal(null)}
        onConfirm={executeDeleteAssignment}
      />

      <ConfirmRegradeAssignmentModal
        regradeModal={regradeModal}
        isPending={isPending}
        onClose={() => setRegradeModal(null)}
        onConfirm={executeRegrade}
      />

      <IeltsTemplatesShowcase
        isOpen={isTemplatesShowcaseOpen}
        onClose={() => setIsTemplatesShowcaseOpen(false)}
      />

      <StudentSubmissionReviewModal
        open={Boolean(reviewAssignmentId)}
        onOpenChange={(open) => !open && setReviewAssignmentId(null)}
        assignmentId={reviewAssignmentId || ""}
      />
    </div>
  );
}
