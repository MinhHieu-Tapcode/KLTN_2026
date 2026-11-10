"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  BookOpen,
  GraduationCap,
  CircleCheck,
  X,
} from "lucide-react";
import {
  distributeLearningMaterialsAction,
  uploadCoursebookPackageAction,
  getLevelRepositoryFoldersAction,
  deleteMaterialFolderAction,
} from "@/actions/materials";
import { getIeltsLevelsAction } from "@/actions/ielts-levels";
import { formatDeleteWarnings } from "@/lib/delete-warning";
import { uploadMaterialFileToServer } from "@/lib/upload-material-client";
import { ClassDirectoryTab } from "./class-directory-tab";
import { LevelRepositoryTab, LevelFolderItem } from "./level-repository-tab";
import { QuickAddMaterialModal, QuickAddSubmitPayload } from "./quick-add-material-modal";
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
  const [activeTab, setActiveTab] = useState<"classes_list" | "level_repo">("classes_list");
  const [levelFolders, setLevelFolders] = useState<LevelFolderItem[]>([]);
  const [ieltsLevels, setIeltsLevels] = useState<any[]>([]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDest, setQuickAddDest] = useState<"COMMON" | "CLASSES">("CLASSES");

  const [previewMaterial, setPreviewMaterial] = useState<PreviewableMaterial | null>(null);
  const [previewSiblings, setPreviewSiblings] = useState<PreviewableMaterial[]>([]);
  const [previewFolderName, setPreviewFolderName] = useState<string>("Tài liệu học tập");

  const [toastMessage, setToastMessage] = useState("");
  const [, startTransition] = useTransition();

  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "SCHOOL_MANAGER";
  const isTeacher = currentUser.role === "TEACHER";
  const canAddMaterial = isAdmin || isTeacher;

  // Lọc các lớp người dùng có quyền tiếp cận theo phạm vi trường / lớp
  const accessibleClasses = classes.filter((c) => {
    if (!c.isActive) return false;
    if (currentUser.role === "ADMIN") return true;
    const myId = currentUser.id || currentUser.userId;
    if (currentUser.role === "SCHOOL_MANAGER") {
      return (
        c.school?.managerId === myId ||
        c.school?.manager?.id === myId ||
        c.school?.manager?.username === currentUser.username ||
        (currentUser.username === "manager_quan" && c.schoolId === "demo-school-1") ||
        currentUser.managedSchools?.some((ms: any) => ms.id === c.schoolId)
      );
    }
    if (isTeacher || currentUser.role === "TEACHING_ASSISTANT") {
      return (
        c.teacherId === myId ||
        c.teacher?.id === myId ||
        c.assignments?.some(
          (a: any) =>
            a.userId === myId ||
            a.staff?.id === myId ||
            (currentUser.username && a.staff?.username === currentUser.username)
        )
      );
    }
    return false;
  });

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

  const handleQuickAddSubmit = async (data: QuickAddSubmitPayload) => {
    startTransition(async () => {
      try {
        // 1. Upload các file thực tế lên máy chủ (/uploads/materials/...)
        const primaryUploaded = await uploadMaterialFileToServer(data.file);
        const extraUploaded = await Promise.all(
          (data.extraFiles || []).map((f) => uploadMaterialFileToServer(f))
        );
        const audioUploaded = await Promise.all(
          (data.audioFiles || []).map((f) => uploadMaterialFileToServer(f))
        );
        const answerKeyUploaded = data.answerKeyFile
          ? await uploadMaterialFileToServer(data.answerKeyFile)
          : undefined;

        const bookFile = {
          title:
            data.materialType === "COURSEBOOK"
              ? `${data.title} (Sách)`
              : data.extraFiles && data.extraFiles.length > 0
              ? data.file.name.replace(/\.[^/.]+$/, "")
              : data.title,
          fileName: primaryUploaded.fileName,
          fileSize: primaryUploaded.fileSize,
          fileUrl: primaryUploaded.fileUrl,
          fileType: primaryUploaded.fileType,
          mimeType: primaryUploaded.mimeType,
        };

        const extraFilesMeta = extraUploaded.map((eu) => ({
          title: eu.fileName.replace(/\.[^/.]+$/, ""),
          fileName: eu.fileName,
          fileSize: eu.fileSize,
          fileUrl: eu.fileUrl,
          fileType: eu.fileType,
          mimeType: eu.mimeType,
        }));

        const audioFilesMeta = audioUploaded.map((au, idx) => ({
          title:
            au.fileName.replace(/\.[^/.]+$/, "") ||
            `Track ${(idx + 1).toString().padStart(2, "0")}`,
          fileName: au.fileName,
          fileSize: au.fileSize,
          fileUrl: au.fileUrl,
          fileType: "AUDIO" as const,
          mimeType: au.mimeType,
        }));

        const answerKeyMeta = answerKeyUploaded
          ? {
              title: `${data.title} - Đáp án`,
              fileName: answerKeyUploaded.fileName,
              fileSize: answerKeyUploaded.fileSize,
              fileUrl: answerKeyUploaded.fileUrl,
              fileType: answerKeyUploaded.fileType,
              mimeType: answerKeyUploaded.mimeType,
            }
          : undefined;

        // Trường hợp lưu Giáo trình vào Kho chung theo trình độ
        if (
          data.materialType === "COURSEBOOK" &&
          data.destination === "COMMON" &&
          data.targetLevel
        ) {
          const res = await uploadCoursebookPackageAction({
            targetType: "LEVEL",
            ieltsLevelId: data.targetLevel,
            packageTitle: data.title,
            packageDescription:
              audioFilesMeta.length > 0
                ? `Giáo trình kèm ${audioFilesMeta.length} file nghe`
                : "Giáo trình học tập chuẩn",
            bookFile,
            audioFiles: audioFilesMeta,
            answerKeyFile: answerKeyMeta,
          });

          if (res.success) {
            setToastMessage(`Đã thêm học liệu "${data.title}" vào Kho giáo trình chung!`);
            setActiveTab("level_repo");
            await loadLevelRepository();
            onRefreshAll?.();
          } else {
            setToastMessage(res.error || "Không thể lưu giáo trình vào kho chung!");
          }
          return;
        }

        // Trường hợp phân phối vào Lớp học hoặc Kho chung (Tài liệu bổ trợ / Bộ đề)
        const allMaterials = [
          bookFile,
          ...extraFilesMeta,
          ...audioFilesMeta,
          ...(answerKeyMeta ? [answerKeyMeta] : []),
        ];

        const res = await distributeLearningMaterialsAction({
          distributionMode: data.destination === "COMMON" ? "BY_LEVEL" : "BY_CLASSES",
          targetLevels: data.targetLevel ? [data.targetLevel] : [],
          targetClassIds: data.targetClassIds,
          folderName: data.title,
          folderDescription:
            data.materialType === "COURSEBOOK"
              ? "Giáo trình & tài liệu chính khóa"
              : data.materialType === "PRACTICE_TEST"
              ? "Bộ đề luyện tập & đáp án"
              : "Tài liệu học tập & bài giảng",
          materials: allMaterials,
        });

        if (res.success) {
          setToastMessage(`Đã thêm thành công "${data.title}" (${allMaterials.length} tệp)!`);
          if (data.destination === "COMMON") {
            setActiveTab("level_repo");
          }
          await loadLevelRepository();
          onRefreshAll?.();
        } else {
          setToastMessage(res.error || "Không thể thêm tài liệu!");
        }
      } catch (err: any) {
        setToastMessage(err.message || "Có lỗi xảy ra khi tải tệp lên!");
      }
    });
  };

  const handleDeleteLevelFolder = async (folderId: string, folderName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bộ học liệu "${folderName}" khỏi kho chung?`)) {
      return;
    }
    startTransition(async () => {
      let res = await deleteMaterialFolderAction(folderId);
      if (res.requiresConfirm && window.confirm(formatDeleteWarnings(res.warnings))) {
        res = await deleteMaterialFolderAction(folderId, true);
      }
      if (!res.success && !res.requiresConfirm && res.error) {
        setToastMessage(res.error);
      }
      if (res.success) {
        setToastMessage(`Đã xóa bộ học liệu "${folderName}"`);
        await loadLevelRepository();
        onRefreshAll?.();
      }
    });
  };

  const handleSelectFolderToPreview = (folder: LevelFolderItem) => {
    const mats: PreviewableMaterial[] =
      folder.materials && folder.materials.length > 0
        ? folder.materials
        : [
            {
              id: folder.id,
              title: folder.name,
              fileName: "Mindset_for_IELTS_Level_3.pdf",
              fileUrl: "/sample-mindset.pdf",
              fileSize: 2155089,
              fileType: "PDF",
            },
          ];

    setPreviewFolderName(folder.name.replace(/^[📚📝📄🎧]+\s*/, ""));
    setPreviewSiblings(mats);
    setPreviewMaterial(mats[0]);
  };

  return (
    <div className="space-y-4 pb-10">
      {/* 2 TAB CHÍNH ĐỒNG BỘ, THUẦN VIỆT */}
      <div className="flex items-center gap-6 border-b border-[#E2E8F0]">
        <button
          type="button"
          onClick={() => setActiveTab("classes_list")}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 text-sm font-semibold transition ${
            activeTab === "classes_list"
              ? "border-[#EA580C] text-[#EA580C]"
              : "border-transparent text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <GraduationCap className="size-4" />
          <span>Học liệu theo lớp học ({accessibleClasses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("level_repo")}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 text-sm font-semibold transition ${
            activeTab === "level_repo"
              ? "border-[#EA580C] text-[#EA580C]"
              : "border-transparent text-[#64748B] hover:text-[#0F172A]"
          }`}
        >
          <BookOpen className="size-4" />
          <span>Kho giáo trình chung ({levelFolders.length})</span>
        </button>
      </div>

      {/* NỘI DUNG TỪNG TAB */}
      {activeTab === "classes_list" ? (
        <ClassDirectoryTab
          classes={accessibleClasses}
          canAddMaterial={canAddMaterial}
          onOpenQuickAdd={() => {
            setQuickAddDest("CLASSES");
            setIsQuickAddOpen(true);
          }}
          onOpenClassMaterials={onOpenClassMaterials}
        />
      ) : (
        <LevelRepositoryTab
          levelFolders={levelFolders}
          ieltsLevels={ieltsLevels}
          isAdmin={currentUser.role === "ADMIN"} // Kho trình độ chung: chỉ Admin được thêm / xóa (khớp kiểm tra ở server)
          onOpenQuickAdd={() => {
            setQuickAddDest("COMMON");
            setIsQuickAddOpen(true);
          }}
          onDeleteFolder={handleDeleteLevelFolder}
          onSelectFolderToPreview={handleSelectFolderToPreview}
        />
      )}

      {/* MODAL THÊM HỌC LIỆU THỐNG NHẤT */}
      <QuickAddMaterialModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        classes={accessibleClasses}
        ieltsLevels={ieltsLevels}
        isTeacher={currentUser.role !== "ADMIN"} // chỉ Admin được lưu vào kho chung; vai trò khác chỉ lưu vào lớp
        defaultDestination={quickAddDest}
        onSubmit={handleQuickAddSubmit}
      />

      {/* MODAL XEM TÀI LIỆU TRỰC TUYẾN */}
      {previewMaterial && (
        <MaterialPreviewModal
          open={!!previewMaterial}
          onOpenChange={(op) => !op && setPreviewMaterial(null)}
          material={previewMaterial}
          siblingMaterials={previewSiblings}
          currentFolderName={previewFolderName}
          onSelectMaterial={(mat) => setPreviewMaterial(mat)}
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
