"use client";
import React, { useState, useEffect, useTransition } from "react";
import { DeleteConfirmModal, type DeleteTarget } from "@/components/shared/delete-confirm-modal";
import {
  Folder,
  FolderPlus,
  UploadCloud,
  FileText,
  Music,
  Image as ImageIcon,
  File,
  ChevronRight,
  Eye,
  Download,
  Trash2,
  Edit2,
  Lock,
  Search,
  CircleCheck,
  X,
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
import {
  uploadMaterialFileToServer,
  isImageFile,
} from "@/lib/upload-material-client";
import { CreateFolderModal } from "./create-folder-modal";
import { BulkUploadModal, UploadFileItem } from "./bulk-upload-modal";
import { MaterialPreviewModal, PreviewableMaterial } from "./material-preview-modal";

interface ClassMaterialsTabProps {
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

export function ClassMaterialsTab({
  classId,
  currentUser,
}: ClassMaterialsTabProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<any | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [, startTransition] = useTransition();

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<PreviewableMaterial | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const isStudent = currentUser.role === "STUDENT";
  const canManage =
    currentUser.role === "ADMIN" ||
    currentUser.role === "TEACHER" ||
    currentUser.role === "SCHOOL_MANAGER";

  const loadFolders = async (parentId: string | null = null) => {
    const res = await getMaterialFoldersAction({ classId, parentId });
    if (res.success && res.folders) {
      setFolders(res.folders);
    }
  };

  const loadMaterials = async (folderId: string) => {
    const res = await getLearningMaterialsAction(folderId);
    if (res.success && res.materials) {
      setMaterials(res.materials);
    }
  };

  useEffect(() => {
    setCurrentFolder(null);
    setBreadcrumbs([]);
    setMaterials([]);
    loadFolders(null);
  }, [classId]);

  const handleOpenFolder = (folder: any) => {
    setCurrentFolder(folder);
    setBreadcrumbs((prev) => [...prev, folder]);
    loadFolders(folder.id);
    loadMaterials(folder.id);
  };

  const handleBackToRoot = () => {
    setCurrentFolder(null);
    setBreadcrumbs([]);
    setMaterials([]);
    loadFolders(null);
  };

  const handleBreadcrumbClick = (folder: any, index: number) => {
    setCurrentFolder(folder);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    loadFolders(folder.id);
    loadMaterials(folder.id);
  };

  const handleCreateFolder = async (data: {
    name: string;
    description?: string;
    parentId?: string | null;
  }) => {
    startTransition(async () => {
      const res = await createMaterialFolderAction({
        classId,
        name: data.name,
        description: data.description,
        parentId: currentFolder?.id || data.parentId || null,
      });
      if (res.success) {
        setToastMsg(`Đã tạo thư mục "${data.name}" thành công!`);
        await loadFolders(currentFolder?.id || null);
      } else {
        setToastMsg(res.error || "Không thể tạo thư mục!");
      }
    });
  };

  const handleBulkUpload = async (
    fileItems: UploadFileItem[],
    targetFolderOption: { folderId?: string; newFolderName?: string }
  ) => {
    startTransition(async () => {
      try {
        let targetFolderId = currentFolder?.id || targetFolderOption.folderId;
        let createdFolderObj: any = null;

        // Nếu chưa có thư mục hoặc người dùng chọn tạo thư mục mới
        if (!targetFolderId) {
          const folderRes = await createMaterialFolderAction({
            classId,
            name: targetFolderOption.newFolderName || "Tài liệu học tập chung",
            description: "Thư mục tài liệu học tập của lớp",
            parentId: null,
          });
          if (!folderRes.success || !folderRes.folder) {
            setToastMsg(folderRes.error || "Không thể khởi tạo thư mục lưu tài liệu!");
            return;
          }
          targetFolderId = folderRes.folder.id;
          createdFolderObj = folderRes.folder;
        }

        // Tải từng tệp thật lên máy chủ (/api/materials/upload)
        const uploadedList = await Promise.all(
          fileItems.map(async (item) => {
            const meta = await uploadMaterialFileToServer(item.file);
            return {
              title: item.name.replace(/\.[^/.]+$/, ""),
              fileName: meta.fileName,
              fileSize: meta.fileSize,
              fileUrl: meta.fileUrl,
              fileType: meta.fileType,
              mimeType: meta.mimeType,
            };
          })
        );

        const uploadRes = await uploadMultipleLearningMaterialsAction({
          folderId: targetFolderId!,
          materials: uploadedList,
        });

        if (uploadRes.success) {
          setToastMsg(`Đã tải lên thành công ${uploadedList.length} tệp tài liệu!`);
          if (!currentFolder) {
            // Mở thẳng vào thư mục vừa tải để người dùng nhìn thấy ngay tệp
            await loadFolders(null);
            const targetFolder =
              createdFolderObj ||
              folders.find((f) => f.id === targetFolderId) || {
                id: targetFolderId,
                name: targetFolderOption.newFolderName || "Tài liệu học tập",
              };
            setCurrentFolder(targetFolder);
            setBreadcrumbs([targetFolder]);
            await loadFolders(targetFolderId!);
            await loadMaterials(targetFolderId!);
          } else {
            await loadFolders(currentFolder.id);
            await loadMaterials(currentFolder.id);
          }
        } else {
          setToastMsg(uploadRes.error || "Không thể lưu tài liệu!");
        }
      } catch (err: any) {
        setToastMsg(err.message || "Có lỗi khi tải tài liệu lên!");
      }
    });
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setDeleteTarget({
      kind: "MATERIAL_FOLDER",
      ids: [folderId],
      title: "Xác nhận xóa thư mục học liệu",
      description: `Bạn có chắc chắn muốn xóa thư mục "${folderName}"?`,
      onExecute: (confirmed) => deleteMaterialFolderAction(folderId, confirmed),
      onSuccess: async () => {
        setToastMsg(`Đã xóa thư mục "${folderName}"`);
        await loadFolders(currentFolder?.id || null);
      },
    });
  };

  const handleDeleteMaterial = (materialId: string, title: string) => {
    setDeleteTarget({
      kind: "MATERIAL",
      ids: [materialId],
      title: "Xác nhận xóa tài liệu",
      description: `Bạn có chắc chắn muốn xóa tài liệu "${title}"?`,
      onExecute: (confirmed) => deleteLearningMaterialAction(materialId, confirmed),
      onSuccess: async () => {
        setToastMsg(`Đã xóa tài liệu "${title}"`);
        if (currentFolder) await loadMaterials(currentFolder.id);
      },
    });
  };

  const handleDownload = (mat: any) => {
    incrementMaterialDownloadCountAction(mat.id);
    const a = document.createElement("a");
    a.href = mat.fileUrl;
    a.download = mat.fileName || mat.title;
    a.click();
  };

  const handleSaveRename = async () => {
    if (!editingMaterial || !editTitle.trim()) return;
    startTransition(async () => {
      await updateLearningMaterialAction({
        materialId: editingMaterial.id,
        title: editTitle.trim(),
      });
      setEditingMaterial(null);
      if (currentFolder) await loadMaterials(currentFolder.id);
    });
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "Hôm nay";
    try {
      return new Date(iso).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Hôm nay";
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const displayFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayMaterials = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.fileName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="panel space-y-4">
      {/* Thanh điều hướng Breadcrumb + Tìm kiếm + Nút Tạo thư mục & Tải tài liệu */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
        {/* Đường dẫn thư mục (Breadcrumbs) */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#64748B] overflow-x-auto py-1">
          <button
            type="button"
            onClick={handleBackToRoot}
            className={`hover:text-[#EA580C] transition ${
              !currentFolder ? "font-bold text-[#EA580C]" : ""
            }`}
          >
            📁 Tất cả thư mục
          </button>
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={b.id}>
              <ChevronRight className="size-4 text-[#94A3B8] shrink-0" />
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(b, idx)}
                className={`hover:text-[#EA580C] transition truncate max-w-[200px] ${
                  idx === breadcrumbs.length - 1 ? "font-bold text-[#EA580C]" : ""
                }`}
              >
                {b.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Tìm kiếm & Nút thao tác */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thư mục, tên tệp..."
              className="field field-search border-[#CBD5E1] h-9 text-xs"
            />
          </div>

          {canManage && !isStudent && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateFolderOpen(true)}
                className="text-xs rounded-xl border-[#CBD5E1] hover:bg-slate-50 text-[#0F172A] font-semibold gap-1.5 h-9"
              >
                <FolderPlus className="size-4 text-[#EA580C]" /> Tạo thư mục
              </Button>
              <Button
                size="sm"
                onClick={() => setIsUploadOpen(true)}
                className="text-xs rounded-xl bg-primary hover:bg-primary/90 text-white font-bold gap-1.5 h-9 shadow-sm"
              >
                <UploadCloud className="size-4" /> Tải lên tài liệu
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bảng hiển thị Thư mục & Tệp tài liệu */}
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <th className="py-3.5 px-4 text-xs font-bold text-[#64748B] uppercase">
                Tên thư mục / Tài liệu
              </th>
              <th className="py-3.5 px-4 w-36 text-xs font-bold text-[#64748B] uppercase">
                Thông tin / Kích thước
              </th>
              <th className="py-3.5 px-4 w-32 text-xs font-bold text-[#64748B] uppercase">
                Ngày tạo
              </th>
              <th className="py-3.5 px-4 w-44 text-xs font-bold text-[#64748B] uppercase">
                Người đăng
              </th>
              <th className="py-3.5 px-4 w-28 text-right text-xs font-bold text-[#64748B] uppercase">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] bg-white">
            {/* 1. DANH SÁCH THƯ MỤC (GỒM CẢ THƯ MỤC CON KHI ĐANG Ở TRONG THƯ MỤC CHA) */}
            {displayFolders.map((f) => (
              <tr
                key={f.id}
                onClick={() => handleOpenFolder(f)}
                className="hover:bg-[#F8FAFC] cursor-pointer transition group"
              >
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <Folder
                      className={`size-5 shrink-0 ${
                        f.isInherited ? "text-[#EA580C]" : "text-amber-500"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#0F172A] group-hover:text-[#EA580C] transition">
                          {f.name}
                        </span>
                        {f.isInherited && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            <Lock className="size-3" /> Giáo trình chung của trình độ
                          </span>
                        )}
                      </div>
                      {f.description && (
                        <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                          {f.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-xs text-[#475569] font-medium">
                  {f.fileCount || 0} tệp
                  {f.subFolderCount > 0 ? ` • ${f.subFolderCount} thư mục con` : ""}
                </td>
                <td className="py-3.5 px-4 text-xs text-[#64748B]">
                  {formatDate(f.createdAt)}
                </td>
                <td className="py-3.5 px-4 text-xs font-medium text-[#334155]">
                  {f.authorName || (f.isInherited ? "Quản trị viên" : currentUser.fullName || "Giáo viên")}
                </td>
                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  {!f.isInherited && canManage && !isStudent && (
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(f.id, f.name)}
                      title="Xóa thư mục"
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-[#94A3B8] hover:text-rose-600 transition"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* 2. DANH SÁCH TỆP TÀI LIỆU */}
            {displayMaterials.map((m) => {
              const isImg = isImageFile(m.fileName, m.mimeType);
              return (
                <tr
                  key={m.id}
                  onClick={() => setPreviewMaterial(m)}
                  className="hover:bg-[#F8FAFC] cursor-pointer transition group"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {m.fileType === "PDF" ? (
                        <FileText className="size-5 text-[#EA580C] shrink-0" />
                      ) : m.fileType === "AUDIO" ? (
                        <Music className="size-5 text-purple-600 shrink-0" />
                      ) : isImg ? (
                        <ImageIcon className="size-5 text-emerald-600 shrink-0" />
                      ) : (
                        <File className="size-5 text-blue-600 shrink-0" />
                      )}
                      <div>
                        <span className="font-semibold text-[#0F172A] group-hover:text-[#EA580C] transition block">
                          {m.title}
                        </span>
                        <span className="text-[11px] text-[#64748B] font-mono">
                          {m.fileName}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#475569] font-mono">
                    {formatSize(m.fileSize)}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-[#64748B]">
                    {formatDate(m.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-[#334155]">
                    {m.authorName || currentUser.fullName || "Giáo viên"}
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewMaterial(m)}
                        title="Xem tài liệu"
                        className="p-1.5 rounded-lg hover:bg-orange-50 text-[#64748B] hover:text-[#EA580C] transition"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(m)}
                        title="Tải về máy"
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition"
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
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(m.id, m.title)}
                            title="Xóa tài liệu"
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-[#64748B] hover:text-rose-600 transition"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Trạng thái trống */}
            {displayFolders.length === 0 && displayMaterials.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-[#64748B]">
                  {currentFolder
                    ? "Thư mục này hiện chưa có tệp tài liệu nào. Bấm \"Tải lên tài liệu\" ở góc phải để thêm tệp."
                    : "Lớp học chưa có thư mục hoặc tài liệu nào. Hãy bấm \"Tạo thư mục\" hoặc \"Tải lên tài liệu\"."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Tạo thư mục */}
      <CreateFolderModal
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        parentFolders={folders}
        currentParentId={currentFolder?.id || null}
        isAdmin={currentUser.role === "ADMIN"}
        onSubmit={handleCreateFolder}
      />

      {/* Modal Tải tài liệu */}
      <BulkUploadModal
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        currentFolder={currentFolder}
        availableFolders={folders}
        onUpload={handleBulkUpload}
      />

      {/* Modal Xem tài liệu trực tuyến */}
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

      {/* Modal Đổi tên tài liệu */}
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

      <DeleteConfirmModal target={deleteTarget} onClose={() => setDeleteTarget(null)} />

      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#0F172A] text-white text-xs font-semibold rounded-xl shadow-2xl border border-emerald-500/20">
          <CircleCheck className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg("")}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
