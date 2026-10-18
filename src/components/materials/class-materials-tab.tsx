"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Folder,
  FolderPlus,
  Upload,
  FileText,
  Music,
  File,
  Eye,
  Download,
  Trash2,
  ChevronRight,
  Home,
  Loader2,
  X,
  Play,
  Pause,
  Volume2,
  Search,
  ExternalLink,
  AlertCircle,
  Edit3,
  Layers,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Check,
  BookOpen,
  Disc,
  Radio,
  Lock,
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
  getMaterialFoldersAction,
  createMaterialFolderAction,
  deleteMaterialFolderAction,
  getLearningMaterialsAction,
  uploadLearningMaterialAction,
  uploadMultipleLearningMaterialsAction,
  updateLearningMaterialAction,
  deleteLearningMaterialAction,
  incrementMaterialDownloadCountAction,
  uploadCoursebookPackageAction,
} from "@/actions/materials";

interface ClassMaterialsTabProps {
  classId: string;
  className: string;
  currentUser: {
    id?: string;
    role: string;
    fullName?: string;
  };
}

export function ClassMaterialsTab({
  classId,
  className,
  currentUser,
}: ClassMaterialsTabProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<any | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal thông báo & xác nhận an toàn thay thế alert/confirm native
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "warning" | "error" | "success" | "info";
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showAlert = (
    title: string,
    message: string,
    type: "warning" | "error" | "success" | "info" = "warning"
  ) => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  // Modal tạo Folder mới
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderDesc, setFolderDesc] = useState("");
  const [createFolderLocation, setCreateFolderLocation] = useState<"CURRENT" | "ROOT">("CURRENT");

  // Modal tải 1 tệp lên
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialType, setMaterialType] = useState<"PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER">("PDF");
  const [materialUrl, setMaterialUrl] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  // Modal Tải trọn gói Sách giáo khoa & Toàn bộ Audio bài nghe (Coursebook Package)
  const [isCoursebookModalOpen, setIsCoursebookModalOpen] = useState(false);
  const [cbTitle, setCbTitle] = useState("");
  const [cbDescription, setCbDescription] = useState("");
  const [cbPdfFile, setCbPdfFile] = useState<File | null>(null);
  const [cbAudioFiles, setCbAudioFiles] = useState<
    Array<{
      id: string;
      file: File;
      title: string;
      size: number;
    }>
  >([]);

  // Modal tải lên HÀNG LOẠT (Bulk Upload)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkFolderId, setBulkFolderId] = useState("");
  const [bulkFiles, setBulkFiles] = useState<
    Array<{
      id: string;
      file: File;
      title: string;
      fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
      size: number;
    }>
  >([]);

  // Modal Chỉnh sửa tài liệu (Edit Material)
  const [editMaterialModal, setEditMaterialModal] = useState<{
    isOpen: boolean;
    materialId: string;
    title: string;
    fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
  } | null>(null);

  // Modal Xem trước (Preview)
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Helper chuyển đổi URL xem PDF an toàn, tránh bị ép tải về máy
  const getSafePdfUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("blob:") || url.startsWith("/") || url.startsWith("data:")) {
      return url;
    }
    return `/api/pdf-proxy?url=${encodeURIComponent(url)}`;
  };

  const canManage =
    currentUser.role === "ADMIN" ||
    currentUser.role === "TEACHER" ||
    currentUser.role === "SCHOOL_MANAGER";

  // Tải danh sách thư mục
  const loadFolders = async (parentId?: string | null) => {
    setIsLoading(true);
    const res = await getMaterialFoldersAction({
      classId,
      parentId: parentId === undefined ? null : parentId,
    });
    if (res.success) {
      setFolders(res.folders || []);
    }
    setIsLoading(false);
  };

  // Tải danh sách tài liệu trong thư mục hiện tại
  const loadMaterials = async (folderId: string) => {
    setIsLoading(true);
    const res = await getLearningMaterialsAction(folderId);
    if (res.success) {
      setMaterials(res.materials || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadFolders(null);
  }, [classId]);

  // Điều hướng vào thư mục
  const handleOpenFolder = (folder: any) => {
    setCurrentFolder(folder);
    setFolderBreadcrumbs((prev) => [...prev, folder]);
    loadMaterials(folder.id);
  };

  // Điều hướng về thư mục gốc
  const handleBackToRoot = () => {
    setCurrentFolder(null);
    setFolderBreadcrumbs([]);
    setMaterials([]);
    loadFolders(null);
  };

  // Điều hướng đến cấp breadcrumb cụ thể
  const handleBreadcrumbClick = (folder: any, index: number) => {
    setCurrentFolder(folder);
    setFolderBreadcrumbs((prev) => prev.slice(0, index + 1));
    loadMaterials(folder.id);
  };

  // Tạo thư mục mới (mô hình phẳng 1 cấp cho lớp học)
  const handleCreateFolder = () => {
    if (!folderName.trim()) {
      showAlert("Thiếu tên thư mục", "Vui lòng nhập tên cho thư mục!", "warning");
      return;
    }
    startTransition(async () => {
      const res = await createMaterialFolderAction({
        name: folderName.trim(),
        description: folderDesc.trim() || undefined,
        classId,
        parentId: null,
      });

      if (res.success) {
        setIsCreateFolderOpen(false);
        setFolderName("");
        setFolderDesc("");
        loadFolders(null);
        showAlert("Thành công", `Đã tạo thư mục "${folderName.trim()}" thành công!`, "success");
      } else {
        showAlert("Lỗi tạo thư mục", res.error || "Không thể tạo thư mục!", "error");
      }
    });
  };

  // Xóa thư mục an toàn
  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa thư mục",
      message: `Bạn có chắc muốn xóa thư mục "${folderName}" cùng toàn bộ tài liệu bên trong? Hệ thống áp dụng cơ chế xóa mềm an toàn.`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteMaterialFolderAction(folderId);
          if (res.success) {
            if (currentFolder && currentFolder.id === folderId) {
              handleBackToRoot();
            } else {
              loadFolders(null);
            }
            showAlert("Thành công", `Đã xóa thư mục "${folderName}"!`, "success");
          } else {
            showAlert("Lỗi", res.error || "Xóa thư mục thất bại!", "error");
          }
        });
      },
    });
  };

  // Tải tài liệu lên (Hỗ trợ chọn thư mục đích)
  const handleUploadMaterial = () => {
    const targetFolderId =
      uploadTargetFolderId || (currentFolder ? currentFolder.id : folders[0]?.id);

    if (!targetFolderId) {
      showAlert("Chưa chọn thư mục", "Vui lòng mở hoặc chọn một thư mục để tải tài liệu vào!", "warning");
      return;
    }
    if (!materialTitle.trim()) {
      showAlert("Thiếu tên tài liệu", "Vui lòng nhập tên cho tài liệu!", "warning");
      return;
    }

    startTransition(async () => {
      let finalUrl = materialUrl.trim();
      let fileName = materialTitle.trim();
      let fileSize = 1024 * 1024 * 2; // Demo 2MB

      if (materialFile) {
        fileName = materialFile.name;
        fileSize = materialFile.size;
        finalUrl = URL.createObjectURL(materialFile);
      }

      if (!finalUrl) {
        finalUrl =
          materialType === "AUDIO"
            ? "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
            : "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
      }

      const res = await uploadLearningMaterialAction({
        folderId: targetFolderId,
        title: materialTitle.trim(),
        fileName,
        fileSize,
        fileType: materialType,
        fileUrl: finalUrl,
        mimeType: materialType === "AUDIO" ? "audio/mpeg" : "application/pdf",
      });

      if (res.success) {
        setIsUploadOpen(false);
        setMaterialTitle("");
        setMaterialUrl("");
        setMaterialFile(null);
        if (currentFolder && currentFolder.id === targetFolderId) {
          loadMaterials(currentFolder.id);
        } else if (!currentFolder) {
          loadFolders(null);
        }
        showAlert("Thành công", `Đã tải lên tài liệu "${materialTitle.trim()}"!`, "success");
      } else {
        showAlert("Lỗi tải lên", res.error || "Không thể tải lên tài liệu!", "error");
      }
    });
  };

  // Chọn nhiều files Audio cho Gói Sách & Audio
  const handleSelectCbAudioFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const newAudios: Array<{
      id: string;
      file: File;
      title: string;
      size: number;
    }> = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      newAudios.push({
        id: `cba-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
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
    setCbAudioFiles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, title: newTitle } : a))
    );
  };

  // Thực thi tải lên trọn gói Sách & Audio (Coursebook Package)
  const handleExecuteCoursebookUpload = () => {
    if (!cbTitle.trim()) {
      showAlert("Thiếu tên bộ sách", "Vui lòng nhập tên cho bộ sách giáo khoa (VD: Mindset for IELTS Level 2)!", "warning");
      return;
    }
    if (!cbPdfFile) {
      showAlert("Thiếu file Sách PDF", "Vui lòng chọn 1 tệp Sách giáo khoa định dạng PDF!", "warning");
      return;
    }
    if (cbAudioFiles.length === 0) {
      showAlert("Thiếu file Audio bài nghe", "Vui lòng chọn ít nhất 1 file âm thanh bài nghe (MP3)!", "warning");
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
        targetType: "CLASS",
        classId,
        parentId: currentFolder ? currentFolder.id : null,
        packageTitle: cbTitle.trim(),
        packageDescription: cbDescription.trim() || undefined,
        bookFile,
        audioFiles,
      });

      if (res.success) {
        setIsCoursebookModalOpen(false);
        setCbTitle("");
        setCbDescription("");
        setCbPdfFile(null);
        setCbAudioFiles([]);
        loadFolders(currentFolder ? currentFolder.id : null);
        showAlert(
          "Tải lên trọn gói Sách & Audio thành công!",
          `Đã tạo thư mục "${cbTitle.trim()}" chứa 1 file PDF và thư mục con "🎧 Audio bài nghe" với ${audioFiles.length} bài nghe gọn gàng!`,
          "success"
        );
      } else {
        showAlert("Lỗi tải lên", res.error || "Không thể tải lên trọn gói sách giáo khoa!", "error");
      }
    });
  };

  // Xóa tài liệu an toàn
  const handleDeleteMaterial = (materialId: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Xác nhận xóa tài liệu",
      message: `Bạn có chắc muốn xóa tài liệu "${title}" khỏi thư mục? Lịch sử tải về vẫn được bảo toàn theo quy định.`,
      onConfirm: () => {
        startTransition(async () => {
          const res = await deleteLearningMaterialAction(materialId);
          if (res.success) {
            if (currentFolder) loadMaterials(currentFolder.id);
            showAlert("Thành công", `Đã xóa tài liệu "${title}"!`, "success");
          } else {
            showAlert("Lỗi", res.error || "Xóa tài liệu thất bại!", "error");
          }
        });
      },
    });
  };

  // Mở modal tải lên hàng loạt (Bulk Upload)
  const handleOpenBulkUpload = () => {
    setBulkFolderId(currentFolder ? currentFolder.id : folders[0]?.id || "");
    setBulkFiles([]);
    setIsBulkUploadOpen(true);
  };

  // Chọn nhiều files cho Bulk Upload
  const handleSelectBulkFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        id: `bulk-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        title: cleanTitle,
        fileType: autoType,
        size: file.size,
      });
    }

    setBulkFiles((prev) => [...prev, ...newFiles]);
  };

  // Gỡ 1 file khỏi danh sách chờ tải lên hàng loạt
  const handleRemoveBulkFile = (id: string) => {
    setBulkFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Sửa tên hiển thị file trong danh sách bulk
  const handleUpdateBulkFileTitle = (id: string, newTitle: string) => {
    setBulkFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, title: newTitle } : f))
    );
  };

  // Sửa loại tệp trong danh sách bulk
  const handleUpdateBulkFileType = (id: string, newType: any) => {
    setBulkFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, fileType: newType } : f))
    );
  };

  // Thực thi tải lên hàng loạt
  const handleExecuteBulkUpload = () => {
    if (!bulkFolderId) {
      showAlert("Chưa chọn thư mục", "Vui lòng chọn thư mục đích để lưu trữ tài liệu tải lên!", "warning");
      return;
    }
    if (bulkFiles.length === 0) {
      showAlert("Chưa có tệp", "Vui lòng chọn ít nhất 1 tệp tài liệu để tải lên!", "warning");
      return;
    }

    startTransition(async () => {
      const payload = bulkFiles.map((item) => ({
        title: item.title.trim() || item.file.name,
        fileName: item.file.name,
        fileSize: item.size,
        fileType: item.fileType,
        fileUrl: URL.createObjectURL(item.file),
        mimeType: item.file.type || undefined,
      }));

      const res = await uploadMultipleLearningMaterialsAction({
        folderId: bulkFolderId,
        materials: payload,
      });

      if (res.success) {
        setIsBulkUploadOpen(false);
        setBulkFiles([]);
        if (currentFolder && currentFolder.id === bulkFolderId) {
          loadMaterials(bulkFolderId);
        } else if (!currentFolder) {
          loadFolders(null);
        }
        showAlert(
          "Tải lên hàng loạt thành công!",
          `Đã tải lên thành công ${res.count || payload.length} tài liệu vào thư mục!`,
          "success"
        );
      } else {
        showAlert("Lỗi tải lên hàng loạt", res.error || "Không thể tải lên danh sách tài liệu!", "error");
      }
    });
  };

  // Mở modal sửa tài liệu
  const handleOpenEditMaterial = (mat: any) => {
    setEditMaterialModal({
      isOpen: true,
      materialId: mat.id,
      title: mat.title,
      fileType: mat.fileType,
    });
  };

  // Thực thi sửa tài liệu
  const handleExecuteEditMaterial = () => {
    if (!editMaterialModal) return;
    if (!editMaterialModal.title.trim()) {
      showAlert("Thiếu tên tài liệu", "Vui lòng nhập tên tài liệu!", "warning");
      return;
    }

    startTransition(async () => {
      const res = await updateLearningMaterialAction({
        materialId: editMaterialModal.materialId,
        title: editMaterialModal.title.trim(),
        fileType: editMaterialModal.fileType,
      });

      if (res.success) {
        setEditMaterialModal(null);
        if (currentFolder) loadMaterials(currentFolder.id);
        showAlert("Thành công", "Đã cập nhật thông tin tài liệu!", "success");
      } else {
        showAlert("Lỗi", res.error || "Không thể cập nhật tài liệu!", "error");
      }
    });
  };

  // Tải xuống tài liệu
  const handleDownload = async (material: any) => {
    await incrementMaterialDownloadCountAction(material.id);
    const link = document.createElement("a");
    link.href = material.fileUrl;
    link.download = material.fileName || material.title;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lọc tài liệu theo từ khóa tìm kiếm
  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Thanh điều hướng & tác vụ đầu trang */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          {currentFolder ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackToRoot}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <ChevronRight className="size-3.5 rotate-180 text-slate-600" /> Quay lại danh sách thư mục
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-semibold text-slate-500 truncate max-w-[200px] sm:max-w-xs">{currentFolder.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Home className="size-3.5 text-[#EA580C]" />
              <span>Thư mục gốc kho học liệu</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-0.5">
            <h2 className="text-lg font-bold text-slate-900">
              {currentFolder ? currentFolder.name : `Kho học liệu lớp ${className}`}
            </h2>
            {currentFolder?.isInherited && (
              <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                🌟 Giáo trình chuẩn Trình độ
              </Badge>
            )}
          </div>

          <p className="text-xs text-slate-500">
            {currentFolder
              ? currentFolder.description || "Danh sách tài liệu học tập, giáo trình và bài giảng trong thư mục."
              : `Tổng hợp toàn bộ học liệu, sách giáo khoa và tài liệu giảng dạy của lớp.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài liệu, thư mục..."
              className="pl-9 h-9 text-xs rounded-xl border-slate-200"
            />
          </div>

          {canManage && (
            <>
              {!currentFolder ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateFolderOpen(true)}
                    className="h-9 px-3 text-xs rounded-xl border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-700 font-semibold gap-1.5 shrink-0"
                  >
                    <FolderPlus className="size-4 text-[#EA580C]" /> Tạo thư mục
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleOpenBulkUpload}
                    className="h-9 px-3.5 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5 shadow-sm shrink-0"
                  >
                    <Upload className="size-4" /> Tải tài liệu lên
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setBulkFolderId(currentFolder.id);
                      setBulkFiles([]);
                      setIsBulkUploadOpen(true);
                    }}
                    className="h-9 px-3.5 text-xs bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold rounded-xl gap-1.5 shadow-sm shrink-0"
                  >
                    <Upload className="size-4" /> Thêm tài liệu vào thư mục này
                  </Button>

                  {!currentFolder.isInherited && (
                    <button
                      onClick={() => handleDeleteFolder(currentFolder.id, currentFolder.name)}
                      className="size-9 grid place-items-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition shrink-0"
                      title="Xóa thư mục này"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hiển thị Nội dung Kho học liệu */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-500 gap-2">
          <Loader2 className="size-6 animate-spin text-[#EA580C]" />
          <span className="text-xs font-semibold">Đang tải kho học liệu...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {!currentFolder ? (
            /* ========================================================
               1. CẤP GỐC: DANH SÁCH CÁC THƯ MỤC CỦA LỚP (GRID)
               ======================================================== */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Folder className="size-4 text-[#EA580C]" />
                  Danh mục Buổi học & Chuyên đề ({filteredFolders.length})
                </h3>
              </div>

              {filteredFolders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
                  <Folder className="size-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Chưa có thư mục học liệu nào</p>
                  <p className="text-xs text-slate-400 mt-0.5">Tạo thư mục để bắt đầu lưu trữ tài liệu theo buổi học hoặc giáo trình.</p>
                  {canManage && (
                    <Button
                      size="sm"
                      onClick={() => setIsCreateFolderOpen(true)}
                      className="mt-3 text-xs text-white bg-[#EA580C] hover:bg-[#C2410C] font-semibold rounded-xl gap-1.5"
                    >
                      <Plus className="size-3.5" /> Tạo thư mục đầu tiên
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className={`group p-4 bg-white rounded-2xl border transition-all flex flex-col justify-between ${
                        folder.isInherited
                          ? "border-indigo-200 bg-gradient-to-b from-indigo-50/30 to-white hover:border-indigo-400 hover:shadow-md"
                          : "border-slate-200 hover:border-orange-200 hover:shadow-md"
                      }`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => handleOpenFolder(folder)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div
                            className={`size-10 rounded-xl border grid place-items-center transition ${
                              folder.isInherited
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white"
                                : "bg-orange-50 border-orange-100 text-[#EA580C] group-hover:bg-[#EA580C] group-hover:text-white"
                            }`}
                          >
                            {folder.name.includes("Audio") || folder.name.includes("🎧") ? (
                              <Music className="size-5" />
                            ) : folder.name.includes("📚") || folder.isInherited ? (
                              <BookOpen className="size-5" />
                            ) : (
                              <Folder className="size-5" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {folder.isInherited && (
                              <Badge className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                                🌟 Giáo trình chuẩn
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200 font-semibold">
                              {folder.fileCount} tệp
                            </Badge>
                          </div>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#EA580C] transition truncate">
                          {folder.name}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {folder.description || (folder.isInherited ? "Giáo trình chuẩn của Trình độ do Trung tâm phê duyệt" : "Tài liệu học tập & luyện thi")}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{new Date(folder.createdAt).toLocaleDateString("vi-VN")}</span>
                        {canManage && !folder.isInherited && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(folder.id, folder.name);
                            }}
                            className="text-slate-400 hover:text-rose-600 transition p-1"
                            title="Xóa thư mục"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                        {folder.isInherited && (
                          <span className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1" title="Giáo trình kế thừa cấp trình độ, không thể xóa trực tiếp tại lớp">
                            <Lock className="size-3" /> Kế thừa chuẩn
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================
               2. TRONG THƯ MỤC: HIỂN THỊ TRỰC TIẾP TOÀN BỘ TÀI LIỆU
               ======================================================== */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="size-4 text-emerald-600" />
                    Tài liệu trong thư mục ({filteredMaterials.length})
                  </h3>
                  {currentFolder.isInherited && (
                    <span className="text-[11px] text-indigo-600 font-medium">
                      🌟 Giáo trình chuẩn của Trình độ được đồng bộ tự động
                    </span>
                  )}
                </div>

                {canManage && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setBulkFolderId(currentFolder.id);
                      setBulkFiles([]);
                      setIsBulkUploadOpen(true);
                    }}
                    className="h-8.5 px-3.5 text-xs bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold rounded-xl gap-1.5 shadow-sm"
                  >
                    <Plus className="size-3.5" /> Thêm tài liệu vào thư mục này
                  </Button>
                )}
              </div>

              {filteredMaterials.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500">
                  <File className="size-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Thư mục này chưa có tài liệu nào</p>
                  <p className="text-xs text-slate-400 mt-0.5">Bấm nút bên dưới để tải lên các tệp tài liệu (PDF, Audio, Slide...).</p>
                  {canManage && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setBulkFolderId(currentFolder.id);
                        setBulkFiles([]);
                        setIsBulkUploadOpen(true);
                      }}
                      className="mt-3 text-xs bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold rounded-xl gap-1.5"
                    >
                      <Plus className="size-3.5" /> Thêm tài liệu ngay
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                  {filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`size-10 rounded-xl grid place-items-center shrink-0 ${
                            material.fileType === "AUDIO"
                              ? "bg-purple-50 text-purple-600 border border-purple-200"
                              : material.fileType === "PDF"
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}
                        >
                          {material.fileType === "AUDIO" ? (
                            <Music className="size-5" />
                          ) : material.fileType === "PDF" ? (
                            <FileText className="size-5" />
                          ) : (
                            <File className="size-5" />
                          )}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {material.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                              {material.fileType}
                            </span>
                            <span>•</span>
                            <span>{(material.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                            <span>•</span>
                            <span>{new Date(material.createdAt).toLocaleDateString("vi-VN")}</span>
                            <span>•</span>
                            <span>Lượt tải: {material.downloadCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Các nút Xem trước, Tải về, Sửa & Xóa theo phân quyền */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewMaterial(material)}
                          className="h-8 px-3 text-xs rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold gap-1.5"
                        >
                          <Eye className="size-3.5 text-slate-600" /> Xem trước
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(material)}
                          className="h-8 px-3 text-xs rounded-xl border-orange-200 bg-orange-50/50 hover:bg-orange-100 text-[#EA580C] font-semibold gap-1.5"
                        >
                          <Download className="size-3.5" /> Tải về
                        </Button>

                        {canManage && (
                          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                            <button
                              onClick={() => handleOpenEditMaterial(material)}
                              className="size-8 grid place-items-center text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition"
                              title="Chỉnh sửa tài liệu"
                            >
                              <Edit3 className="size-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteMaterial(material.id, material.title)}
                              className="size-8 grid place-items-center text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                              title="Xóa tài liệu"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL 1: TẠO THƯ MỤC MỚI
          ======================================================== */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="size-5 text-[#EA580C]" /> Tạo thư mục học liệu mới
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Thư mục giúp phân loại tài liệu theo buổi học, chuyên đề kỹ năng hoặc giáo trình.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Tên thư mục <span className="text-rose-500">*</span></Label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="VD: Buổi 01 - Listening Overview"
                className="h-9 text-xs rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Mô tả chi tiết</Label>
              <Input
                value={folderDesc}
                onChange={(e) => setFolderDesc(e.target.value)}
                placeholder="VD: Giáo trình, Slide bài giảng và file nghe Section 1"
                className="h-9 text-xs rounded-xl border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateFolderOpen(false)}
              className="text-xs rounded-xl"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleCreateFolder}
              disabled={isPending || !folderName.trim()}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Tạo thư mục
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL 2: TẢI TÀI LIỆU LÊN
          ======================================================== */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="size-5 text-[#EA580C]" /> Tải tài liệu lên thư mục
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Chọn thư mục và tài liệu đính kèm cần lưu trữ vào lớp học.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Chọn thư mục đích */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Thư mục đích lưu trữ <span className="text-rose-500">*</span></Label>
              <select
                value={uploadTargetFolderId || (currentFolder ? currentFolder.id : folders[0]?.id || "")}
                onChange={(e) => setUploadTargetFolderId(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-slate-200 bg-white px-3 font-medium text-slate-800 focus:ring-1 focus:ring-orange-400"
              >
                {folders.length === 0 ? (
                  <option value="">(Chưa có thư mục - Hãy tạo thư mục trước)</option>
                ) : (
                  folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name} {f.isInherited ? "(🌟 Giáo trình chuẩn Trình độ)" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Tên tài liệu hiển thị <span className="text-rose-500">*</span></Label>
              <Input
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                placeholder="VD: Giáo trình Reading Skimming & Scanning - Buổi 1"
                className="h-9 text-xs rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Loại tài liệu</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: "PDF", label: "Tài liệu PDF", icon: FileText },
                  { type: "AUDIO", label: "File Nghe MP3", icon: Music },
                  { type: "DOCUMENT", label: "Văn bản Word", icon: File },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setMaterialType(item.type as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition ${
                      materialType === item.type
                        ? "border-[#EA580C] bg-orange-50 text-[#EA580C]"
                        : "border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Chọn tệp từ máy tính</Label>
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                <input
                  type="file"
                  id="material-file-upload"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setMaterialFile(f);
                      if (!materialTitle) setMaterialTitle(f.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                />
                <label
                  htmlFor="material-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-1 text-xs text-slate-500 hover:text-[#EA580C] transition"
                >
                  <Upload className="size-6 text-slate-400 mb-1" />
                  {materialFile ? (
                    <span className="font-bold text-slate-800">{materialFile.name} ({(materialFile.size / 1024).toFixed(0)} KB)</span>
                  ) : (
                    <span>Bấm vào đây để chọn tệp (PDF, MP3, DOCX)</span>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Hoặc dán đường dẫn trực tiếp (URL)</Label>
              <Input
                value={materialUrl}
                onChange={(e) => setMaterialUrl(e.target.value)}
                placeholder="https://example.com/audio-section-1.mp3"
                className="h-9 text-xs rounded-xl border-slate-200 font-mono text-[11px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(false)}
              className="text-xs rounded-xl"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleUploadMaterial}
              disabled={isPending || !materialTitle.trim()}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Xác nhận tải lên
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL 3: XEM TRƯỚC TRỰC TIẾP (PREVIEW MODAL)
          ======================================================== */}
      {previewMaterial && (
        <Dialog open={true} onOpenChange={() => setPreviewMaterial(null)}>
          <DialogContent className="w-[96vw] max-w-7xl h-[94vh] flex flex-col rounded-2xl p-4 sm:p-6 bg-white">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2 truncate">
                    {previewMaterial.fileType === "AUDIO" ? (
                      <Music className="size-5 text-purple-600 shrink-0" />
                    ) : (
                      <FileText className="size-5 text-rose-600 shrink-0" />
                    )}
                    <span className="truncate">{previewMaterial.title}</span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5 truncate">
                    {previewMaterial.fileName} • {(previewMaterial.fileSize / (1024 * 1024)).toFixed(2)} MB • {previewMaterial.fileType}
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {previewMaterial.fileType === "PDF" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getSafePdfUrl(previewMaterial.fileUrl), "_blank")}
                      className="text-xs rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold gap-1.5 h-8.5"
                    >
                      <ExternalLink className="size-3.5" /> Mở toàn màn hình (Tab mới)
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleDownload(previewMaterial)}
                    className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5 h-8.5 shadow-sm"
                  >
                    <Download className="size-3.5" /> Tải về máy
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden py-2 min-h-0">
              {previewMaterial.fileType === "AUDIO" ? (
                <div className="h-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white space-y-6 p-8">
                  <div className="size-20 rounded-full bg-purple-600/30 border border-purple-500/40 grid place-items-center text-purple-400 animate-pulse">
                    <Music className="size-10" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-base">{previewMaterial.title}</h4>
                    <p className="text-xs text-slate-400 mt-1">Trình phát Audio IELTS SIMPACE</p>
                  </div>
                  <audio
                    controls
                    className="w-full max-w-lg mt-4"
                    src={previewMaterial.fileUrl}
                    autoPlay
                  >
                    Trình duyệt của bạn không hỗ trợ thẻ phát âm thanh.
                  </audio>
                </div>
              ) : previewMaterial.fileType === "PDF" ? (
                <div className="w-full h-full min-h-[70vh] rounded-xl overflow-hidden border border-slate-200 bg-slate-800 shadow-inner flex flex-col">
                  <object
                    data={`${getSafePdfUrl(previewMaterial.fileUrl)}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                    type="application/pdf"
                    className="w-full h-full flex-1 border-0"
                  >
                    <iframe
                      src={`${getSafePdfUrl(previewMaterial.fileUrl)}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                      className="w-full h-full flex-1 border-0"
                      title={previewMaterial.title}
                    />
                  </object>
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <File className="size-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Tài liệu định dạng {previewMaterial.fileType}</p>
                  <p className="text-xs text-slate-500 mt-1">Vui lòng tải tệp tin về máy tính để mở bằng ứng dụng tương ứng.</p>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(previewMaterial)}
                    className="mt-4 text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold"
                  >
                    Tải về ngay ({previewMaterial.fileName})
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMaterial(null)}
                className="text-xs rounded-xl"
              >
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL 4: TẢI LÊN HÀNG LOẠT (BULK MATERIAL UPLOAD)
          ======================================================== */}
      <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="size-5 text-[#EA580C]" /> Tải tài liệu lên thư mục
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Chọn 1 hoặc nhiều tài liệu (PDF sách, Audio bài nghe, Slide bài giảng, Word...) để nạp vào thư mục lớp.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Chọn Thư mục đích */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                Thư mục lưu trữ <span className="text-rose-500">*</span>
              </Label>
              <select
                value={bulkFolderId}
                onChange={(e) => setBulkFolderId(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border border-slate-200 bg-white px-3 text-slate-800 font-medium focus:ring-1 focus:ring-orange-400"
              >
                {folders.length === 0 ? (
                  <option value="">(Chưa có thư mục - Hãy tạo thư mục trước)</option>
                ) : (
                  folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name} {f.isInherited ? "(🌟 Giáo trình chuẩn)" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Vùng chọn nhiều file */}
            <div className="p-6 border-2 border-dashed border-emerald-200 hover:border-emerald-400 rounded-2xl bg-emerald-50/20 text-center transition">
              <input
                type="file"
                multiple
                id="bulk-materials-input"
                className="hidden"
                onChange={handleSelectBulkFiles}
              />
              <label
                htmlFor="bulk-materials-input"
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
                    Hỗ trợ tệp PDF, Audio MP3/WAV, Word DOCX, Slide PPTX, Video...
                  </p>
                </div>
                <span className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm mt-1">
                  Chọn tệp từ máy tính
                </span>
              </label>
            </div>

            {/* Danh sách các file đã chọn */}
            {bulkFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Danh sách tệp chờ tải lên ({bulkFiles.length})
                  </span>
                  <label
                    htmlFor="bulk-materials-input"
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="size-3" /> Chọn thêm tệp khác
                  </label>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/50">
                  {bulkFiles.map((bf) => (
                    <div key={bf.id} className="p-2.5 flex items-center gap-2.5 text-xs bg-white">
                      <div
                        className={`size-8 rounded-lg grid place-items-center shrink-0 ${
                          bf.fileType === "AUDIO"
                            ? "bg-purple-50 text-purple-600"
                            : bf.fileType === "PDF"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {bf.fileType === "AUDIO" ? (
                          <Music className="size-4" />
                        ) : bf.fileType === "PDF" ? (
                          <FileText className="size-4" />
                        ) : (
                          <File className="size-4" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <Input
                          value={bf.title}
                          onChange={(e) => handleUpdateBulkFileTitle(bf.id, e.target.value)}
                          placeholder="Tên tài liệu..."
                          className="h-7 text-xs bg-white border-slate-200"
                        />
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span className="truncate max-w-[150px]">{bf.file.name}</span>
                          <span>•</span>
                          <span>{(bf.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                      </div>

                      <select
                        value={bf.fileType}
                        onChange={(e) => handleUpdateBulkFileType(bf.id, e.target.value)}
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
                        onClick={() => handleRemoveBulkFile(bf.id)}
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

          <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkUploadOpen(false)}
              className="text-xs rounded-xl"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteBulkUpload}
              disabled={isPending || bulkFiles.length === 0 || !bulkFolderId}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold gap-1.5 shadow-sm"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
              Xác nhận tải lên ({bulkFiles.length} tệp)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL 5: CHỈNH SỬA TÀI LIỆU (EDIT MATERIAL MODAL)
          ======================================================== */}
      {editMaterialModal && (
        <Dialog open={true} onOpenChange={() => setEditMaterialModal(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="size-5 text-blue-600" /> Chỉnh sửa thông tin tài liệu
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cập nhật tên hiển thị và định dạng phân loại tài liệu trong kho học liệu.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">
                  Tên tài liệu <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={editMaterialModal.title}
                  onChange={(e) =>
                    setEditMaterialModal({ ...editMaterialModal, title: e.target.value })
                  }
                  placeholder="Nhập tên tài liệu..."
                  className="h-9 text-xs rounded-xl border-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Định dạng phân loại</Label>
                <select
                  value={editMaterialModal.fileType}
                  onChange={(e) =>
                    setEditMaterialModal({ ...editMaterialModal, fileType: e.target.value as any })
                  }
                  className="w-full h-9 text-xs rounded-xl border border-slate-200 bg-white px-3 text-slate-800 font-medium"
                >
                  <option value="PDF">Tài liệu PDF (Sách, Đề thi, Bài tập)</option>
                  <option value="AUDIO">Tệp Âm thanh (Audio MP3, Listening)</option>
                  <option value="DOCUMENT">Văn bản / Bảng tính (Word, Excel)</option>
                  <option value="VIDEO">Video bài giảng</option>
                  <option value="OTHER">Định dạng khác</option>
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMaterialModal(null)}
                className="text-xs rounded-xl"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteEditMaterial}
                disabled={isPending || !editMaterialModal.title.trim()}
                className="text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL 6: XÁC NHẬN XÓA AN TOÀN (CONFIRM DELETE MODAL)
          ======================================================== */}
      {confirmModal && (
        <Dialog open={true} onOpenChange={() => setConfirmModal(null)}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <div className="size-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 grid place-items-center mb-2">
                <AlertTriangle className="size-6" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {confirmModal.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-1">
                {confirmModal.message}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModal(null)}
                className="text-xs rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const cb = confirmModal.onConfirm;
                  setConfirmModal(null);
                  cb();
                }}
                disabled={isPending}
                className="text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Xác nhận xóa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          MODAL 7: THÔNG BÁO HỆ THỐNG (ALERT MODAL TIẾNG VIỆT)
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
                    : alertModal.type === "info"
                    ? "bg-blue-50 text-blue-600 border-blue-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                {alertModal.type === "success" ? (
                  <CheckCircle2 className="size-6" />
                ) : alertModal.type === "error" ? (
                  <AlertCircle className="size-6" />
                ) : alertModal.type === "info" ? (
                  <ShieldCheck className="size-6" />
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
