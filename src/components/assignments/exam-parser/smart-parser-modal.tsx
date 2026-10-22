"use client";

import React, { useState, useTransition, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles,
  FileText,
  Upload,
  Download,
  Eye,
  AlertCircle,
  Loader2,
  Layers,
  History,
  Trash2,
} from "lucide-react";
import {
  parseIeltsExamAction,
  createAssignmentAction,
  createMultipleAssignmentsAction,
} from "@/actions/assignments";
import { extractTextFromScannedPdfClient } from "@/lib/exam-parser/client-ocr";
import { ExcelAnswerImporter } from "@/components/assignments/excel-answer-importer";
import { InvariantsBanner } from "@/components/assignments/invariants-banner";
import { IeltsExamPlayer } from "@/components/assignments/ielts-exam-player";
import { EbookTwoColumnViewer } from "./ebook-two-column-viewer";
import { useExamParserDraft } from "./hooks/use-exam-parser-draft";

export interface SmartParserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  onSuccess: (message: string) => void;
  showAlert: (title: string, desc: string, type?: "success" | "error" | "warning" | "info") => void;
}

export function SmartParserModal({
  open,
  onOpenChange,
  classId,
  onSuccess,
  showAlert,
}: SmartParserModalProps) {
  const [isPending, startTransition] = useTransition();

  // State cấu hình khởi tạo
  const [parserTitle, setParserTitle] = useState<string>("");
  const [parserSkill, setParserSkill] = useState<
    "ALL_SKILLS" | "READING" | "LISTENING" | "WRITING" | "SPEAKING"
  >("READING");
  const [parserDuration, setParserDuration] = useState<number>(60);
  const [parserPdfFile, setParserPdfFile] = useState<File | null>(null);
  const [ocrStatusText, setOcrStatusText] = useState<string>("");

  // State kết quả Ebook sau khi parse
  const [parsedEbookData, setParsedEbookData] = useState<any | null>(null);
  const [selectedQuestionNumbers, setSelectedQuestionNumbers] = useState<number[]>([]);
  const [isQuestionsFinalized, setIsQuestionsFinalized] = useState<boolean>(false);
  const [activeEbookSectionId, setActiveEbookSectionId] = useState<string>("");
  const [parserAudioFileName, setParserAudioFileName] = useState<string | null>(null);

  // State xem trước bài thi
  const [isPreviewExamOpen, setIsPreviewExamOpen] = useState<boolean>(false);

  // Custom hook quản lý bản nháp localStorage
  const { hasDraft, savedTime, saveDraft, getDraft, clearDraft } = useExamParserDraft(classId);

  // Tự động lưu nháp mỗi khi dữ liệu Ebook thay đổi
  useEffect(() => {
    if (parsedEbookData && parsedEbookData.questions?.length > 0) {
      saveDraft({
        parserTitle,
        parserSkill,
        parserDuration,
        parsedEbookData,
        selectedQuestionNumbers,
        isQuestionsFinalized,
        activeEbookSectionId,
      });
    }
  }, [
    parsedEbookData,
    selectedQuestionNumbers,
    isQuestionsFinalized,
    activeEbookSectionId,
    parserTitle,
    parserSkill,
    parserDuration,
    saveDraft,
  ]);

  // Khôi phục bản nháp
  const handleRestoreDraft = () => {
    const draft = getDraft();
    if (!draft || !draft.parsedEbookData) return;
    setParserTitle(draft.parserTitle || "");
    setParserSkill((draft.parserSkill as any) || "READING");
    setParserDuration(draft.parserDuration || 60);
    setParsedEbookData(draft.parsedEbookData);
    setSelectedQuestionNumbers(draft.selectedQuestionNumbers || []);
    setIsQuestionsFinalized(Boolean(draft.isQuestionsFinalized));
    setActiveEbookSectionId(draft.activeEbookSectionId || "");
    showAlert("Khôi phục bản nháp", "Đã nạp lại thành công nội dung đề thi từ bản nháp trước!", "info");
  };

  // Upload file đề thi & bóc tách
  const handlePdfUploadForParser = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParserPdfFile(file);
    e.target.value = "";

    startTransition(async () => {
      setOcrStatusText("");
      const examTitle = parserTitle.trim() || file.name.replace(/\.[^/.]+$/, "");
      const formData = new FormData();
      formData.append("title", examTitle);
      formData.append("skill", parserSkill);
      formData.append("durationMinutes", String(parserDuration));
      formData.append("file", file);

      let res = await parseIeltsExamAction(formData);

      // Nếu là PDF scan -> chạy Tesseract client OCR
      if (!res.success && res.isScannedPdf) {
        try {
          const ocrText = await extractTextFromScannedPdfClient(file, (msg) =>
            setOcrStatusText(msg)
          );
          setOcrStatusText("Đang phân tích cấu trúc Ebook 2 cột bằng Groq AI...");
          const ocrFormData = new FormData();
          ocrFormData.append("title", examTitle);
          ocrFormData.append("skill", parserSkill);
          ocrFormData.append("durationMinutes", String(parserDuration));
          ocrFormData.append("pdfText", ocrText);
          ocrFormData.append("file", file);
          res = await parseIeltsExamAction(ocrFormData);
        } catch (ocrErr: any) {
          setOcrStatusText("");
          showAlert(
            "Lỗi quét OCR tệp PDF Scan",
            ocrErr.message || "Không thể nhận diện văn bản từ tệp PDF Scan này!",
            "error"
          );
          return;
        }
      }

      setOcrStatusText("");

      if (res.success && res.parsedData) {
        setParsedEbookData(res.parsedData);
        setActiveEbookSectionId(res.parsedData.sections?.[0]?.id || "");
        const allNums = (res.parsedData.questions || []).map(
          (q: any, idx: number) => q.questionNumber || idx + 1
        );
        setSelectedQuestionNumbers(allNums);
        setIsQuestionsFinalized(false);
        showAlert(
          "Nhận diện đề thi thành công!",
          `Đã trích xuất cấu trúc đề thi từ "${file.name}" thành Ebook 2 cột (${allNums.length} câu hỏi). Hãy kiểm tra và chốt danh sách câu hỏi sử dụng!`,
          "success"
        );
      } else {
        showAlert("Lỗi bóc tách đề thi", res.error || "Không thể bóc tách đề thi!", "error");
      }
    });
  };

  // Tải Audio bổ sung cho Listening
  const handleUploadAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audioFile = e.target.files?.[0];
    if (!audioFile) return;
    const blobUrl = URL.createObjectURL(audioFile);
    setParserAudioFileName(audioFile.name);
    if (parsedEbookData) {
      setParsedEbookData({ ...parsedEbookData, audioUrl: blobUrl });
    }
    showAlert("Tải tệp âm thanh thành công", `Đã gắn tệp audio "${audioFile.name}".`, "success");
  };

  // Xuất file Excel mẫu theo đúng số câu đã chốt
  const handleDownloadExcelTemplate = () => {
    if (!isQuestionsFinalized) {
      showAlert("Chưa chốt câu hỏi", "Vui lòng bấm 'Chốt danh sách câu hỏi sử dụng' trước khi tải file mẫu!", "warning");
      return;
    }
    const allValidNums = new Set((parsedEbookData?.questions || []).map((q: any) => q.questionNumber));
    const sortedNums = Array.from(selectedQuestionNumbers).filter((n) => allValidNums.has(n)).sort((a, b) => a - b);
    const templateData = sortedNums.map((num) => {
      const targetQ = (parsedEbookData.questions || []).find((q: any) => q.questionNumber === num);
      let note = "Điền đáp án chuẩn vào cột B";
      if (targetQ?.type === "TRUE_FALSE_NG") note = "Điền TRUE, FALSE hoặc NOT GIVEN";
      else if (targetQ?.type === "MULTIPLE_CHOICE") note = "Điền chữ cái A, B, C hoặc D";
      return { "Số câu": num, "Đáp án chuẩn": targetQ?.correctAnswer || "", "Ghi chú loại câu": note };
    });
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DapAnIELTS");
    XLSX.writeFile(wb, `SIMPACE_IELTS_${sortedNums.length}_Cau_Dap_An.xlsx`);
  };

  // Nạp đáp án từ Excel
  const handleAnswersImported = (excelMap: Map<number, string>, fileName: string) => {
    if (!parsedEbookData) return;
    const updateQuestionList = (list: any[]) =>
      list.map((q: any, idx: number) => {
        const num = q.questionNumber || idx + 1;
        const ans = excelMap.get(num);
        if (ans !== undefined) {
          const opts = q.options?.map((opt: any) => ({
            ...opt,
            isCorrect: opt.optionLabel.toUpperCase() === ans.toUpperCase(),
          }));
          return { ...q, correctAnswer: ans, options: opts || q.options };
        }
        return q;
      });

    const updatedQuestions = updateQuestionList(parsedEbookData.questions || []);
    const updatedSections = parsedEbookData.sections?.map((sec: any) => ({
      ...sec,
      questions: updateQuestionList(sec.questions || []),
    }));

    setParsedEbookData({ ...parsedEbookData, questions: updatedQuestions, sections: updatedSections });
    showAlert("Khớp đáp án thành công!", `Đã tự động điền đáp án chuẩn cho các câu hỏi từ "${fileName}".`, "success");
  };

  // Cập nhật từng trường của câu hỏi
  const handleUpdateQuestionField = (qNum: number, field: string, value: any) => {
    if (!parsedEbookData) return;
    const applyUpdate = (q: any) => (q.questionNumber === qNum ? { ...q, [field]: value } : q);
    const updatedQuestions = (parsedEbookData.questions || []).map(applyUpdate);
    const updatedSections = parsedEbookData.sections?.map((sec: any) => ({
      ...sec,
      questions: (sec.questions || []).map(applyUpdate),
    }));
    setParsedEbookData({ ...parsedEbookData, questions: updatedQuestions, sections: updatedSections });
  };

  // Xóa câu hỏi
  const handleDeleteQuestion = (qNum: number) => {
    if (!parsedEbookData) return;
    const updatedQuestions = (parsedEbookData.questions || []).filter((q: any) => q.questionNumber !== qNum);
    const updatedSections = parsedEbookData.sections?.map((sec: any) => ({
      ...sec,
      questions: (sec.questions || []).filter((q: any) => q.questionNumber !== qNum),
    }));
    setSelectedQuestionNumbers((prev) => prev.filter((n) => n !== qNum));
    setParsedEbookData({ ...parsedEbookData, questions: updatedQuestions, sections: updatedSections });
  };

  // Thêm câu hỏi mới vào Section
  const handleAddQuestion = (sectionId: string, type: string) => {
    if (!parsedEbookData) return;
    const allQ = parsedEbookData.questions || [];
    const maxNum = allQ.reduce((m: number, q: any) => Math.max(m, q.questionNumber || 0), 0);
    const newQ = {
      questionNumber: maxNum + 1,
      prompt: `Câu hỏi số ${maxNum + 1}`,
      type,
      points: 1.0,
      correctAnswer: type === "MULTIPLE_CHOICE" ? "A" : "",
      explanation: "",
      options: type === "MULTIPLE_CHOICE" ? [
        { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
        { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
        { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
        { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
      ] : [],
    };
    const updatedQuestions = [...allQ, newQ];
    const updatedSections = parsedEbookData.sections?.map((sec: any) =>
      sec.id === sectionId || sec.key === sectionId ? { ...sec, questions: [...(sec.questions || []), newQ] } : sec
    );
    setSelectedQuestionNumbers((prev) => [...prev, newQ.questionNumber]);
    setParsedEbookData({ ...parsedEbookData, questions: updatedQuestions, sections: updatedSections });
  };

  // Lưu bài tập vào CSDL
  const handleSaveParsedAssignment = () => {
    if (!parsedEbookData) return;
    if (!isQuestionsFinalized) {
      showAlert("Chưa chốt câu hỏi", "Vui lòng bấm '🔒 Chốt danh sách câu hỏi sử dụng' trước khi lưu!", "warning");
      return;
    }
    if (selectedQuestionNumbers.length === 0) {
      showAlert("Chưa chọn câu hỏi", "Vui lòng chọn ít nhất 1 câu hỏi để phát hành!", "warning");
      return;
    }

    startTransition(async () => {
      if (parsedEbookData.skill === "ALL_SKILLS" && parsedEbookData.sections) {
        const multiple = parsedEbookData.sections.map((sec: any) => ({
          classId,
          title: sec.title || `${parsedEbookData.title} - ${sec.skill}`,
          description: `Đề thi kỹ năng ${sec.skill} từ bộ đề: ${parsedEbookData.title}`,
          skill: sec.skill,
          type: "MOCK_EXAM",
          durationMinutes: sec.durationMinutes || 60,
          audioUrl: sec.audioUrl || (sec.skill === "LISTENING" ? parsedEbookData.audioUrl : null),
          enableProctoring: true,
          maxTabSwitches: 3,
          questions: (sec.questions || []).filter((q: any) => selectedQuestionNumbers.includes(q.questionNumber)),
          flowcharts: parsedEbookData.flowcharts || [],
          tables: parsedEbookData.tables || [],
          matchingHeadings: parsedEbookData.matchingHeadings || [],
          summaries: parsedEbookData.summaries || [],
        })).filter((a: any) => a.questions.length > 0);

        const res = await createMultipleAssignmentsAction(multiple);
        if (res.success) {
          clearDraft();
          setParsedEbookData(null);
          onOpenChange(false);
          onSuccess(`Đã phân tách và phát hành thành công ${multiple.length} bài tập!`);
        } else {
          showAlert("Lỗi phát hành", res.error || "Không thể lưu danh sách bài tập!", "error");
        }
        return;
      }

      const filteredQ = (parsedEbookData.questions || [])
        .filter((q: any) => selectedQuestionNumbers.includes(q.questionNumber))
        .map((q: any, idx: number) => ({
          questionNumber: q.questionNumber || idx + 1,
          passageText: parsedEbookData.passageText,
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          options: q.options,
        }));

      const res = await createAssignmentAction({
        classId,
        title: parsedEbookData.title,
        description: `Bài tập bóc tách Ebook: ${parsedEbookData.title}`,
        skill: parsedEbookData.skill,
        type: "HOMEWORK",
        durationMinutes: parsedEbookData.durationMinutes || 60,
        audioUrl: parsedEbookData.audioUrl,
        enableProctoring: true,
        maxTabSwitches: 3,
        questions: filteredQ,
        flowcharts: parsedEbookData.flowcharts || [],
        tables: parsedEbookData.tables || [],
        matchingHeadings: parsedEbookData.matchingHeadings || [],
        summaries: parsedEbookData.summaries || [],
      });

      if (res.success) {
        clearDraft();
        setParsedEbookData(null);
        onOpenChange(false);
        onSuccess(`Đã tạo bài tập "${parsedEbookData.title}" thành công!`);
      } else {
        showAlert("Lỗi lưu bài tập", res.error || "Không thể lưu bài tập!", "error");
      }
    });
  };

  return (
    <>
      <Dialog open={open && !isPreviewExamOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="size-5 text-[#EA580C]" /> Bóc tách Đề thi IELTS Thông minh (Ebook 2 cột)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tải PDF đề thi → Xem Ebook 2 cột → Nạp Excel điền đáp án → Phát hành bài tập.
            </DialogDescription>
          </DialogHeader>

          {!parsedEbookData ? (
            <div className="space-y-4 py-2">
              {/* Thông báo bản nháp nếu có */}
              {hasDraft && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-900">
                    <History className="size-4 text-blue-600 shrink-0" />
                    <span>
                      Tìm thấy bản nháp đề thi chưa hoàn thành (lưu lúc <b>{savedTime}</b>).
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={clearDraft} className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-200">
                      <Trash2 className="size-3 mr-1" /> Xóa nháp
                    </Button>
                    <Button size="sm" onClick={handleRestoreDraft} className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                      Tiếp tục sửa nháp
                    </Button>
                  </div>
                </div>
              )}

              <div className="p-4 bg-orange-50/70 rounded-2xl border border-orange-200 flex items-start gap-3">
                <FileText className="size-5 text-[#EA580C] shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 space-y-1">
                  <b className="text-slate-900">Bước 1: Tải lên tệp Đề thi PDF / Word</b>
                  <p>Hệ thống tự động quét nhận diện chữ, chia Phần và mở giao diện Ebook 2 cột tương tác.</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Tên bài thi / Bộ đề IELTS</Label>
                  <Input
                    value={parserTitle}
                    onChange={(e) => setParserTitle(e.target.value)}
                    placeholder="VD: Cambridge IELTS 18 - Test 01"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Phạm vi bóc tách</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { val: "ALL_SKILLS", label: "🌟 Full 4 Kỹ năng" },
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

                {/* VÙNG UPLOAD */}
                <div className="p-8 border-2 border-dashed border-orange-200 hover:border-orange-400 rounded-2xl bg-orange-50/20 text-center transition">
                  {isPending ? (
                    <Loader2 className="size-8 mx-auto text-[#EA580C] mb-2 animate-spin" />
                  ) : (
                    <Upload className="size-8 mx-auto text-[#EA580C] mb-2" />
                  )}
                  <p className="text-sm font-bold text-slate-800">
                    {isPending ? ocrStatusText || "Đang đọc tệp và bóc tách Ebook..." : parserPdfFile?.name || "Chọn tệp PDF (có chữ hoặc bản Scan) hoặc Word (.docx)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Hỗ trợ .pdf và .docx (Tối đa 25MB)</p>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    id="smart-parser-file-input"
                    className="hidden"
                    disabled={isPending}
                    onChange={handlePdfUploadForParser}
                  />
                  <label
                    htmlFor={isPending ? undefined : "smart-parser-file-input"}
                    className={`inline-block mt-3 px-4 py-2 text-xs text-white rounded-xl font-semibold transition shadow-sm ${
                      isPending ? "bg-slate-400 cursor-not-allowed" : "bg-[#EA580C] hover:bg-[#C2410C] cursor-pointer"
                    }`}
                  >
                    {isPending ? "Đang xử lý..." : "Duyệt tìm tệp & Bóc tách ngay"}
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* HIỂN THỊ EBOOK 2 CỘT */
            <div className="space-y-4 py-2">
              {/* Header toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]" title={parsedEbookData.title}>
                  📖 {parsedEbookData.title}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadExcelTemplate}
                    disabled={!isQuestionsFinalized}
                    className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold flex items-center gap-1 transition shadow-sm ${
                      isQuestionsFinalized
                        ? "bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                        : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-70"
                    }`}
                  >
                    <Download className="size-3" />
                    <span>Tải file Excel mẫu ({isQuestionsFinalized ? `${selectedQuestionNumbers.length} câu` : "Chưa chốt"})</span>
                  </button>

                  <ExcelAnswerImporter
                    isQuestionsFinalized={isQuestionsFinalized}
                    selectedQuestionNumbers={selectedQuestionNumbers}
                    onAnswersImported={handleAnswersImported}
                    showAlert={showAlert}
                  />

                  <button
                    type="button"
                    onClick={() => setIsPreviewExamOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Eye className="size-3.5 text-amber-400" />
                    <span>Xem trước thi thật</span>
                  </button>
                </div>
              </div>

              {/* Tabs chọn Section nếu có */}
              {parsedEbookData.sections && parsedEbookData.sections.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                    <Layers className="size-3.5" /> Chọn phần:
                  </span>
                  {parsedEbookData.sections.map((sec: any) => {
                    const isSelected = activeEbookSectionId === sec.id || (!activeEbookSectionId && sec.id === parsedEbookData.sections[0]?.id);
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setActiveEbookSectionId(sec.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                          isSelected ? "bg-[#EA580C] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {sec.title} ({sec.questions?.length || 0} câu)
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Invariants banner */}
              {parsedEbookData.invariantsReport && (
                <InvariantsBanner report={parsedEbookData.invariantsReport} />
              )}

              {/* Ebook 2 Cột */}
              <EbookTwoColumnViewer
                parsedEbookData={parsedEbookData}
                setParsedEbookData={setParsedEbookData}
                selectedQuestionNumbers={selectedQuestionNumbers}
                isQuestionsFinalized={isQuestionsFinalized}
                activeEbookSectionId={activeEbookSectionId}
                setActiveEbookSectionId={setActiveEbookSectionId}
                parserAudioFileName={parserAudioFileName}
                onUploadAudio={handleUploadAudio}
                onSelectAll={() => {
                  if (isQuestionsFinalized) return;
                  const allNums = (parsedEbookData.questions || []).map((q: any, i: number) => q.questionNumber || i + 1);
                  setSelectedQuestionNumbers(allNums);
                }}
                onDeselectAll={() => {
                  if (isQuestionsFinalized) return;
                  setSelectedQuestionNumbers([]);
                }}
                onFinalize={() => {
                  const valid = selectedQuestionNumbers.filter((n) => (parsedEbookData.questions || []).some((q: any) => q.questionNumber === n));
                  if (valid.length === 0) {
                    showAlert("Chưa chọn câu hỏi", "Vui lòng chọn ít nhất 1 câu hỏi!", "warning");
                    return;
                  }
                  setSelectedQuestionNumbers(valid);
                  setIsQuestionsFinalized(true);
                  showAlert("Đã chốt danh sách", `Đã chốt ${valid.length} câu. Bạn có thể tải mẫu và nạp Excel!`, "success");
                }}
                onUnlock={() => setIsQuestionsFinalized(false)}
                onToggleQuestionSelection={(qNum) => {
                  if (isQuestionsFinalized) return;
                  setSelectedQuestionNumbers((prev) => prev.includes(qNum) ? prev.filter((n) => n !== qNum) : [...prev, qNum]);
                }}
                onUpdateQuestionField={handleUpdateQuestionField}
                onDeleteQuestion={handleDeleteQuestion}
                onAddQuestion={handleAddQuestion}
              />

              {/* Dialog Footer */}
              <DialogFooter className="flex justify-between items-center pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearDraft();
                    setParsedEbookData(null);
                  }}
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

      {/* Full Preview Modal */}
      {isPreviewExamOpen && parsedEbookData && (
        <IeltsExamPlayer
          assignment={{
            ...parsedEbookData,
            id: "preview-parsed-exam",
            title: parsedEbookData.title || "Xem trước đề thi IELTS",
            skill: parsedEbookData.skill || parserSkill || "READING",
            durationMinutes: parsedEbookData.durationMinutes || 60,
            passageText: parsedEbookData.passageText,
            questions: (parsedEbookData.questions || []).filter((q: any) =>
              selectedQuestionNumbers.includes(q.questionNumber)
            ),
            sections: parsedEbookData.sections,
            tables: parsedEbookData.tables,
            flowcharts: parsedEbookData.flowcharts,
            matchingHeadings: parsedEbookData.matchingHeadings,
            summaries: parsedEbookData.summaries,
            audioUrl: parsedEbookData.audioUrl,
          }}
          isPreview={true}
          onClose={() => setIsPreviewExamOpen(false)}
          onSubmit={() => {
            setIsPreviewExamOpen(false);
            showAlert("Thông báo", "Đây là chế độ xem trước của giáo viên. Bài làm thử đã được đóng lại.", "info");
          }}
        />
      )}
    </>
  );
}
