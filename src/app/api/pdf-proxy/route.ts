import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Vui lòng cung cấp tham số url" },
      { status: 400 }
    );
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Giao thức URL không hợp lệ" },
        { status: 400 }
      );
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Không thể tải tệp PDF từ nguồn ngoài (${response.status})` },
        { status: response.status }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", "inline");
    headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
    headers.set("Access-Control-Allow-Origin", "*");

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("Lỗi khi tải PDF proxy:", err);
    return NextResponse.json(
      { error: "Không thể kết nối đến máy chủ chứa file PDF" },
      { status: 500 }
    );
  }
}
