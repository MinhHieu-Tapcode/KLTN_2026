"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Folder,
  FolderPlus,
  UploadCloud,
  FileText,
  Music,
  File,
  MoreVertical,
  ChevronRight,
  Eye,
  Download,
  Trash2,
  Edit2,
  Lock,
  Search,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getMaterialFoldersAction,
  createMaterialFolderAction,
  deleteMaterialFolderAction,
  getLearningMaterialsAction,
  uploadMultipleLearningMaterialsAction,
  updateLearningMaterialAction,
  deleteLearningMaterialAction,
  incrementMaterialDownloadCountAction,
} from "@/actions/materials";
import { CreateFolderModal } from "./create-folder-modal";
import { BulkUploadModal } from "./bulk-upload-modal";
import { MaterialPreviewModal, PreviewableMaterial } from "./material-preview-modal";

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
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  // Modals
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<PreviewableMaterial | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const isStudent = currentUser.role === "STUDENT";
  const canManage =
    currentUser.role === "ADMIN" ||
    currentUser.role === "TEACHER" ||
    currentUser.role === "SCHOOL_MANAGER" ||
    currentUser.role === "TA";

  // Tải danh sách thư mục
  const loadFolders = async (parentId: string | null = null) => {
    const res = await getMaterialFoldersAction({ classId, parentId });
    if (res.success && res.folders) {
      setFolders(res.folders);
    }
  };

  // Tải danh sách tệp trong thư mục
  const loadMaterials = async (folderId: string) => {
    const res = await getLearningMaterialsAction(folderId);
    if (res.success && res.materials) {
      setMaterials(res.materials);
    }
  };

  useEffect(() => {
    loadFolders(null);
  }, [classId]);

  // Điều hướng vào thư mục
  const handleOpenFolder = (folder: any) => {
    setCurrentFolder(folder);
    setBreadcrumbs((prev) => [...prev, folder]);
    loadMaterials(folder.id);
  };

  // Trở về thư mục gốc
  const handleBackToRoot = () => {
    setCurrentFolder(null);
    setBreadcrumbs([]);
    setMaterials([]);
    loadFolders(null);
  };

  // Click vào breadcrumb
  const handleBreadcrumbClick = (folder: any, index: number) => {
    setCurrentFolder(folder);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    loadMaterials(folder.id);
  };

  // Tạo thư mục mới (M4.1)
  const handleCreateFolder = async (data: {
    name: string;
    description?: string;
    parentId?: string | null;
    isInherited?: boolean;
  }) => {
    startTransition(async () => {
      await createMaterialFolderAction({
        classId,
        name: data.name,
        description: data.description,
        parentId: currentFolder?.id || data.parentId || null,
      });
      loadFolders(currentFolder?.id || null);
    });
  };

  // Tải file lên (M4.2)
  const handleBulkUpload = async (fileItems: any[]) => {
    startTransition(async () => {
      const targetFolderId = currentFolder?.id || folders[0]?.id;
      if (!targetFolderId) return;

      const formattedFiles = fileItems.map((item) => ({
        title: item.name.replace(/\.[^/.]+$/, ""),
        fileName: item.name,
        fileSize: item.size,
        fileUrl: URL.createObjectURL(item.file),
        fileType: item.type,
        mimeType: item.file.type || "application/octet-stream",
      }));

      await uploadMultipleLearningMaterialsAction({
        folderId: targetFolderId,
        materials: formattedFiles,
      });

      loadMaterials(targetFolderId);
    });
  };

  // Xóa thư mục
  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa thư mục này?")) return;
    startTransition(async () => {
      await deleteMaterialFolderAction(folderId);
      loadFolders(currentFolder?.id || null);
    });
  };

  // Xóa tài liệu
  const handleDeleteMaterial = async (materialId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) return;
    startTransition(async () => {
      await deleteLearningMaterialAction(materialId);
      if (currentFolder) loadMaterials(currentFolder.id);
    });
  };

  // Tải tài liệu về máy
  const handleDownload = (mat: any) => {
    incrementMaterialDownloadCountAction(mat.id);
    const a = document.createElement("a");
    a.href = mat.fileUrl;
    a.download = mat.fileName;
    a.click();
  };

  // Lưu đổi tên tài liệu
  const handleSaveRename = async () => {
    if (!editingMaterial || !editTitle.trim()) return;
    startTransition(async () => {
      await updateLearningMaterialAction({
        materialId: editingMaterial.id,
        title: editTitle.trim(),
      });
      setEditingMaterial(null);
      if (currentFolder) loadMaterials(currentFolder.id);
    });
  };

  // Lọc tìm kiếm
  const displayFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-10">
      {/* HEADER LỚP HỌC M4 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-orange-50 border border-orange-200 text-[#EA580C] grid place-items-center shrink-0">
              <BookOpen className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{className}</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                  IELTS 5.5 - 6.5
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kho tài liệu học tập, giáo trình chuẩn Cambridge và file nghe theo buổi
              </p>
            </div>
          </div>

          {/* Cụm nút tác vụ (Ẩn với Học sinh) */}
          {canManage && !isStudent && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateFolderOpen(true)}
                className="text-xs rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold gap-1.5 h-9"
              >
                <FolderPlus className="size-3.5 text-amber-500" /> Tạo thư mục
              </Button>
              <Button
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold gap-1.5 h-9 shadow-sm"
              >
                <UploadCloud className="size-4" /> Tải lên tài liệu
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KHÔNG GIAN BẢNG TÀI LIỆU CHUẨN M4 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar & Breadcrumbs */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          {/* Breadcrumb M4 */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium overflow-x-auto py-1">
            <button
              type="button"
              onClick={handleBackToRoot}
              className={`hover:text-[#EA580C] transition ${!currentFolder ? "font-bold text-[#EA580C]" : ""}`}
            >
              📁 Thư mục gốc
            </button>
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={b.id}>
                <ChevronRight className="size-3.5 text-slate-400 shrink-0" />
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(b, idx)}
                  className={`hover:text-[#EA580C] transition truncate max-w-[150px] ${
                    idx === breadcrumbs.length - 1 ? "font-bold text-[#EA580C]" : ""
                  }`}
                >
                  {b.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Ô tìm kiếm M4 */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài liệu, thư mục..."
              className="w-full h-8.5 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C]"
            />
          </div>
        </div>

        {/* Bảng danh sách Folder & File M4 */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Tên tài liệu / Thư mục</th>
                <th className="py-3 px-4 w-28">Kích thước</th>
                <th className="py-3 px-4 w-32">Ngày tải lên</th>
                <th className="py-3 px-4 w-36">Người tải lên</th>
                <th className="py-3 px-4 w-20 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* 1. HÀNG THƯ MỤC */}
              {!currentFolder &&
                displayFolders.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => handleOpenFolder(f)}
                    className="hover:bg-slate-50/80 cursor-pointer transition group"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Folder className={`size-4.5 shrink-0 ${f.isInherited ? "text-purple-600" : "text-amber-500"}`} />
                        <span className="font-bold text-slate-900 group-hover:text-[#EA580C] transition">
                          {f.name}
                        </span>
                        {f.isInherited && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            <Lock className="size-2.5" /> Kế thừa từ trình độ (không thể sửa/xóa)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">—</td>
                    <td className="py-3 px-4 text-slate-500">12/04/2026</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {f.isInherited ? "Admin" : "GV Nguyễn Văn A"}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {!f.isInherited && canManage && !isStudent && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(f.id)}
                          title="Xóa thư mục"
                          className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

              {/* 2. HÀNG TÀI LIỆU FILE */}
              {displayMaterials.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {m.fileType === "PDF" ? (
                        <FileText className="size-4.5 text-rose-600 shrink-0" />
                      ) : m.fileType === "AUDIO" ? (
                        <Music className="size-4.5 text-purple-600 shrink-0" />
                      ) : (
                        <File className="size-4.5 text-blue-600 shrink-0" />
                      )}
                      <span className="font-semibold text-slate-900 group-hover:text-[#EA580C] transition">
                        {m.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                    {(m.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </td>
                  <td className="py-3 px-4 text-slate-500">12/04/2026</td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {m.uploadedById === "SYSTEM" ? "Admin" : "GV Nguyễn Văn A"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewMaterial(m)}
                        title="Xem trước"
                        className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-[#EA580C] transition"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(m)}
                        title="Tải về máy"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                      >
                        <Download className="size-4" />
                      </button>
                      {canManage && !isStudent && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMaterial(m);
                              setEditTitle(m.title);
                            }}
                            title="Đổi tên"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(m.id)}
                            title="Xóa tài liệu"
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {/* Trạng thái trống M4 */}
              {!currentFolder && displayFolders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    Chưa có thư mục nào trong lớp học này.
                  </td>
                </tr>
              )}
              {currentFolder && displayMaterials.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    Thư mục này hiện chưa có tài liệu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TẠO THƯ MỤC M4.1 */}
      <CreateFolderModal
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        parentFolders={folders}
        currentParentId={currentFolder?.id || null}
        isAdmin={currentUser.role === "ADMIN"}
        onSubmit={handleCreateFolder}
      />

      {/* MODAL TẢI TÀI LIỆU KÉO THẢ M4.2 */}
      <BulkUploadModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        folderName={currentFolder?.name || folders[0]?.name}
        onUpload={handleBulkUpload}
      />

      {/* MODAL XEM TRƯỚC 2 CỘT M4.4 */}
      {previewMaterial && (
        <MaterialPreviewModal
          open={!!previewMaterial}
          onOpenChange={(op) => !op && setPreviewMaterial(null)}
          material={previewMaterial}
          siblingMaterials={materials}
          currentFolderName={currentFolder?.name || "Tài liệu học tập"}
          onSelectMaterial={(mat) => setPreviewMaterial(mat)}
          onDownload={handleDownload}
        />
      )}

      {/* MODAL ĐỔI TÊN TÀI LIỆU */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl">
            <b className="text-sm text-slate-900 block">Đổi tên tài liệu</b>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#EA580C]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingMaterial(null)}
                className="text-xs rounded-xl"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSaveRename}
                className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
