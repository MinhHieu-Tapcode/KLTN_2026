"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FolderPlus } from "lucide-react";

interface CreateFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolders?: Array<{ id: string; name: string }>;
  currentParentId?: string | null;
  isAdmin?: boolean;
  onSubmit: (data: {
    name: string;
    description?: string;
    parentId?: string | null;
    isInherited?: boolean;
  }) => Promise<void>;
}

export function CreateFolderModal({
  open,
  onOpenChange,
  parentFolders = [],
  currentParentId = null,
  isAdmin = false,
  onSubmit,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>(currentParentId || "ROOT");
  const [isInherited, setIsInherited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: parentId === "ROOT" ? null : parentId,
        isInherited,
      });
      setName("");
      setDescription("");
      setIsInherited(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-white shadow-xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderPlus className="size-5 text-[#EA580C]" />
            Tạo thư mục mới
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên thư mục <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên thư mục..."
              className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/15 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Thư mục cha
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#EA580C] transition"
            >
              <option value="ROOT">📁 Thư mục Gốc (Cấp cao nhất)</option>
              {parentFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  📂 {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mô tả ghi chú (tùy chọn)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Tài liệu luyện thi dành riêng cho buổi 1..."
              className="w-full h-9 px-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C] transition"
            />
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <b className="block text-xs text-slate-800">Kế thừa từ trình độ</b>
                <span className="text-[11px] text-slate-500">
                  Thư mục chuẩn sẽ tự động xuất hiện ở tất cả các lớp cùng Level
                </span>
              </div>
              <input
                type="checkbox"
                checked={isInherited}
                onChange={(e) => setIsInherited(e.target.checked)}
                className="size-4 accent-[#EA580C] rounded cursor-pointer"
              />
            </div>
          )}

          <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim()}
              className="text-xs rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Đang tạo...
                </>
              ) : (
                "Tạo thư mục"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
