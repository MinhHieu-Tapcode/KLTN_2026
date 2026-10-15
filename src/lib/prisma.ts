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
 * Kiểm tra siêu tốc xem Cơ sở dữ liệu PostgreSQL có đang hoạt động hay không.
 * Tự động phân biệt giữa Localhost (kiểm tra 300ms) và Cloud Database / Supabase trên Vercel (kiểm tra 2500ms)
 * để tránh false-negative và ngăn chặn triệt để tình trạng treo / lag.
 */
export async function isDbAlive(): Promise<boolean> {
  const now = Date.now();
  const { host, port } = parseDbHostAndPort();
  const isLocal = host === "127.0.0.1" || host === "localhost";

  // Cache kết quả: Nếu DB đang hoạt động tốt -> cache 60s. Nếu tạm thời lỗi -> cache ngắn (5s cho cloud, 15s cho local) để thử lại sớm
  const cacheDuration = globalForPrisma.isDbReachable
    ? 60000
    : isLocal
    ? 15000
    : 5000;

  if (
    globalForPrisma.isDbReachable !== undefined &&
    globalForPrisma.lastDbCheckTime &&
    now - globalForPrisma.lastDbCheckTime < cacheDuration
  ) {
    return globalForPrisma.isDbReachable;
  }

  const socketTimeout = isLocal ? 300 : 2500;
  const probeTimeout = isLocal ? 800 : 3500;

  const isSocketOpen = await new Promise<boolean>((resolve) => {
    try {
      const socket = net.createConnection({ host, port, timeout: socketTimeout });
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

  if (!isSocketOpen) {
    globalForPrisma.isDbReachable = false;
    globalForPrisma.lastDbCheckTime = now;
    return false;
  }

  try {
    const probe = prisma.$queryRaw`SELECT 1`;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB_PROBE_TIMEOUT")), probeTimeout)
    );
    await Promise.race([probe, timeout]);
    globalForPrisma.isDbReachable = true;
    globalForPrisma.lastDbCheckTime = now;
    return true;
  } catch {
    globalForPrisma.isDbReachable = false;
    globalForPrisma.lastDbCheckTime = now;
    return false;
  }
}

