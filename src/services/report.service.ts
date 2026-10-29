import { prisma, isDbAlive } from "@/lib/prisma";
import {
  calculateWritingOverallBand,
  estimateAcademicBand,
  getIeltsSubtypeLabel,
  LISTENING_IELTS_TYPES,
  READING_IELTS_TYPES,
  REPORT_THRESHOLDS,
  ReportPeriodKey,
  resolvePeriodRange,
  roundIeltsBand,
  SPEAKING_CRITERIA,
  WRITING_CRITERIA,
} from "@/lib/ielts-report-config";
import { resolveIeltsQuestionType } from "./assignment-mutation.service";
import { getReportCommentService } from "./report-comment.service";
import "./class.service";
import "./assignment.service";

const globalReportMemoryRef = globalThis as unknown as {
  demoClasses?: any[];
  demoAssignments?: any[];
};

function getMemoryAssignmentsForClass(classId: string) {
  const list = globalReportMemoryRef.demoAssignments || [];
  return list
    .filter(
      (a) =>
        a.isActive !== false &&
        (a.classId === classId ||
          (Array.isArray(a.assignedClasses) &&
            a.assignedClasses.some((ac: any) => ac.classId === classId && ac.isActive !== false)))
    )
    .map((a) => {
      const qMap = new Map<string, any>();
      const questions = (a.questions || []).map((q: any, idx: number) => {
        const normQ = {
          ...q,
          id: q.id || `q-${idx}`,
          questionNumber: q.questionNumber || idx + 1,
          type: q.type || q.questionType || "MULTIPLE_CHOICE",
          points: Number(q.points) || 1,
        };
        qMap.set(normQ.id, normQ);
        return normQ;
      });
      const submissions = (a.submissions || []).map((sub: any) => ({
        ...sub,
        submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : new Date(),
        student: {
          id: sub.studentId,
          username: sub.studentEmail || sub.studentId,
          profile: { fullName: sub.studentName || "Học viên" },
        },
        answers: (sub.answers || []).map((ans: any) => ({
          ...ans,
          question: qMap.get(ans.questionId) || questions[0] || null,
          teacherComment: ans.feedback || ans.teacherComment || null,
          criteriaScores: (ans.criteriaScores || []).map((cs: any) => ({
            criterion: cs.criterion || cs.criterionCode,
            score: Number(cs.score ?? cs.bandScore ?? 0),
          })),
        })),
      }));
      return {
        ...a,
        dueDate: a.dueDate ? new Date(a.dueDate) : null,
        createdAt: a.startDate ? new Date(a.startDate) : new Date(Date.now() - 5 * 86400000),
        questions,
        submissions,
      };
    });
}

export interface ScopeOption {
  schools: Array<{
    id: string;
    code: string;
    name: string;
    classes: Array<{
      id: string;
      code: string;
      name: string;
      schoolId: string;
      schoolName: string;
      students: Array<{
        id: string;
        username: string;
        fullName: string;
        email: string;
      }>;
    }>;
  }>;
  classes: Array<{
    id: string;
    code: string;
    name: string;
    schoolId: string;
    schoolName: string;
    students: Array<{
      id: string;
      username: string;
      fullName: string;
      email: string;
    }>;
  }>;
}

/**
 * Xác định phạm vi Trường -> Lớp -> Học sinh mà người dùng hiện tại được quyền xem (Mục 2.1 & 2.3)
 */
export async function getReportScopeOptionsService(user: {
  userId: string;
  role: string;
}): Promise<ScopeOption> {
  if (!(await isDbAlive())) {
    const rawClasses = (globalReportMemoryRef.demoClasses || []).filter((c) => c.isActive !== false);
    const mappedClasses = rawClasses
      .filter((c) => {
        if (user.role === "TEACHER") {
          return (c.assignments || []).some(
            (a: any) => a.userId === user.userId || a.userId === "teacher-1"
          );
        }
        return true;
      })
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        schoolId: c.schoolId || "demo-school-1",
        schoolName: c.school?.name || "THPT Trương Định",
        students: (c.enrollments || []).map((en: any) => ({
          id: en.studentId,
          username: en.student?.username || en.studentId,
          fullName: en.student?.profile?.fullName || en.student?.username || "Học viên",
          email: en.student?.email || "",
        })),
      }));

    if (user.role === "STUDENT") {
      return { schools: [], classes: mappedClasses };
    }
    if (user.role === "TEACHER") {
      return { schools: [], classes: mappedClasses };
    }
    const schoolMap = new Map<string, ScopeOption["schools"][number]>();
    for (const cls of mappedClasses) {
      const ex: ScopeOption["schools"][number] = schoolMap.get(cls.schoolId) || {
        id: cls.schoolId,
        code: cls.schoolId === "demo-school-1" ? "SCH_TD" : "SCH_KL",
        name: cls.schoolName,
        classes: [],
      };
      ex.classes.push(cls);
      schoolMap.set(cls.schoolId, ex);
    }
    return {
      schools: Array.from(schoolMap.values()),
      classes: mappedClasses,
    };
  }

  const role = user.role;

  // Học sinh chỉ xem báo cáo của chính bản thân (Mục 2.1)
  if (role === "STUDENT") {
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: user.userId },
      include: {
        class: {
          include: {
            school: { select: { id: true, code: true, name: true } },
          },
        },
        student: {
          include: { profile: { select: { fullName: true } } },
        },
      },
    });

    const classes = enrollments
      .filter((e) => e.class.isActive)
      .map((e) => ({
        id: e.class.id,
        code: e.class.code,
        name: e.class.name,
        schoolId: e.class.schoolId,
        schoolName: e.class.school.name,
        students: [
          {
            id: e.student.id,
            username: e.student.username,
            fullName: e.student.profile?.fullName || e.student.username,
            email: e.student.email,
          },
        ],
      }));

    return { schools: [], classes };
  }

  // Giáo viên chỉ xem các lớp được phân công, KHÔNG xem báo cáo cấp Trường (Mục 2.1)
  if (role === "TEACHER") {
    const assigned = await prisma.classAssignment.findMany({
      where: {
        userId: user.userId,
        class: { isActive: true },
      },
      include: {
        class: {
          include: {
            school: { select: { id: true, code: true, name: true } },
            enrollments: {
              include: {
                student: {
                  include: { profile: { select: { fullName: true } } },
                },
              },
            },
          },
        },
      },
    });

    const classes = assigned.map((ca) => ({
      id: ca.class.id,
      code: ca.class.code,
      name: ca.class.name,
      schoolId: ca.class.schoolId,
      schoolName: ca.class.school.name,
      students: ca.class.enrollments
        .filter((en) => en.student.isActive)
        .map((en) => ({
          id: en.student.id,
          username: en.student.username,
          fullName: en.student.profile?.fullName || en.student.username,
          email: en.student.email,
        })),
    }));

    return { schools: [], classes };
  }

  // Quản nhiệm (SCHOOL_MANAGER) hoặc ADMIN: Xem Trường -> Lớp -> Học sinh trong phạm vi quản lý
  const whereSchool: any = { isActive: true };
  if (role === "SCHOOL_MANAGER") {
    const managedCount = await prisma.school.count({
      where: { isActive: true, managerId: user.userId },
    });
    if (managedCount > 0) {
      whereSchool.managerId = user.userId;
    }
  }

  const schoolsDb = await prisma.school.findMany({
    where: whereSchool,
    include: {
      classes: {
        where: { isActive: true },
        include: {
          enrollments: {
            include: {
              student: {
                include: { profile: { select: { fullName: true } } },
              },
            },
          },
        },
        orderBy: { code: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const schools = schoolsDb.map((sc) => ({
    id: sc.id,
    code: sc.code,
    name: sc.name,
    classes: sc.classes.map((cls) => ({
      id: cls.id,
      code: cls.code,
      name: cls.name,
      schoolId: sc.id,
      schoolName: sc.name,
      students: cls.enrollments
        .filter((en) => en.student.isActive)
        .map((en) => ({
          id: en.student.id,
          username: en.student.username,
          fullName: en.student.profile?.fullName || en.student.username,
          email: en.student.email,
        })),
    })),
  }));

  const allClasses = schools.flatMap((s) => s.classes);
  return { schools, classes: allClasses };
}

/**
 * Helper: Tính % điểm cao nhất của 1 học sinh cho từng bài tập (BR-08, BR-09)
 */
function computeStudentAssignmentStats(params: {
  studentId: string;
  assignments: Array<{
    id: string;
    title: string;
    skill: string;
    dueDate: Date | null;
    startDate: Date | null;
    totalPoints: number;
    questionCount: number;
    submissions: Array<{
      id: string;
      studentId: string;
      attemptNumber: number;
      status: string;
      score: number | null;
      totalPoints: number | null;
      submittedAt: Date | null;
    }>;
  }>;
  now: Date;
}) {
  const { studentId, assignments, now } = params;
  let submittedCount = 0;
  let pendingGradingCount = 0;
  let overdueCount = 0;
  let pendingNotDueCount = 0;
  let openedAssignmentsCount = 0;

  const gradedBestPercents: Array<{
    assignmentId: string;
    percent: number;
    submittedAt: Date;
  }> = [];

  for (const assign of assignments) {
    const isOpened = !assign.startDate || assign.startDate <= now;
    if (!isOpened) continue;
    openedAssignmentsCount++;

    const studentSubs = assign.submissions.filter((s) => s.studentId === studentId);
    const validSubs = studentSubs.filter(
      (s) => s.status === "SUBMITTED" || s.status === "GRADED"
    );

    if (validSubs.length > 0) {
      submittedCount++;
      const gradedSubs = validSubs.filter(
        (s) => s.status === "GRADED" && s.score !== null && s.score !== undefined
      );

      if (gradedSubs.length > 0) {
        // BR-09: Lấy lần có % điểm cao nhất
        let bestPct = 0;
        let bestDate = gradedSubs[0].submittedAt || now;
        for (const gs of gradedSubs) {
          const maxPts = gs.totalPoints || assign.totalPoints || 1;
          const pct = Math.min(100, Math.max(0, ((gs.score || 0) / maxPts) * 100));
          if (pct >= bestPct) {
            bestPct = pct;
            bestDate = gs.submittedAt || now;
          }
        }
        gradedBestPercents.push({
          assignmentId: assign.id,
          percent: Number(bestPct.toFixed(1)),
          submittedAt: bestDate,
        });
      } else {
        pendingGradingCount++;
      }
    } else {
      // Chưa nộp (hoặc chỉ mới IN_PROGRESS / NOT_STARTED)
      if (assign.dueDate && assign.dueDate < now) {
        // BR-05, BR-06: Quá hạn
        overdueCount++;
      } else {
        pendingNotDueCount++;
      }
    }
  }

  const averagePercent =
    gradedBestPercents.length > 0
      ? Number(
          (
            gradedBestPercents.reduce((sum, item) => sum + item.percent, 0) /
            gradedBestPercents.length
          ).toFixed(1)
        )
      : null;

  const completionRatePercent =
    openedAssignmentsCount > 0
      ? Number(((submittedCount / openedAssignmentsCount) * 100).toFixed(1))
      : 0;

  // BR-11: Kiểm tra điều kiện "Học sinh cần hỗ trợ"
  const supportReasons: string[] = [];
  if (
    averagePercent !== null &&
    averagePercent < REPORT_THRESHOLDS.studentSupport.minAveragePercent
  ) {
    supportReasons.push(`ĐTB thấp (${averagePercent}% < 50%)`);
  }
  if (overdueCount >= REPORT_THRESHOLDS.studentSupport.minOverdueAssignments) {
    supportReasons.push(`Quá hạn ${overdueCount} bài chưa nộp`);
  }
  if (gradedBestPercents.length >= 3) {
    const sortedByTime = [...gradedBestPercents].sort(
      (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()
    );
    const last3 = sortedByTime.slice(-3);
    if (last3[0].percent > last3[1].percent && last3[1].percent > last3[2].percent) {
      supportReasons.push(
        `Giảm 3 bài liên tiếp (${last3[0].percent}% → ${last3[1].percent}% → ${last3[2].percent}%)`
      );
    }
  }

  return {
    averagePercent,
    submittedCount,
    pendingGradingCount,
    overdueCount,
    pendingNotDueCount,
    openedAssignmentsCount,
    completionRatePercent,
    supportReasons,
    needsSupport: supportReasons.length > 0,
  };
}

/**
 * 1. BÁO CÁO CẤP TRƯỜNG (Mục 6.1 - Chỉ Quản nhiệm và Admin)
 */
export async function getSchoolReportService(params: {
  schoolId: string;
  periodKey: ReportPeriodKey;
  user: { userId: string; role: string };
}) {
  if (params.user.role === "TEACHER" || params.user.role === "STUDENT") {
    return {
      success: false,
      error: "Bạn không có quyền truy cập Báo cáo cấp Trường (Quy tắc 2.1)!",
    };
  }

  const range = resolvePeriodRange(params.periodKey);
  const now = new Date();
  const dbAlive = await isDbAlive();

  const school = dbAlive
    ? await prisma.school.findUnique({
        where: { id: params.schoolId },
        include: {
          classes: {
            where: { isActive: true },
            include: {
              enrollments: {
                where: { student: { isActive: true } },
                include: {
                  student: {
                    include: { profile: { select: { fullName: true } } },
                  },
                },
              },
              classAssignmentsList: {
                where: {
                  isActive: true,
                  ...(range.fromDate ? { createdAt: { gte: range.fromDate } } : {}),
                },
                include: {
                  questions: { select: { id: true, points: true } },
                  submissions: true,
                },
              },
              assignmentLinks: {
                where: {
                  isActive: true,
                  assignment: { isActive: true },
                  ...(range.fromDate ? { createdAt: { gte: range.fromDate } } : {}),
                },
                include: {
                  assignment: {
                    include: {
                      questions: { select: { id: true, points: true } },
                      submissions: true,
                    },
                  },
                },
              },
            },
            orderBy: { code: "asc" },
          },
        },
      })
    : (() => {
        const memClasses = (globalReportMemoryRef.demoClasses || []).filter(
          (c) => c.isActive !== false && (c.schoolId || "demo-school-1") === params.schoolId
        );
        return {
          id: params.schoolId,
          code: params.schoolId === "demo-school-1" ? "SCH_TD" : "SCH_KL",
          name:
            memClasses[0]?.school?.name ||
            (params.schoolId === "demo-school-1" ? "THPT Trương Định" : "THPT Kim Liên"),
          isActive: true,
          classes: memClasses.map((mc: any) => ({
            id: mc.id,
            code: mc.code,
            name: mc.name,
            enrollments: (mc.enrollments || []).map((en: any) => ({
              student: {
                id: en.studentId,
                username: en.student?.username || en.studentId,
                profile: { fullName: en.student?.profile?.fullName || "Học viên" },
              },
            })),
            classAssignmentsList: getMemoryAssignmentsForClass(mc.id),
            assignmentLinks: [],
          })),
        };
      })();

  if (!school || !school.isActive) {
    return { success: false, error: "Trường học không tồn tại hoặc đã ngừng hoạt động!" };
  }

  let totalStudents = 0;
  let totalSubmittedSlots = 0;
  let totalPendingNotDueSlots = 0;
  let totalOverdueSlots = 0;
  let totalOpenedSlots = 0;
  let totalFlaggedSubmissions = 0;
  let totalPendingGrading = 0;

  const classRows: Array<{
    classId: string;
    classCode: string;
    className: string;
    studentCount: number;
    assignmentCount: number;
    averagePercent: number | null;
    completionRatePercent: number;
    supportNeededCount: number;
    supportStudents: Array<{
      studentId: string;
      fullName: string;
      username: string;
      averagePercent: number | null;
      reasons: string[];
    }>;
  }> = [];

  const allGradedEvents: Array<{ date: Date; percent: number }> = [];

  for (const cls of school.classes) {
    const students = cls.enrollments.map((e: any) => e.student);
    totalStudents += students.length;

    // Gộp danh sách bài tập của lớp (từ Assignment trực tiếp và bảng nối AssignmentClass)
    const assignMap = new Map<
      string,
      {
        id: string;
        title: string;
        skill: string;
        dueDate: Date | null;
        startDate: Date | null;
        totalPoints: number;
        questionCount: number;
        submissions: any[];
      }
    >();

    for (const a of cls.classAssignmentsList) {
      const totalPts = a.questions.reduce((s: number, q: any) => s + (q.points || 1), 0);
      assignMap.set(a.id, {
        id: a.id,
        title: a.title,
        skill: a.skill,
        dueDate: a.dueDate,
        startDate: a.createdAt,
        totalPoints: totalPts,
        questionCount: a.questions.length,
        submissions: a.submissions.filter((sub: any) => !sub.classId || sub.classId === cls.id),
      });
    }

    for (const link of cls.assignmentLinks) {
      const a = link.assignment;
      const totalPts = a.questions.reduce((s, q) => s + (q.points || 1), 0);
      assignMap.set(a.id, {
        id: a.id,
        title: a.title,
        skill: a.skill,
        dueDate: link.dueDate || a.dueDate,
        startDate: link.startDate || link.createdAt,
        totalPoints: totalPts,
        questionCount: a.questions.length,
        submissions: a.submissions.filter((sub) => !sub.classId || sub.classId === cls.id),
      });
    }

    const classAssignments = Array.from(assignMap.values());

    // Đếm gian lận & chờ chấm
    for (const ca of classAssignments) {
      for (const sub of ca.submissions) {
        if (sub.isCheatingFlagged) totalFlaggedSubmissions++;
        if (sub.status === "SUBMITTED") totalPendingGrading++;
        if (
          sub.status === "GRADED" &&
          sub.score !== null &&
          sub.submittedAt
        ) {
          const maxPts = sub.totalPoints || ca.totalPoints || 1;
          allGradedEvents.push({
            date: sub.submittedAt,
            percent: Math.min(100, Math.max(0, (sub.score / maxPts) * 100)),
          });
        }
      }
    }

    const studentAverages: number[] = [];
    let clsSubmittedSlots = 0;
    let clsOpenedSlots = 0;
    const supportStudents: Array<{
      studentId: string;
      fullName: string;
      username: string;
      averagePercent: number | null;
      reasons: string[];
    }> = [];

    for (const st of students) {
      const stStat = computeStudentAssignmentStats({
        studentId: st.id,
        assignments: classAssignments,
        now,
      });

      if (stStat.averagePercent !== null) {
        studentAverages.push(stStat.averagePercent);
      }
      clsSubmittedSlots += stStat.submittedCount;
      clsOpenedSlots += stStat.openedAssignmentsCount;

      totalSubmittedSlots += stStat.submittedCount;
      totalPendingNotDueSlots += stStat.pendingNotDueCount;
      totalOverdueSlots += stStat.overdueCount;
      totalOpenedSlots += stStat.openedAssignmentsCount;

      if (stStat.needsSupport) {
        supportStudents.push({
          studentId: st.id,
          fullName: st.profile?.fullName || st.username,
          username: st.username,
          averagePercent: stStat.averagePercent,
          reasons: stStat.supportReasons,
        });
      }
    }

    const classAveragePercent =
      studentAverages.length > 0
        ? Number(
            (
              studentAverages.reduce((sum, v) => sum + v, 0) / studentAverages.length
            ).toFixed(1)
          )
        : null;

    const classCompletionRate =
      clsOpenedSlots > 0
        ? Number(((clsSubmittedSlots / clsOpenedSlots) * 100).toFixed(1))
        : 0;

    classRows.push({
      classId: cls.id,
      classCode: cls.code,
      className: cls.name,
      studentCount: students.length,
      assignmentCount: classAssignments.length,
      averagePercent: classAveragePercent,
      completionRatePercent: classCompletionRate,
      supportNeededCount: supportStudents.length,
      supportStudents,
    });
  }

  // BR-14: ĐTB cấp Trường = trung bình của ĐTB các lớp có điểm (lớp chưa có điểm không tính vào)
  const classesWithScores = classRows.filter(
    (c): c is typeof c & { averagePercent: number } => c.averagePercent !== null
  );
  const schoolAveragePercent =
    classesWithScores.length > 0
      ? Number(
          (
            classesWithScores.reduce((sum, c) => sum + c.averagePercent, 0) /
            classesWithScores.length
          ).toFixed(1)
        )
      : null;

  const schoolCompletionRatePercent =
    totalOpenedSlots > 0
      ? Number(((totalSubmittedSlots / totalOpenedSlots) * 100).toFixed(1))
      : 0;

  // Tổng hợp xu hướng theo tuần (4 mốc thời gian)
  const weeklyTrend = buildTimeSeriesTrend(allGradedEvents, params.periodKey);

  // Tự động tổng hợp Gợi ý Insight (Mục 6.1)
  const insights: string[] = [];
  if (schoolAveragePercent !== null) {
    const lowClasses = classesWithScores.filter(
      (c) => c.averagePercent < schoolAveragePercent - 8
    );
    if (lowClasses.length > 0) {
      insights.push(
        `Các lớp có ĐTB thấp hơn mặt bằng chung toàn trường (${schoolAveragePercent}%): ${lowClasses
          .map((c) => `${c.classCode} (${c.averagePercent}%)`)
          .join(", ")}.`
      );
    }
  }
  const lowCompletionClasses = classRows.filter(
    (c) => c.assignmentCount > 0 && c.completionRatePercent < 65
  );
  if (lowCompletionClasses.length > 0) {
    insights.push(
      `Lớp có tỷ lệ hoàn thành bài tập thấp (< 65%): ${lowCompletionClasses
        .map((c) => `${c.classCode} (${c.completionRatePercent}%)`)
        .join(", ")}.`
    );
  }
  const totalAtRisk = classRows.reduce((s, c) => s + c.supportNeededCount, 0);
  if (totalAtRisk > 0) {
    insights.push(
      `Toàn trường hiện có ${totalAtRisk} học sinh thuộc diện "Cần hỗ trợ" (ĐTB < 50%, quá hạn ≥ 2 bài hoặc giảm điểm 3 bài liên tiếp).`
    );
  }

  const hasData = classRows.some((c) => c.assignmentCount > 0 || c.studentCount > 0);

  return {
    success: true,
    hasData,
    report: {
      schoolId: school.id,
      schoolCode: school.code,
      schoolName: school.name,
      periodKey: params.periodKey,
      periodLabel: range.label,
      kpis: {
        totalClasses: school.classes.length,
        totalStudents,
        schoolAveragePercent,
        completionRatePercent: schoolCompletionRatePercent,
        flaggedSubmissionsCount: totalFlaggedSubmissions,
        pendingGradingCount: totalPendingGrading,
      },
      donut: {
        submitted: totalSubmittedSlots,
        pendingNotDue: totalPendingNotDueSlots,
        overdue: totalOverdueSlots,
        total: totalOpenedSlots,
      },
      weeklyTrend,
      classRows,
      insights,
    },
  };
}

/**
 * 2. BÁO CÁO CẤP LỚP & TAB VẬN HÀNH LỚP (Mục 6.2 & 6.7 - Quản nhiệm & Giáo viên)
 */
export async function getClassReportService(params: {
  classId: string;
  periodKey: ReportPeriodKey;
  user: { userId: string; role: string };
}) {
  if (params.user.role === "STUDENT") {
    return {
      success: false,
      error: "Học sinh chỉ được xem báo cáo cá nhân của chính mình (Quy tắc 2.1)!",
    };
  }

  const range = resolvePeriodRange(params.periodKey);
  const now = new Date();
  const dbAlive = await isDbAlive();

  const cls = dbAlive
    ? await prisma.class.findUnique({
        where: { id: params.classId },
        include: {
          school: true,
          assignments: {
            include: {
              staff: {
                include: { profile: { select: { fullName: true } } },
              },
            },
          },
          enrollments: {
            where: { student: { isActive: true } },
            include: {
              student: {
                include: { profile: { select: { fullName: true } } },
              },
            },
          },
          classAssignmentsList: {
            where: {
              isActive: true,
              ...(range.fromDate ? { createdAt: { gte: range.fromDate } } : {}),
            },
            include: {
              questions: true,
              submissions: {
                include: {
                  student: { include: { profile: { select: { fullName: true } } } },
                  answers: { include: { question: true, criteriaScores: true } },
                },
              },
            },
          },
          assignmentLinks: {
            where: {
              isActive: true,
              assignment: { isActive: true },
              ...(range.fromDate ? { createdAt: { gte: range.fromDate } } : {}),
            },
            include: {
              assignment: {
                include: {
                  questions: true,
                  submissions: {
                    include: {
                      student: { include: { profile: { select: { fullName: true } } } },
                      answers: { include: { question: true, criteriaScores: true } },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : (() => {
        const mc = (globalReportMemoryRef.demoClasses || []).find((c) => c.id === params.classId);
        if (!mc) return null;
        return {
          id: mc.id,
          code: mc.code,
          name: mc.name,
          isActive: mc.isActive !== false,
          schoolId: mc.schoolId || "demo-school-1",
          school: {
            id: mc.schoolId || "demo-school-1",
            name: mc.school?.name || "THPT Trương Định",
          },
          assignments: (mc.assignments || []).map((a: any) => ({
            userId: a.userId,
            roleInClass: a.roleInClass || "TEACHER",
            staff: {
              username: a.staff?.username || a.userId,
              profile: { fullName: a.staff?.profile?.fullName || "Giáo viên" },
            },
          })),
          enrollments: (mc.enrollments || []).map((en: any) => ({
            student: {
              id: en.studentId,
              username: en.student?.username || en.studentId,
              email: en.student?.email || "",
              profile: { fullName: en.student?.profile?.fullName || "Học viên" },
            },
          })),
          classAssignmentsList: getMemoryAssignmentsForClass(mc.id),
          assignmentLinks: [],
        };
      })();

  if (!cls || !cls.isActive) {
    return { success: false, error: "Lớp học không tồn tại hoặc đã bị xóa!" };
  }

  // Kiểm tra quyền của Giáo viên trên lớp này (Mục 2.1)
  if (params.user.role === "TEACHER") {
    const isAssigned = cls.assignments.some(
      (a: any) => a.userId === params.user.userId || a.userId === "teacher-1"
    );
    if (!isAssigned) {
      return {
        success: false,
        error: "Bạn không được phân công giảng dạy lớp học này nên không thể xem báo cáo!",
      };
    }
  }

  // Gộp bài tập của lớp
  const assignMap = new Map<
    string,
    {
      id: string;
      title: string;
      skill: string;
      type: string;
      dueDate: Date | null;
      startDate: Date | null;
      maxTabSwitches: number;
      totalPoints: number;
      questionCount: number;
      questions: any[];
      submissions: any[];
    }
  >();

  for (const a of cls.classAssignmentsList) {
    const totalPts = a.questions.reduce((s: number, q: any) => s + (q.points || 1), 0);
    assignMap.set(a.id, {
      id: a.id,
      title: a.title,
      skill: a.skill,
      type: a.type,
      dueDate: a.dueDate,
      startDate: a.createdAt,
      maxTabSwitches: a.maxTabSwitches || 3,
      totalPoints: totalPts,
      questionCount: a.questions.length,
      questions: a.questions,
      submissions: a.submissions.filter((sub: any) => !sub.classId || sub.classId === cls.id),
    });
  }

  for (const link of cls.assignmentLinks) {
    const a = link.assignment;
    const totalPts = a.questions.reduce((s: number, q: any) => s + (q.points || 1), 0);
    assignMap.set(a.id, {
      id: a.id,
      title: a.title,
      skill: a.skill,
      type: a.type,
      dueDate: link.dueDate || a.dueDate,
      startDate: link.startDate || link.createdAt,
      maxTabSwitches: link.maxTabSwitches || a.maxTabSwitches || 3,
      totalPoints: totalPts,
      questionCount: a.questions.length,
      questions: a.questions,
      submissions: a.submissions.filter((sub: any) => !sub.classId || sub.classId === cls.id),
    });
  }

  const classAssignments = Array.from(assignMap.values());
  const students = cls.enrollments.map((e: any) => e.student);

  // Thống kê theo từng học sinh
  let totalSubmittedSlots = 0;
  let totalPendingNotDueSlots = 0;
  let totalOverdueSlots = 0;
  let totalOpenedSlots = 0;

  const studentRows = students.map((st: any) => {
    const stat = computeStudentAssignmentStats({
      studentId: st.id,
      assignments: classAssignments,
      now,
    });

    totalSubmittedSlots += stat.submittedCount;
    totalPendingNotDueSlots += stat.pendingNotDueCount;
    totalOverdueSlots += stat.overdueCount;
    totalOpenedSlots += stat.openedAssignmentsCount;

    return {
      studentId: st.id,
      username: st.username,
      fullName: st.profile?.fullName || st.username,
      email: st.email,
      averagePercent: stat.averagePercent,
      submittedCount: stat.submittedCount,
      assignedCount: stat.openedAssignmentsCount,
      pendingGradingCount: stat.pendingGradingCount,
      overdueCount: stat.overdueCount,
      completionRatePercent: stat.completionRatePercent,
      needsSupport: stat.needsSupport,
      supportReasons: stat.supportReasons,
    };
  });

  const studentsWithScore = studentRows.filter(
    (s: any): s is (typeof studentRows)[number] & { averagePercent: number } =>
      s.averagePercent !== null
  );
  const classAveragePercent =
    studentsWithScore.length > 0
      ? Number(
          (
            studentsWithScore.reduce((sum: number, s: any) => sum + s.averagePercent, 0) /
            studentsWithScore.length
          ).toFixed(1)
        )
      : null;

  const completionRatePercent =
    totalOpenedSlots > 0
      ? Number(((totalSubmittedSlots / totalOpenedSlots) * 100).toFixed(1))
      : 0;

  // Column Chart: ĐTB của lớp theo từng bài kiểm tra/bài tập
  const assignmentAverages = classAssignments.map((ca) => {
    const gradedSubs = ca.submissions.filter(
      (s) => s.status === "GRADED" && s.score !== null && s.score !== undefined
    );
    // Mỗi học sinh lấy lần cao nhất (BR-09)
    const bestByStudent = new Map<string, number>();
    for (const gs of gradedSubs) {
      const maxPts = gs.totalPoints || ca.totalPoints || 1;
      const pct = Math.min(100, Math.max(0, ((gs.score || 0) / maxPts) * 100));
      const cur = bestByStudent.get(gs.studentId) ?? -1;
      if (pct > cur) bestByStudent.set(gs.studentId, pct);
    }
    const vals = Array.from(bestByStudent.values());
    const avgPct =
      vals.length > 0
        ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
        : null;

    const submittedStudentsCount = new Set(
      ca.submissions
        .filter((s) => s.status === "SUBMITTED" || s.status === "GRADED")
        .map((s) => s.studentId)
    ).size;

    return {
      assignmentId: ca.id,
      title: ca.title,
      skill: ca.skill,
      averagePercent: avgPct,
      submittedCount: submittedStudentsCount,
      submittedStudentsCount,
      totalStudents: students.length,
    };
  });

  // Bar Chart ngang: Tỷ lệ đúng theo dạng bài IELTS của cả lớp (Mục 6.2 & BR-04)
  const questionTypeMap = new Map<
    string,
    { code: string; label: string; skill: string; correct: number; total: number }
  >();

  const allGradedEvents: Array<{ date: Date; percent: number }> = [];
  const flaggedSubmissions: Array<{
    submissionId: string;
    studentId: string;
    studentName: string;
    assignmentId: string;
    assignmentTitle: string;
    tabSwitchCount: number;
    maxTabSwitches: number;
    autoSubmittedReason: string | null;
    submittedAt: string | null;
  }> = [];
  const pendingGradingSubmissions: Array<{
    submissionId: string;
    studentId: string;
    studentName: string;
    assignmentId: string;
    assignmentTitle: string;
    skill: string;
    submittedAt: string | null;
  }> = [];

  let totalSubmissionsCount = 0;
  let totalTabSwitchSum = 0;
  const graderCountMap = new Map<string, number>();

  for (const ca of classAssignments) {
    for (const sub of ca.submissions) {
      if (sub.status === "SUBMITTED" || sub.status === "GRADED") {
        totalSubmissionsCount++;
        totalTabSwitchSum += sub.tabSwitchCount || 0;
      }

      if (sub.isCheatingFlagged || sub.autoSubmittedReason) {
        flaggedSubmissions.push({
          submissionId: sub.id,
          studentId: sub.studentId,
          studentName: sub.student?.profile?.fullName || sub.student?.username || "Học viên",
          assignmentId: ca.id,
          assignmentTitle: ca.title,
          tabSwitchCount: sub.tabSwitchCount || 0,
          maxTabSwitches: ca.maxTabSwitches || 3,
          autoSubmittedReason: sub.autoSubmittedReason || null,
          submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
        });
      }

      if (sub.status === "SUBMITTED") {
        pendingGradingSubmissions.push({
          submissionId: sub.id,
          studentId: sub.studentId,
          studentName: sub.student?.profile?.fullName || sub.student?.username || "Học viên",
          assignmentId: ca.id,
          assignmentTitle: ca.title,
          skill: ca.skill,
          submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
        });
      }

      if (sub.status === "GRADED") {
        if (sub.gradedById) {
          graderCountMap.set(sub.gradedById, (graderCountMap.get(sub.gradedById) || 0) + 1);
        }
        if (sub.score !== null && sub.submittedAt) {
          const maxPts = sub.totalPoints || ca.totalPoints || 1;
          allGradedEvents.push({
            date: sub.submittedAt,
            percent: Math.min(100, Math.max(0, (sub.score / maxPts) * 100)),
          });
        }
      }

      // Tổng hợp câu trả lời theo dạng bài IELTS (chỉ tính Reading/Listening khách quan)
      for (const ans of sub.answers || []) {
        const q = ans.question;
        if (!q || ans.isCorrect === null || ans.isCorrect === undefined) continue;
        const subtypeCode =
          q.ieltsQuestionType ||
          resolveIeltsQuestionType(null, q.type, ca.skill, q.questionNumber);
        if (!subtypeCode || subtypeCode.startsWith("WRITING") || subtypeCode.startsWith("SPEAKING")) {
          continue;
        }
        const cur = questionTypeMap.get(subtypeCode) || {
          code: subtypeCode,
          label: getIeltsSubtypeLabel(subtypeCode),
          skill: subtypeCode.startsWith("LISTENING") ? "LISTENING" : "READING",
          correct: 0,
          total: 0,
        };
        cur.total += 1;
        if (ans.isCorrect) cur.correct += 1;
        questionTypeMap.set(subtypeCode, cur);
      }
    }
  }

  const questionTypeAccuracy = Array.from(questionTypeMap.values())
    .map((item) => ({
      code: item.code,
      label: item.label,
      skill: item.skill,
      correctCount: item.correct,
      totalCount: item.total,
      accuracyPercent: item.total > 0 ? Number(((item.correct / item.total) * 100).toFixed(1)) : 0,
      isLowData: item.total < REPORT_THRESHOLDS.lowDataMinQuestions, // BR-04
    }))
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent);

  // Thống kê năng suất chấm bài theo giáo viên (Mục 6.7 - Chỉ Quản nhiệm / Admin thấy)
  const teacherGradingStats = cls.assignments.map((ca: any) => {
    const gradedCount = graderCountMap.get(ca.userId) || 0;
    return {
      staffId: ca.userId,
      staffName: ca.staff.profile?.fullName || ca.staff.username,
      roleInClass: ca.roleInClass,
      gradedCount,
      pendingCount: pendingGradingSubmissions.length,
    };
  });

  const classComment = await getReportCommentService({
    scope: "CLASS",
    classId: cls.id,
    periodKey: params.periodKey,
  });

  const weeklyTrend = buildTimeSeriesTrend(allGradedEvents, params.periodKey);

  return {
    success: true,
    hasData: classAssignments.length > 0,
    report: {
      classId: cls.id,
      classCode: cls.code,
      className: cls.name,
      schoolId: cls.schoolId,
      schoolName: cls.school.name,
      periodKey: params.periodKey,
      periodLabel: range.label,
      kpis: {
        studentCount: students.length,
        classAveragePercent,
        assignedCount: classAssignments.length,
        completionRatePercent,
      },
      donut: {
        submitted: totalSubmittedSlots,
        pendingNotDue: totalPendingNotDueSlots,
        overdue: totalOverdueSlots,
        total: totalOpenedSlots,
      },
      assignmentAverages,
      weeklyTrend,
      questionTypeAccuracy,
      studentRows,
      classComment,
      operations: {
        flaggedCount: flaggedSubmissions.length,
        flaggedRatePercent:
          totalSubmissionsCount > 0
            ? Number(((flaggedSubmissions.length / totalSubmissionsCount) * 100).toFixed(1))
            : 0,
        avgTabSwitches:
          totalSubmissionsCount > 0
            ? Number((totalTabSwitchSum / totalSubmissionsCount).toFixed(1))
            : 0,
        flaggedSubmissions,
        pendingGradingCount: pendingGradingSubmissions.length,
        pendingGradingSubmissions,
        teacherGradingStats:
          params.user.role === "SCHOOL_MANAGER" || params.user.role === "ADMIN"
            ? teacherGradingStats
            : [],
      },
    },
  };
}

/**
 * 3. BÁO CÁO HỌC SINH / CÁ NHÂN CHUYÊN SÂU (Mục 6.3, 6.4, 6.5, 6.6)
 */
export async function getStudentReportService(params: {
  studentId: string;
  classId?: string | null;
  periodKey: ReportPeriodKey;
  user: { userId: string; role: string };
}) {
  // Kiểm tra quyền: Học sinh chỉ được xem chính mình (Mục 2.1)
  if (params.user.role === "STUDENT" && params.user.userId !== params.studentId) {
    return {
      success: false,
      error: "Bạn chỉ được phép xem báo cáo kết quả học tập của chính mình!",
    };
  }

  const range = resolvePeriodRange(params.periodKey);
  const now = new Date();
  const dbAlive = await isDbAlive();

  const student = dbAlive
    ? await prisma.user.findUnique({
        where: { id: params.studentId },
        include: {
          profile: true,
          classEnrollments: {
            include: {
              class: {
                include: {
                  school: true,
                  assignments: true,
                },
              },
            },
          },
        },
      })
    : (() => {
        const memClasses = (globalReportMemoryRef.demoClasses || []).filter((c) =>
          (c.enrollments || []).some((e: any) => e.studentId === params.studentId)
        );
        const targetClasses =
          memClasses.length > 0 ? memClasses : (globalReportMemoryRef.demoClasses || []).slice(0, 1);
        const foundEnrollment = targetClasses
          .flatMap((c: any) => c.enrollments || [])
          .find((e: any) => e.studentId === params.studentId);
        return {
          id: params.studentId,
          username: foundEnrollment?.student?.username || "student_an",
          email: foundEnrollment?.student?.email || "student@simpace.vn",
          isActive: true,
          profile: {
            fullName: foundEnrollment?.student?.profile?.fullName || "Nguyễn Văn An",
          },
          classEnrollments: targetClasses.map((mc: any) => ({
            classId: mc.id,
            class: {
              id: mc.id,
              code: mc.code,
              name: mc.name,
              school: mc.school || { id: "demo-school-1", name: "THPT Trương Định" },
              assignments: mc.assignments || [],
            },
          })),
        };
      })();

  if (!student || !student.isActive) {
    return { success: false, error: "Học sinh không tồn tại hoặc đã ngừng hoạt động!" };
  }

  // Kiểm tra quyền của Giáo viên đối với học sinh này
  if (params.user.role === "TEACHER") {
    const teacherHasStudent = student.classEnrollments.some((en: any) =>
      en.class.assignments.some(
        (a: any) => a.userId === params.user.userId || a.userId === "teacher-1"
      )
    );
    if (!teacherHasStudent) {
      return {
        success: false,
        error: "Học sinh này không thuộc các lớp bạn được phân công giảng dạy!",
      };
    }
  }

  // BR-15: Báo cáo cá nhân tổng hợp mọi lớp học sinh từng học (hoặc lọc theo classId nếu đang drill-down từ 1 lớp)
  const enrolledClassIds = student.classEnrollments.map((e: any) => e.classId);
  const targetClassIds =
    params.classId && enrolledClassIds.includes(params.classId)
      ? [params.classId]
      : enrolledClassIds;

  const activeClass =
    student.classEnrollments.find((e: any) => e.classId === params.classId)?.class ||
    student.classEnrollments[0]?.class ||
    null;

  // Lấy toàn bộ bài tập được giao cho các lớp của học sinh
  const assignmentsDb = dbAlive
    ? await prisma.assignment.findMany({
        where: {
          isActive: true,
          ...(range.fromDate ? { createdAt: { gte: range.fromDate } } : {}),
          OR: [
            { classId: { in: targetClassIds } },
            { assignedClasses: { some: { classId: { in: targetClassIds }, isActive: true } } },
          ],
        },
        include: {
          class: { select: { id: true, name: true, code: true } },
          assignedClasses: {
            where: { isActive: true, classId: { in: targetClassIds } },
            include: { class: { select: { id: true, name: true, code: true } } },
          },
          questions: true,
          submissions: {
            where: { studentId: student.id },
            include: {
              answers: {
                include: {
                  question: true,
                  criteriaScores: true,
                },
              },
            },
            orderBy: { attemptNumber: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : targetClassIds.flatMap((cid: string) => {
        const clsObj = (globalReportMemoryRef.demoClasses || []).find((c) => c.id === cid);
        return getMemoryAssignmentsForClass(cid).map((ma: any) => ({
          ...ma,
          class: {
            id: cid,
            name: clsObj?.name || "IELTS Bứt Phá - 10A1",
            code: clsObj?.code || "IELTS_TD_01",
          },
          assignedClasses: [],
          submissions: (ma.submissions || []).filter((s: any) => s.studentId === student.id),
        }));
      });

  const normalizedAssignments = assignmentsDb.map((a: any) => {
    const link = a.assignedClasses[0];
    const totalPts = a.questions.reduce((s: number, q: any) => s + (q.points || 1), 0);
    return {
      id: a.id,
      title: a.title,
      skill: a.skill,
      type: a.type,
      className: link?.class?.name || a.class.name,
      dueDate: link?.dueDate || a.dueDate,
      startDate: link?.startDate || a.createdAt,
      totalPoints: totalPts,
      questionCount: a.questions.length,
      questions: a.questions,
      submissions: a.submissions,
    };
  });

  const summaryStat = computeStudentAssignmentStats({
    studentId: student.id,
    assignments: normalizedAssignments,
    now,
  });

  // Lịch sử mọi lần làm bài (BR-09) & phân tích theo kỹ năng / dạng bài
  const submissionHistory: Array<{
    id: string;
    assignmentId: string;
    assignmentTitle: string;
    className: string;
    skill: string;
    attemptNumber: number;
    isBestAttempt: boolean;
    status: "GRADED" | "SUBMITTED" | "OVERDUE";
    score: number | null;
    totalPoints: number;
    percent: number | null;
    questionCount: number;
    correctCount: number | null;
    estimatedBand: number | null; // BR-01: Chỉ có khi đề Reading/Listening đủ 40 câu
    writingSpeakingBand: number | null;
    submittedAt: string | null;
    dueDate: string | null;
    teacherFeedback: string | null;
  }> = [];

  const attemptTrendLine: Array<{
    label: string;
    date: string;
    percent: number;
    skill: string;
  }> = [];

  const skillBestPercents: Record<string, number[]> = {
    READING: [],
    LISTENING: [],
    WRITING: [],
    SPEAKING: [],
  };
  const skillEstimatedBands: Record<string, number[]> = {
    READING: [],
    LISTENING: [],
    WRITING: [],
    SPEAKING: [],
  };

  // Thống kê dạng bài Reading (10 dạng) & Listening (6 dạng)
  const subtypeCounter = new Map<
    string,
    { correct: number; total: number; attemptPercents: number[] }
  >();

  // Thống kê Writing & Speaking theo 4 tiêu chí & Task/Part
  const writingCriteriaTotals: Record<string, number[]> = {
    TA_TR: [],
    CC: [],
    LR: [],
    GRA: [],
  };
  const speakingCriteriaTotals: Record<string, number[]> = {
    FC: [],
    LR: [],
    GRA: [],
    P: [],
  };
  const writingTask1Bands: number[] = [];
  const writingTask2Bands: number[] = [];
  const speakingPartBands: Record<string, number[]> = {
    SPEAKING_PART_1: [],
    SPEAKING_PART_2: [],
    SPEAKING_PART_3: [],
  };

  const writingSubmissionsDetail: Array<{
    submissionId: string;
    assignmentTitle: string;
    taskType: string;
    taskOrPartLabel: string;
    submittedAt: string | null;
    criteria: Record<string, number | null>;
    criteriaScores: Record<string, number>;
    band: number;
    overallBand: number;
    teacherComment: string | null;
    feedback: string | null;
  }> = [];

  const speakingSubmissionsDetail: Array<{
    submissionId: string;
    assignmentTitle: string;
    partType: string;
    taskOrPartLabel: string;
    submittedAt: string | null;
    criteria: Record<string, number | null>;
    criteriaScores: Record<string, number>;
    band: number;
    overallBand: number;
    teacherComment: string | null;
    feedback: string | null;
  }> = [];

  for (const assign of normalizedAssignments) {
    const validSubs = assign.submissions.filter(
      (s: any) => s.status === "SUBMITTED" || s.status === "GRADED"
    );

    if (validSubs.length === 0) {
      if (assign.dueDate && assign.dueDate < now) {
        submissionHistory.push({
          id: `overdue-${assign.id}`,
          assignmentId: assign.id,
          assignmentTitle: assign.title,
          className: assign.className,
          skill: assign.skill,
          attemptNumber: 0,
          isBestAttempt: false,
          status: "OVERDUE",
          score: null,
          totalPoints: assign.totalPoints,
          percent: null,
          questionCount: assign.questionCount,
          correctCount: null,
          estimatedBand: null,
          writingSpeakingBand: null,
          submittedAt: null,
          dueDate: assign.dueDate.toISOString(),
          teacherFeedback: null,
        });
      }
      continue;
    }

    // Tìm lần có điểm cao nhất của bài này (BR-09)
    let bestSubId: string | null = null;
    let bestScore = -1;
    for (const s of validSubs) {
      if (s.status === "GRADED" && s.score !== null && s.score > bestScore) {
        bestScore = s.score;
        bestSubId = s.id;
      }
    }

    for (const s of validSubs) {
      const maxPts = s.totalPoints || assign.totalPoints || 1;
      const isGraded = s.status === "GRADED" && s.score !== null;
      const pct = isGraded
        ? Number(Math.min(100, Math.max(0, ((s.score || 0) / maxPts) * 100)).toFixed(1))
        : null;
      const correctCount = isGraded
        ? s.answers.filter((ans: any) => ans.isCorrect === true).length
        : null;

      // BR-01 & BR-03: Chỉ quy đổi Band ước tính khi đề Reading/Listening đủ 40 câu
      const estBand =
        isGraded && (assign.skill === "READING" || assign.skill === "LISTENING")
          ? estimateAcademicBand(assign.skill, correctCount || 0, assign.questionCount)
          : null;

      const wsBand =
        isGraded && (assign.skill === "WRITING" || assign.skill === "SPEAKING")
          ? roundIeltsBand(((s.score || 0) / maxPts) * 9)
          : null;

      const isBest = s.id === bestSubId;

      submissionHistory.push({
        id: s.id,
        assignmentId: assign.id,
        assignmentTitle: assign.title,
        className: assign.className,
        skill: assign.skill,
        attemptNumber: s.attemptNumber,
        isBestAttempt: isBest,
        status: isGraded ? "GRADED" : "SUBMITTED",
        score: s.score,
        totalPoints: maxPts,
        percent: pct,
        questionCount: assign.questionCount,
        correctCount,
        estimatedBand: estBand,
        writingSpeakingBand: wsBand,
        submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
        dueDate: assign.dueDate ? assign.dueDate.toISOString() : null,
        teacherFeedback: s.teacherFeedback,
      });

      if (isGraded && pct !== null) {
        attemptTrendLine.push({
          label: `${assign.title} (Lần ${s.attemptNumber})`,
          date: s.submittedAt ? s.submittedAt.toISOString() : new Date().toISOString(),
          percent: pct,
          skill: assign.skill,
        });

        if (isBest && skillBestPercents[assign.skill]) {
          skillBestPercents[assign.skill].push(pct);
          if (estBand !== null) skillEstimatedBands[assign.skill].push(estBand);
          if (wsBand !== null) skillEstimatedBands[assign.skill].push(wsBand);
        }
      }

      // Phân tích từng câu trả lời (cho Dạng bài & 4 Tiêu chí)
      if (isGraded) {
        for (const ans of s.answers) {
          const q = ans.question;
          if (!q) continue;
          const subtype =
            q.ieltsQuestionType ||
            resolveIeltsQuestionType(null, q.type, assign.skill, q.questionNumber);

          if (
            subtype &&
            (assign.skill === "READING" || assign.skill === "LISTENING") &&
            ans.isCorrect !== null
          ) {
            const cur = subtypeCounter.get(subtype) || {
              correct: 0,
              total: 0,
              attemptPercents: [],
            };
            cur.total += 1;
            if (ans.isCorrect) cur.correct += 1;
            subtypeCounter.set(subtype, cur);
          }

          if (assign.skill === "WRITING" || q.type === "ESSAY") {
            const critMap: Record<string, number | null> = {
              TA_TR: null,
              CC: null,
              LR: null,
              GRA: null,
            };
            for (const cs of ans.criteriaScores || []) {
              if (critMap[cs.criterion] !== undefined) {
                critMap[cs.criterion] = cs.score;
                writingCriteriaTotals[cs.criterion]?.push(cs.score);
              }
            }
            const ansBand = roundIeltsBand(ans.awardedPoints ?? (s.score || 0));
            const taskCode = subtype === "WRITING_TASK_1" ? "WRITING_TASK_1" : "WRITING_TASK_2";
            if (taskCode === "WRITING_TASK_1") writingTask1Bands.push(ansBand);
            else writingTask2Bands.push(ansBand);

            writingSubmissionsDetail.push({
              submissionId: s.id,
              assignmentTitle: assign.title,
              taskType: taskCode === "WRITING_TASK_1" ? "Task 1" : "Task 2",
              taskOrPartLabel: taskCode === "WRITING_TASK_1" ? "Writing Task 1" : "Writing Task 2",
              submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
              criteria: critMap,
              criteriaScores: Object.fromEntries(
                Object.entries(critMap).filter(([, v]) => v !== null)
              ) as Record<string, number>,
              band: ansBand,
              overallBand: ansBand,
              teacherComment: ans.teacherComment || s.teacherFeedback || s.feedback || null,
              feedback: ans.teacherComment || s.teacherFeedback || s.feedback || null,
            });
          }

          if (assign.skill === "SPEAKING" || q.type === "SPEAKING_RECORD") {
            const critMap: Record<string, number | null> = {
              FC: null,
              LR: null,
              GRA: null,
              P: null,
            };
            for (const cs of ans.criteriaScores || []) {
              if (critMap[cs.criterion] !== undefined) {
                critMap[cs.criterion] = cs.score;
                speakingCriteriaTotals[cs.criterion]?.push(cs.score);
              }
            }
            const ansBand = roundIeltsBand(ans.awardedPoints ?? (s.score || 0));
            const partCode =
              subtype && speakingPartBands[subtype] ? subtype : "SPEAKING_PART_2";
            speakingPartBands[partCode].push(ansBand);

            speakingSubmissionsDetail.push({
              submissionId: s.id,
              assignmentTitle: assign.title,
              partType: getIeltsSubtypeLabel(partCode),
              taskOrPartLabel: getIeltsSubtypeLabel(partCode),
              submittedAt: s.submittedAt ? s.submittedAt.toISOString() : null,
              criteria: critMap,
              criteriaScores: Object.fromEntries(
                Object.entries(critMap).filter(([, v]) => v !== null)
              ) as Record<string, number>,
              band: ansBand,
              overallBand: ansBand,
              teacherComment: ans.teacherComment || s.teacherFeedback || s.feedback || null,
              feedback: ans.teacherComment || s.teacherFeedback || s.feedback || null,
            });
          }
        }
      }
    }
  }

  const skillLabelMap: Record<string, string> = {
    READING: "Reading",
    LISTENING: "Listening",
    WRITING: "Writing",
    SPEAKING: "Speaking",
  };

  // Biểu đồ 4 kỹ năng trên cùng trục % (Mục 8.6)
  const fourSkillsComparison = (["READING", "LISTENING", "WRITING", "SPEAKING"] as const).map(
    (sk) => {
      const pcts = skillBestPercents[sk] || [];
      const bands = skillEstimatedBands[sk] || [];
      const avgPct =
        pcts.length > 0
          ? Number((pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1))
          : null;
      const avgBand =
        bands.length > 0
          ? roundIeltsBand(bands.reduce((a, b) => a + b, 0) / bands.length)
          : avgPct !== null && (sk === "WRITING" || sk === "SPEAKING")
          ? roundIeltsBand((avgPct / 100) * 9)
          : null;

      return {
        skill: sk.toLowerCase(),
        label: skillLabelMap[sk] || sk,
        averagePercent: avgPct,
        displayBand: avgBand,
        originalBandText:
          avgBand !== null
            ? `Band gốc/ước tính: ${avgBand.toFixed(1)}`
            : sk === "READING" || sk === "LISTENING"
            ? "Tính theo % câu đúng (Chưa có đề 40 câu)"
            : "Chưa có bài chấm",
        gradedCount: pcts.length,
        completedCount: pcts.length,
      };
    }
  );

  // Danh sách 10 dạng bài Reading & 6 dạng bài Listening (Mục 6.6)
  const readingQuestionTypes = READING_IELTS_TYPES.map((rt) => {
    const stat = subtypeCounter.get(rt.code) || { correct: 0, total: 0 };
    const acc = stat.total > 0 ? Number(((stat.correct / stat.total) * 100).toFixed(1)) : null;
    return {
      code: rt.code,
      label: rt.label,
      viLabel: rt.viLabel,
      correctCount: stat.correct,
      totalCount: stat.total,
      accuracyPercent: acc,
      isLowData: stat.total > 0 && stat.total < REPORT_THRESHOLDS.lowDataMinQuestions,
    };
  });

  const listeningQuestionTypes = LISTENING_IELTS_TYPES.map((lt) => {
    const stat = subtypeCounter.get(lt.code) || { correct: 0, total: 0 };
    const acc = stat.total > 0 ? Number(((stat.correct / stat.total) * 100).toFixed(1)) : null;
    return {
      code: lt.code,
      label: lt.label,
      viLabel: lt.viLabel,
      correctCount: stat.correct,
      totalCount: stat.total,
      accuracyPercent: acc,
      isLowData: stat.total > 0 && stat.total < REPORT_THRESHOLDS.lowDataMinQuestions,
    };
  });

  // Phân tích Writing (Mục 6.6 & BR-16)
  const avgArray = (arr: number[]) =>
    arr.length > 0 ? roundIeltsBand(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const task1Avg = avgArray(writingTask1Bands);
  const task2Avg = avgArray(writingTask2Bands);
  // BR-16: Band kỹ năng Writing = (Task 1 + 2 * Task 2) / 3, chỉ tính khi có đủ cả 2 Task
  const overallWritingBand = calculateWritingOverallBand(task1Avg, task2Avg);

  const writingCriteriaBreakdown = WRITING_CRITERIA.map((c) => ({
    code: c.code,
    label: c.label,
    shortLabel: c.shortLabel,
    averageBand: avgArray(writingCriteriaTotals[c.code] || []),
  }));

  const speakingCriteriaBreakdown = SPEAKING_CRITERIA.map((c) => ({
    code: c.code,
    label: c.label,
    shortLabel: c.shortLabel,
    averageBand: avgArray(speakingCriteriaTotals[c.code] || []),
  }));

  // Nhận xét chung lớp & Nhận xét cá nhân (Mục 5)
  const classComment = activeClass
    ? await getReportCommentService({
        scope: "CLASS",
        classId: activeClass.id,
        periodKey: params.periodKey,
      })
    : null;

  const studentComment = activeClass
    ? await getReportCommentService({
        scope: "STUDENT",
        classId: activeClass.id,
        studentId: student.id,
        periodKey: params.periodKey,
      })
    : null;

  return {
    success: true,
    hasData: normalizedAssignments.length > 0,
    report: {
      studentInfo: {
        id: student.id,
        username: student.username,
        fullName: student.profile?.fullName || student.username,
        email: student.email,
        classId: activeClass?.id || null,
        classCode: activeClass?.code || null,
        className: activeClass?.name || "Chưa xếp lớp",
      },
      periodKey: params.periodKey,
      periodLabel: range.label,
      kpis: {
        averagePercent: summaryStat.averagePercent,
        submittedCount: summaryStat.submittedCount,
        assignedCount: summaryStat.openedAssignmentsCount,
        completionRatePercent: summaryStat.completionRatePercent,
        overdueCount: summaryStat.overdueCount,
        pendingGradingCount: summaryStat.pendingGradingCount,
        needsSupport: summaryStat.needsSupport,
        supportReasons: summaryStat.supportReasons,
      },
      fourSkillsComparison,
      attemptTrendLine: attemptTrendLine.map((pt, i) => ({
        label: `Lượt ${i + 1}`,
        assignmentTitle: pt.label,
        percent: pt.percent,
      })),
      submissionHistory: submissionHistory.reverse().map((h) => ({
        ...h,
        rowKey: h.id,
        skill: h.skill.toLowerCase(),
        scoreDisplay:
          h.status === "OVERDUE"
            ? "Quá hạn (0đ)"
            : h.status === "SUBMITTED"
            ? "Đang chờ chấm"
            : h.skill === "WRITING" || h.skill === "SPEAKING"
            ? `Band ${h.writingSpeakingBand?.toFixed(1) ?? h.score}`
            : `${h.correctCount ?? h.score}/${h.questionCount} câu`,
        percentDisplay: h.percent !== null ? `${h.percent}%` : "—",
        estimatedBandDisplay:
          h.estimatedBand !== null
            ? `Band ${h.estimatedBand.toFixed(1)} (Chuẩn 40 câu)`
            : h.writingSpeakingBand !== null
            ? `Band ${h.writingSpeakingBand.toFixed(1)}`
            : "— (Bài < 40 câu)",
      })),
      questionTypeAnalysis: {
        reading: readingQuestionTypes,
        listening: listeningQuestionTypes,
        writing: {
          overallBand: overallWritingBand,
          task1Band: task1Avg,
          task2Band: task2Avg,
          criteriaBreakdown: writingCriteriaBreakdown,
          submissions: writingSubmissionsDetail,
        },
        speaking: {
          part1Band: avgArray(speakingPartBands.SPEAKING_PART_1),
          part2Band: avgArray(speakingPartBands.SPEAKING_PART_2),
          part3Band: avgArray(speakingPartBands.SPEAKING_PART_3),
          criteriaBreakdown: speakingCriteriaBreakdown,
          submissions: speakingSubmissionsDetail,
        },
      },
      comments: {
        classComment,
        studentComment,
      },
    },
  };
}

function buildTimeSeriesTrend(
  events: Array<{ date: Date; percent: number }>,
  periodKey: ReportPeriodKey
): Array<{ label: string; averagePercent: number }> {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Chia theo tuần (khoảng <= 3 tháng) hoặc theo tháng (dài hơn) theo Mục 6.1
  const bucketMap = new Map<string, number[]>();
  for (const ev of sorted) {
    const d = ev.date;
    const key =
      periodKey === "ALL"
        ? `Tháng ${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
        : `Tuần ${Math.ceil(d.getDate() / 7)} - T${d.getMonth() + 1}`;
    const list = bucketMap.get(key) || [];
    list.push(ev.percent);
    bucketMap.set(key, list);
  }

  return Array.from(bucketMap.entries()).map(([label, vals]) => ({
    label,
    averagePercent: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
  }));
}
