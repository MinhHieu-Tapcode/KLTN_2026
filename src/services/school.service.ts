import { prisma, isDbAlive } from "@/lib/prisma";
import { areSchedulesConflicting } from "@/lib/schedule";
import { logSystemWarning } from "@/lib/telemetry";

export const DEMO_SCHOOLS: any[] = [
  {
    id: "demo-school-1",
    code: "SCH_TD",
    name: "THPT Trương Định",
    type: "THPT",
    address: "Hoàng Mai, Hà Nội",
    contactName: "Thầy Nguyễn Văn Hiệu",
    contactPhone: "0912345001",
    managerId: "demo-manager-1",
    manager: {
      id: "demo-manager-1",
      username: "manager_quan",
      email: "manager@simpace.vn",
      profile: { fullName: "ThS. Hoàng Văn Quản", phoneNumber: "0981234567" },
    },
    isActive: true,
    classes: [],
  },
  {
    id: "demo-school-2",
    code: "SCH_KL",
    name: "THPT Kim Liên",
    type: "THPT",
    address: "Đống Đa, Hà Nội",
    contactName: "Cô Trần Thị Phó",
    contactPhone: "0912345002",
    managerId: null,
    manager: null,
    isActive: true,
    classes: [],
  },
];

function hydrateDemoSchools(params: GetSchoolsServiceParams = {}) {
  const { searchKeyword = "", statusFilter = "ACTIVE", managerId } = params;
  const allDemoClasses = (((globalThis as any).demoClasses || []) as any[]).filter(
    (c) => c.isActive !== false
  );

  let list = DEMO_SCHOOLS.map((s) => {
    const schoolClasses = allDemoClasses.filter((c) => c.schoolId === s.id);
    return {
      ...s,
      classes: schoolClasses,
      _count: { classes: schoolClasses.length },
    };
  });

  if (statusFilter === "ACTIVE") {
    list = list.filter((s) => s.isActive !== false);
  } else if (statusFilter === "INACTIVE") {
    list = list.filter((s) => s.isActive === false);
  }

  if (managerId) {
    list = list.filter((s) => s.managerId === managerId);
  }

  if (searchKeyword && searchKeyword.trim()) {
    const q = searchKeyword.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.contactName?.toLowerCase().includes(q)
    );
  }

  return list;
}

/**
 * Sinh mã trường học tự động từ tên trường (VD: THPT Trương Định -> SCH_TD)
 */
export async function generateSchoolCode(schoolName: string): Promise<string> {
  let cleanName = schoolName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "D")
    .toUpperCase();

  // Bỏ tiền tố trường học nếu có
  cleanName = cleanName
    .replace(/^TRUONG\s+(THPT|THCS|DAI\s+HOC|CD|TIEU\s+HOC)\s+/, "")
    .replace(/^(THPT|THCS|DAI\s+HOC|CD|TIEU\s+HOC)\s+/, "");

  const words = cleanName
    .split(/[\s,.-]+/)
    .filter(Boolean);

  let acronym = words.map((w) => w[0]).join("");
  if (!acronym || acronym.length < 2) {
    acronym = words[0]?.slice(0, 3) || "SIM";
  }

  let candidate = `SCH_${acronym}`;

  if (await isDbAlive()) {
    try {
      let existing = await prisma.school.findUnique({ where: { code: candidate } });
      let idx = 1;

      while (existing) {
        candidate = `SCH_${acronym}_${idx.toString().padStart(2, "0")}`;
        existing = await prisma.school.findUnique({ where: { code: candidate } });
        idx++;
      }

      return candidate;
    } catch (err: any) {
      logSystemWarning("school.service", "generateSchoolCode", "Lỗi DB khi sinh mã trường học, sử dụng mã ứng viên", err);
    }
  }

  return candidate;
}

export interface GetSchoolsServiceParams {
  searchKeyword?: string;
  statusFilter?: "ACTIVE" | "INACTIVE" | "ALL";
  managerId?: string;
}

/**
 * Lấy danh sách trường học có lọc theo trạng thái, từ khóa và quản nhiệm
 */
export async function getSchoolsService(params: GetSchoolsServiceParams = {}) {
  const { searchKeyword = "", statusFilter = "ACTIVE", managerId } = params;

  if (!(await isDbAlive())) {
    logSystemWarning("school.service", "getSchoolsService", "DB offline, trả về danh sách trường học demo");
    return hydrateDemoSchools(params) as any;
  }

  try {
    const whereClause: any = {};

    if (statusFilter === "ACTIVE") {
      whereClause.isActive = true;
    } else if (statusFilter === "INACTIVE") {
      whereClause.isActive = false;
    }

    if (managerId) {
      whereClause.managerId = managerId;
    }

    if (searchKeyword && searchKeyword.trim()) {
      const clean = searchKeyword.trim();
      whereClause.OR = [
        { name: { contains: clean, mode: "insensitive" } },
        { code: { contains: clean, mode: "insensitive" } },
        { address: { contains: clean, mode: "insensitive" } },
        { contactName: { contains: clean, mode: "insensitive" } },
      ];
    }

    return await prisma.school.findMany({
      where: whereClause,
      include: {
        manager: {
          include: { profile: true },
        },
        classes: {
          where: { isActive: true },
          include: {
            assignments: {
              include: { staff: { include: { profile: true } } },
            },
            _count: {
              select: { enrollments: true },
            },
          },
        },
        _count: {
          select: { classes: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err: any) {
    logSystemWarning("school.service", "getSchoolsService", "Lỗi truy vấn DB khi lấy danh sách trường, fallback demo", err);
    return hydrateDemoSchools(params) as any;
  }
}

/**
 * Lấy thông tin chi tiết trường học và danh sách lớp trực thuộc
 */
export async function getSchoolDetailService(schoolId: string) {
  if (!(await isDbAlive())) {
    const hydrated = hydrateDemoSchools({ statusFilter: "ALL" });
    return hydrated.find((s) => s.id === schoolId) || null;
  }

  try {
    return await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        manager: {
          include: { profile: true },
        },
        classes: {
          where: { isActive: true },
          include: {
            assignments: {
              include: { staff: { include: { profile: true } } },
            },
            _count: {
              select: { enrollments: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch (err: any) {
    logSystemWarning("school.service", "getSchoolDetailService", "Lỗi DB khi lấy chi tiết trường", err);
    const hydrated = hydrateDemoSchools({ statusFilter: "ALL" });
    return hydrated.find((s) => s.id === schoolId) || null;
  }
}

/**
 * Lấy danh sách người dùng có vai trò Quản nhiệm (SCHOOL_MANAGER)
 */
export async function getSchoolManagersService() {
  if (!(await isDbAlive())) {
    const demoUsers = (((globalThis as any).demoUsers || []) as any[]).filter(
      (u) => u.isActive !== false && u.role?.code === "SCHOOL_MANAGER"
    );
    if (demoUsers.length > 0) return demoUsers;
    return [
      {
        id: "demo-manager-1",
        username: "manager_quan",
        email: "manager@simpace.vn",
        isActive: true,
        profile: { fullName: "ThS. Hoàng Văn Quản", phoneNumber: "0981234567" },
        managedSchools: [{ id: "demo-school-1", name: "THPT Trương Định", code: "SCH_TD" }],
      },
    ] as any;
  }

  try {
    return await prisma.user.findMany({
      where: {
        role: { code: "SCHOOL_MANAGER" },
        isActive: true,
      },
      include: {
        profile: true,
        managedSchools: {
          where: { isActive: true },
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { username: "asc" },
    });
  } catch (err: any) {
    logSystemWarning("school.service", "getSchoolManagersService", "Lỗi DB khi lấy danh sách quản nhiệm", err);
    return [];
  }
}

export interface CreateSchoolData {
  code?: string;
  name: string;
  type?: "THCS" | "THPT" | "UNIVERSITY" | "OTHER";
  managerId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
}

/**
 * Tạo trường học mới
 */
export async function createSchoolService(data: CreateSchoolData) {
  try {
    const cleanName = data.name.trim();
    if (!cleanName) {
      return { success: false, error: "Tên trường học là bắt buộc!" };
    }
    if (!data.contactName?.trim()) {
      return { success: false, error: "Vui lòng nhập tên Đại diện BGH / Giáo vụ liên hệ!" };
    }
    if (!data.contactPhone?.trim()) {
      return { success: false, error: "Vui lòng nhập Số điện thoại liên hệ BGH!" };
    }
    if (!data.address?.trim()) {
      return { success: false, error: "Vui lòng nhập Địa chỉ trường học!" };
    }

    let code = data.code?.trim().toUpperCase();
    if (!code) {
      code = await generateSchoolCode(cleanName);
    }

    if (await isDbAlive()) {
      const existing = await prisma.school.findUnique({
        where: { code },
      });

      if (existing) {
        return { success: false, error: `Mã trường '${code}' đã tồn tại!` };
      }

      const school = await prisma.school.create({
        data: {
          code,
          name: cleanName,
          type: data.type || "THPT",
          managerId: data.managerId || null,
          address: data.address?.trim() || null,
          contactName: data.contactName?.trim() || null,
          contactPhone: data.contactPhone?.trim() || null,
          isActive: true,
        },
        include: {
          manager: { include: { profile: true } },
        },
      });

      return { success: true, school };
    } else {
      // Fallback in-memory
      logSystemWarning("school.service", "createSchoolService", "DB offline khi tạo trường, lưu tạm demo");
      const demoSchool = {
        id: `demo-school-${Date.now()}`,
        code,
        name: cleanName,
        type: data.type || "THPT",
        managerId: data.managerId || null,
        address: data.address?.trim() || null,
        contactName: data.contactName?.trim() || null,
        contactPhone: data.contactPhone?.trim() || null,
        isActive: true,
        classes: [],
      };
      DEMO_SCHOOLS.push(demoSchool);
      return { success: true, school: demoSchool };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo trường học!" };
  }
}

export interface UpdateSchoolData {
  name?: string;
  type?: "THCS" | "THPT" | "UNIVERSITY" | "OTHER";
  managerId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
}

/**
 * Cập nhật thông tin trường học
 */
export async function updateSchoolService(id: string, data: UpdateSchoolData) {
  try {
    if (data.name !== undefined && !data.name.trim()) {
      return { success: false, error: "Tên trường học không được để trống!" };
    }
    if (data.managerId !== undefined && !data.managerId) {
      return { success: false, error: "Trường học bắt buộc phải có Quản nhiệm phụ trách!" };
    }

    if (data.managerId) {
      const conflictCheck = await checkSchoolManagerScheduleConflictService(id, data.managerId);
      if (conflictCheck.hasConflict) {
        return {
          success: false,
          error: conflictCheck.error || "Phát hiện xung đột lịch học giữa các trường mà quản nhiệm phụ trách!",
        };
      }
    }

    if (await isDbAlive()) {
      await prisma.school.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          type: data.type,
          managerId: data.managerId !== undefined ? data.managerId || null : undefined,
          address: data.address?.trim() || null,
          contactName: data.contactName?.trim() || null,
          contactPhone: data.contactPhone?.trim() || null,
        },
      });
      return { success: true };
    } else {
      const demo = DEMO_SCHOOLS.find((s) => s.id === id);
      if (demo) {
        if (data.name) demo.name = data.name.trim();
        if (data.type) demo.type = data.type;
        if (data.address) demo.address = data.address.trim();
      }
      return { success: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật trường học!" };
  }
}

/**
 * Xóa mềm trường học (isActive: false)
 */
export async function deleteSchoolService(id: string) {
  try {
    if (await isDbAlive()) {
      await prisma.school.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      const demo = DEMO_SCHOOLS.find((s) => s.id === id);
      if (demo) demo.isActive = false;
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa trường học!" };
  }
}

/**
 * Khôi phục trường học đã xóa mềm (isActive: true)
 */
export async function restoreSchoolService(id: string) {
  try {
    if (await isDbAlive()) {
      await prisma.school.update({
        where: { id },
        data: { isActive: true },
      });
    } else {
      const demo = DEMO_SCHOOLS.find((s) => s.id === id);
      if (demo) demo.isActive = true;
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể khôi phục trường học!" };
  }
}

/**
 * Xóa mềm hàng loạt trường học
 */
export async function deleteMultipleSchoolsService(ids: string[]) {
  try {
    if (await isDbAlive()) {
      await prisma.school.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      });
    } else {
      DEMO_SCHOOLS.forEach((s) => {
        if (ids.includes(s.id)) s.isActive = false;
      });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể xóa các trường đã chọn!" };
  }
}

/**
 * Kiểm tra xung đột lịch học giữa các trường mà Quản nhiệm phụ trách
 */
export async function checkSchoolManagerScheduleConflictService(
  targetSchoolId: string,
  managerId: string
) {
  try {
    if (!await isDbAlive()) {
      return { success: true, hasConflict: false, managerName: "Quản nhiệm", otherSchools: [] };
    }

    const [targetSchool, targetManager, otherSchools] = await Promise.all([
      prisma.school.findUnique({
        where: { id: targetSchoolId },
        include: {
          classes: {
            where: { isActive: true },
            select: { id: true, name: true, code: true, description: true, startDate: true, endDate: true },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: managerId },
        include: { profile: true },
      }),
      prisma.school.findMany({
        where: {
          managerId,
          id: { not: targetSchoolId },
          isActive: true,
        },
        include: {
          classes: {
            where: { isActive: true },
            select: { id: true, name: true, code: true, description: true, startDate: true, endDate: true },
          },
        },
      }),
    ]);

    if (!targetSchool) {
      return { success: false, error: "Không tìm thấy trường học!" };
    }

    const managerName = targetManager?.profile?.fullName || targetManager?.username || "Quản nhiệm";

    for (const targetCls of targetSchool.classes) {
      if (!targetCls.description) continue;

      for (const otherSch of otherSchools) {
        for (const otherCls of otherSch.classes) {
          if (!otherCls.description) continue;

          const isConflict = areSchedulesConflicting(
            targetCls.description,
            otherCls.description,
            { start: targetCls.startDate, end: targetCls.endDate },
            { start: otherCls.startDate, end: otherCls.endDate }
          );

          if (isConflict) {
            return {
              success: true,
              hasConflict: true,
              managerName,
              otherSchoolName: otherSch.name,
              targetSchoolName: targetSchool.name,
              targetClassName: targetCls.name,
              targetClassCode: targetCls.code,
              targetClassSchedule: targetCls.description,
              otherClassName: otherCls.name,
              otherClassCode: otherCls.code,
              otherClassSchedule: otherCls.description,
              error: `Xung đột lịch học: Trường "${targetSchool.name}" có lớp "${targetCls.name}" (${targetCls.description}) bị trùng khung giờ với lớp "${otherCls.name}" (${otherCls.description}) tại trường "${otherSch.name}" mà quản nhiệm "${managerName}" đang phụ trách! Không thể phân công quản nhiệm.`,
            };
          }
        }
      }
    }

    return {
      success: true,
      hasConflict: false,
      managerName,
      otherSchools: otherSchools.map((s) => ({ id: s.id, name: s.name, code: s.code })),
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi kiểm tra trùng lịch quản nhiệm!" };
  }
}

export interface ChangeSchoolManagerParams {
  schoolId: string;
  newManagerId: string;
  actionType: "ASSIGN" | "SWAP" | "OVERWRITE";
  swapWithSchoolId?: string;
}

/**
 * Thay đổi quản nhiệm phụ trách trường: Hỗ trợ GHI ĐÈ hoặc HOÁN ĐỔI 2 QUẢN NHIỆM
 */
export async function changeSchoolManagerService(data: ChangeSchoolManagerParams) {
  try {
    const { schoolId, newManagerId, actionType, swapWithSchoolId } = data;

    // 1. Kiểm tra xung đột lịch học của newManagerId với schoolId
    const conflictCheck = await checkSchoolManagerScheduleConflictService(schoolId, newManagerId);
    if (conflictCheck.hasConflict) {
      return {
        success: false,
        error: conflictCheck.error || "Phát hiện xung đột lịch học giữa các trường mà quản nhiệm phụ trách!",
      };
    }

    if (await isDbAlive()) {
      const currentSchool = await prisma.school.findUnique({
        where: { id: schoolId },
        include: { manager: true },
      });
      if (!currentSchool) {
        return { success: false, error: "Không tìm thấy trường học!" };
      }

      const oldManagerId = currentSchool.managerId;

      if (actionType === "SWAP") {
        if (!swapWithSchoolId) {
          return { success: false, error: "Vui lòng chọn trường học cần hoán đổi quản nhiệm!" };
        }

        if (oldManagerId) {
          const oldManagerConflict = await checkSchoolManagerScheduleConflictService(
            swapWithSchoolId,
            oldManagerId
          );
          if (oldManagerConflict.hasConflict) {
            return {
              success: false,
              error: `Không thể hoán đổi: ${oldManagerConflict.error}`,
            };
          }
        }

        await prisma.$transaction([
          prisma.school.update({
            where: { id: schoolId },
            data: { managerId: newManagerId },
          }),
          prisma.school.update({
            where: { id: swapWithSchoolId },
            data: { managerId: oldManagerId || null },
          }),
        ]);

        return { success: true, message: "Hoán đổi quản nhiệm giữa 2 trường thành công!" };
      } else {
        await prisma.school.update({
          where: { id: schoolId },
          data: { managerId: newManagerId },
        });

        return { success: true, message: "Cập nhật quản nhiệm phụ trách trường thành công!" };
      }
    } else {
      return { success: true, message: "Cập nhật quản nhiệm phụ trách trường thành công (demo)!" };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể thay đổi quản nhiệm!" };
  }
}
