"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  BookOpen,
  GraduationCap,
  Plus,
  CircleCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  distributeLearningMaterialsAction,
  uploadCoursebookPackageAction,
  getLevelRepositoryFoldersAction,
} from "@/actions/materials";
import { getIeltsLevelsAction } from "@/actions/ielts-levels";
import { MaterialsGlobalSearch, GlobalSearchItem } from "./materials-global-search";
import { ClassDirectoryTab } from "./class-directory-tab";
import { LevelRepositoryTab } from "./level-repository-tab";
import { QuickAddMaterialModal } from "./quick-add-material-modal";
import { MaterialPreviewModal, PreviewableMaterial } from "./material-preview-modal";

interface GlobalMaterialsViewProps {
  classes: any[];
  currentUser: {
    id?: string;
    userId?: string;
    role: string;
    fullName?: string;
    username?: string;
    email?: string;
    managedSchools?: any[];
  };
  onOpenClassMaterials: (cls: any) => void;
  onRefreshAll?: () => void;
}

export function GlobalMaterialsView({
  classes = [],
  currentUser,
  onOpenClassMaterials,
  onRefreshAll,
}: GlobalMaterialsViewProps) {
  // 2 Tab chính: Kho giáo trình theo trình độ (M2B) & Danh mục lớp (M2A)
  const [activeTab, setActiveTab] = useState<"level_repo" | "classes_list">("classes_list");
  const [levelFolders, setLevelFolders] = useState<any[]>([]);
  const [ieltsLevels, setIeltsLevels] = useState<any[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<PreviewableMaterial | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [, startTransition] = useTransition();

  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "SCHOOL_MANAGER";
  const isTeacher = currentUser.role === "TEACHER" || currentUser.role === "TA";

  // Lọc các lớp người dùng có quyền tiếp cận
  const accessibleClasses = classes.filter((c) => {
    if (isAdmin) return true;
    if (isTeacher) {
      const myId = currentUser.id || currentUser.userId;
      const isMyTeacher = c.teacherId === myId || c.teacher?.id === myId;
      const isMyTA = c.taId === myId || c.ta?.id === myId;
      return isMyTeacher || isMyTA;
    }
    return true;
  });

  // Tải danh mục trình độ và giáo trình chuẩn
  const loadLevelRepository = async () => {
    try {
      const [foldersRes, levelsRes] = await Promise.all([
        getLevelRepositoryFoldersAction(),
        getIeltsLevelsAction(),
      ]);
      if (foldersRes.success && foldersRes.folders) {
        setLevelFolders(foldersRes.folders);
      }
      if (levelsRes.success && levelsRes.levels) {
        setIeltsLevels(levelsRes.levels);
      }
    } catch (err) {
      console.error("Lỗi khi tải kho giáo trình:", err);
    }
  };

  useEffect(() => {
    loadLevelRepository();
  }, []);

  // Tổng hợp dữ liệu cho thanh tìm kiếm toàn cục M8
  const globalSearchItems: GlobalSearchItem[] = [
    // 1. Giáo trình dùng chung
    ...levelFolders.map((f) => ({
      id: f.id,
      title: f.name,
      category: "COMMON" as const,
      categoryLabel: "Kho chung",
      level: f.levelName || "IELTS",
    })),
    // 2. Lớp học
    ...accessibleClasses.map((c) => ({
      id: c.id,
      title: c.name,
      category: "CLASS" as const,
      categoryLabel: "Lớp học",
      classCode: c.code,
      className: c.name,
      level: c.level,
    })),
    // 3. File mẫu giáo trình
    {
      id: "demo-search-mindset",
      title: "Mindset for IELTS Level 3 Student's Book (PDF)",
      category: "FILE" as const,
      categoryLabel: "Sách PDF",
      type: "PDF",
      size: 2155089,
      fileUrl: "/sample-mindset.pdf",
    },
    {
      id: "demo-search-audio-1",
      title: "Track 01 - Unit 1: Urban and Rural Life (MP3)",
      category: "FILE" as const,
      categoryLabel: "Audio nghe",
      type: "AUDIO",
      size: 3450000,
      fileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
  ];

  // Xử lý chọn kết quả từ thanh tìm kiếm M8
  const handleSelectSearchResult = (item: GlobalSearchItem) => {
    if (item.category === "CLASS") {
      const targetClass = accessibleClasses.find((c) => c.id === item.id);
      if (targetClass) onOpenClassMaterials(targetClass);
    } else if (item.category === "FILE" && item.fileUrl) {
      setPreviewMaterial({
        id: item.id,
        title: item.title,
        fileName: `${item.title}.${item.type === "PDF" ? "pdf" : "mp3"}`,
        fileUrl: item.fileUrl,
        fileSize: item.size || 2000000,
        fileType: (item.type as any) || "PDF",
      });
    } else if (item.category === "COMMON") {
      setActiveTab("level_repo");
    }
  };

  // Thực thi Nạp gói giáo trình & audio chuẩn M2B.1
  const handleUploadCoursebookPackage = async (data: {
    targetLevelId: string;
    title: string;
    description: string;
    pdfFile: File;
    audioFiles: Array<{ file: File; title: string }>;
  }) => {
    startTransition(async () => {
      const bookFile = {
        title: `${data.title} (PDF Sách)`,
        fileName: data.pdfFile.name,
        fileSize: data.pdfFile.size,
        fileUrl: URL.createObjectURL(data.pdfFile),
        mimeType: data.pdfFile.type || "application/pdf",
      };

      const audioFiles = data.audioFiles.map((af, idx) => ({
        title: af.title || `Track ${(idx + 1).toString().padStart(2, "0")}`,
        fileName: af.file.name,
        fileSize: af.file.size,
        fileUrl: URL.createObjectURL(af.file),
        mimeType: af.file.type || "audio/mpeg",
      }));

      const res = await uploadCoursebookPackageAction({
        targetType: "LEVEL",
        ieltsLevelId: data.targetLevelId,
        packageTitle: data.title,
        packageDescription: data.description,
        bookFile,
        audioFiles,
      });

      if (res.success) {
        setToastMessage(`Đã nạp thành công bộ giáo trình "${data.title}" vào hệ thống!`);
        await loadLevelRepository();
        onRefreshAll?.();
      }
    });
  };

  // Thực thi Thêm nhanh / Phân phối tài liệu M2C
  const handleQuickAddSubmit = async (data: {
    title: string;
    materialType: "COURSEBOOK" | "SUPPLEMENTARY" | "PRACTICE_TEST";
    file: File;
    audioFiles: File[];
    answerKeyFile?: File | null;
    destination: "COMMON" | "CLASSES";
    targetLevel?: string;
    targetClassIds: string[];
  }) => {
    startTransition(async () => {
      const bookFile = {
        title: data.materialType === "COURSEBOOK" ? `${data.title} (PDF Sách)` : data.title,
        fileName: data.file.name,
        fileSize: data.file.size,
        fileUrl: URL.createObjectURL(data.file),
        fileType: "PDF" as const,
        mimeType: data.file.type || "application/pdf",
      };

      const audioFiles = (data.audioFiles || []).map((af, idx) => ({
        title: af.name.replace(/\.[^/.]+$/, "") || `Track ${(idx + 1).toString().padStart(2, "0")}`,
        fileName: af.name,
        fileSize: af.size,
        fileUrl: URL.createObjectURL(af),
        fileType: "AUDIO" as const,
        mimeType: af.type || "audio/mpeg",
      }));

      const answerKeyFile = data.answerKeyFile
        ? {
            title: `${data.title} - Đáp án (Answer Key)`,
            fileName: data.answerKeyFile.name,
            fileSize: data.answerKeyFile.size,
            fileUrl: URL.createObjectURL(data.answerKeyFile),
            fileType: "PDF" as const,
            mimeType: data.answerKeyFile.type || "application/pdf",
          }
        : undefined;

      // 1. Nếu là Sách giáo khoa nạp vào Kho chung cấp Trình độ (Level Repository)
      if (data.materialType === "COURSEBOOK" && data.destination === "COMMON" && data.targetLevel) {
        const res = await uploadCoursebookPackageAction({
          targetType: "LEVEL",
          ieltsLevelId: data.targetLevel,
          packageTitle: data.title,
          packageDescription: "Giáo trình chuẩn kèm toàn bộ audio bài nghe",
          bookFile,
          audioFiles,
          answerKeyFile,
        });

        if (res.success) {
          setToastMessage(`Đã nạp thành công bộ giáo trình "${data.title}" vào Kho trình độ!`);
          await loadLevelRepository();
          onRefreshAll?.();
        } else {
          setToastMessage(res.error || "Không thể nạp giáo trình vào kho!");
        }
        return;
      }

      // 2. Phân phối vào các Lớp học hoặc Tài liệu bổ trợ / Bộ đề
      const folderPrefix =
        data.materialType === "COURSEBOOK"
          ? "📚 "
          : data.materialType === "PRACTICE_TEST"
          ? "📝 "
          : "📄 ";

      const folderDesc =
        data.materialType === "COURSEBOOK"
          ? `Gói Sách giáo khoa & ${audioFiles.length} file audio bài nghe`
          : data.materialType === "PRACTICE_TEST"
          ? "Bộ đề thi và bài tập thực hành"
          : "Tài liệu học tập bổ trợ cho lớp học";

      const allMaterials = [
        bookFile,
        ...audioFiles,
        ...(answerKeyFile ? [answerKeyFile] : []),
      ];

      const res = await distributeLearningMaterialsAction({
        distributionMode: data.destination === "COMMON" ? "BY_LEVEL" : "BY_CLASSES",
        targetLevels: data.targetLevel ? [data.targetLevel] : [],
        targetClassIds: data.targetClassIds,
        folderName: `${folderPrefix}${data.title}`,
        folderDescription: folderDesc,
        materials: allMaterials,
      });

      if (res.success) {
        setToastMessage(`Đã phân phối tài liệu "${data.title}" thành công!`);
        await loadLevelRepository();
        onRefreshAll?.();
      } else {
        setToastMessage(res.error || "Không thể phân phối tài liệu!");
      }
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER QUẢN LÝ HỌC LIỆU + TÌM KIẾM TOÀN CỤC M8 + NÚT THÊM M2C */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Quản lý học liệu</span>
            <span>/</span>
            <span className="font-semibold text-slate-800">Kho học liệu trung tâm</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
            Quản lý học liệu
          </h2>
        </div>

        {/* Cụm Tìm kiếm M8 & Nút Thêm M2C */}
        <div className="flex items-center gap-3 flex-1 md:justify-end">
          <MaterialsGlobalSearch
            items={globalSearchItems}
            onSelectItem={handleSelectSearchResult}
          />

          {!currentUser.role.includes("STUDENT") && (
            <Button
              onClick={() => setIsQuickAddOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="size-4" /> Thêm tài liệu
            </Button>
          )}
        </div>
      </div>

      {/* 2 TAB CHÍNH: KHO CHUNG (M2B) & DANH MỤC LỚP (M2A) */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold text-slate-500">
        <button
          type="button"
          onClick={() => setActiveTab("classes_list")}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition ${
            activeTab === "classes_list"
              ? "border-[#EA580C] text-[#EA580C]"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <GraduationCap className="size-4" />
          <span>Danh mục lớp &amp; Thư mục (M2A)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("level_repo")}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition ${
            activeTab === "level_repo"
              ? "border-[#EA580C] text-[#EA580C]"
              : "border-transparent hover:text-slate-800"
          }`}
        >
          <BookOpen className="size-4" />
          <span>Kho giáo trình chuẩn theo trình độ (M2B)</span>
        </button>
      </div>

      {/* NỘI DUNG TỪNG TAB */}
      {activeTab === "classes_list" ? (
        <ClassDirectoryTab
          classes={accessibleClasses}
          onOpenClassMaterials={onOpenClassMaterials}
        />
      ) : (
        <LevelRepositoryTab
          levelFolders={levelFolders}
          ieltsLevels={ieltsLevels}
          isAdmin={isAdmin}
          onUploadCoursebookPackage={handleUploadCoursebookPackage}
          onSelectFolderToPreview={(folder) => {
            setPreviewMaterial({
              id: folder.id,
              title: folder.name,
              fileName: "Mindset_for_IELTS_Level_3.pdf",
              fileUrl: "/sample-mindset.pdf",
              fileSize: 2155089,
              fileType: "PDF",
            });
          }}
        />
      )}

      {/* MODAL THÊM NHANH TÀI LIỆU (M2C) */}
      <QuickAddMaterialModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        classes={accessibleClasses}
        ieltsLevels={ieltsLevels}
        isTeacher={isTeacher}
        onSubmit={handleQuickAddSubmit}
      />

      {/* MODAL XEM TRƯỚC TÀI LIỆU 2 CỘT (M4.4) */}
      {previewMaterial && (
        <MaterialPreviewModal
          open={!!previewMaterial}
          onOpenChange={(op) => !op && setPreviewMaterial(null)}
          material={previewMaterial}
          onDownload={(mat) => {
            const a = document.createElement("a");
            a.href = mat.fileUrl;
            a.download = mat.fileName;
            a.click();
          }}
        />
      )}

      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0F172A] text-white text-xs font-semibold rounded-xl shadow-2xl border border-emerald-500/20">
          <CircleCheck className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
