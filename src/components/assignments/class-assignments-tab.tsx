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
  createMultipleAssignmentsAction,
  deleteAssignmentAction,
  parseIeltsExamAction,
  submitAssignmentAction,
  getSubmissionsForAssignmentAction,
  gradeSubmissionAction,
} from "@/actions/assignments";

interface ClassAssignmentsTabProps {
  classId: string;
  className: string;
  currentUser: {
    id?: string;
    role: string;
    fullName?: string;
  };
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

  // Form State: Bóc tách thông minh 4 bước (Smart Parser)
  const [parserStep, setParserStep] = useState<1 | 2 | 3 | 4>(1);
  const [parserTitle, setParserTitle] = useState("Đề thi IELTS Cambridge 18 - Full Test 01");
  const [parserSkill, setParserSkill] = useState<"READING" | "LISTENING" | "WRITING" | "SPEAKING" | "ALL_SKILLS">("ALL_SKILLS");
  const [parserDuration, setParserDuration] = useState(120);
  const [parserPdfFile, setParserPdfFile] = useState<File | null>(null);
  const [parserPdfText, setParserPdfText] = useState("");
  const [parserExcelFile, setParserExcelFile] = useState<File | null>(null);
  const [parserAudioUrl, setParserAudioUrl] = useState("");
  const [parserAudioFileName, setParserAudioFileName] = useState("");
  const [parserAudioFileSize, setParserAudioFileSize] = useState("");
  const [parsedEbookData, setParsedEbookData] = useState<any | null>(null);
  const [activeEbookSectionId, setActiveEbookSectionId] = useState<string>("reading_1");
  // Quản lý tích chọn câu hỏi và Chốt danh sách câu hỏi trước khi nạp Excel
  const [selectedQuestionNumbers, setSelectedQuestionNumbers] = useState<number[]>([]);
  const [isQuestionsFinalized, setIsQuestionsFinalized] = useState<boolean>(false);

  // State: Làm bài thi dạng Ebook (Student Exam Mode)
  const [examAssignment, setExamAssignment] = useState<any | null>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isExamFinished, setIsExamFinished] = useState(false);
  const [examResult, setExamResult] = useState<any | null>(null);

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

  // Xử lý Xóa bài tập
  const handleDeleteAssignment = (assignmentId: string, title: string) => {
    setConfirmDeleteModal({ isOpen: true, assignmentId, title });
  };

  const executeDeleteAssignment = () => {
    if (!confirmDeleteModal) return;
    const { assignmentId } = confirmDeleteModal;
    setConfirmDeleteModal(null);

    startTransition(async () => {
      const res = await deleteAssignmentAction(assignmentId);
      if (res.success) {
        showAlert("Thành công", "Đã xóa bài tập khỏi lớp học!", "success");
        loadAssignments();
      } else {
        showAlert("Lỗi", res.error || "Xóa bài tập thất bại!", "error");
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

  // Xử lý tải tệp Audio cho Smart Parser
  const handleParserAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.includes("audio") && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      showAlert("Định dạng không hợp lệ", "Vui lòng chọn tệp âm thanh định dạng .mp3, .wav, .m4a hoặc .aac!", "warning");
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setParserAudioUrl(blobUrl);
    setParserAudioFileName(file.name);
    setParserAudioFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
    if (parsedEbookData) {
      setParsedEbookData({ ...parsedEbookData, audioUrl: blobUrl });
    }
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

  // Bóc tách file PDF đề thi IELTS và hiển thị ngay Ebook Viewer 2 cột
  const handlePdfUploadForParser = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParserPdfFile(file);

    // Tự động kích hoạt bóc tách nội dung đề thi ra Ebook ngay tức thì
    startTransition(async () => {
      const formData = new FormData();
      formData.append("title", parserTitle.trim() || file.name.replace(/\.[^/.]+$/, ""));
      formData.append("skill", parserSkill);
      formData.append("durationMinutes", String(parserDuration));
      if (parserAudioUrl) formData.append("audioUrl", parserAudioUrl);

      const res = await parseIeltsExamAction(formData);
      if (res.success && res.parsedData) {
        setParsedEbookData(res.parsedData);
        const allNums = (res.parsedData.questions || []).map((q: any, idx: number) => q.questionNumber || idx + 1);
        setSelectedQuestionNumbers(allNums);
        setIsQuestionsFinalized(false);
        setParserStep(4); // Mở ngay giao diện Ebook 2 Cột theo đúng yêu cầu!
        showAlert(
          "Nhận diện đề thi thành công!",
          `Hệ thống đã trích xuất cấu trúc đề thi thành Ebook 2 cột tương tác (${allNums.length} câu hỏi). Hãy tích chọn các câu hỏi muốn sử dụng và bấm 'Chốt danh sách câu hỏi sử dụng' trước khi nạp file Excel đáp án!`,
          "success"
        );
      } else {
        showAlert("Lỗi bóc tách đề thi", res.error || "Không thể bóc tách đề thi!", "error");
      }
    });
  };

  // Chọn / bỏ chọn 1 câu hỏi
  const handleToggleQuestionSelection = (qNum: number) => {
    if (isQuestionsFinalized) return;
    setSelectedQuestionNumbers((prev) =>
      prev.includes(qNum) ? prev.filter((n) => n !== qNum) : [...prev, qNum]
    );
  };

  // Chọn tất cả câu hỏi
  const handleSelectAllQuestions = () => {
    if (isQuestionsFinalized || !parsedEbookData) return;
    const allNums = (parsedEbookData.questions || []).map((q: any, idx: number) => q.questionNumber || idx + 1);
    setSelectedQuestionNumbers(allNums);
  };

  // Bỏ chọn tất cả câu hỏi
  const handleDeselectAllQuestions = () => {
    if (isQuestionsFinalized) return;
    setSelectedQuestionNumbers([]);
  };

  // Chốt danh sách câu hỏi sử dụng
  const handleFinalizeQuestions = () => {
    if (selectedQuestionNumbers.length === 0) {
      showAlert(
        "Chưa chọn câu hỏi",
        "Vui lòng tích chọn ít nhất 1 câu hỏi mà giáo viên muốn sử dụng trong bài tập!",
        "warning"
      );
      return;
    }
    setIsQuestionsFinalized(true);
    showAlert(
      "Đã chốt danh sách câu hỏi thành công!",
      `Bạn đã chốt sử dụng ${selectedQuestionNumbers.length} câu hỏi. Bây giờ bạn có thể tải file Excel mẫu chuẩn theo đúng ${selectedQuestionNumbers.length} câu này và nạp file Excel đáp án!`,
      "success"
    );
  };

  // Mở khóa chỉnh sửa câu hỏi
  const handleUnlockQuestions = () => {
    setIsQuestionsFinalized(false);
    showAlert(
      "Đã mở khóa câu hỏi",
      "Bạn có thể tiếp tục tích/bỏ chọn hoặc chỉnh sửa các câu hỏi. Sau khi hoàn tất, hãy bấm 'Chốt danh sách câu hỏi sử dụng' lại.",
      "info"
    );
  };

  // Tải file Excel đáp án và TỰ ĐỘNG PLACEHOLDER / ĐIỀN ĐÁP ÁN VÀO TỪNG CÂU HỎI TRONG EBOOK
  // Yêu cầu tối giản: Chỉ cần 2 Cột [Câu số, Đáp án]
  const handleExcelUploadForParser = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isQuestionsFinalized) {
      showAlert(
        "Chưa chốt danh sách câu hỏi",
        "Vui lòng tích chọn câu hỏi và bấm '🔒 Chốt danh sách câu hỏi sử dụng' trước khi nạp file Excel đáp án!",
        "warning"
      );
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;
    setParserExcelFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (rows.length < 2) {
        showAlert("File Excel trống", "File Excel không chứa đủ dòng dữ liệu câu hỏi!", "warning");
        return;
      }

      // Đọc 2 cột chính: [Câu số, Đáp án] (linh hoạt nếu file có nhiều cột thì tìm cột đáp án)
      const excelMap = new Map<number, string>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        const qNum = parseInt(String(row[0]).replace(/\D/g, "")) || i;
        // Đáp án nằm ở cột B (index 1), nếu file cũ nhiều cột thì fallback sang cột D (index 3)
        let qAns = "";
        if (row.length === 2) {
          qAns = String(row[1] ?? "").trim();
        } else if (row.length >= 3) {
          // Nếu có 2 cột dữ liệu chính hoặc nhiều hơn
          qAns = String(row[1] ?? "").trim();
          if (!qAns && row[3]) qAns = String(row[3]).trim();
        }

        if (qAns) {
          excelMap.set(qNum, qAns);
        }
      }

      if (excelMap.size === 0) {
        showAlert("Không tìm thấy đáp án", "Vui lòng đảm bảo cột B chứa đáp án của từng câu hỏi!", "warning");
        return;
      }

      // Placeholder tự động điền vào Ebook đang mở (đồng bộ cả questions và từng section)
      if (parsedEbookData) {
        const updatedQuestions = (parsedEbookData.questions || []).map((q: any, idx: number) => {
          const num = q.questionNumber || idx + 1;
          const ans = excelMap.get(num);
          if (ans !== undefined) {
            let updatedOptions = q.options;
            if (q.options && q.options.length > 0) {
              updatedOptions = q.options.map((opt: any) => ({
                ...opt,
                isCorrect: opt.optionLabel.toUpperCase() === ans.toUpperCase(),
              }));
            }
            return {
              ...q,
              correctAnswer: ans,
              options: updatedOptions,
            };
          }
          return q;
        });

        let updatedSections = parsedEbookData.sections;
        if (parsedEbookData.sections) {
          updatedSections = parsedEbookData.sections.map((sec: any) => ({
            ...sec,
            questions: sec.questions.map((q: any) => {
              const ans = excelMap.get(q.questionNumber);
              if (ans !== undefined) {
                let updatedOptions = q.options;
                if (q.options && q.options.length > 0) {
                  updatedOptions = q.options.map((opt: any) => ({
                    ...opt,
                    isCorrect: opt.optionLabel.toUpperCase() === ans.toUpperCase(),
                  }));
                }
                return {
                  ...q,
                  correctAnswer: ans,
                  options: updatedOptions,
                };
              }
              return q;
            }),
          }));
        }

        setParsedEbookData({
          ...parsedEbookData,
          questions: updatedQuestions,
          sections: updatedSections,
        });

        showAlert(
          "Khớp đáp án thành công!",
          `Đã tự động placeholder và điền đáp án chuẩn cho ${excelMap.size} câu hỏi trong Ebook từ file "${file.name}"!`,
          "success"
        );
      }
    } catch (err: any) {
      showAlert("Lỗi đọc file Excel", "Không thể đọc nội dung file Excel. Vui lòng kiểm tra định dạng tệp .xlsx!", "error");
    }
  };

  // Cập nhật từng trường của câu hỏi trong Ebook (đồng bộ 2 chiều questions & sections)
  const updateEbookQuestionField = (qNum: number, field: string, value: any) => {
    if (!parsedEbookData) return;
    const updatedQuestions = (parsedEbookData.questions || []).map((q: any) => {
      if (q.questionNumber === qNum) {
        return { ...q, [field]: value };
      }
      return q;
    });

    let updatedSections = parsedEbookData.sections;
    if (parsedEbookData.sections) {
      updatedSections = parsedEbookData.sections.map((sec: any) => ({
        ...sec,
        questions: sec.questions.map((q: any) => {
          if (q.questionNumber === qNum) {
            return { ...q, [field]: value };
          }
          return q;
        }),
      }));
    }

    setParsedEbookData({
      ...parsedEbookData,
      questions: updatedQuestions,
      sections: updatedSections,
    });
  };

  // Xóa một câu hỏi khỏi Ebook
  const deleteEbookQuestion = (qNum: number) => {
    if (!parsedEbookData) return;
    const updatedQuestions = (parsedEbookData.questions || []).filter((q: any) => q.questionNumber !== qNum);
    let updatedSections = parsedEbookData.sections;
    if (parsedEbookData.sections) {
      updatedSections = parsedEbookData.sections.map((sec: any) => ({
        ...sec,
        questions: sec.questions.filter((q: any) => q.questionNumber !== qNum),
      }));
    }
    setParsedEbookData({
      ...parsedEbookData,
      questions: updatedQuestions,
      sections: updatedSections,
    });
  };

  // Thêm một câu hỏi mới vào Ebook Section đang mở
  const addEbookQuestionToSection = (sectionId: string, questionType: string = "MULTIPLE_CHOICE") => {
    if (!parsedEbookData) return;
    const newQNum = (parsedEbookData.questions?.length || 0) + 1;
    let initialOptions: any[] = [];
    let initialCorrect = "";
    if (questionType === "MULTIPLE_CHOICE") {
      initialOptions = [
        { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
        { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
        { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
        { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
      ];
      initialCorrect = "A";
    } else if (questionType === "TRUE_FALSE_NG") {
      initialOptions = [
        { optionLabel: "A", content: "TRUE", isCorrect: true },
        { optionLabel: "B", content: "FALSE", isCorrect: false },
        { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
      ];
      initialCorrect = "TRUE";
    }

    const newQuestion = {
      questionNumber: newQNum,
      passageText: "",
      prompt: `Câu hỏi số ${newQNum}:`,
      type: questionType,
      points: 1.0,
      correctAnswer: initialCorrect,
      explanation: "",
      options: initialOptions,
    };

    const updatedQuestions = [...(parsedEbookData.questions || []), newQuestion];
    let updatedSections = parsedEbookData.sections;
    if (parsedEbookData.sections) {
      updatedSections = parsedEbookData.sections.map((sec: any) => {
        if (sec.id === sectionId || sec.key === sectionId || sec.skill === sectionId) {
          return {
            ...sec,
            questions: [...sec.questions, newQuestion],
          };
        }
        return sec;
      });
    }

    setParsedEbookData({
      ...parsedEbookData,
      questions: updatedQuestions,
      sections: updatedSections,
    });
  };

  // Tải file Excel mẫu chuẩn (CHỈ ĐÚNG 2 CỘT: CÂU SỐ & ĐÁP ÁN THEO ĐÚNG CÁC CÂU ĐÃ CHỐT)
  const handleDownloadExcelTemplate = () => {
    if (!isQuestionsFinalized) {
      showAlert(
        "Chưa chốt danh sách câu hỏi",
        "Vui lòng bấm '🔒 Chốt danh sách câu hỏi sử dụng' trước khi tải file Excel mẫu để hệ thống xuất file khớp chính xác các câu bạn đã chọn!",
        "warning"
      );
      return;
    }

    if (!parsedEbookData) return;
    const sortedNums = [...selectedQuestionNumbers].sort((a, b) => a - b);
    if (sortedNums.length === 0) {
      showAlert("Chưa có câu hỏi nào được chọn", "Vui lòng chọn ít nhất 1 câu hỏi để tải file mẫu!", "warning");
      return;
    }

    const templateData: any[] = [["Câu số", "Đáp án"]];
    sortedNums.forEach((num) => {
      const targetQ = (parsedEbookData.questions || []).find((q: any) => q.questionNumber === num);
      templateData.push([num, targetQ?.correctAnswer || "A"]);
    });

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dap_An");
    XLSX.writeFile(wb, `SIMPACE_IELTS_${sortedNums.length}_Cau_Dap_An.xlsx`);
  };

  // Lưu đề thi sau khi Review Ebook (hỗ trợ tự động chia 4 kỹ năng theo các câu đã chốt)
  const handleSaveParsedAssignment = () => {
    if (!parsedEbookData) return;

    if (!isQuestionsFinalized) {
      showAlert(
        "Chưa chốt danh sách câu hỏi",
        "Vui lòng kiểm tra lại các câu hỏi đã chọn và bấm nút '🔒 Chốt danh sách câu hỏi sử dụng' trước khi phát hành bài tập!",
        "warning"
      );
      return;
    }

    if (selectedQuestionNumbers.length === 0) {
      showAlert("Chưa chọn câu hỏi", "Vui lòng chọn ít nhất 1 câu hỏi để phát hành bài tập!", "warning");
      return;
    }

    // RÀNG BUỘC: Nếu có bài Listening, bắt buộc có Audio
    const hasListening =
      parsedEbookData.skill === "LISTENING" ||
      parsedEbookData.skill === "ALL_SKILLS" ||
      parsedEbookData.sections?.some((s: any) => s.skill === "LISTENING");

    if (hasListening && (!parsedEbookData.audioUrl || !parsedEbookData.audioUrl.trim())) {
      showAlert(
        "Thiếu tệp âm thanh nghe",
        "Đề thi có phần Nghe (Listening) bắt buộc phải có tệp Audio MP3. Vui lòng tải file Audio tại cột Ebook trước khi lưu!",
        "warning"
      );
      return;
    }

    startTransition(async () => {
      // TRƯỜNG HỢP 1: ĐỀ THI TỔNG HỢP 4 KỸ NĂNG -> TỰ ĐỘNG TÁCH THÀNH 4 BÀI TẬP RIÊNG BIỆT (CHỈ LẤY CÁC CÂU ĐÃ CHỐT)
      if (parsedEbookData.skill === "ALL_SKILLS" && parsedEbookData.sections) {
        const multipleAssignments = parsedEbookData.sections
          .map((sec: any) => {
            const filteredQuestions = (sec.questions || []).filter((q: any) =>
              selectedQuestionNumbers.includes(q.questionNumber)
            );
            return {
              classId,
              title: sec.title || `${parsedEbookData.title} - ${sec.skill}`,
              description: `Đề thi kỹ năng ${sec.skill} bóc tách từ bộ đề: ${parsedEbookData.title}`,
              skill: sec.skill,
              type: "MOCK_EXAM",
              durationMinutes: sec.durationMinutes || (sec.skill === "READING" ? 60 : sec.skill === "LISTENING" ? 30 : sec.skill === "WRITING" ? 60 : 15),
              audioUrl: sec.audioUrl || (sec.skill === "LISTENING" ? parsedEbookData.audioUrl : null),
              enableProctoring: true,
              maxTabSwitches: 3,
              questions: filteredQuestions,
            };
          })
          .filter((assign: any) => assign.questions.length > 0);

        if (multipleAssignments.length === 0) {
          showAlert("Không có câu hỏi hợp lệ", "Tất cả các phần thi đều không có câu hỏi nào được chọn!", "warning");
          return;
        }

        const res = await createMultipleAssignmentsAction(multipleAssignments);
        if (res.success) {
          setCreateMode(null);
          setParsedEbookData(null);
          setSelectedQuestionNumbers([]);
          setIsQuestionsFinalized(false);
          setParserStep(1);
          loadAssignments();
          showAlert(
            "Phát hành trọn bộ các Kỹ năng thành công!",
            `Hệ thống đã tự động phân tách đề thi thành ${multipleAssignments.length} bài tập riêng biệt với tổng cộng ${selectedQuestionNumbers.length} câu hỏi đã được chốt và giao vào lớp học thành công!`,
            "success"
          );
        } else {
          showAlert("Lỗi phát hành", res.error || "Không thể lưu danh sách bài tập!", "error");
        }
        return;
      }

      // TRƯỜNG HỢP 2: ĐỀ THI 1 KỸ NĂNG ĐƠN LẺ (CHỈ LẤY CÂU ĐÃ CHỐT)
      const filteredQuestions = (parsedEbookData.questions || [])
        .filter((q: any) => selectedQuestionNumbers.includes(q.questionNumber))
        .map((q: any, idx: number) => ({
          questionNumber: q.questionNumber || idx + 1,
          passageText: q.passageText || parsedEbookData.passageText,
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          options: q.options,
        }));

      if (filteredQuestions.length === 0) {
        showAlert("Không có câu hỏi hợp lệ", "Vui lòng chọn ít nhất 1 câu hỏi để phát hành!", "warning");
        return;
      }

      const res = await createAssignmentAction({
        classId,
        title: parsedEbookData.title,
        skill: parsedEbookData.skill,
        type: "HOMEWORK",
        durationMinutes: parsedEbookData.durationMinutes,
        audioUrl: parsedEbookData.audioUrl,
        enableProctoring: true,
        maxTabSwitches: 3,
        questions: filteredQuestions,
      });

      if (res.success) {
        setCreateMode(null);
        setParsedEbookData(null);
        setParserStep(1);
        loadAssignments();
        showAlert("Thành công", `Đã lưu và phát hành bài tập Ebook "${parsedEbookData.title}" thành công!`, "success");
      } else {
        showAlert("Lỗi lưu đề thi", res.error || "Không thể lưu đề thi bóc tách!", "error");
      }
    });
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
  const handleSubmitExam = (forceCheatingCount?: number, reason?: string) => {
    if (!examAssignment) return;

    const answersArray = examAssignment.questions.map((q: any) => ({
      questionId: q.id,
      studentAnswer: studentAnswers[q.id] || "",
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

        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCreateMode("choice")}
              className="h-9 px-4 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="size-4" /> Giao bài tập mới
            </Button>
          </div>
        )}
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
                  <Button
                    size="sm"
                    onClick={() => handleStartExam(item.id)}
                    className="w-full text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5"
                  >
                    <BookOpen className="size-3.5" /> Làm bài tập (Ebook View)
                  </Button>
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

                    <button
                      onClick={() => handleDeleteAssignment(item.id, item.title)}
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
                setParserStep(1);
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
      <Dialog open={createMode === "smart_parser"} onOpenChange={() => setCreateMode(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="size-5 text-[#EA580C]" /> Bóc tách Đề thi IELTS Thông minh (Ebook tương tác 2 cột)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Tải PDF đề thi → Xem Ebook 2 cột → Nạp Excel tự động điền đáp án → Tách 4 kỹ năng tự động.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* NẾU CHƯA CÓ DỮ LIỆU EBOOK: HIỂN THỊ MÀN TẢI FILE ĐỀ THI */}
          {!parsedEbookData ? (
            <div className="space-y-5 py-4">
              <div className="p-4 bg-orange-50/70 rounded-2xl border border-orange-200 flex items-start gap-3">
                <FileText className="size-5 text-[#EA580C] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 space-y-1">
                  <b className="text-slate-900">Bước 1: Tải lên tệp Đề thi PDF (Hỗ trợ Đề thi đơn hoặc Full 4 Kỹ năng)</b>
                  <p>Hệ thống sẽ ngay lập tức mở giao diện Ebook 2 cột tương tác để giáo viên xem trước và cấu hình câu hỏi.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Tên bài thi / Bộ đề IELTS</Label>
                  <Input
                    value={parserTitle}
                    onChange={(e) => setParserTitle(e.target.value)}
                    placeholder="VD: Cambridge IELTS 18 - Full Practice Test 01"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-xs font-bold text-slate-700">Phạm vi bóc tách đề thi</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { val: "ALL_SKILLS", label: "🌟 Full 4 Kỹ năng (Tự động tách 4 bài)" },
                      { val: "READING", label: "Reading (Đọc)" },
                      { val: "LISTENING", label: "Listening (Nghe)" },
                      { val: "WRITING", label: "Writing (Viết)" },
                      { val: "SPEAKING", label: "Speaking (Nói)" },
                    ].map((sk) => (
                      <button
                        key={sk.val}
                        type="button"
                        onClick={() => setParserSkill(sk.val as any)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition text-left ${
                          parserSkill === sk.val
                            ? "border-[#EA580C] bg-orange-50 text-[#EA580C] ring-2 ring-orange-200"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        {sk.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VÙNG CHỌN FILE PDF */}
                <div className="col-span-2 p-8 border-2 border-dashed border-orange-200 hover:border-orange-400 rounded-2xl bg-orange-50/20 text-center transition">
                  <Upload className="size-8 mx-auto text-[#EA580C] mb-2" />
                  <p className="text-sm font-bold text-slate-800">
                    {parserPdfFile ? parserPdfFile.name : "Nhấn để chọn file PDF đề thi IELTS"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Hỗ trợ tệp định dạng .pdf (Tối đa 25MB)</p>
                  <input
                    type="file"
                    accept=".pdf"
                    id="parser-pdf-input"
                    className="hidden"
                    onChange={handlePdfUploadForParser}
                  />
                  <label
                    htmlFor="parser-pdf-input"
                    className="inline-block mt-3 px-4 py-2 text-xs bg-[#EA580C] text-white rounded-xl font-semibold hover:bg-[#C2410C] cursor-pointer transition shadow-sm"
                  >
                    Duyệt tìm tệp PDF & Bóc tách ra Ebook ngay
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* KHI ĐÃ CÓ EBOOK: HIỂN THỊ GIAO DIỆN EBOOK 2 CỘT TƯƠNG TÁC ĐẦY ĐỦ */
            <div className="space-y-4 py-2">
              {/* THANH ĐIỀU KHIỂN & THANH CÔNG CỤ CỦA EBOOK */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#EA580C] text-white text-xs">Ebook 2 Cột</Badge>
                  <span className="text-xs font-bold text-slate-800">{parsedEbookData.title}</span>
                </div>

                {/* Nút nạp File Excel Đáp án & Tải file mẫu - Chỉ kích hoạt sau khi đã Chốt câu hỏi */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isQuestionsFinalized ? (
                    <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 font-medium flex items-center gap-1.5">
                      <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
                      <span>Bước 2: Tích chọn các câu hỏi & bấm <b>Chốt danh sách câu hỏi</b> ở Cột 2 trước khi nạp Excel!</span>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    disabled={!isQuestionsFinalized}
                    className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold flex items-center gap-1 transition shadow-sm ${
                      isQuestionsFinalized
                        ? "bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                        : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-70"
                    }`}
                    title={!isQuestionsFinalized ? "Vui lòng bấm 'Chốt danh sách câu hỏi sử dụng' trước khi tải file mẫu!" : "Tải file mẫu gồm đúng các câu hỏi đã chốt"}
                  >
                    <Download className="size-3" />
                    <span>Tải file Excel mẫu ({isQuestionsFinalized ? `${selectedQuestionNumbers.length} câu` : "Chưa chốt"})</span>
                  </button>

                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    id="ebook-excel-input"
                    className="hidden"
                    disabled={!isQuestionsFinalized}
                    onChange={handleExcelUploadForParser}
                  />
                  <label
                    htmlFor={isQuestionsFinalized ? "ebook-excel-input" : undefined}
                    onClick={() => {
                      if (!isQuestionsFinalized) {
                        showAlert(
                          "Chưa chốt danh sách câu hỏi",
                          "Vui lòng xem lại danh sách câu hỏi bên Cột 2 và bấm nút '🔒 Chốt danh sách câu hỏi sử dụng' trước khi nạp file Excel đáp án!",
                          "warning"
                        );
                      }
                    }}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold flex items-center gap-1.5 transition shadow-sm ${
                      isQuestionsFinalized
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-75"
                    }`}
                  >
                    <FileSpreadsheet className="size-3.5" />
                    <span>Nạp Đáp án Excel (2 Cột)</span>
                  </label>
                </div>
              </div>

              {/* NẾU LÀ ĐỀ TỔNG HỢP: HIỂN THỊ CÁC TAB THEO ĐÚNG TỪNG PHẦN ĐỘC LẬP */}
              {parsedEbookData.sections && (
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Layers className="size-3.5" /> Chọn phần bài tập:
                  </span>
                  {parsedEbookData.sections.map((sec: any) => {
                    const isSelected = activeEbookSectionId === sec.id || (!activeEbookSectionId && sec.id === "reading_1");
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setActiveEbookSectionId(sec.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#EA580C] text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <span>
                          {sec.id === "reading_1" ? "📖 Reading 1: Urban Beekeeping (6 câu)" :
                           sec.id === "reading_2" ? "📖 Reading 2: Teenagers Sleep (6 câu)" :
                           sec.id === "listening_1" ? "🎧 Listening 1: Riverside Club (8 câu)" :
                           sec.id === "writing_1" ? "✍️ Writing 2: Essay (1 câu)" : sec.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* GIAO DIỆN EBOOK 2 CỘT TƯƠNG TÁC */}
              {(() => {
                const currentSec = parsedEbookData.sections
                  ? (parsedEbookData.sections.find((s: any) => s.id === activeEbookSectionId) || parsedEbookData.sections[0])
                  : null;
                const isListeningSec = currentSec ? currentSec.skill === "LISTENING" : parsedEbookData.skill === "LISTENING";
                const questionsToShow = currentSec ? (currentSec.questions || []) : (parsedEbookData.questions || []);

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[60vh]">
                    {/* CỘT TRÁI: ĐỀ BÀI / PASSAGE READING / AUDIO / INSTRUCTIONS */}
                    <div className="border border-slate-200 rounded-2xl p-4 overflow-y-auto bg-slate-50/60 space-y-3 flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <b className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <BookOpen className="size-4 text-[#EA580C]" /> Cột 1: Nội dung Đề bài & Bài đọc (Ebook Passage)
                        </b>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-slate-500">
                          {currentSec ? currentSec.title : "Cho phép sửa trực tiếp"}
                        </span>
                      </div>

                      {/* NẾU LÀ PHẦN LISTENING THÌ HIỂN THỊ THÊM AUDIO PLAYER & TẢI TỆP AUDIO */}
                      {isListeningSec && (
                        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                              <Music className="size-4 text-blue-600" />
                              <span>Tệp Audio Listening Section:</span>
                            </div>
                            <input
                              type="file"
                              accept="audio/*,.mp3,.wav,.m4a"
                              id="ebook-inner-audio"
                              className="hidden"
                              onChange={handleParserAudioUpload}
                            />
                            <label
                              htmlFor="ebook-inner-audio"
                              className="px-2.5 py-1 text-[11px] bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer font-semibold transition"
                            >
                              {parserAudioFileName ? "Đổi tệp Audio khác" : "Chọn tệp Audio MP3..."}
                            </label>
                          </div>

                          {parsedEbookData.audioUrl ? (
                            <div className="space-y-1">
                              <audio controls className="w-full h-8" src={parsedEbookData.audioUrl} />
                              <p className="text-[10px] text-blue-600 font-mono truncate">
                                File âm thanh: {parserAudioFileName || parsedEbookData.audioUrl}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                              ⚠️ Chưa có file Audio cho bài Nghe. Vui lòng bấm nút chọn tệp Audio MP3 ở trên.
                            </p>
                          )}
                        </div>
                      )}

                      <textarea
                        value={currentSec ? currentSec.passageText : parsedEbookData.passageText}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (currentSec && parsedEbookData.sections) {
                            const updatedSections = parsedEbookData.sections.map((s: any) =>
                              s.id === currentSec.id ? { ...s, passageText: val } : s
                            );
                            setParsedEbookData({ ...parsedEbookData, sections: updatedSections });
                          } else {
                            setParsedEbookData({ ...parsedEbookData, passageText: val });
                          }
                        }}
                        className="w-full flex-1 min-h-[300px] text-xs font-serif leading-relaxed p-3.5 bg-white border border-slate-200 rounded-xl resize-none text-slate-800 focus:ring-1 focus:ring-orange-300"
                        placeholder="Nội dung bài đọc / hướng dẫn làm bài..."
                      />
                    </div>

                    {/* CỘT PHẢI: PHIẾU CÂU HỎI & ĐÁP ÁN (CHỈ HIỂN THỊ ĐÚNG CÂU HỎI CỦA PHẦN ĐANG CHỌN) */}
                    <div className="border border-slate-200 rounded-2xl p-4 overflow-y-auto bg-white space-y-3 flex flex-col">
                      {/* Header Cột 2 kèm các nút thêm câu hỏi & Chốt danh sách */}
                      <div className="border-b border-slate-100 pb-3 space-y-2.5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <b className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <FileText className="size-4 text-emerald-600" /> Cột 2: Phiếu câu hỏi & Đáp án chuẩn
                            </b>
                            <span className="text-[11px] text-slate-500">
                              {currentSec ? `${currentSec.title} • ` : ""}
                              Phần này: {questionsToShow.length} câu | Tổng toàn đề: {parsedEbookData.questions?.length || 0} câu
                            </span>
                          </div>

                          {/* Huy hiệu trạng thái chốt */}
                          {isQuestionsFinalized ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold gap-1.5 shadow-sm">
                              <ShieldCheck className="size-3.5" /> Đã chốt {selectedQuestionNumbers.length} câu sử dụng
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[11px] font-semibold gap-1.5">
                              <AlertCircle className="size-3.5 text-amber-600" /> Chưa chốt (Đang chọn {selectedQuestionNumbers.length}/{parsedEbookData.questions?.length || 0} câu)
                            </Badge>
                          )}
                        </div>

                        {/* Thanh thao tác chọn câu hỏi & Nút Chốt câu hỏi sử dụng */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            {!isQuestionsFinalized ? (
                              <>
                                <button
                                  type="button"
                                  onClick={handleSelectAllQuestions}
                                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                                >
                                  Chọn tất cả
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeselectAllQuestions}
                                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition"
                                >
                                  Bỏ chọn
                                </button>
                                <button
                                  type="button"
                                  onClick={handleFinalizeQuestions}
                                  className="px-3 py-1 text-xs bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-lg font-bold flex items-center gap-1 transition shadow-sm"
                                >
                                  <span>🔒 Chốt danh sách câu hỏi sử dụng ({selectedQuestionNumbers.length})</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={handleUnlockQuestions}
                                className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold flex items-center gap-1 transition shadow-sm"
                              >
                                <span>🔓 Mở khóa chỉnh sửa câu hỏi</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => addEbookQuestionToSection(currentSec ? currentSec.id : "reading_1", "MULTIPLE_CHOICE")}
                              className="px-2 py-0.5 text-[10px] bg-orange-50 border border-orange-200 text-[#EA580C] rounded font-semibold hover:bg-orange-100 transition"
                            >
                              + Trắc nghiệm
                            </button>
                            <button
                              type="button"
                              onClick={() => addEbookQuestionToSection(currentSec ? currentSec.id : "reading_1", "FILL_IN_BLANK")}
                              className="px-2 py-0.5 text-[10px] bg-slate-50 border border-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-100 transition"
                            >
                              + Điền từ
                            </button>
                            <button
                              type="button"
                              onClick={() => addEbookQuestionToSection(currentSec ? currentSec.id : "reading_1", "TRUE_FALSE_NG")}
                              className="px-2 py-0.5 text-[10px] bg-slate-50 border border-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-100 transition"
                            >
                              + T/F/NG
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Danh sách câu hỏi của phần hiện tại */}
                      <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                        {questionsToShow.map((q: any, qIdx: number) => {
                          const isSelected = selectedQuestionNumbers.includes(q.questionNumber);
                          return (
                      <div
                        key={q.questionNumber || qIdx}
                        className={`p-3 rounded-xl border transition space-y-2 text-xs ${
                          isSelected
                            ? "border-slate-200 bg-slate-50/70"
                            : "border-dashed border-slate-300 bg-slate-100/60 opacity-60"
                        }`}
                      >
                        {/* Thanh tiêu đề câu hỏi: Checkbox chọn câu, Số câu, Loại câu, Điểm số, Nút xóa */}
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isQuestionsFinalized}
                                onChange={() => handleToggleQuestionSelection(q.questionNumber)}
                                className="size-4 rounded accent-[#EA580C] cursor-pointer"
                              />
                              <span
                                className={`text-[11px] font-bold ${
                                  isSelected ? "text-slate-900" : "text-slate-400 line-through"
                                }`}
                              >
                                {isSelected ? "Dùng câu này" : "Bỏ qua"}
                              </span>
                            </label>

                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[#EA580C]">
                              Câu {q.questionNumber}
                            </span>
                            <select
                              value={q.type}
                              disabled={isQuestionsFinalized}
                              onChange={(e) => updateEbookQuestionField(q.questionNumber, "type", e.target.value)}
                              className="h-6 text-[11px] rounded border border-slate-200 bg-white font-normal px-1 text-slate-700"
                            >
                              <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
                              <option value="TRUE_FALSE_NG">True / False / NG</option>
                              <option value="FILL_IN_BLANK">Điền từ (Blank)</option>
                              <option value="ESSAY">Tự luận Viết</option>
                              <option value="SPEAKING_RECORD">Ghi âm Nói</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="10"
                                value={q.points || 1.0}
                                onChange={(e) => updateEbookQuestionField(q.questionNumber, "points", Number(e.target.value))}
                                className="w-12 h-6 text-center text-xs border border-emerald-300 rounded bg-emerald-50 text-emerald-800 font-bold"
                              />
                              <span className="text-[10px] text-slate-500 font-normal">đ</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteEbookQuestion(q.questionNumber)}
                              className="size-6 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 grid place-items-center transition"
                              title="Xóa câu hỏi này"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Prompt câu hỏi */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-semibold text-slate-500">Đề bài câu hỏi:</Label>
                          <Input
                            value={q.prompt || ""}
                            onChange={(e) => updateEbookQuestionField(q.questionNumber, "prompt", e.target.value)}
                            className="h-7 text-xs bg-white"
                            placeholder="Nhập nội dung câu hỏi..."
                          />
                        </div>

                        {/* Ô đáp án chuẩn theo từng dạng */}
                        {q.type === "MULTIPLE_CHOICE" && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-semibold text-slate-500">Các lựa chọn (Click nút tròn để đặt đáp án đúng):</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {(q.options && q.options.length > 0 ? q.options : [
                                { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
                                { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
                                { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
                                { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
                              ]).map((opt: any, optIdx: number) => (
                                <div
                                  key={optIdx}
                                  className={`p-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-1.5 ${
                                    opt.isCorrect || q.correctAnswer === opt.optionLabel
                                      ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-800"
                                      : "bg-white border-slate-200 text-slate-700"
                                  }`}
                                >
                                  <span className="font-bold shrink-0">{opt.optionLabel}.</span>
                                  <input
                                    type="text"
                                    value={opt.content || ""}
                                    onChange={(e) => {
                                      const newOpts = [...(q.options || [])];
                                      if (newOpts[optIdx]) {
                                        newOpts[optIdx].content = e.target.value;
                                        updateEbookQuestionField(q.questionNumber, "options", newOpts);
                                      }
                                    }}
                                    className="h-5 text-[11px] bg-transparent border-0 focus:ring-0 p-0 flex-1 min-w-0"
                                  />
                                  <input
                                    type="radio"
                                    name={`ebook-correct-${q.questionNumber}`}
                                    checked={opt.isCorrect || q.correctAnswer === opt.optionLabel}
                                    onChange={() => {
                                      const newOpts = (q.options || []).map((o: any, oi: number) => ({
                                        ...o,
                                        isCorrect: oi === optIdx,
                                      }));
                                      updateEbookQuestionField(q.questionNumber, "options", newOpts);
                                      updateEbookQuestionField(q.questionNumber, "correctAnswer", opt.optionLabel);
                                    }}
                                    title="Chọn làm đáp án đúng"
                                    className="size-3.5 accent-emerald-600 shrink-0 cursor-pointer"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {q.type === "TRUE_FALSE_NG" && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-semibold text-slate-500">Chọn đáp án đúng chuẩn IELTS:</span>
                            <div className="flex items-center gap-1.5">
                              {["TRUE", "FALSE", "NOT GIVEN"].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => updateEbookQuestionField(q.questionNumber, "correctAnswer", val)}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                                    q.correctAnswer === val
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
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
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-slate-500">Từ/Cụm từ đáp án chuẩn (Placeholder):</span>
                              <span className="text-[9px] text-slate-400">Tự động điền từ file Excel</span>
                            </div>
                            <Input
                              value={q.correctAnswer || ""}
                              onChange={(e) => updateEbookQuestionField(q.questionNumber, "correctAnswer", e.target.value)}
                              className="h-7 text-xs bg-white font-mono font-bold text-emerald-700"
                              placeholder="Nhập từ đáp án chuẩn..."
                            />
                          </div>
                        )}

                        {(q.type === "ESSAY" || q.type === "SPEAKING_RECORD") && (
                          <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                            ℹ️ Dạng câu hỏi <b>{q.type === "ESSAY" ? "Tự luận Viết (Task 2)" : "Ghi âm Nói"}</b>: Giáo viên sẽ trực tiếp chấm tay theo 4 tiêu chí IELTS.
                          </div>
                        )}

                        {/* Ô Lời giải thích */}
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-semibold text-slate-400">Giải thích chi tiết (Hiển thị sau khi nộp bài):</Label>
                          <Input
                            value={q.explanation || ""}
                            onChange={(e) => updateEbookQuestionField(q.questionNumber, "explanation", e.target.value)}
                            className="h-6 text-[11px] bg-white text-slate-600"
                            placeholder="Giải thích vì sao đáp án này đúng..."
                          />
                        </div>
                      </div>
                          );
                        })}
                      </div>
                    </div>
              </div>
            );
          })()}

              {/* Nút bấm Lưu & Phát hành */}
              <DialogFooter className="flex justify-between items-center pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParsedEbookData(null)}
                  className="text-xs rounded-xl"
                >
                  Tải lại đề thi khác
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveParsedAssignment}
                  disabled={isPending}
                  className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5 shadow-sm px-5"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Sparkles className="size-3.5" />}
                  {parsedEbookData.skill === "ALL_SKILLS"
                    ? "Tự động phân tách & Phát hành trọn bộ 4 Kỹ năng"
                    : "Xác nhận & Lưu bài tập Ebook"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: HỌC SINH LÀM BÀI (EBOOK SPLIT VIEW & CHỐNG GIAN LẬN)
          ======================================================== */}
      {examAssignment && (
        <Dialog open={true} onOpenChange={() => !isExamFinished && setExamAssignment(null)}>
          <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col rounded-2xl p-6 bg-slate-50">
            <DialogHeader className="border-b border-slate-200 pb-3 bg-white p-3 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {examAssignment.title}
                    {renderSkillBadge(examAssignment.skill)}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Thời lượng: {examAssignment.durationMinutes ? `${examAssignment.durationMinutes} phút` : "Tự do"} • Tổng: {examAssignment.questions.length} câu
                  </DialogDescription>
                </div>

                {/* Thanh cảnh báo Giám sát thi */}
                <div className="flex items-center gap-3">
                  {examAssignment.enableProctoring && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-50 border border-orange-200 text-xs font-semibold text-[#EA580C]">
                      <ShieldAlert className="size-3.5" />
                      <span>Rời tab: {tabSwitchCount}/{examAssignment.maxTabSwitches} lần</span>
                    </div>
                  )}

                  {!isExamFinished && (
                    <Button
                      size="sm"
                      onClick={() => handleSubmitExam()}
                      disabled={isPending}
                      className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5"
                    >
                      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      Nộp bài ngay
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>

            {/* Khi đã nộp bài: Hiển thị kết quả */}
            {isExamFinished && examResult ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm my-auto space-y-4 max-w-lg mx-auto">
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
                    {examResult.isCheated ? "Bài làm đã bị thu hồi do vi phạm quy chế!" : "Chúc mừng bạn đã hoàn thành bài tập!"}
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
                  className="text-xs rounded-xl bg-slate-900 text-white px-6"
                >
                  Đóng màn hình làm bài
                </Button>
              </div>
            ) : (
              /* Giao diện Ebook 2 Cột làm bài */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden py-2">
                {/* Cột trái: Đề bài & Audio */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-y-auto space-y-4 shadow-sm">
                  {examAssignment.audioUrl && (
                    <div className="sticky top-0 z-10 p-3 bg-slate-900 text-white rounded-xl shadow-md space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                        <Music className="size-3.5" /> Audio đề thi IELTS Listening
                      </div>
                      <audio controls className="w-full h-8" src={examAssignment.audioUrl} />
                    </div>
                  )}

                  <div className="prose prose-sm max-w-none text-xs text-slate-700 font-serif leading-relaxed">
                    <h4 className="text-sm font-bold text-slate-900 font-sans mb-2">ĐỀ BÀI / PASSAGE READING</h4>
                    <p className="whitespace-pre-line">
                      {examAssignment.questions[0]?.passageText ||
                        "Vui lòng đọc kỹ các câu hỏi bên cột phải và hoàn thành bài tập theo đúng thời lượng quy định."}
                    </p>
                  </div>
                </div>

                {/* Cột phải: Phiếu làm bài */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-y-auto space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <b className="text-xs font-bold text-slate-800">PHIẾU TRẢ LỜI CỦA HỌC VIÊN</b>
                    <span className="text-xs text-slate-400">
                      Đã làm {Object.keys(studentAnswers).length}/{examAssignment.questions.length} câu
                    </span>
                  </div>

                  <div className="space-y-4">
                    {examAssignment.questions.map((q: any, idx: number) => (
                      <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Câu {q.questionNumber || idx + 1}: {q.prompt}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 shrink-0">{q.points}đ</span>
                        </div>

                        {/* Tùy chọn A/B/C/D */}
                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-1.5">
                            {q.options.map((opt: any) => (
                              <label
                                key={opt.id}
                                className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                                  studentAnswers[q.id] === opt.optionLabel
                                    ? "border-[#EA580C] bg-orange-50/80 font-bold text-[#EA580C]"
                                    : "border-slate-200 hover:bg-white text-slate-700"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  checked={studentAnswers[q.id] === opt.optionLabel}
                                  onChange={() =>
                                    setStudentAnswers({ ...studentAnswers, [q.id]: opt.optionLabel })
                                  }
                                  className="accent-[#EA580C]"
                                />
                                <span>{opt.optionLabel}. {opt.content}</span>
                              </label>
                            ))}
                          </div>
                        ) : q.type === "ESSAY" ? (
                          <textarea
                            value={studentAnswers[q.id] || ""}
                            onChange={(e) =>
                              setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })
                            }
                            placeholder="Nhập bài luận của bạn tại đây (Writing Task)..."
                            className="w-full h-32 p-3 text-xs border border-slate-200 rounded-xl bg-white resize-none"
                          />
                        ) : (
                          <Input
                            value={studentAnswers[q.id] || ""}
                            onChange={(e) =>
                              setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })
                            }
                            placeholder="Nhập câu trả lời của bạn..."
                            className="h-8 text-xs bg-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
    </div>
  );
}
