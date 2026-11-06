import { NextRequest, NextResponse } from "next/server";
import { lookup } from "dns/promises";
import { isIP } from "net";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 30 * 1024 * 1024;

// AUTHZ-31: chặn SSRF — không cho proxy tới địa chỉ nội bộ / loopback / link-local
function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateIp(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

async function isSafeHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
  if (isIP(host)) return !isPrivateIp(host);
  try {
    const records = await lookup(host, { all: true });
    return records.length > 0 && records.every((r) => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Vui lòng cung cấp tham số url" }, { status: 400 });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Giao thức URL không hợp lệ" }, { status: 400 });
    }
    if (!(await isSafeHost(parsedUrl.hostname))) {
      return NextResponse.json({ error: "Địa chỉ nguồn không được phép" }, { status: 403 });
    }

    const response = await fetch(targetUrl, {
      redirect: "error", // không theo chuyển hướng để tránh vòng sang địa chỉ nội bộ
      signal: AbortSignal.timeout(20000),
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

    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) {
      return NextResponse.json({ error: "Tệp PDF quá lớn" }, { status: 413 });
    }

    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Disposition", "inline");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "private, max-age=3600");

    return new NextResponse(response.body, { status: 200, headers });
  } catch (err: any) {
    console.error("Lỗi khi tải PDF proxy:", err);
    return NextResponse.json(
      { error: "Không thể kết nối đến máy chủ chứa file PDF" },
      { status: 502 }
    );
  }
}
