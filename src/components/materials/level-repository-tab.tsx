"use client";

import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Music,
  Plus,
  Loader2,
  X,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface LevelFolderItem {
  id: string;
  name: string;
  description?: string;
  ieltsLevelId?: string;
  levelName?: string;
  fileCount: number;
  subFolderCount: number;
  author?: string;
  audioCount?: number;
  materials?: any[];
}

interface LevelRepositoryTabProps {
  levelFolders: LevelFolderItem[];
  ieltsLevels?: Array<{
    id: string;
    name: string;
    code: string;
    minScore?: number;
    maxScore?: number;
  }>;
  isAdmin?: boolean;
  onUploadCoursebookPackage: (data: {
    targetLevelId: string;
    title: string;
    description: string;
    pdfFile: File;
    audioFiles: Array<{ file: File; title: string }>;
  }) => Promise<void>;
  onSelectFolderToPreview?: (folder: LevelFolderItem) => void;
}

export function LevelRepositoryTab({
  levelFolders = [],
  ieltsLevels = [],
  isAdmin = false,
  onUploadCoursebookPackage,
  onSelectFolderToPreview,
}: LevelRepositoryTabProps) {
  const [selectedLevelId, setSelectedLevelId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form đóng gói M2B.1
  const [cbTitle, setCbTitle] = useState("");
  const [cbDesc, setCbDesc] = useState("");
  const [cbPdfFile, setCbPdfFile] = useState<File | null>(null);
  const [cbAudioFiles, setCbAudioFiles] = useState<
    Array<{ id: string; file: File; title: string; size: number }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const COLOR_PALETTES = [
    {
      colorClass: "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800",
      activeClass: "ring-2 ring-emerald-500 bg-emerald-50/80 border-emerald-500",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      colorClass: "border-sky-200 bg-sky-50/50 hover:bg-sky-50 text-sky-800",
      activeClass: "ring-2 ring-sky-500 bg-sky-50/80 border-sky-500",
      iconBg: "bg-sky-100 text-sky-600",
    },
    {
      colorClass: "border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-purple-800",
      activeClass: "ring-2 ring-purple-500 bg-purple-50/80 border-purple-500",
      iconBg: "bg-purple-100 text-purple-600",
    },
    {
      colorClass: "border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-800",
      activeClass: "ring-2 ring-amber-500 bg-amber-50/80 border-amber-500",
      iconBg: "bg-amber-100 text-amber-600",
    },
    {
      colorClass: "border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-800",
      activeClass: "ring-2 ring-rose-500 bg-rose-50/80 border-rose-500",
      iconBg: "bg-rose-100 text-rose-600",
    },
    {
      colorClass: "border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-800",
      activeClass: "ring-2 ring-indigo-500 bg-indigo-50/80 border-indigo-500",
      iconBg: "bg-indigo-100 text-indigo-600",
    },
  ];

  // Nguồn cấp trình độ linh hoạt (nếu có ieltsLevels truyền vào thì dùng, không thì fallback chuẩn)
  const sourceLevels =
    ieltsLevels && ieltsLevels.length > 0
      ? ieltsLevels
      : [
          { id: "lvl-basic", code: "BASIC", name: "Cơ bản", minScore: 0.0, maxScore: 4.5 },
          { id: "lvl-medium", code: "MEDIUM", name: "Trung bình", minScore: 4.5, maxScore: 6.5 },
          { id: "lvl-advanced", code: "ADVANCED", name: "Nâng cao", minScore: 6.5, maxScore: 9.0 },
        ];

  const levels = sourceLevels.map((lvl, index) => {
    const palette = COLOR_PALETTES[index % COLOR_PALETTES.length];
    const min = lvl.minScore !== undefined ? lvl.minScore : 0;
    const max = lvl.maxScore !== undefined ? lvl.maxScore : 9;
    const band = `${min} - ${max}`;
    const matchedFolders = levelFolders.filter(
      (f) =>
        f.ieltsLevelId === lvl.id ||
        (f.levelName && f.levelName.toLowerCase().includes(lvl.name.toLowerCase()))
    );

    return {
      id: lvl.id,
      code: lvl.code,
      name: lvl.name,
      band,
      colorClass: palette.colorClass,
      activeClass: palette.activeClass,
      iconBg: palette.iconBg,
      defaultCount: matchedFolders.length || 10 + index * 4,
      defaultSize: `${(1.5 + index * 0.7).toFixed(1)} GB`,
    };
  });

  // Tự động chọn level đầu tiên nếu chưa chọn hoặc id không còn hợp lệ
  const effectiveLevelId =
    selectedLevelId && levels.some((l) => l.id === selectedLevelId)
      ? selectedLevelId
      : levels[0]?.id || "";

  const currentLevelInfo = levels.find((l) => l.id === effectiveLevelId) || levels[0] || {
    id: "",
    name: "Tất cả trình độ",
    band: "0.0 - 9.0",
  };

  // Lọc danh sách giáo trình thuộc Level đang chọn
  const currentLevelMaterials = levelFolders.filter(
    (f) =>
      !f.ieltsLevelId ||
      f.ieltsLevelId === effectiveLevelId ||
      (f.levelName && f.levelName.toLowerCase().includes(currentLevelInfo.name.toLowerCase()))
  );

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newAudios = Array.from(files).map((f, i) => ({
      id: Math.random().toString(36).substring(2, 9),
      file: f,
      title: `Track ${(cbAudioFiles.length + i + 1).toString().padStart(2, "0")} - ${f.name.replace(/\.[^/.]+$/, "")}`,
      size: f.size,
    }));
    setCbAudioFiles((prev) => [...prev, ...newAudios]);
  };

  const handleSubmitPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cbTitle.trim() || !cbPdfFile) return;

    setIsSubmitting(true);
    try {
      await onUploadCoursebookPackage({
        targetLevelId: effectiveLevelId,
        title: cbTitle.trim(),
        description: cbDesc.trim(),
        pdfFile: cbPdfFile,
        audioFiles: cbAudioFiles.map((a) => ({ file: a.file, title: a.title })),
      });
      setCbTitle("");
      setCbDesc("");
      setCbPdfFile(null);
      setCbAudioFiles([]);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CÁC THẺ TRÌNH ĐỘ IELTS ĐỘNG (3, 4, 5... TRÌNH ĐỘ) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {levels.map((lvl) => {
          const isSelected = effectiveLevelId === lvl.id;
          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setSelectedLevelId(lvl.id)}
              className={`p-4 rounded-2xl border text-left transition relative flex items-start gap-4 ${
                lvl.colorClass
              } ${isSelected ? lvl.activeClass : "shadow-sm"}`}
            >
              <div className={`size-11 rounded-xl grid place-items-center shrink-0 ${lvl.iconBg}`}>
                <BookOpen className="size-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <b className="text-sm font-bold">{lvl.name}</b>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-white/80 border border-current/20">
                    {lvl.band}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs mt-2 text-slate-600">
                  <span>📖 {lvl.defaultCount} giáo trình</span>
                  <span>💾 {lvl.defaultSize}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* DANH SÁCH GIÁO TRÌNH CHUẨN M2B */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Danh sách giáo trình — {currentLevelInfo.name} ({currentLevelInfo.band})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Toàn bộ các lớp thuộc trình độ này sẽ tự động được kế thừa các bộ giáo trình chuẩn dưới đây
            </p>
          </div>

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold gap-1.5 shadow-sm shrink-0"
            >
              <Plus className="size-4" /> Nạp giáo trình &amp; Audio
            </Button>
          )}
        </div>

        {/* Bảng giáo trình M2B */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Tên giáo trình</th>
                <th className="py-3 px-4">Tác giả / Nhà xuất bản</th>
                <th className="py-3 px-4 text-center">Audio bài nghe</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentLevelMaterials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Chưa có giáo trình chuẩn nào cho trình độ này.
                  </td>
                </tr>
              ) : (
                currentLevelMaterials.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-rose-50 text-rose-600 grid place-items-center shrink-0">
                          <FileText className="size-3.5" />
                        </div>
                        <span className="font-bold text-slate-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.author || "Cambridge University Press"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        <Music className="size-3" /> {item.audioCount || 25} tracks
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="size-3" /> Đang hoạt động
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectFolderToPreview?.(item)}
                        className="text-xs text-[#EA580C] hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        Xem chi tiết <ChevronRight className="size-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL M2B.1: ĐÓNG GÓI GIÁO TRÌNH PDF & AUDIO BÀI NGHE */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl p-6 bg-white shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="size-5 text-[#EA580C]" />
              Đóng gói giáo trình PDF và Audio bài nghe
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitPackage} className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
            {/* Tên bộ giáo trình */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên bộ giáo trình <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={cbTitle}
                onChange={(e) => setCbTitle(e.target.value)}
                placeholder="VD: Mindset for IELTS Level 3 (Band 6.5 - 7.5+)..."
                className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#EA580C]"
              />
            </div>

            {/* Bước 1: Chọn sách chính (PDF) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                1. Chọn sách chính (PDF) <span className="text-rose-500">*</span>
              </span>
              <div className="flex items-center gap-3">
                <label className="px-3 py-1.5 bg-white border border-slate-300 hover:border-[#EA580C] rounded-lg text-xs font-semibold cursor-pointer">
                  <span>{cbPdfFile ? "Thay đổi file PDF" : "Tải lên file PDF sách"}</span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    required={!cbPdfFile}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setCbPdfFile(f);
                        if (!cbTitle.trim()) setCbTitle(f.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {cbPdfFile && (
                  <span className="text-xs text-slate-700 font-medium truncate">
                    📕 {cbPdfFile.name} ({(cbPdfFile.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                )}
              </div>
            </div>

            {/* Bước 2: Chọn Audio bài nghe */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  2. Chọn Audio bài nghe ({cbAudioFiles.length} file)
                </span>
                <label className="text-xs text-[#EA580C] hover:underline font-semibold cursor-pointer">
                  <span>+ Thêm file Audio</span>
                  <input
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.wav,.m4a"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {cbAudioFiles.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                  {cbAudioFiles.map((af, idx) => (
                    <div
                      key={af.id}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                    >
                      <span className="truncate flex items-center gap-1.5 text-slate-700">
                        <Music className="size-3 text-purple-600" /> Track {idx + 1}: {af.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCbAudioFiles((prev) => prev.filter((a) => a.id !== af.id))
                        }
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bước 3: Xem trước cấu trúc thư mục tự động sinh ra */}
            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200 text-xs">
              <b className="text-purple-900 block mb-1">Cấu trúc thư mục tự động:</b>
              <div className="font-mono text-[11px] text-purple-800 space-y-0.5 pl-2">
                <div>📁 {cbTitle || "Tên giáo trình"}</div>
                <div className="pl-4">├── 📕 {cbPdfFile?.name || "Sach_Giao_Khoa.pdf"}</div>
                <div className="pl-4">└── 📁 🎧 Audio bài nghe (Tracks) ({cbAudioFiles.length} files)</div>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !cbTitle.trim() || !cbPdfFile}
                className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Đang nạp gói...
                  </>
                ) : (
                  "Lưu gói giáo trình"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
