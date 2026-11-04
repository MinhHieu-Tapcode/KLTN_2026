import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import mammoth from "mammoth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const fileUrl = req.nextUrl.searchParams.get("url") || "";
    if (!fileUrl || !fileUrl.startsWith("/uploads/materials/")) {
      return NextResponse.json(
        { success: false, error: "Đường dẫn tệp không hợp lệ" },
        { status: 400 }
      );
    }

    const relativePath = fileUrl.replace(/^\//, "");
    const fullPath = path.join(process.cwd(), "public", relativePath);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy tệp trên máy chủ" },
        { status: 404 }
      );
    }

    const buffer = fs.readFileSync(fullPath);
    const result = await mammoth.convertToHtml({ buffer });

    return NextResponse.json({
      success: true,
      html: result.value || "<p>Tài liệu trống.</p>",
    });
  } catch (err: any) {
    console.error("[GET /api/materials/docx-preview] Lỗi:", err);
    return NextResponse.json(
      { success: false, error: "Không thể đọc nội dung tệp Word" },
      { status: 500 }
    );
  }
}
