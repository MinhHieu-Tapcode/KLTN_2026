"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
  FileText,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Music,
  Eye,
  Trash2,
  Edit3,
  Loader2,
  FileSpreadsheet,
  Upload,
  BookOpen,
  Send,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Check,
  AlertCircle,
  X,
  UserCheck,
  Copy,
  Headphones,
  HelpCircle,
  Download,
  Layers,
  Mic,
  PenTool,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

// 7 Dạng câu hỏi IELTS chuẩn quốc tế
export const IELTS_QUESTION_TYPES = [
  { value: "MULTIPLE_CHOICE", label: "Trắc nghiệm 1 đáp án (A, B, C, D)" },
  { value: "MULTIPLE_CHOICE_MULTI", label: "Trắc nghiệm nhiều đáp án (Chọn 2-3 đáp án)" },
  { value: "TRUE_FALSE_NG", label: "True / False / Not Given" },
  { value: "FILL_IN_BLANK", label: "Điền từ vào chỗ trống (Fill in the Blank)" },
  { value: "MATCHING", label: "Nối thông tin / Tiêu đề (Matching Headings)" },
  { value: "ESSAY", label: "Tự luận Viết (Writing Task 1 & 2)" },
  { value: "SPEAKING_RECORD", label: "Ghi âm Nói (Speaking Part 1, 2, 3)" },
];

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

  // Custom Alert & Confirm Modals (thay thế hoàn toàn alert/confirm native)
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

  // Mode chọn cách tạo bài mới: null | "choice" | "manual" | "smart_parser"
  const [createMode, setCreateMode] = useState<null | "choice" | "manual" | "smart_parser">(null);
  const [isTemplatesShowcaseOpen, setIsTemplatesShowcaseOpen] = useState(false);

  // Form State: Tạo bài thủ công (Manual Builder)
  const [manualTitle, setManualTitle] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualSkill, setManualSkill] = useState<"READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS">("READING");
  const [manualType, setManualType] = useState<"HOMEWORK" | "QUIZ" | "MIDTERM" | "MOCK_EXAM">("HOMEWORK");
  const [manualDuration, setManualDuration] = useState<number>(60);
  const [manualDueDate, setManualDueDate] = useState("");
  const [manualAudioUrl, setManualAudioUrl] = useState("");
  const [manualAudioFileName, setManualAudioFileName] = useState("");
  const [manualAudioFileSize, setManualAudioFileSize] = useState("");
  const [manualAudioSourceType, setManualAudioSourceType] = useState<"file" | "url">("file");
  const [manualEnableProctoring, setManualEnableProctoring] = useState(true);
  const [manualMaxTabSwitches, setManualMaxTabSwitches] = useState(3);
  const [manualQuestions, setManualQuestions] = useState<any[]>([
    {
      questionNumber: 1,
      passageText: "Đoạn văn tham chiếu: Architecture has always been an accurate reflection of cultural values...",
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
      passageText: "Lưu ý: Choose TRUE if the statement agrees with the information, FALSE if it contradicts, or NOT GIVEN if there is no information.",
      prompt: "The concept 'form follows function' was championed by Le Corbusier in the early twentieth century.",
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
  const [teacherGradingAnswers, setTeacherGradingAnswers] = useState<Record<string, { points: number; comment: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState("");

  const canManage =
    currentUser.role === "ADMIN" ||
    currentUser.role === "TEACHER" ||
    currentUser.role === "SCHOOL_MANAGER";

  // Tải danh sách bài tập
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

  // Xử lý Xóa bài tập (Hỗ trợ phân tách xóa 1 lớp vs xóa tất cả các lớp)
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

  // Xử lý Chấm lại bài nộp trắc nghiệm theo đáp án mới
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

  // Xử lý tải tệp Audio nghe từ máy tính cho Manual Builder
  const handleManualAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("audio") && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      showAlert("Định dạng không hợp lệ", "Vui lòng chọn tệp âm thanh định dạng .mp3, .wav, .m4a hoặc .aac!", "warning");
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setManualAudioUrl(blobUrl);
    setManualAudioFileName(file.name);
    setManualAudioFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
  };

  // Lưu tạo bài thủ công
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

  // Thêm một câu hỏi mới vào danh sách Manual
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

  // Nhân bản câu hỏi
  const handleDuplicateQuestion = (idx: number) => {
    const target = manualQuestions[idx];
    const duplicated = {
      ...JSON.parse(JSON.stringify(target)),
      questionNumber: manualQuestions.length + 1,
      prompt: `${target.prompt} (Bản sao)`,
    };
    setManualQuestions([...manualQuestions, duplicated]);
  };

  // Xóa câu hỏi
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

  // Mở màn hình làm bài cho học viên
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

  // Giám sát chuyển tab (Anti-cheating / Page Visibility API)
  useEffect(() => {
    if (!examAssignment || isExamFinished || !examAssignment.enableProctoring) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setTabSwitchCount((prev) => {
          const nextCount = prev + 1;
          setShowWarningModal(true);
          if (nextCount > examAssignment.maxTabSwitches) {
            handleAutoSubmit(nextCount, "VIOLATED_TAB_SWITCH_LIMIT");
          }
          return nextCount;
        });
      }
    };

    const handleWindowBlur = () => {
      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        setShowWarningModal(true);
        if (nextCount > examAssignment.maxTabSwitches) {
          handleAutoSubmit(nextCount, "VIOLATED_TAB_SWITCH_LIMIT");
        }
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

  // Nộp bài thi
  const handleSubmitExam = (forceCheatingCount?: number, reason?: string, customAnswers?: Record<string, any>) => {
    if (!examAssignment) return;

    const activeAnswers = customAnswers || studentAnswers;
    const answersArray = examAssignment.questions.map((q: any) => ({
      questionId: q.id,
      studentAnswer: activeAnswers[q.id] || activeAnswers[`q_${q.questionNumber}`] || "",
    }));

    const finalTabCount = forceCheatingCount !== undefined ? forceCheatingCount : tabSwitchCount;
    const isCheated = finalTabCount > examAssignment.maxTabSwitches;

    startTransition(async () => {
      const res = await submitAssignmentAction({
        assignmentId: examAssignment.id,
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

  const handleAutoSubmit = (violationCount: number, reason: string) => {
    handleSubmitExam(violationCount, reason);
  };

  // Mở màn hình chấm bài của giáo viên
  const handleOpenGradingView = async (assignment: any) => {
    setGradingAssignment(assignment);
    setIsLoading(true);
    const res = await getSubmissionsForAssignmentAction(assignment.id);
    if (res.success) {
      setSubmissionsList(res.submissions || []);
      if (res.submissions && res.submissions.length > 0) {
        selectSubmissionForGrading(res.submissions[0]);
      }
    }
    setIsLoading(false);
  };

  const selectSubmissionForGrading = (sub: any) => {
    setSelectedSubmission(sub);
    const initialGrading: Record<string, { points: number; comment: string }> = {};
    (sub.answers || []).forEach((ans: any) => {
      initialGrading[ans.id] = {
        points: ans.awardedPoints || 0,
        comment: ans.teacherComment || "",
      };
    });
    setTeacherGradingAnswers(initialGrading);
    setOverallFeedback(sub.teacherFeedback || "");
  };

  const handleSaveGrading = () => {
    if (!selectedSubmission) return;

    startTransition(async () => {
      const gradedArray = Object.entries(teacherGradingAnswers).map(([ansId, val]) => ({
        answerId: ansId,
        awardedPoints: Number(val.points) || 0,
        teacherComment: val.comment,
      }));

      const res = await gradeSubmissionAction({
        submissionId: selectedSubmission.id,
        gradedAnswers: gradedArray,
        teacherFeedback: overallFeedback,
      });

      if (res.success) {
        showAlert("Đã lưu chấm bài", "Kết quả chấm điểm và nhận xét của giáo viên đã được cập nhật thành công!", "success");
        handleOpenGradingView(gradingAssignment);
      } else {
        showAlert("Lỗi lưu điểm", res.error || "Lưu kết quả chấm bài thất bại!", "error");
      }
    });
  };

  // Badge Kỹ năng
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
      {/* ========================================================
          1. HEADER & THỐNG KÊ NHANH
          ======================================================== */}
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

      {/* Danh sách Thẻ bài tập */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500 gap-2">
          <Loader2 className="size-6 animate-spin text-[#EA580C]" />
          <span className="text-xs font-semibold">Đang tải danh sách bài tập...</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-3">
          <FileText className="size-10 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Chưa có bài tập nào được giao cho lớp này.</p>
          <p className="text-xs text-slate-400">Giáo viên có thể tạo thủ công từng câu hỏi hoặc bóc tách tự động từ file đề thi IELTS.</p>
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
                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 flex items-center gap-1">
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
                    <span>{item.questionCount} câu • {item.totalPoints}đ</span>
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

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {currentUser.role === "STUDENT" ? (
                  item.mySubmission ? (
                    <div className="w-full flex items-center justify-between gap-2">
                      {item.mySubmission.status === "GRADED" ? (
                        <Badge className="bg-emerald-600 text-white text-[11px] font-semibold px-2.5 py-1">
                          Đã có điểm: {item.mySubmission.score ?? 0} / {item.totalPoints}đ
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[11px] px-2 py-0.5 font-medium">
                          <Clock className="size-3 mr-1" /> Đã nộp (Chờ chấm)
                        </Badge>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReviewAssignmentId(item.id)}
                        className="text-xs rounded-xl border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold gap-1 ml-auto"
                      >
                        <Eye className="size-3.5" /> Xem bài & Lời phê
                      </Button>
                    </div>
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

      {/* ========================================================
          MODAL: CHỌN CÁCH GIAO BÀI (MANUAL VS SMART PARSER)
          ======================================================== */}
      <Dialog open={createMode === "choice"} onOpenChange={() => setCreateMode(null)}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Chọn phương thức giao bài tập IELTS
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Hệ thống hỗ trợ soạn thủ công từng câu hỏi hoặc bóc tách thông minh từ file đề thi.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-3">
            <button
              onClick={() => setCreateMode("manual")}
              className="p-4 rounded-2xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-left transition flex items-start gap-3.5 group"
            >
              <div className="size-10 rounded-xl bg-slate-100 group-hover:bg-[#EA580C] group-hover:text-white grid place-items-center text-slate-700 transition">
                <Edit3 className="size-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#EA580C]">
                  1. Soạn bài tập thủ công
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Đầy đủ 7 dạng câu hỏi IELTS, hỗ trợ trường mô tả ngữ cảnh đoạn trích, tải file audio MP3 trực tiếp.
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setCreateMode("smart_parser");
              }}
              className="p-4 rounded-2xl border-2 border-orange-200 bg-orange-50/30 hover:bg-orange-50/80 text-left transition flex items-start gap-3.5 group"
            >
              <div className="size-10 rounded-xl bg-orange-100 group-hover:bg-[#EA580C] group-hover:text-white grid place-items-center text-[#EA580C] transition">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#EA580C]">
                    2. Bóc tách đề thi IELTS thông minh
                  </h4>
                  <Badge className="bg-[#EA580C] text-white text-[10px]">Ebook View</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tải file đề thi PDF → Hiện ngay Ebook 2 cột → Nạp Excel tự động điền đáp án → Tự động tách 4 kỹ năng!
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: TẠO THỦ CÔNG (MANUAL BUILDER) - ĐẦY ĐỦ DẠNG CÂU HỎI & AUDIO UPLOAD
          ======================================================== */}
      <Dialog open={createMode === "manual"} onOpenChange={() => setCreateMode(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="size-5 text-[#EA580C]" /> Soạn bài tập thủ công (Đầy đủ 7 Dạng câu hỏi IELTS)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Thiết lập thông tin bài kiểm tra, đính kèm âm thanh nghe và soạn từng câu hỏi kèm đoạn mô tả ngữ cảnh.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs font-bold text-slate-700">Tiêu đề bài tập <span className="text-rose-500">*</span></Label>
                <Input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="VD: IELTS Reading Mini Test - Academic Module"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Kỹ năng IELTS</Label>
                <select
                  value={manualSkill}
                  onChange={(e) => setManualSkill(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-xl border border-slate-200 px-3 bg-white"
                >
                  <option value="READING">Reading (Đọc)</option>
                  <option value="LISTENING">Listening (Nghe)</option>
                  <option value="WRITING">Writing (Viết)</option>
                  <option value="SPEAKING">Speaking (Nói)</option>
                  <option value="ALL_SKILLS">Tổng hợp 4 kỹ năng</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Thời lượng (phút)</Label>
                <Input
                  type="number"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(Number(e.target.value))}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* KHỐI ĐÍNH KÈM AUDIO NGHE: HỖ TRỢ TẢI FILE TRỰC TIẾP TỪ MÁY */}
              {(manualSkill === "LISTENING" || manualSkill === "ALL_SKILLS") && (
                <div className="col-span-2 p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                      <Music className="size-4 text-blue-600" />
                      <span>Đính kèm tệp Audio Nghe <span className="text-rose-600">* (Bắt buộc với bài Nghe)</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] bg-white p-0.5 rounded-lg border border-blue-200">
                      <button
                        type="button"
                        onClick={() => setManualAudioSourceType("file")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          manualAudioSourceType === "file" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Tải tệp từ máy
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualAudioSourceType("url")}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          manualAudioSourceType === "url" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Dán URL ngoài
                      </button>
                    </div>
                  </div>

                  {manualAudioSourceType === "file" ? (
                    <div className="space-y-2">
                      <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center bg-white hover:bg-blue-50/30 transition">
                        <Upload className="size-6 text-blue-500 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-slate-800">
                          {manualAudioFileName || "Nhấn để chọn tệp âm thanh (.mp3, .wav, .m4a)"}
                        </p>
                        {manualAudioFileSize && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Dung lượng: {manualAudioFileSize}</p>
                        )}
                        <input
                          type="file"
                          accept="audio/*,.mp3,.wav,.m4a"
                          id="manual-audio-input"
                          className="hidden"
                          onChange={handleManualAudioUpload}
                        />
                        <label
                          htmlFor="manual-audio-input"
                          className="inline-block mt-2.5 px-3.5 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100 cursor-pointer transition"
                        >
                          {manualAudioUrl ? "Đổi tệp âm thanh khác" : "Duyệt tìm tệp Audio trên máy..."}
                        </label>
                      </div>
                    </div>
                  ) : (
                    <Input
                      value={manualAudioUrl}
                      onChange={(e) => setManualAudioUrl(e.target.value)}
                      placeholder="Dán link audio (VD: https://domain.com/audio.mp3)"
                      className="h-9 text-xs rounded-xl bg-white border-blue-200 font-mono text-[11px]"
                    />
                  )}

                  {/* Audio Player nghe thử trực tiếp */}
                  {manualAudioUrl && (
                    <div className="p-2.5 bg-slate-900 rounded-xl text-white space-y-1 shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-purple-300">
                        <span className="flex items-center gap-1.5">
                          <Volume2 className="size-3.5" /> Nghe thử tệp âm thanh đã chọn:
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{manualAudioFileName || manualAudioUrl}</span>
                      </div>
                      <audio controls className="w-full h-8" src={manualAudioUrl} />
                    </div>
                  )}
                </div>
              )}

              {/* Cấu hình Giám sát thi */}
              <div className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <b className="text-xs text-slate-800 block">Giám sát chống gian lận (Chuyển tab)</b>
                  <span className="text-[11px] text-slate-500">Cảnh báo và tự động nộp bài khi học viên rời tab làm bài</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Tối đa:</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={manualMaxTabSwitches}
                    onChange={(e) => setManualMaxTabSwitches(Number(e.target.value))}
                    className="w-14 h-8 text-xs text-center border border-slate-200 rounded-lg bg-white"
                  />
                  <span className="text-xs text-slate-500">lần</span>
                </div>
              </div>
            </div>

            {/* DANH SÁCH CÂU HỎI & MÔ TẢ ĐOẠN TRÍCH */}
            <div className="space-y-4 pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-xs font-bold text-slate-900">Danh sách câu hỏi ({manualQuestions.length})</b>
                  <p className="text-[11px] text-slate-500">Mỗi câu hỏi có thể cấu hình đoạn mô tả tham chiếu và dạng bài tương ứng.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddQuestion("MULTIPLE_CHOICE")}
                    className="h-8 text-xs rounded-xl border-orange-200 text-[#EA580C] hover:bg-orange-50 font-semibold gap-1"
                  >
                    <Plus className="size-3.5" /> + Trắc nghiệm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddQuestion("FILL_IN_BLANK")}
                    className="h-8 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-1"
                  >
                    <Plus className="size-3.5" /> + Điền từ
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddQuestion("TRUE_FALSE_NG")}
                    className="h-8 text-xs rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold gap-1"
                  >
                    <Plus className="size-3.5" /> + T/F/NG
                  </Button>
                </div>
              </div>

              {manualQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        Câu {qIdx + 1}
                      </span>
                      {/* Dropdown chọn dạng câu hỏi */}
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setManualQuestions((prev) =>
                            prev.map((item, idx) => (idx === qIdx ? { ...item, type: newType } : item))
                          );
                        }}
                        className="h-7 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 px-2"
                      >
                        {IELTS_QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>Điểm:</span>
                        <input
                          type="number"
                          step="0.5"
                          value={q.points}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setManualQuestions((prev) =>
                              prev.map((item, idx) => (idx === qIdx ? { ...item, points: val } : item))
                            );
                          }}
                          className="w-12 h-7 text-xs text-center border border-slate-200 rounded-md bg-white font-bold"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDuplicateQuestion(qIdx)}
                        className="size-7 grid place-items-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition"
                        title="Nhân bản câu hỏi này"
                      >
                        <Copy className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIdx)}
                        className="size-7 grid place-items-center text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Ô MÔ TẢ ĐOẠN TRÍCH / HƯỚNG DẪN NGỮ CẢNH */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <BookOpen className="size-3 text-slate-400" />
                      Đoạn văn mô tả / Hướng dẫn đề bài (Passage snippet / Instructions)
                    </Label>
                    <textarea
                      value={q.passageText || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualQuestions((prev) =>
                          prev.map((item, idx) => (idx === qIdx ? { ...item, passageText: val } : item))
                        );
                      }}
                      placeholder="VD: Paragraph A: Architecture has always been an accurate reflection... hoặc 'Questions 1-5: Choose NO MORE THAN TWO WORDS'"
                      className="w-full h-14 p-2 text-xs bg-white border border-slate-200 rounded-xl resize-none font-serif text-slate-700 leading-relaxed"
                    />
                  </div>

                  {/* NỘI DUNG CÂU HỎI */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">Nội dung câu hỏi (Question prompt)</Label>
                    <Input
                      value={q.prompt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualQuestions((prev) =>
                          prev.map((item, idx) => (idx === qIdx ? { ...item, prompt: val } : item))
                        );
                      }}
                      placeholder="Nhập nội dung đề bài câu hỏi..."
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* KHỐI ĐÁP ÁN THEO TỪNG DẠNG */}
                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-500">Các lựa chọn đáp án (Chọn 1 nút tròn để đặt làm đáp án đúng):</span>
                      {q.options?.map((opt: any, optIdx: number) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 w-4">{opt.optionLabel}.</span>
                          <Input
                            value={opt.content}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManualQuestions((prev) =>
                                prev.map((item, idx) => {
                                  if (idx !== qIdx) return item;
                                  const newOpts = [...item.options];
                                  newOpts[optIdx].content = val;
                                  return { ...item, options: newOpts };
                                })
                              );
                            }}
                            className="h-7 text-xs bg-white flex-1"
                          />
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={opt.isCorrect}
                            onChange={() => {
                              setManualQuestions((prev) =>
                                prev.map((item, idx) => {
                                  if (idx !== qIdx) return item;
                                  const newOpts = item.options.map((o: any, oi: number) => ({
                                    ...o,
                                    isCorrect: oi === optIdx,
                                  }));
                                  return { ...item, options: newOpts, correctAnswer: opt.optionLabel };
                                })
                              );
                            }}
                            title="Chọn làm đáp án đúng"
                            className="size-4 accent-[#EA580C]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === "TRUE_FALSE_NG" && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-500">Chọn đáp án đúng chuẩn IELTS:</span>
                      <div className="flex items-center gap-2">
                        {["TRUE", "FALSE", "NOT GIVEN"].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              setManualQuestions((prev) =>
                                prev.map((item, idx) => (idx === qIdx ? { ...item, correctAnswer: val } : item))
                              );
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                              q.correctAnswer === val
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type === "FILL_IN_BLANK" && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-[11px] font-semibold text-slate-500">Đáp án chuẩn cần điền (Hỗ trợ từ đồng nghĩa phân tách bằng dấu |):</Label>
                      <Input
                        value={q.correctAnswer || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualQuestions((prev) =>
                            prev.map((item, idx) => (idx === qIdx ? { ...item, correctAnswer: val } : item))
                          );
                        }}
                        placeholder="VD: central library | library"
                        className="h-8 text-xs bg-white font-mono"
                      />
                    </div>
                  )}

                  {(q.type === "ESSAY" || q.type === "SPEAKING_RECORD") && (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                      ℹ️ Dạng câu hỏi <b>{q.type === "ESSAY" ? "Tự luận Viết" : "Ghi âm Nói"}</b>: Giáo viên sẽ trực tiếp chấm tay và nhận xét dựa trên 4 tiêu chí IELTS sau khi học sinh nộp bài.
                    </div>
                  )}

                  {/* GIẢI THÍCH CHI TIẾT */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-500">Lời giải thích chi tiết (Hiển thị cho học viên sau khi nộp bài):</Label>
                    <Input
                      value={q.explanation || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualQuestions((prev) =>
                          prev.map((item, idx) => (idx === qIdx ? { ...item, explanation: val } : item))
                        );
                      }}
                      placeholder="Giải thích vì sao đáp án này đúng dựa trên ngữ cảnh bài đọc/bài nghe..."
                      className="h-7 text-xs bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateMode(null)} className="text-xs rounded-xl">
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveManualAssignment}
              disabled={isPending}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Lưu & Phát hành bài tập
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: BÓC TÁCH THÔNG MINH - HIỆN NGAY EBOOK 2 CỘT & ĐIỀN ĐÁP ÁN EXCEL
          ======================================================== */}
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

      {/* ========================================================
          GIAO DIỆN THI CHUẨN COMPUTER-DELIVERED IELTS & KẾT QUẢ THI
          ======================================================== */}
      {examAssignment && !isExamFinished && (
        <IeltsExamPlayer
          assignment={examAssignment}
          onClose={() => setExamAssignment(null)}
          onSubmit={(answers) => {
            setStudentAnswers(answers);
            handleSubmitExam(undefined, undefined, answers);
          }}
          initialAnswers={studentAnswers}
        />
      )}



      {/* MODAL KẾT QUẢ SAU KHI NỘP BÀI THI */}
      {examAssignment && isExamFinished && examResult && (
        <Dialog open={true} onOpenChange={() => setExamAssignment(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white">
            <div className="p-4 text-center space-y-4">
              {examResult.isCheated ? (
                <div className="size-16 rounded-full bg-rose-100 text-rose-600 grid place-items-center mx-auto">
                  <ShieldAlert className="size-8" />
                </div>
              ) : (
                <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto">
                  <CheckCircle2 className="size-8" />
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {examResult.isCheated ? "Bài làm đã bị thu hồi do vi phạm quy chế!" : "Chúc mừng bạn đã hoàn thành bài thi!"}
                </h3>
                {examResult.isCheated && (
                  <p className="text-xs text-rose-600 mt-1">
                    Lý do: Rời màn hình làm bài {examResult.tabSwitchCount} lần (Vượt mức cho phép).
                  </p>
                )}
                {examResult.score !== null && (
                  <p className="text-2xl font-black text-[#EA580C] mt-2">
                    {examResult.score} / {examResult.totalPoints} điểm
                  </p>
                )}
              </div>

              <Button
                onClick={() => setExamAssignment(null)}
                className="text-xs rounded-xl bg-slate-900 text-white px-6 w-full"
              >
                Đóng màn hình kết quả
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL CẢNH BÁO ĐỎ: RỜI KHỎI TAB THI
          ======================================================== */}
      {showWarningModal && (
        <Dialog open={true} onOpenChange={() => setShowWarningModal(false)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white border-2 border-rose-500">
            <div className="text-center space-y-3">
              <div className="size-14 rounded-full bg-rose-100 text-rose-600 grid place-items-center mx-auto animate-bounce">
                <AlertTriangle className="size-7" />
              </div>
              <h3 className="text-base font-bold text-rose-700">
                CẢNH BÁO RỜI MÀN HÌNH LÀM BÀI!
              </h3>
              <p className="text-xs text-slate-600">
                Hệ thống phát hiện bạn vừa chuyển tab hoặc thu nhỏ trình duyệt.
                <br />
                Số lần vi phạm: <b className="text-rose-600 font-bold">{tabSwitchCount} / {examAssignment?.maxTabSwitches || 3}</b>.
              </p>
              <p className="text-[11px] text-slate-500 bg-rose-50 p-2 rounded-xl">
                Lưu ý: Nếu vi phạm quá số lần cho phép, bài thi sẽ bị <b>tự động thu hồi và khóa làm tiếp</b>!
              </p>
              <Button
                size="sm"
                onClick={() => setShowWarningModal(false)}
                className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
              >
                Tôi đã hiểu và quay lại làm bài
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL: GIÁO VIÊN CHẤM BÀI & GHI NHẬN XÉT
          ======================================================== */}
      {gradingAssignment && (
        <Dialog open={true} onOpenChange={() => setGradingAssignment(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="size-5 text-[#EA580C]" /> Chấm điểm bài tập: {gradingAssignment.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Danh sách bài nộp của học viên • Tự động chấm trắc nghiệm & Chấm tay tự luận
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 py-2">
              {/* Cột Trái: Danh sách bài nộp */}
              <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/50 space-y-2">
                <b className="text-xs font-bold text-slate-800 block px-1">Bài nộp học sinh ({submissionsList.length})</b>
                <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
                  {submissionsList.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => selectSubmissionForGrading(sub)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                        selectedSubmission?.id === sub.id
                          ? "border-[#EA580C] bg-white shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <b className="text-slate-900 truncate">{sub.studentName}</b>
                        <Badge
                          variant="outline"
                          className={sub.status === "GRADED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                        >
                          {sub.status === "GRADED" ? "Đã chấm" : "Chờ chấm"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                        <span>Điểm: <b>{sub.score !== null ? `${sub.score}đ` : "---"}</b></span>
                        {sub.isCheatingFlagged && (
                          <span className="text-rose-600 font-bold flex items-center gap-0.5">
                            <ShieldAlert className="size-3" /> Chuyển tab ({sub.tabSwitchCount})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cột Phải: Chi tiết câu trả lời & Nhập điểm */}
              <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-4 bg-white space-y-4">
                {selectedSubmission ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{selectedSubmission.studentName}</h4>
                        <span className="text-xs text-slate-500">{selectedSubmission.studentEmail}</span>
                      </div>
                      {selectedSubmission.isCheatingFlagged && (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200">
                          ⚠️ Vi phạm rời màn hình {selectedSubmission.tabSwitchCount} lần (Tự động thu bài)
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
                      {selectedSubmission.answers.map((ans: any, idx: number) => (
                        <div key={ans.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-slate-800">
                              Câu {idx + 1}: {ans.prompt}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">Tối đa: {ans.points}đ</span>
                          </div>

                          <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-700">
                            <span className="text-[10px] text-slate-400 block font-semibold">Câu trả lời của học sinh:</span>
                            <p className="mt-0.5 font-medium">{ans.studentAnswer || "(Không trả lời)"}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Điểm chấm</Label>
                              <Input
                                type="number"
                                step="0.5"
                                max={ans.points}
                                value={teacherGradingAnswers[ans.id]?.points ?? ans.awardedPoints ?? 0}
                                onChange={(e) =>
                                  setTeacherGradingAnswers({
                                    ...teacherGradingAnswers,
                                    [ans.id]: {
                                      points: Number(e.target.value),
                                      comment: teacherGradingAnswers[ans.id]?.comment || "",
                                    },
                                  })
                                }
                                className="h-7 text-xs bg-white"
                              />
                            </div>
                            <div>
                              <Label className="text-[11px] font-semibold text-slate-600">Nhận xét câu này</Label>
                              <Input
                                value={teacherGradingAnswers[ans.id]?.comment ?? ans.teacherComment ?? ""}
                                onChange={(e) =>
                                  setTeacherGradingAnswers({
                                    ...teacherGradingAnswers,
                                    [ans.id]: {
                                      points: teacherGradingAnswers[ans.id]?.points || 0,
                                      comment: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Góp ý ngữ pháp, từ vựng..."
                                className="h-7 text-xs bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <Label className="text-xs font-bold text-slate-700">Nhận xét tổng quan của Giáo viên</Label>
                      <textarea
                        value={overallFeedback}
                        onChange={(e) => setOverallFeedback(e.target.value)}
                        placeholder="Nhận xét tổng thể về bài làm của học sinh..."
                        className="w-full h-16 p-2.5 text-xs border border-slate-200 rounded-xl resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={handleSaveGrading}
                        disabled={isPending}
                        className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5"
                      >
                        {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                        Lưu kết quả chấm bài
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Chọn một bài nộp bên trái để bắt đầu chấm điểm.
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL: THÔNG BÁO POPUP CHUYÊN NGHIỆP (THAY THẾ WINDOW.ALERT)
          ======================================================== */}
      {alertModal && (
        <Dialog open={alertModal.isOpen} onOpenChange={() => setAlertModal(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
            <div className="text-center space-y-3.5">
              <div
                className={`size-12 rounded-2xl grid place-items-center mx-auto ${
                  alertModal.type === "error"
                    ? "bg-rose-100 text-rose-600"
                    : alertModal.type === "success"
                    ? "bg-emerald-100 text-emerald-600"
                    : alertModal.type === "info"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-amber-100 text-amber-600"
                }`}
              >
                {alertModal.type === "error" ? (
                  <AlertCircle className="size-6" />
                ) : alertModal.type === "success" ? (
                  <CheckCircle2 className="size-6" />
                ) : alertModal.type === "info" ? (
                  <HelpCircle className="size-6" />
                ) : (
                  <AlertTriangle className="size-6" />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{alertModal.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{alertModal.message}</p>
              </div>

              <Button
                onClick={() => setAlertModal(null)}
                className="w-full text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold h-9"
              >
                Đã hiểu
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL: XÁC NHẬN XÓA BÀI TẬP (THAY THẾ WINDOW.CONFIRM)
          ======================================================== */}
      {confirmDeleteModal && (
        <Dialog open={confirmDeleteModal.isOpen} onOpenChange={() => setConfirmDeleteModal(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
            <div className="text-center space-y-3.5">
              <div className="size-12 rounded-2xl bg-rose-100 text-rose-600 grid place-items-center mx-auto">
                <Trash2 className="size-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa bài tập</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Bạn có chắc muốn xóa bài tập <b className="text-slate-900 font-semibold">"{confirmDeleteModal.title}"</b>?
                  Hệ thống sẽ chuyển trạng thái sang xóa mềm để bảo toàn lịch sử học tập.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmDeleteModal(null)}
                  className="flex-1 text-xs rounded-xl h-9"
                >
                  Hủy bỏ
                </Button>
                <Button
                  onClick={executeDeleteAssignment}
                  disabled={isPending}
                  className="flex-1 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold h-9"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                  Xác nhận xóa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal học sinh xem lại bài làm & lời phê của giáo viên */}
      <StudentSubmissionReviewModal
        open={Boolean(reviewAssignmentId)}
        onOpenChange={(open) => !open && setReviewAssignmentId(null)}
        assignmentId={reviewAssignmentId || ""}
      />
    </div>
  );
}
