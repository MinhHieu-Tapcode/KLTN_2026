import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

function detectMaterialType(
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

function sanitizeFileName(name: string): string {
  // Giữ lại chữ cái, số, dấu gạch ngang, gạch dưới, dấu chấm
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned || "material_file";
}

// AUTHZ-07: danh sách đuôi file được phép (cấm html, htm, svg, js, xml...)
const STAFF_ALLOWED_EXT = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "mp3", "wav", "m4a", "aac", "ogg", "flac", "webm", "mp4",
  "png", "jpg", "jpeg", "gif", "webp",
]);
const STUDENT_ALLOWED_EXT = new Set(["webm", "wav", "mp3", "m4a", "ogg"]);
const STAFF_MAX_BYTES = 50 * 1024 * 1024;
const STUDENT_MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Vui lòng đăng nhập để tải tệp lên!" },
        { status: 401 }
      );
    }
    const isStudentUser = session.role === "STUDENT";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy tệp tin tải lên!" },
        { status: 400 }
      );
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const allowed = isStudentUser ? STUDENT_ALLOWED_EXT : STAFF_ALLOWED_EXT;
    if (!file.name.includes(".") || !allowed.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: isStudentUser
            ? "Học viên chỉ được tải lên tệp ghi âm (webm, wav, mp3, m4a, ogg)!"
            : "Định dạng tệp không được hỗ trợ!",
        },
        { status: isStudentUser && STAFF_ALLOWED_EXT.has(ext) ? 403 : 400 }
      );
    }
    if (file.size > (isStudentUser ? STUDENT_MAX_BYTES : STAFF_MAX_BYTES)) {
      return NextResponse.json(
        { success: false, error: "Tệp vượt quá dung lượng cho phép!" },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName = sanitizeFileName(file.name);
    const uniqueFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${safeName}`;
    let fileUrl = `/uploads/materials/${uniqueFileName}`;

    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "materials");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const filePath = path.join(uploadDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);
    } catch (fsErr) {
      // Trên Vercel (Read-Only Filesystem), lưu tạm vào /tmp để không văng lỗi 500
      try {
        const tmpDir = path.join("/tmp", "uploads", "materials");
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        fs.writeFileSync(path.join(tmpDir, uniqueFileName), buffer);
      } catch {
        // Bỏ qua nếu /tmp không khả dụng
      }
      if (file.size <= 4 * 1024 * 1024 && (file.type?.startsWith("audio/") || file.type?.startsWith("image/"))) {
        fileUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
      }
    }

    const fileType = detectMaterialType(file.name, file.type);

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      fileType,
    });
  } catch (err: any) {
    console.error("[POST /api/materials/upload] Lỗi:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Không thể lưu tệp tin lên máy chủ!",
      },
      { status: 500 }
    );
  }
}
