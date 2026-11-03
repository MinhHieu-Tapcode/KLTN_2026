export interface UploadedMaterialMeta {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
}

export function detectFileCategory(
  fileName: string,
  mimeType?: string
): "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER" {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (ext === "pdf" || mime.includes("pdf")) return "PDF";
  if (
    ["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext) ||
    mime.startsWith("audio/")
  ) {
    return "AUDIO";
  }
  if (
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "csv", "odt"].includes(ext) ||
    mime.includes("word") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    mime.includes("excel")
  ) {
    return "DOCUMENT";
  }
  if (
    ["mp4", "mkv", "mov", "avi", "webm"].includes(ext) ||
    mime.startsWith("video/")
  ) {
    return "VIDEO";
  }
  return "OTHER";
}

export function isImageFile(fileName?: string, mimeType?: string): boolean {
  const ext = (fileName?.split(".").pop() || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();
  return (
    ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext) ||
    mime.startsWith("image/")
  );
}

/**
 * Tải tệp tin thực tế lên máy chủ (lưu vào public/uploads/materials/)
 * để đường dẫn bền vững qua các lần tải lại trang (F5).
 */
export async function uploadMaterialFileToServer(
  file: File
): Promise<UploadedMaterialMeta> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/materials/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.fileUrl) {
        return {
          fileUrl: data.fileUrl,
          fileName: data.fileName || file.name,
          fileSize: data.fileSize || file.size,
          mimeType: data.mimeType || file.type || "application/octet-stream",
          fileType: data.fileType || detectFileCategory(file.name, file.type),
        };
      }
    }
  } catch (err) {
    console.warn("[uploadMaterialFileToServer] Fallback local URL:", err);
  }

  return {
    fileUrl: URL.createObjectURL(file),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
    fileType: detectFileCategory(file.name, file.type),
  };
}

export async function uploadMaterialFileClient(
  file: File
): Promise<UploadedMaterialMeta & { success: boolean; url: string; error?: string }> {
  const meta = await uploadMaterialFileToServer(file);
  return {
    ...meta,
    success: Boolean(meta.fileUrl),
    url: meta.fileUrl,
  };
}
