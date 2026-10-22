import { PrismaClient } from "@prisma/client";
import * as net from "net";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  lastDbCheckTime: number | undefined;
  isDbReachable: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

// Luôn gán vào globalThis để tái sử dụng connection pool trên Serverless (Vercel) và Local, tránh cạn kiệt connection
globalForPrisma.prisma = prisma;

function parseDbHostAndPort(): { host: string; port: number } {
  try {
    const urlStr = process.env.DATABASE_URL;
    if (!urlStr) return { host: "127.0.0.1", port: 5432 };
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    };
  } catch {
    return { host: "127.0.0.1", port: 5432 };
  }
}

/**
 * Kiểm tra xem Cơ sở dữ liệu PostgreSQL có đang hoạt động hay không.
 * - Trên môi trường Production / Cloud (Vercel / Supabase): Bỏ qua raw socket probe nặng nề,
 *   tận dụng tối đa Connection Pool của Prisma và Supavisor, phản hồi tức thì (0ms overhead).
 * - Trên môi trường Localhost: Kiểm tra nhanh qua socket (300ms) để thông báo cho lập trình viên nếu quên bật Postgres.
 */
export async function isDbAlive(): Promise<boolean> {
  const urlStr = process.env.DATABASE_URL;
  if (!urlStr) {
    return false;
  }

  const { host, port } = parseDbHostAndPort();
  const isLocal = host === "127.0.0.1" || host === "localhost";

  // Trên Cloud / Vercel: DB Supabase luôn sẵn sàng qua Connection Pooler.
  // Không thực hiện TCP raw socket hay query thừa trước mỗi request để tránh đội latency.
  if (!isLocal || process.env.VERCEL) {
    return true;
  }

  // Ở Local: Kiểm tra nhanh socket để hỗ trợ dev khi chạy máy cá nhân
  const now = Date.now();
  if (
    globalForPrisma.isDbReachable !== undefined &&
    globalForPrisma.lastDbCheckTime &&
    now - globalForPrisma.lastDbCheckTime < 15000
  ) {
    return globalForPrisma.isDbReachable;
  }

  const isSocketOpen = await new Promise<boolean>((resolve) => {
    try {
      const socket = net.createConnection({ host, port, timeout: 300 });
      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });

  globalForPrisma.isDbReachable = isSocketOpen;
  globalForPrisma.lastDbCheckTime = now;
  return isSocketOpen;
}
