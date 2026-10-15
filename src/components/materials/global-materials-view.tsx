"use client";

import React, { useState, useTransition } from "react";
import {
  Layers,
  BookOpen,
  Upload,
  Folder,
  FileText,
  Music,
  File,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Search,
  ChevronRight,
  Check,
  Sparkles,
  Filter,
  GraduationCap,
  Building2,
  Loader2,
  Download,
  AlertTriangle,
} from "lucide-react";
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
  distributeLearningMaterialsAction,
  uploadCoursebookPackageAction,
  getLevelRepositoryFoldersAction,
} from "@/actions/materials";
import { getIeltsLevelsAction } from "@/actions/ielts-levels";

interface GlobalMaterialsViewProps {
  classes: any[];
  currentUser: {
    id?: string;
    role: string;
    fullName?: string;
  };
  onOpenClassMaterials: (cls: any) => void;
  onRefreshAll?: () => void;
}

export function GlobalMaterialsView({
  classes,
  currentUser,
  onOpenClassMaterials,
  onRefreshAll,
}: GlobalMaterialsViewProps) {
  const [activeTab, setActiveTab] = useState<"classes_list" | "level_repo" | "distribute">("classes_list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  // State cho Kho Giáo trình chuẩn theo Trình độ (Level Repository)
  const [levelFolders, setLevelFolders] = useState<any[]>([]);
  const [ieltsLevels, setIeltsLevels] = useState<any[]>([]);
  const [isLoadingLevelRepo, setIsLoadingLevelRepo] = useState(false);
  const [isLevelCoursebookModalOpen, setIsLevelCoursebookModalOpen] = useState(false);
  const [targetLevelForCb, setTargetLevelForCb] = useState<string>("lvl-advanced");

  // State Form Phân phối tài liệu
  const [distributePackageType, setDistributePackageType] = useState<"NORMAL" | "COURSEBOOK">("NORMAL");
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributionMode, setDistributionMode] = useState<"BY_LEVEL" | "BY_CLASSES">("BY_LEVEL");
  const [selectedLevels, setSelectedLevels] = useState<string[]>(["6.5 - 7.5", "5.5 - 6.5"]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [folderName, setFolderName] = useState("📚 Sách giáo khoa & Giáo trình chính thức");
  const [folderDesc, setFolderDesc] = useState("Tài liệu học tập phân phối đồng bộ theo chương trình đào tạo SIMPACE");
  
  // Tệp lẻ thông thường
  const [uploadFiles, setUploadFiles] = useState<
    Array<{
      id: string;
      file: File;
      title: string;
      fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
      size: number;
    }>
  >([]);

  // Tệp cho Gói Sách giáo khoa & Audio trọn bộ
  const [cbTitle, setCbTitle] = useState("");
  const [cbDesc, setCbDesc] = useState("");
  const [cbPdfFile, setCbPdfFile] = useState<File | null>(null);
  const [cbAudioFiles, setCbAudioFiles] = useState<
    Array<{
      id: string;
      file: File;
      title: string;
      size: number;
    }>
  >([]);

  // State Modal Thông báo
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "warning" | "error" | "success" | "info";
  } | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: "warning" | "error" | "success" | "info" = "warning"
  ) => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const canManage =
    currentUser.role === "ADMIN" ||
    currentUser.role === "TEACHER" ||
    currentUser.role === "SCHOOL_MANAGER";

  // Danh sách các trình độ chuẩn
  const LEVEL_OPTIONS = [
    {
      code: "HIGH_LEVEL",
      keywords: ["6.5", "7.5", "Master", "Nâng cao"],
      label: "🌟 High Level (Band 6.5 - 7.5+ / Nâng cao)",
      desc: "Giáo trình Master, đề thi khó và tài liệu chuyên sâu",
    },
    {
      code: "INTERMEDIATE",
      keywords: ["5.5", "6.0", "5.0", "Bứt phá"],
      label: "📘 Intermediate (Band 5.0 - 6.5 / Bứt phá)",
      desc: "Giáo trình tăng tốc và phương pháp giải đề tiêu chuẩn",
    },
    {
      code: "FOUNDATION",
      keywords: ["4.0", "4.5", "3.5", "Nền tảng"],
      label: "📗 Foundation (Band 4.0 - 5.0 / Nền tảng)",
      desc: "Sách ngữ pháp, phát âm và từ vựng cơ bản",
    },
  ];

  // Các mẫu tên thư mục nhanh
  const FOLDER_PRESETS = [
    "📚 Sách giáo khoa & Giáo trình chính thức",
    "🖥️ Slide bài giảng & Bài trình chiếu",
    "🎧 Audio Luyện nghe & Tapescript",
    "📝 Đề thi thử & Bài tập bổ trợ",
    "📖 Từ vựng chuyên đề & Handout",
  ];

  // Xử lý chọn nhiều tệp
  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newFiles: Array<{
      id: string;
      file: File;
      title: string;
      fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
      size: number;
    }> = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      let autoType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER" = "OTHER";

      if (["mp3", "wav", "m4a", "aac", "ogg"].includes(ext) || file.type.includes("audio")) {
        autoType = "AUDIO";
      } else if (ext === "pdf" || file.type.includes("pdf")) {
        autoType = "PDF";
      } else if (["doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
        autoType = "DOCUMENT";
      } else if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext) || file.type.includes("video")) {
        autoType = "VIDEO";
      }

      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      newFiles.push({
        id: `dist-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        title: cleanTitle,
        fileType: autoType,
        size: file.size,
      });
    }

    setUploadFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (id: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateFileTitle = (id: string, newTitle: string) => {
    setUploadFiles((prev) => prev.map((f) => (f.id === id ? { ...f, title: newTitle } : f)));
  };

  const handleUpdateFileType = (id: string, newType: any) => {
    setUploadFiles((prev) => prev.map((f) => (f.id === id ? { ...f, fileType: newType } : f)));
  };

  // Tải dữ liệu Level Repository
  const loadLevelRepoData = async () => {
    setIsLoadingLevelRepo(true);
    const [foldersRes, levelsRes] = await Promise.all([
      getLevelRepositoryFoldersAction(),
      getIeltsLevelsAction(),
    ]);
    if (foldersRes.success) {
      setLevelFolders(foldersRes.folders || []);
    }
    if (levelsRes.success) {
      setIeltsLevels(levelsRes.levels || []);
    }
    setIsLoadingLevelRepo(false);
  };

  React.useEffect(() => {
    loadLevelRepoData();
  }, []);

  const handleSelectCbAudioFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newAudios: Array<{ id: string; file: File; title: string; size: number }> = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      newAudios.push({
        id: `gcba-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        title: cleanTitle,
        size: file.size,
      });
    }
    setCbAudioFiles((prev) => [...prev, ...newAudios]);
  };

  const handleRemoveCbAudioFile = (id: string) => {
    setCbAudioFiles((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateCbAudioTitle = (id: string, newTitle: string) => {
    setCbAudioFiles((prev) => prev.map((a) => (a.id === id ? { ...a, title: newTitle } : a)));
  };

  // Nạp Sách & Audio trực tiếp vào Kho Trình độ (Level Repository)
  const handleExecuteLevelCoursebookUpload = () => {
    if (!cbTitle.trim()) {
      showAlert("Thiếu tên bộ sách", "Vui lòng nhập tên bộ sách giáo khoa (VD: Mindset for IELTS Level 3)!", "warning");
      return;
    }
    if (!cbPdfFile) {
      showAlert("Thiếu file PDF sách", "Vui lòng chọn 1 tệp Sách giáo khoa PDF chính!", "warning");
      return;
    }
    if (cbAudioFiles.length === 0) {
      showAlert("Thiếu file Audio", "Vui lòng chọn ít nhất 1 bài nghe Audio!", "warning");
      return;
    }

    startTransition(async () => {
      const bookFile = {
        title: `${cbTitle.trim()} (PDF Sách)`,
        fileName: cbPdfFile.name,
        fileSize: cbPdfFile.size,
        fileUrl: URL.createObjectURL(cbPdfFile),
        mimeType: cbPdfFile.type || "application/pdf",
      };

      const audioFiles = cbAudioFiles.map((af, idx) => ({
        title: af.title.trim() || `Track ${(idx + 1).toString().padStart(2, "0")}`,
        fileName: af.file.name,
        fileSize: af.size,
        fileUrl: URL.createObjectURL(af.file),
        mimeType: af.file.type || "audio/mpeg",
      }));

      const res = await uploadCoursebookPackageAction({
        targetType: "LEVEL",
        ieltsLevelId: targetLevelForCb,
        packageTitle: cbTitle.trim(),
        packageDescription: cbDesc.trim() || undefined,
        bookFile,
        audioFiles,
      });

      if (res.success) {
        setIsLevelCoursebookModalOpen(false);
        setCbTitle("");
        setCbDesc("");
        setCbPdfFile(null);
        setCbAudioFiles([]);
        loadLevelRepoData();
        if (onRefreshAll) onRefreshAll();
        showAlert(
          "Nạp Giáo trình cấp Trình độ thành công!",
          `Bộ giáo trình "${cbTitle.trim()}" kèm ${audioFiles.length} bài nghe đã được lưu trữ vào Kho Trình độ. Toàn bộ các lớp thuộc trình độ này tự động kế thừa!`,
          "success"
        );
      } else {
        showAlert("Lỗi nạp giáo trình", res.error || "Không thể tải lên giáo trình trình độ!", "error");
      }
    });
  };

  // Tính toán danh sách lớp học mục tiêu được hưởng theo cấu hình hiện tại
  const activeClasses = classes.filter((c) => c.isActive);

  const getTargetClassesCount = () => {
    if (distributionMode === "BY_LEVEL") {
      if (selectedLevels.length === 0) return 0;
      return activeClasses.filter((c) =>
        selectedLevels.some(
          (lvl) =>
            (c.level || "").toLowerCase().includes(lvl.toLowerCase()) ||
            (c.name || "").toLowerCase().includes(lvl.toLowerCase())
        )
      ).length;
    } else {
      return selectedClassIds.length;
    }
  };

  const targetClassesList =
    distributionMode === "BY_LEVEL"
      ? activeClasses.filter((c) =>
          selectedLevels.some(
            (lvl) =>
              (c.level || "").toLowerCase().includes(lvl.toLowerCase()) ||
              (c.name || "").toLowerCase().includes(lvl.toLowerCase())
          )
        )
      : activeClasses.filter((c) => selectedClassIds.includes(c.id));

  // Thực thi Phân phối Tài liệu hàng loạt
  const handleExecuteDistribution = () => {
    if (distributePackageType === "COURSEBOOK") {
      if (!cbTitle.trim()) {
        showAlert("Thiếu tên bộ sách", "Vui lòng nhập tên bộ sách giáo khoa cần phân phối!", "warning");
        return;
      }
      if (!cbPdfFile) {
        showAlert("Thiếu file PDF sách", "Vui lòng chọn 1 tệp Sách giáo khoa PDF chính!", "warning");
        return;
      }
      if (cbAudioFiles.length === 0) {
        showAlert("Thiếu file Audio", "Vui lòng chọn ít nhất 1 bài nghe Audio!", "warning");
        return;
      }

      if (distributionMode === "BY_LEVEL" && selectedLevels.length === 0) {
        showAlert("Chưa chọn trình độ", "Vui lòng chọn ít nhất 1 trình độ IELTS để phân phối!", "warning");
        return;
      }
      if (distributionMode === "BY_CLASSES" && selectedClassIds.length === 0) {
        showAlert("Chưa chọn lớp học", "Vui lòng tích chọn ít nhất 1 lớp học để nhận tài liệu!", "warning");
        return;
      }

      startTransition(async () => {
        const bookFile = {
          title: `${cbTitle.trim()} (PDF Sách)`,
          fileName: cbPdfFile.name,
          fileSize: cbPdfFile.size,
          fileUrl: URL.createObjectURL(cbPdfFile),
          mimeType: cbPdfFile.type || "application/pdf",
        };

        const audioFiles = cbAudioFiles.map((af, idx) => ({
          title: af.title.trim() || `Track ${(idx + 1).toString().padStart(2, "0")}`,
          fileName: af.file.name,
          fileSize: af.size,
          fileUrl: URL.createObjectURL(af.file),
          mimeType: af.file.type || "audio/mpeg",
        }));

        const res = await uploadCoursebookPackageAction({
          targetType: "MULTI_CLASSES",
          targetLevels: distributionMode === "BY_LEVEL" ? selectedLevels : undefined,
          targetClassIds: distributionMode === "BY_CLASSES" ? selectedClassIds : undefined,
          packageTitle: cbTitle.trim(),
          packageDescription: cbDesc.trim() || undefined,
          bookFile,
          audioFiles,
        });

        if (res.success) {
          setIsDistributeModalOpen(false);
          setCbTitle("");
          setCbDesc("");
          setCbPdfFile(null);
          setCbAudioFiles([]);
          if (onRefreshAll) onRefreshAll();
          showAlert(
            "Phân phối Gói Sách & Audio thành công!",
            `Hệ thống đã tự động tạo thư mục sách và thư mục con "🎧 Audio bài nghe" (${audioFiles.length} bài nghe) tới ${res.count || getTargetClassesCount()} lớp học!`,
            "success"
          );
        } else {
          showAlert("Lỗi phân phối", res.error || "Không thể phân phối bộ sách!", "error");
        }
      });
      return;
    }

    if (!folderName.trim()) {
      showAlert("Thiếu tên thư mục", "Vui lòng nhập tên thư mục chứa tài liệu phân phối!", "warning");
      return;
    }

    if (uploadFiles.length === 0) {
      showAlert("Chưa chọn tệp", "Vui lòng tải lên ít nhất 1 tài liệu (Sách giáo khoa, Slide, Audio...)!", "warning");
      return;
    }

    if (distributionMode === "BY_LEVEL" && selectedLevels.length === 0) {
      showAlert("Chưa chọn trình độ", "Vui lòng chọn ít nhất 1 trình độ IELTS để phân phối!", "warning");
      return;
    }

    if (distributionMode === "BY_CLASSES" && selectedClassIds.length === 0) {
      showAlert("Chưa chọn lớp học", "Vui lòng tích chọn ít nhất 1 lớp học để nhận tài liệu!", "warning");
      return;
    }

    startTransition(async () => {
      const payload = uploadFiles.map((item) => ({
        title: item.title.trim() || item.file.name,
        fileName: item.file.name,
        fileSize: item.size,
        fileType: item.fileType,
        fileUrl: URL.createObjectURL(item.file),
        mimeType: item.file.type || undefined,
      }));

      const res = await distributeLearningMaterialsAction({
        distributionMode,
        targetLevels: distributionMode === "BY_LEVEL" ? selectedLevels : undefined,
        targetClassIds: distributionMode === "BY_CLASSES" ? selectedClassIds : undefined,
        folderName: folderName.trim(),
        folderDescription: folderDesc.trim(),
        materials: payload,
      });

      if (res.success) {
        setIsDistributeModalOpen(false);
        setUploadFiles([]);
        if (onRefreshAll) onRefreshAll();
        showAlert(
          "Phân phối tài liệu hàng loạt thành công!",
          `Hệ thống đã phân phối thành công ${payload.length} tài liệu vào thư mục "${folderName.trim()}" cho ${res.targetClassCount} lớp học (${res.classNames?.slice(0, 3).join(", ")}${res.classNames && res.classNames.length > 3 ? "..." : ""})!`,
          "success"
        );
      } else {
        showAlert("Lỗi phân phối", res.error || "Không thể phân phối tài liệu hàng loạt!", "error");
      }
    });
  };

  // Lọc lớp học ở Tab 1
  const filteredClasses = activeClasses.filter((cls) => {
    const matchSearch =
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.school?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;

    if (selectedLevelFilter === "ALL") return true;
    if (selectedLevelFilter === "HIGH") {
      return (cls.level || "").includes("6.5") || (cls.level || "").includes("7.5") || (cls.name || "").includes("Master");
    }
    if (selectedLevelFilter === "INTERMEDIATE") {
      return (cls.level || "").includes("5.0") || (cls.level || "").includes("5.5") || (cls.level || "").includes("6.0");
    }
    if (selectedLevelFilter === "FOUNDATION") {
      return (cls.level || "").includes("4.0") || (cls.level || "").includes("4.5") || (cls.name || "").includes("Nền tảng");
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Nút tác vụ phân phối hàng loạt */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-50 text-[#EA580C] border border-orange-200">
              <Layers className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {currentUser.role === "ADMIN"
                  ? "Trung tâm Quản lý & Phân phối Học liệu SIMPACE"
                  : currentUser.role === "STUDENT"
                  ? "Kho tài liệu học tập của tôi"
                  : "Kho học liệu & Phân phối tài liệu giảng dạy"}
              </h2>
              <p className="text-xs text-slate-500">
                Tải lên sách giáo khoa cho toàn bộ lớp High-level, phân phối slide cho nhiều lớp cùng lúc, hoặc mở xem học liệu từng lớp.
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              onClick={() => setIsDistributeModalOpen(true)}
              className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm px-4 h-9.5 w-full sm:w-auto"
            >
              <Sparkles className="size-4" />
              <span>Phân phối tài liệu hàng loạt (Đa lớp & Level)</span>
            </Button>
          </div>
        )}
      </div>

      {/* 2. Thanh Tabs Điều hướng */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("classes_list")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === "classes_list"
              ? "bg-[#EA580C] text-white shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Folder className="size-3.5" />
          <span>Kho học liệu theo Lớp học ({filteredClasses.length})</span>
        </button>

        {canManage && (
          <button
            onClick={() => {
              setActiveTab("level_repo");
              loadLevelRepoData();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === "level_repo"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <BookOpen className="size-3.5" />
            <span>📚 Kho Giáo trình Chuẩn theo Trình độ ({levelFolders.length})</span>
          </button>
        )}

        {canManage && (
          <button
            onClick={() => setActiveTab("distribute")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === "distribute"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Layers className="size-3.5" />
            <span>⚡ Phân phối Đa lớp / Trình độ</span>
          </button>
        )}
      </div>

      {/* ========================================================
          TAB 1: DANH SÁCH LỚP HỌC (CLICK ĐỂ MỞ KHO TÀI LIỆU CỦA LỚP)
          ======================================================== */}
      {activeTab === "classes_list" && (
        <div className="space-y-4">
          {/* Thanh tìm kiếm và bộ lọc trình độ */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm lớp học, mã lớp, trường..."
                className="pl-9 h-9 text-xs rounded-xl border-slate-200"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
                <Filter className="size-3.5" /> Trình độ:
              </span>
              {[
                { val: "ALL", label: "Tất cả" },
                { val: "HIGH", label: "🌟 High Level (6.5+)" },
                { val: "INTERMEDIATE", label: "📘 Intermediate (5.0-6.0)" },
                { val: "FOUNDATION", label: "📗 Foundation (4.0-5.0)" },
              ].map((f) => (
                <button
                  key={f.val}
                  onClick={() => setSelectedLevelFilter(f.val)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition shrink-0 ${
                    selectedLevelFilter === f.val
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lưới danh sách lớp học */}
          {filteredClasses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
              <Folder className="size-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Không tìm thấy lớp học phù hợp</p>
              <p className="text-xs text-slate-400 mt-0.5">Vui lòng thử tìm kiếm với từ khóa khác.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => onOpenClassMaterials(cls)}
                  className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-md cursor-pointer transition flex items-center justify-between group"
                >
                  <div className="space-y-1.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {cls.code}
                      </span>
                      <Badge variant="outline" className="text-[10px] text-[#EA580C] border-orange-200 bg-orange-50 font-semibold">
                        {cls.level || cls.program}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#EA580C] transition truncate">
                      {cls.name}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                      <Building2 className="size-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cls.school?.name || "Chi nhánh chính"}</span>
                    </div>
                  </div>

                  <div className="size-10 rounded-xl bg-orange-50 text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white grid place-items-center transition shrink-0 shadow-sm">
                    <ChevronRight className="size-5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2: KHO GIÁO TRÌNH CHUẨN THEO TRÌNH ĐỘ (LEVEL REPOSITORY)
          ======================================================== */}
      {activeTab === "level_repo" && canManage && (
        <div className="space-y-6">
          {/* Banner giải thích cơ chế Kế thừa tự động */}
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white p-6 rounded-2xl shadow-sm space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-indigo-500/40 text-indigo-100 border border-indigo-400/30">
                  Cơ chế Kế thừa Tự động (Zero Physical Copy)
                </span>
                <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                  <BookOpen className="size-5 text-indigo-300" />
                  Kho Giáo trình Chuẩn IELTS SIMPACE theo Trình độ
                </h3>
                <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed mt-1">
                  Admin và Tổ chuyên môn tải Sách giáo khoa & Toàn bộ Audio bài nghe lên 1 lần duy nhất tại đây. Tất cả các lớp học thuộc trình độ tương ứng (High Level, Intermediate, Foundation) sẽ tự động thừa hưởng và hiển thị giáo trình chuẩn này trong kho của lớp.
                </p>
              </div>

              <Button
                onClick={() => {
                  setTargetLevelForCb("lvl-advanced");
                  setIsLevelCoursebookModalOpen(true);
                }}
                className="bg-white text-indigo-900 hover:bg-indigo-50 font-bold rounded-xl text-xs gap-1.5 shadow shrink-0"
              >
                <Plus className="size-4 text-indigo-600" />
                <span>Nạp Bộ Giáo trình & Audio mới</span>
              </Button>
            </div>
          </div>

          {/* Lưới các Trình độ & Giáo trình đã nạp */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[
              {
                id: "lvl-advanced",
                code: "ADVANCED",
                name: "🌟 High Level (Band 6.5 - 7.5+)",
                score: "6.5 - 9.0 IELTS",
                badge: "bg-purple-50 text-purple-700 border-purple-200",
                desc: "Các lớp chuyên sâu luyện đề, giáo trình Master Mindset Level 3",
              },
              {
                id: "lvl-medium",
                code: "MEDIUM",
                name: "📘 Intermediate (Band 5.0 - 6.5)",
                score: "5.0 - 6.5 IELTS",
                badge: "bg-blue-50 text-blue-700 border-blue-200",
                desc: "Các lớp bứt phá chiến thuật, Mindset Level 2 & Cambridge tiêu chuẩn",
              },
              {
                id: "lvl-basic",
                code: "BASIC",
                name: "📗 Foundation (Band 4.0 - 5.0)",
                score: "0.0 - 4.5 IELTS",
                badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
                desc: "Các lớp nền tảng ngữ pháp, từ vựng và phát âm cơ bản",
              },
            ].map((lvlGroup) => {
              const groupFolders = levelFolders.filter(
                (f) =>
                  f.ieltsLevelId === lvlGroup.id ||
                  (f.levelName && f.levelName.toLowerCase().includes(lvlGroup.code.toLowerCase())) ||
                  (f.name && f.name.toLowerCase().includes(lvlGroup.code.toLowerCase()))
              );

              const linkedClasses = activeClasses.filter(
                (c) =>
                  (c.level && c.level.toLowerCase().includes(lvlGroup.code.toLowerCase())) ||
                  (c.level && (
                    (lvlGroup.code === "ADVANCED" && (c.level.includes("6.5") || c.level.includes("7.5"))) ||
                    (lvlGroup.code === "MEDIUM" && (c.level.includes("5.0") || c.level.includes("5.5") || c.level.includes("6.0"))) ||
                    (lvlGroup.code === "BASIC" && (c.level.includes("4.0") || c.level.includes("4.5")))
                  ))
              );

              return (
                <div
                  key={lvlGroup.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{lvlGroup.name}</h4>
                        <span className="text-[11px] font-semibold text-slate-500">{lvlGroup.score}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${lvlGroup.badge}`}>
                        {linkedClasses.length} lớp học
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed">{lvlGroup.desc}</p>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Giáo trình chuẩn đang áp dụng ({groupFolders.length}):
                      </span>

                      {groupFolders.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                          Chưa có bộ giáo trình chuẩn nào cho trình độ này.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {groupFolders.map((gf) => (
                            <div
                              key={gf.id}
                              className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <BookOpen className="size-4 text-indigo-600 shrink-0" />
                                <span className="font-bold text-xs text-slate-900 truncate">
                                  {gf.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                <span>📄 {gf.fileCount} file PDF sách</span>
                                <span>•</span>
                                <span>🎧 {gf.subFolderCount} thư mục Audio</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTargetLevelForCb(lvlGroup.id);
                      setIsLevelCoursebookModalOpen(true);
                    }}
                    className="w-full text-xs font-semibold rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1.5"
                  >
                    <Plus className="size-3.5" /> Nạp Bộ Sách & Audio cho Trình độ này
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: MÀN HÌNH PHÂN PHỐI HÀNG LOẠT (ĐA LỚP & THEO TRÌNH ĐỘ)
          ======================================================== */}
      {activeTab === "distribute" && canManage && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="size-5 text-emerald-600" /> Cấu hình Phân phối Học liệu Hàng loạt
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống sẽ tự động tạo thư mục và đẩy tài liệu vào toàn bộ các lớp học được chỉ định bên dưới.
              </p>
            </div>

            {/* Toggle Định dạng Phân phối */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDistributePackageType("NORMAL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  distributePackageType === "NORMAL"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="size-3.5" />
                Tệp lẻ thông thường
              </button>
              <button
                type="button"
                onClick={() => setDistributePackageType("COURSEBOOK")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  distributePackageType === "COURSEBOOK"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-indigo-600"
                }`}
              >
                <BookOpen className="size-3.5" />
                📚 Gói SGK & Audio trọn bộ
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CỘT TRÁI: GÓI SGK & AUDIO TRỌN BỘ HOẶC TỆP LẺ THÔNG THƯỜNG */}
            {distributePackageType === "COURSEBOOK" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    1. Tên Bộ Sách giáo khoa chính <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={cbTitle}
                    onChange={(e) => setCbTitle(e.target.value)}
                    placeholder="VD: Mindset for IELTS Level 3 (Student's Book)"
                    className="h-9.5 text-xs rounded-xl font-medium"
                  />
                  <Input
                    value={cbDesc}
                    onChange={(e) => setCbDesc(e.target.value)}
                    placeholder="Mô tả bộ sách (không bắt buộc)..."
                    className="h-8 text-xs rounded-xl text-slate-600 bg-slate-50/50"
                  />
                </div>

                {/* Chọn file PDF Sách */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    2. File PDF Sách giáo khoa chính <span className="text-rose-500">*</span>
                  </Label>
                  <div className="p-4 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl bg-indigo-50/20 text-center transition">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      id="global-dist-cb-pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCbPdfFile(file);
                          if (!cbTitle.trim()) {
                            setCbTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                          }
                        }
                      }}
                    />
                    {cbPdfFile ? (
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-indigo-100 shadow-sm text-left">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="size-9 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                            <FileText className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 truncate">{cbPdfFile.name}</p>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {(cbPdfFile.size / (1024 * 1024)).toFixed(2)} MB • Sách giáo khoa PDF
                            </span>
                          </div>
                        </div>
                        <label
                          htmlFor="global-dist-cb-pdf"
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer shrink-0 ml-2"
                        >
                          Đổi file
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="global-dist-cb-pdf" className="cursor-pointer flex flex-col items-center gap-1.5 text-slate-600">
                        <Upload className="size-6 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Chọn 1 tệp Sách giáo khoa PDF</span>
                        <span className="text-[11px] text-slate-500">Định dạng file PDF bản đẹp</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Chọn các file Audio bài nghe */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800">
                      3. Toàn bộ file Audio bài nghe ({cbAudioFiles.length} bài) <span className="text-rose-500">*</span>
                    </Label>
                    {cbAudioFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCbAudioFiles([])}
                        className="text-[10px] text-rose-600 hover:underline font-semibold"
                      >
                        Xóa tất cả audio
                      </button>
                    )}
                  </div>

                  <div className="p-4 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl bg-purple-50/20 text-center transition">
                    <input
                      type="file"
                      multiple
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                      id="global-dist-cb-audio"
                      className="hidden"
                      onChange={handleSelectCbAudioFiles}
                    />
                    <label htmlFor="global-dist-cb-audio" className="cursor-pointer flex flex-col items-center gap-1 text-slate-600">
                      <Music className="size-6 text-purple-600" />
                      <span className="text-xs font-bold text-slate-800">Chọn nhiều file Audio bài nghe (MP3, WAV...)</span>
                      <span className="text-[11px] text-slate-500">Giữ Ctrl / Shift để chọn tất cả các bài nghe của sách</span>
                      <span className="mt-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm">
                        Duyệt tìm tệp Audio ({cbAudioFiles.length} đã chọn)
                      </span>
                    </label>
                  </div>

                  {/* Danh sách tracks audio */}
                  {cbAudioFiles.length > 0 && (
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50/50">
                      {cbAudioFiles.map((af, idx) => (
                        <div key={af.id} className="p-2 flex items-center gap-2 text-xs bg-white">
                          <span className="size-6 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-bold grid place-items-center shrink-0">
                            {idx + 1}
                          </span>
                          <Input
                            value={af.title}
                            onChange={(e) => handleUpdateCbAudioTitle(af.id, e.target.value)}
                            placeholder={`Track ${(idx + 1).toString().padStart(2, "0")}`}
                            className="h-7 text-xs bg-white border-slate-200"
                          />
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {(af.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCbAudioFile(af.id)}
                            className="size-6 grid place-items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded shrink-0 transition"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
                    <Sparkles className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      Hệ thống sẽ tự động tạo thư mục mang tên cuốn sách (chứa file PDF sách) và thư mục con <b>"🎧 Audio bài nghe (Tracks)"</b> chứa toàn bộ các file audio trong các lớp được phân phối.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    1. Tên thư mục phân loại tài liệu <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="VD: 📚 Sách giáo khoa & Giáo trình chính thức"
                    className="h-9.5 text-xs rounded-xl font-medium"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Gợi ý nhanh:</span>
                    {FOLDER_PRESETS.map((pst) => (
                      <button
                        key={pst}
                        type="button"
                        onClick={() => setFolderName(pst)}
                        className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      >
                        {pst}
                      </button>
                    ))}
                  </div>
                </div>

                {/* VÙNG CHỌN TỆP */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-800">
                    2. Chọn các tệp tài liệu cần phân phối (Sách giáo khoa, Slide, Audio, Word...)
                  </Label>
                  <div className="p-6 border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-2xl bg-emerald-50/20 text-center transition">
                    <input
                      type="file"
                      multiple
                      id="global-distribute-file-input"
                      className="hidden"
                      onChange={handleSelectFiles}
                    />
                    <label
                    htmlFor="global-distribute-file-input"
                    className="cursor-pointer flex flex-col items-center gap-2 text-slate-600"
                  >
                    <div className="size-12 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shadow-sm">
                      <Upload className="size-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Bấm để chọn nhiều tệp tin hoặc kéo thả vào đây
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Hỗ trợ PDF sách giáo khoa, Slide bài giảng (PPT/PDF), File nghe MP3...
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm mt-1">
                      Duyệt tìm tệp trên máy tính
                    </span>
                  </label>
                </div>

                {/* DANH SÁCH TỆP CHỜ PHÂN PHỐI */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Danh sách tệp chờ phân phối ({uploadFiles.length})
                      </span>
                      <label
                        htmlFor="global-distribute-file-input"
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="size-3" /> Chọn thêm tệp
                      </label>
                    </div>

                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/50">
                      {uploadFiles.map((uf) => (
                        <div key={uf.id} className="p-2.5 flex items-center gap-2.5 text-xs bg-white">
                          <div
                            className={`size-8 rounded-lg grid place-items-center shrink-0 ${
                              uf.fileType === "AUDIO"
                                ? "bg-purple-50 text-purple-600"
                                : uf.fileType === "PDF"
                                ? "bg-rose-50 text-rose-600"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {uf.fileType === "AUDIO" ? (
                              <Music className="size-4" />
                            ) : uf.fileType === "PDF" ? (
                              <FileText className="size-4" />
                            ) : (
                              <File className="size-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <Input
                              value={uf.title}
                              onChange={(e) => handleUpdateFileTitle(uf.id, e.target.value)}
                              placeholder="Tên tài liệu..."
                              className="h-7 text-xs bg-white border-slate-200"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                              <span className="truncate max-w-[150px]">{uf.file.name}</span>
                              <span>•</span>
                              <span>{(uf.size / (1024 * 1024)).toFixed(2)} MB</span>
                            </div>
                          </div>

                          <select
                            value={uf.fileType}
                            onChange={(e) => handleUpdateFileType(uf.id, e.target.value)}
                            className="h-7 text-[11px] rounded-lg border border-slate-200 bg-white px-1.5 text-slate-700 shrink-0 font-medium"
                          >
                            <option value="PDF">PDF</option>
                            <option value="AUDIO">Audio</option>
                            <option value="DOCUMENT">Tài liệu</option>
                            <option value="VIDEO">Video</option>
                            <option value="OTHER">Khác</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveFile(uf.id)}
                            className="size-7 grid place-items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 transition"
                            title="Gỡ khỏi danh sách"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

            {/* CỘT PHẢI: CHỌN PHẠM VI PHÂN PHỐI (THEO TRÌNH ĐỘ HOẶC CHỌN LỚP) */}
            <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-bold text-slate-800">
                    3. Chọn phương thức phân phối tài liệu
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setDistributionMode("BY_LEVEL")}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                        distributionMode === "BY_LEVEL"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <b className="block text-slate-900">🌟 Theo Trình độ (Level)</b>
                      <span className="text-[11px] text-slate-500 font-normal">
                        VD: Sách giáo khoa cho toàn bộ lớp High-level
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDistributionMode("BY_CLASSES")}
                      className={`p-3 rounded-xl border text-xs font-semibold text-left transition ${
                        distributionMode === "BY_CLASSES"
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <b className="block text-slate-900">👥 Chọn nhiều Lớp học cụ thể</b>
                      <span className="text-[11px] text-slate-500 font-normal">
                        VD: Giáo viên phân phối slide cho các lớp mình dạy
                      </span>
                    </button>
                  </div>
                </div>

                {/* NẾU CHỌN THEO TRÌNH ĐỘ (BY_LEVEL) */}
                {distributionMode === "BY_LEVEL" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Tích chọn các Trình độ áp dụng:</Label>
                    <div className="space-y-2">
                      {LEVEL_OPTIONS.map((lvl) => {
                        const isChecked = lvl.keywords.some((kw) => selectedLevels.includes(kw));
                        return (
                          <label
                            key={lvl.code}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                              isChecked
                                ? "border-emerald-300 bg-emerald-50/60"
                                : "border-slate-200 bg-white hover:bg-slate-100"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedLevels((prev) => prev.filter((k) => !lvl.keywords.includes(k)));
                                } else {
                                  setSelectedLevels((prev) => [...prev, ...lvl.keywords]);
                                }
                              }}
                              className="size-4 rounded accent-emerald-600 mt-0.5"
                            />
                            <div>
                              <b className="text-xs text-slate-900 block">{lvl.label}</b>
                              <span className="text-[11px] text-slate-500">{lvl.desc}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* NẾU CHỌN THEO DANH SÁCH LỚP HỌC (BY_CLASSES) */}
                {distributionMode === "BY_CLASSES" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-700">Tích chọn các Lớp học nhận tài liệu:</Label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedClassIds(activeClasses.map((c) => c.id))}
                          className="text-[11px] text-emerald-700 font-semibold hover:underline"
                        >
                          Chọn tất cả
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedClassIds([])}
                          className="text-[11px] text-slate-500 font-semibold hover:underline"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white p-1">
                      {activeClasses.map((cls) => {
                        const isChecked = selectedClassIds.includes(cls.id);
                        return (
                          <label
                            key={cls.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none text-xs ${
                              isChecked ? "bg-emerald-50/70 text-emerald-900 font-semibold" : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedClassIds((prev) =>
                                    prev.includes(cls.id) ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
                                  );
                                }}
                                className="size-4 rounded accent-emerald-600"
                              />
                              <span>{cls.name}</span>
                            </div>
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                              {cls.code}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Preview số lượng lớp nhận tài liệu */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>
                      Sẽ phân phối đồng bộ tới: <b>{getTargetClassesCount()} lớp học</b>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {distributePackageType === "COURSEBOOK"
                      ? `1 PDF + ${cbAudioFiles.length} Audio`
                      : `${uploadFiles.length} tệp tin`}
                  </span>
                </div>
              </div>

              {/* Nút Thực thi */}
              <div className="pt-4 border-t border-slate-200">
                <Button
                  onClick={handleExecuteDistribution}
                  disabled={
                    isPending ||
                    getTargetClassesCount() === 0 ||
                    (distributePackageType === "COURSEBOOK"
                      ? !cbTitle.trim() || !cbPdfFile || cbAudioFiles.length === 0
                      : uploadFiles.length === 0)
                  }
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-2 shadow-sm"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  <span>
                    {distributePackageType === "COURSEBOOK"
                      ? `Xác nhận phân phối Gói SGK & Audio tới ${getTargetClassesCount()} lớp học`
                      : `Xác nhận phân phối tài liệu tới ${getTargetClassesCount()} lớp học ngay`}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL POPUP: PHÂN PHỐI HỌC LIỆU HÀNG LOẠT (KÍCH HOẠT TỪ NÚT ĐẦU TRANG)
          ======================================================== */}
      <Dialog open={isDistributeModalOpen} onOpenChange={setIsDistributeModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="size-5 text-[#EA580C]" /> Phân phối Học liệu Hàng loạt theo Lớp / Trình độ
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tải lên Sách giáo khoa, Slide bài giảng, file Audio và phân phối tự động cho toàn bộ lớp High-level hoặc các lớp bạn phụ trách.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Toggle Định dạng phân phối */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
              <button
                type="button"
                onClick={() => setDistributePackageType("NORMAL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  distributePackageType === "NORMAL"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="size-3.5" />
                Tệp lẻ thông thường
              </button>
              <button
                type="button"
                onClick={() => setDistributePackageType("COURSEBOOK")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  distributePackageType === "COURSEBOOK"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-indigo-600"
                }`}
              >
                <BookOpen className="size-3.5" />
                📚 Gói SGK & Audio trọn bộ
              </button>
            </div>

            {distributePackageType === "COURSEBOOK" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Tên Bộ Sách giáo khoa chính <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={cbTitle}
                    onChange={(e) => setCbTitle(e.target.value)}
                    placeholder="VD: Mindset for IELTS Level 3 (Student's Book)"
                    className="h-9 text-xs rounded-xl font-medium"
                  />
                  <Input
                    value={cbDesc}
                    onChange={(e) => setCbDesc(e.target.value)}
                    placeholder="Mô tả bộ sách (không bắt buộc)..."
                    className="h-8 text-xs rounded-xl text-slate-600 bg-slate-50/50"
                  />
                </div>

                {/* File PDF Sách */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-800">
                    File PDF Sách giáo khoa chính <span className="text-rose-500">*</span>
                  </Label>
                  <div className="p-3.5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl bg-indigo-50/20 text-center transition">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      id="modal-dist-cb-pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCbPdfFile(file);
                          if (!cbTitle.trim()) {
                            setCbTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                          }
                        }
                      }}
                    />
                    {cbPdfFile ? (
                      <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-indigo-100 shadow-sm text-left">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="size-4 text-rose-600 shrink-0" />
                          <span className="font-bold text-xs text-slate-900 truncate">{cbPdfFile.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {(cbPdfFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                        <label
                          htmlFor="modal-dist-cb-pdf"
                          className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer shrink-0 ml-2"
                        >
                          Đổi
                        </label>
                      </div>
                    ) : (
                      <label htmlFor="modal-dist-cb-pdf" className="cursor-pointer flex flex-col items-center gap-1 text-slate-600">
                        <Upload className="size-5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800">Chọn tệp PDF sách giáo khoa</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Audio files */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800">
                      File Audio bài nghe ({cbAudioFiles.length} bài) <span className="text-rose-500">*</span>
                    </Label>
                    {cbAudioFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCbAudioFiles([])}
                        className="text-[10px] text-rose-600 hover:underline font-semibold"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  <div className="p-3 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-xl bg-purple-50/20 text-center transition">
                    <input
                      type="file"
                      multiple
                      accept="audio/*,.mp3,.wav,.m4a"
                      id="modal-dist-cb-audio"
                      className="hidden"
                      onChange={handleSelectCbAudioFiles}
                    />
                    <label htmlFor="modal-dist-cb-audio" className="cursor-pointer flex flex-col items-center gap-1 text-slate-600">
                      <Music className="size-5 text-purple-600" />
                      <span className="text-xs font-bold text-slate-800">
                        {cbAudioFiles.length > 0 ? `Đã chọn ${cbAudioFiles.length} audio (Bấm để thêm)` : "Chọn nhiều file Audio bài nghe (MP3)"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800">
                    Tên thư mục lưu trữ trong lớp <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="VD: 📚 Sách giáo khoa & Giáo trình chính thức"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {/* Vùng chọn file */}
                <div className="p-5 border-2 border-dashed border-orange-200 hover:border-orange-400 rounded-2xl bg-orange-50/20 text-center transition">
                  <input
                    type="file"
                    multiple
                    id="modal-distribute-file-input"
                    className="hidden"
                    onChange={handleSelectFiles}
                  />
                  <label
                    htmlFor="modal-distribute-file-input"
                    className="cursor-pointer flex flex-col items-center gap-1.5 text-slate-600"
                  >
                    <Upload className="size-6 text-[#EA580C]" />
                    <p className="text-xs font-bold text-slate-800">Bấm để chọn các tệp tài liệu cần phân phối</p>
                    <p className="text-[11px] text-slate-500">PDF, PPTX, DOCX, MP3...</p>
                    <span className="px-3 py-1 text-xs bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl font-semibold shadow-sm mt-1">
                      Chọn tệp máy tính ({uploadFiles.length} đã chọn)
                    </span>
                  </label>
                </div>
              </>
            )}

            {/* Chọn chế độ phân phối */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">Phạm vi phân phối</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDistributionMode("BY_LEVEL")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                    distributionMode === "BY_LEVEL"
                      ? "border-[#EA580C] bg-orange-50 text-orange-950 ring-2 ring-orange-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <b className="block">Theo Trình độ (VD: High Level)</b>
                  <span className="text-[10px] text-slate-500 font-normal">Tự động nạp vào mọi lớp thuộc trình độ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDistributionMode("BY_CLASSES")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                    distributionMode === "BY_CLASSES"
                      ? "border-[#EA580C] bg-orange-50 text-orange-950 ring-2 ring-orange-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <b className="block">Chọn nhiều Lớp cụ thể</b>
                  <span className="text-[10px] text-slate-500 font-normal">Tích chọn các lớp bạn đang phụ trách</span>
                </button>
              </div>
            </div>

            {/* Xem trước lớp nhận */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-800 block mb-1">
                Lớp học sẽ nhận được tài liệu ({getTargetClassesCount()} lớp):
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {targetClassesList.map((c) => (
                  <span key={c.id} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700 font-medium">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDistributeModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteDistribution}
              disabled={
                isPending ||
                getTargetClassesCount() === 0 ||
                (distributePackageType === "COURSEBOOK"
                  ? !cbTitle.trim() || !cbPdfFile || cbAudioFiles.length === 0
                  : uploadFiles.length === 0)
              }
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold gap-1.5 shadow-sm"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Sparkles className="size-3.5" />}
              Phân phối tới {getTargetClassesCount()} lớp học
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL 9: NẠP BỘ SÁCH GIÁO KHOA & AUDIO TRỰC TIẾP VÀO KHO TRÌNH ĐỘ (LEVEL REPO)
          ======================================================== */}
      <Dialog open={isLevelCoursebookModalOpen} onOpenChange={setIsLevelCoursebookModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="size-5 text-indigo-600" />
              Nạp Bộ Sách giáo khoa & Toàn bộ Audio vào Kho Trình độ
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Nạp giáo trình chuẩn 1 lần duy nhất ở cấp Trình độ. Toàn bộ các lớp thuộc trình độ này sẽ tự động kế thừa và hiển thị học liệu này!
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Chọn Trình độ */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Trình độ IELTS áp dụng <span className="text-rose-500">*</span>
              </Label>
              <select
                value={targetLevelForCb}
                onChange={(e) => setTargetLevelForCb(e.target.value)}
                className="w-full h-9.5 text-xs rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-800"
              >
                <option value="lvl-advanced">🌟 High Level (Band 6.5 - 7.5+ / Nâng cao)</option>
                <option value="lvl-medium">📘 Intermediate (Band 5.0 - 6.5 / Bứt phá)</option>
                <option value="lvl-basic">📗 Foundation (Band 4.0 - 5.0 / Nền tảng)</option>
              </select>
            </div>

            {/* Tên bộ sách */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Tên Bộ Sách giáo khoa chính <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={cbTitle}
                onChange={(e) => setCbTitle(e.target.value)}
                placeholder="VD: Mindset for IELTS Level 3 (Student's Book)"
                className="h-9 text-xs rounded-xl font-medium"
              />
              <Input
                value={cbDesc}
                onChange={(e) => setCbDesc(e.target.value)}
                placeholder="Mô tả tóm tắt bộ sách (tùy chọn)..."
                className="h-8 text-xs rounded-xl text-slate-600 bg-slate-50/50"
              />
            </div>

            {/* File PDF Sách */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Tệp PDF Sách giáo khoa chính <span className="text-rose-500">*</span>
              </Label>
              <div className="p-4 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl bg-indigo-50/20 text-center transition">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  id="level-cb-pdf-file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCbPdfFile(file);
                      if (!cbTitle.trim()) {
                        setCbTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                      }
                    }
                  }}
                />
                {cbPdfFile ? (
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-indigo-100 shadow-sm text-left">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="size-9 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">{cbPdfFile.name}</p>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(cbPdfFile.size / (1024 * 1024)).toFixed(2)} MB • Sách giáo khoa PDF
                        </span>
                      </div>
                    </div>
                    <label
                      htmlFor="level-cb-pdf-file"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer shrink-0 ml-2"
                    >
                      Đổi file
                    </label>
                  </div>
                ) : (
                  <label htmlFor="level-cb-pdf-file" className="cursor-pointer flex flex-col items-center gap-1.5 text-slate-600">
                    <Upload className="size-6 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Chọn 1 tệp Sách giáo khoa PDF</span>
                    <span className="text-[11px] text-slate-500">Định dạng file PDF chuẩn giáo trình</span>
                  </label>
                )}
              </div>
            </div>

            {/* Các file Audio bài nghe */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Toàn bộ file Audio bài nghe ({cbAudioFiles.length} bài) <span className="text-rose-500">*</span>
                </Label>
                {cbAudioFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCbAudioFiles([])}
                    className="text-[10px] text-rose-600 hover:underline font-semibold"
                  >
                    Xóa tất cả audio
                  </button>
                )}
              </div>

              <div className="p-4 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl bg-purple-50/20 text-center transition">
                <input
                  type="file"
                  multiple
                  accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                  id="level-cb-audio-files"
                  className="hidden"
                  onChange={handleSelectCbAudioFiles}
                />
                <label htmlFor="level-cb-audio-files" className="cursor-pointer flex flex-col items-center gap-1 text-slate-600">
                  <Music className="size-6 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800">Chọn nhiều file Audio bài nghe (MP3, WAV...)</span>
                  <span className="text-[11px] text-slate-500">Giữ Ctrl / Shift để chọn tất cả file audio bài nghe</span>
                  <span className="mt-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm">
                    Duyệt tìm tệp Audio ({cbAudioFiles.length} đã chọn)
                  </span>
                </label>
              </div>

              {/* Danh sách tracks audio đã chọn */}
              {cbAudioFiles.length > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50/50">
                  {cbAudioFiles.map((af, idx) => (
                    <div key={af.id} className="p-2 flex items-center gap-2 text-xs bg-white">
                      <span className="size-6 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-bold grid place-items-center shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        value={af.title}
                        onChange={(e) => handleUpdateCbAudioTitle(af.id, e.target.value)}
                        placeholder={`Track ${(idx + 1).toString().padStart(2, "0")}`}
                        className="h-7 text-xs bg-white border-slate-200"
                      />
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {(af.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCbAudioFile(af.id)}
                        className="size-6 grid place-items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded shrink-0 transition"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Thông báo cơ chế kế thừa */}
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5">
              <Sparkles className="size-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <b className="block">Cơ chế Kế thừa Tự động (Zero Physical Copy):</b>
                <span className="text-[11px] text-indigo-800">
                  Hệ thống tự động tạo thư mục mang tên sách (chứa file PDF sách) và thư mục con "🎧 Audio bài nghe (Tracks)". Mọi lớp học thuộc trình độ này sẽ tự động xuất hiện bộ giáo trình chuẩn này trong danh mục tài liệu của lớp!
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLevelCoursebookModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteLevelCoursebookUpload}
              disabled={isPending || !cbTitle.trim() || !cbPdfFile || cbAudioFiles.length === 0}
              className="text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1" />
              ) : (
                <BookOpen className="size-3.5" />
              )}
              Nạp Giáo trình & Audio vào Trình độ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL THÔNG BÁO POPUP TIẾNG VIỆT
          ======================================================== */}
      {alertModal && (
        <Dialog open={alertModal.isOpen} onOpenChange={() => setAlertModal(null)}>
          <DialogContent className="max-w-sm rounded-2xl p-6 text-center">
            <div className="flex justify-center mb-3">
              <div
                className={`size-12 rounded-2xl grid place-items-center border ${
                  alertModal.type === "success"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : alertModal.type === "error"
                    ? "bg-rose-50 text-rose-600 border-rose-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                {alertModal.type === "success" ? (
                  <CheckCircle2 className="size-6" />
                ) : alertModal.type === "error" ? (
                  <AlertCircle className="size-6" />
                ) : (
                  <AlertTriangle className="size-6" />
                )}
              </div>
            </div>

            <DialogTitle className="text-sm font-bold text-slate-900">
              {alertModal.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2 leading-relaxed">
              {alertModal.message}
            </DialogDescription>

            <DialogFooter className="mt-4 flex justify-center sm:justify-center">
              <Button
                size="sm"
                onClick={() => setAlertModal(null)}
                className="text-xs rounded-xl px-6 bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold"
              >
                Đã hiểu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
