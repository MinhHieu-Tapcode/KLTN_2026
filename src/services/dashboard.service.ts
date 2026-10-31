import { prisma, isDbAlive } from "@/lib/prisma";

export interface SystemActivity {
  id: string;
  time: string;
  title: string;
  actor: string;
}

/**
 * Lấy danh sách 5 hoạt động gần đây nhất từ cơ sở dữ liệu:
 * - Tài khoản người dùng mới tạo
 * - Lớp học mới tạo
 * - Trường học mới tạo
 * - Đợt import Excel danh sách học sinh
 * - Tài liệu học liệu mới tải lên
 */
export async function getRecentActivitiesService(): Promise<SystemActivity[]> {
  if (!(await isDbAlive())) {
    return [
      { id: "act-1", time: "Hôm nay", title: "Khởi tạo hệ thống đào tạo SIMPACE LMS", actor: "Hệ thống" },
    ];
  }

  try {
    const [recentUsers, recentClasses, recentSchools, recentImports, recentMaterials] = await Promise.all([
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { role: true, profile: true },
      }),
      prisma.class.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.school.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.importLog.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { importedBy: { include: { profile: true } } },
      }),
      prisma.learningMaterial.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const events: { date: Date; title: string; actor: string }[] = [];

    for (const u of recentUsers) {
      const name = u.profile?.fullName || u.username;
      const roleName = u.role?.name || u.role?.code;
      events.push({
        date: u.createdAt,
        title: `Tạo tài khoản mới: ${name} (${roleName})`,
        actor: "Admin",
      });
    }

    for (const c of recentClasses) {
      events.push({
        date: c.createdAt,
        title: `Mở lớp học mới: ${c.name} (${c.code})`,
        actor: "Quản nhiệm",
      });
    }

    for (const s of recentSchools) {
      events.push({
        date: s.createdAt,
        title: `Thêm trường đối tác: ${s.name}`,
        actor: "Admin",
      });
    }

    for (const imp of recentImports) {
      const uName = imp.importedBy?.profile?.fullName || "Admin";
      events.push({
        date: imp.createdAt,
        title: `Import danh sách: ${imp.fileName} (${imp.successCount} thành công)`,
        actor: uName,
      });
    }

    for (const m of recentMaterials) {
      events.push({
        date: m.createdAt,
        title: `Tải lên tài liệu: ${m.title}`,
        actor: "Giáo viên",
      });
    }

    // Sắp xếp giảm dần theo thời gian tạo
    events.sort((a, b) => b.date.getTime() - a.date.getTime());

    const top5 = events.slice(0, 5);

    const formatActivityTime = (d: Date): string => {
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");

      if (isToday) {
        return `${hours}:${minutes}`;
      }

      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      return `${day}/${month} ${hours}:${minutes}`;
    };

    return top5.map((ev, idx) => ({
      id: `act-${idx}`,
      time: formatActivityTime(ev.date),
      title: ev.title,
      actor: ev.actor,
    }));
  } catch (error) {
    console.error("[getRecentActivitiesService] Lỗi:", error);
    return [];
  }
}
