import { prisma, isDbAlive } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { AssignmentSearchInput } from "@/lib/validations/assignment-edit";

export interface AssignmentSearchScope {
  role: string;
  userId: string;
}

export interface AssignmentSearchItem {
  id: string;
  title: string;
  skill: string;
  type: string;
  createdAt: string;
  questionCount: number;
  submissionCount: number;
  classes: { id: string; name: string; code: string; dueDate: string | null }[];
}

/** Giới hạn bài tập theo phạm vi của người dùng (Admin: tất cả, Quản nhiệm: trường mình, GV: lớp mình dạy). */
function buildClassScope(scope: AssignmentSearchScope): Prisma.ClassWhereInput {
  if (scope.role === "TEACHER") return { assignments: { some: { userId: scope.userId } } };
  if (scope.role === "SCHOOL_MANAGER") return { school: { managerId: scope.userId } };
  return {};
}

/**
 * Tìm kiếm bài tập xuyên lớp theo từ khóa (tên, mô tả), lớp và kỹ năng.
 */
export async function searchAssignmentsService(
  scope: AssignmentSearchScope,
  filters: AssignmentSearchInput
): Promise<{
  success: boolean;
  items: AssignmentSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const empty = { success: false, items: [], total: 0, page, pageSize };

  if (!(await isDbAlive())) {
    return { ...empty, error: "Hệ thống đang bảo trì CSDL, chưa thể tìm kiếm bài tập!" };
  }

  const classWhere: Prisma.ClassWhereInput = {
    isActive: true,
    ...buildClassScope(scope),
    ...(filters.classId ? { id: filters.classId } : {}),
  };
  const linkWhere: Prisma.AssignmentClassWhereInput = { isActive: true, class: classWhere };

  const keyword = filters.keyword?.trim();
  const where: Prisma.AssignmentWhereInput = {
    isActive: true,
    assignedClasses: { some: linkWhere },
    ...(filters.skill ? { skill: filters.skill } : {}),
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: "insensitive" } },
            { description: { contains: keyword, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [total, rows] = await Promise.all([
      prisma.assignment.count({ where }),
      prisma.assignment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          skill: true,
          type: true,
          createdAt: true,
          _count: { select: { questions: true, submissions: true } },
          assignedClasses: {
            where: linkWhere,
            select: {
              dueDate: true,
              class: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      total,
      page,
      pageSize,
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        skill: r.skill,
        type: r.type,
        createdAt: r.createdAt.toISOString(),
        questionCount: r._count.questions,
        submissionCount: r._count.submissions,
        classes: r.assignedClasses.map((ac) => ({
          id: ac.class.id,
          name: ac.class.name,
          code: ac.class.code,
          dueDate: ac.dueDate ? ac.dueDate.toISOString() : null,
        })),
      })),
    };
  } catch (err) {
    console.error("[searchAssignmentsService] Lỗi:", err);
    return { ...empty, error: "Không thể tìm kiếm bài tập, vui lòng thử lại!" };
  }
}
