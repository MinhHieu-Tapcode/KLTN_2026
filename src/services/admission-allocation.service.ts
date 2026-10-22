import { prisma, isDbAlive } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendAccountCreatedEmail } from "@/lib/mail";
import { ProcessedCandidate } from "./admission-batch.service";

export interface ClassAllocationPlan {
  levelId: string;
  levelName: string;
  levelCode: string;
  studentCount: number;
  minClassSize: number;
  maxClassSize: number;
  isBelowMinSize: boolean;
  warningMessage?: string;
  suggestedAction?: "MERGE_LEVEL" | "HOLD" | "PROCEED";
  classes: Array<{
    tempId: string;
    code: string;
    name: string;
    capacity: number;
    students: ProcessedCandidate[];
  }>;
}

/**
 * Thuật toán chia đều học sinh xác nhận học vào các lớp (Balanced Allocation)
 * Đảm bảo chênh lệch sĩ số giữa các lớp không quá 1 học sinh
 * Cảnh báo nếu số lượng học sinh trong trình độ nhỏ hơn minClassSize
 */
export function buildBalancedClassPlans(
  candidates: ProcessedCandidate[],
  levels: Array<{ id: string; name: string; code: string }>,
  schoolCode: string = "SCH",
  minClassSize: number = 12,
  maxClassSize: number = 25
): ClassAllocationPlan[] {
  // Chỉ lấy những học sinh đã xác nhận đi học (DONG_Y_HOC hoặc NGOAI_LE)
  const confirmedStudents = candidates.filter(
    (c) => c.status === "DONG_Y_HOC" || c.status === "NGOAI_LE"
  );

  return levels.map((lvl) => {
    const studentsInLevel = confirmedStudents.filter(
      (s) => (s.actualLevelId || s.suggestedLevelId) === lvl.id
    );
    const S = studentsInLevel.length;

    let isBelowMinSize = false;
    let warningMessage: string | undefined;
    let suggestedAction: "MERGE_LEVEL" | "HOLD" | "PROCEED" = "PROCEED";

    if (S === 0) {
      return {
        levelId: lvl.id,
        levelName: lvl.name,
        levelCode: lvl.code,
        studentCount: 0,
        minClassSize,
        maxClassSize,
        isBelowMinSize: false,
        classes: [],
      };
    }

    if (S < minClassSize) {
      isBelowMinSize = true;
      warningMessage = `Trình độ ${lvl.name} chỉ có ${S} học sinh xác nhận học, không đủ sĩ số tối thiểu mở lớp (${minClassSize} học sinh/lớp).`;
      suggestedAction = "MERGE_LEVEL";
    }

    // Tính số lượng lớp N: N = ceil(S / maxClassSize)
    let numClasses = Math.ceil(S / maxClassSize) || 1;
    // Kiểm tra nếu S / N < minClassSize và numClasses > 1, giảm N để giữ sĩ số lớp
    while (numClasses > 1 && Math.floor(S / numClasses) < minClassSize) {
      numClasses--;
    }

    // Chia đều S học sinh vào numClasses
    const classes: Array<{
      tempId: string;
      code: string;
      name: string;
      capacity: number;
      students: ProcessedCandidate[];
    }> = [];

    const baseCount = Math.floor(S / numClasses);
    const remainder = S % numClasses;

    let currentIndex = 0;
    for (let i = 0; i < numClasses; i++) {
      const classSize = baseCount + (i < remainder ? 1 : 0);
      const classStudents = studentsInLevel.slice(currentIndex, currentIndex + classSize);
      currentIndex += classSize;

      const classIndexStr = (i + 1).toString().padStart(2, "0");
      const classCode = `IELTS_${schoolCode.toUpperCase()}_${lvl.code}_${classIndexStr}`;
      const className = `Lớp IELTS ${lvl.name} - ${classIndexStr}`;

      classes.push({
        tempId: `prop-cls-${lvl.id}-${i}`,
        code: classCode,
        name: className,
        capacity: maxClassSize,
        students: classStudents,
      });
    }

    return {
      levelId: lvl.id,
      levelName: lvl.name,
      levelCode: lvl.code,
      studentCount: S,
      minClassSize,
      maxClassSize,
      isBelowMinSize,
      warningMessage,
      suggestedAction,
      classes,
    };
  });
}

/**
 * Chốt phân lớp Pha 2 (Commit Phase 2):
 * - Tạo Class và ClassEnrollment
 * - Tạo User và UserProfile (sinh mã HV1001..., băm pass mặc định)
 * - Gửi email thông báo tài khoản
 * - Cập nhật trạng thái đợt và hồ sơ thí sinh
 */
export async function commitAdmissionAllocationService(
  schoolId: string,
  batchId: string,
  plans: ClassAllocationPlan[],
  adminUserId: string
): Promise<{
  success: boolean;
  createdUserCount: number;
  createdClassCount: number;
  error?: string;
}> {
  if (!(await isDbAlive())) {
    const globalStore = globalThis as any;
    if (!globalStore.demoUsers) globalStore.demoUsers = [];
    if (!globalStore.demoClasses) globalStore.demoClasses = [];

    let createdUserCount = 0;
    let createdClassCount = 0;

    for (const plan of plans) {
      for (const cls of plan.classes) {
        if (cls.students.length === 0) continue;

        let classRecord = globalStore.demoClasses.find((c: any) => c.code === cls.code);
        if (!classRecord) {
          classRecord = {
            id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            schoolId,
            code: cls.code,
            name: cls.name,
            program: "IELTS",
            level: plan.levelName,
            ieltsLevelId: plan.levelId,
            capacity: cls.capacity,
            status: "ACTIVE",
            isActive: true,
            enrollments: [],
          };
          globalStore.demoClasses.push(classRecord);
          createdClassCount++;
        }

        for (const st of cls.students) {
          createdUserCount++;
          const username = `HV${(1000 + createdUserCount).toString()}`;
          const newUser = {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            username,
            email: st.email,
            role: { code: "STUDENT", name: "Học viên" },
            isActive: true,
            profile: {
              fullName: st.fullName,
              phoneNumber: st.phoneNumber,
              dateOfBirth: st.dateOfBirth,
              gender: st.gender,
              entryIeltsScore: st.scoreOverall,
            },
            classEnrollments: [
              {
                id: `en-${Date.now()}`,
                classId: classRecord.id,
                class: classRecord,
              },
            ],
          };
          globalStore.demoUsers.unshift(newUser);
        }
      }
    }

    return { success: true, createdUserCount, createdClassCount };
  }

  // Chạy trên PostgreSQL với Prisma Transaction
  try {
    const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD || "Simpace@2026";
    const passwordHash = await hashPassword(defaultPassword);

    let createdUserCount = 0;
    let createdClassCount = 0;

    await prisma.$transaction(async (tx) => {
      const studentRole = await tx.role.findFirst({
        where: { code: "STUDENT" },
      });
      if (!studentRole) {
        throw new Error("Không tìm thấy vai trò STUDENT trong hệ thống!");
      }

      // Đếm số lượng học viên hiện tại để sinh mã HV1001...
      let studentIndex = await tx.user.count({
        where: { role: { code: "STUDENT" } },
      });

      for (const plan of plans) {
        for (const cls of plan.classes) {
          if (cls.students.length === 0) continue;

          // 1. Tạo hoặc lấy Lớp học
          let classRecord = await tx.class.findFirst({
            where: { code: cls.code, schoolId },
          });

          if (!classRecord) {
            classRecord = await tx.class.create({
              data: {
                schoolId,
                code: cls.code,
                name: cls.name,
                program: "IELTS",
                level: plan.levelName,
                ieltsLevelId: plan.levelId,
                capacity: cls.capacity,
                status: "ACTIVE",
              },
            });
            createdClassCount++;
          }

          // 2. Tạo User & Enrollment cho từng học sinh
          for (const st of cls.students) {
            studentIndex++;
            const userCode = `HV${(1000 + studentIndex).toString()}`;

            const newUser = await tx.user.create({
              data: {
                username: userCode,
                email: st.email.toLowerCase(),
                passwordHash,
                roleId: studentRole.id,
                profile: {
                  create: {
                    fullName: st.fullName,
                    phoneNumber: st.phoneNumber || null,
                    dateOfBirth: st.dateOfBirth ? new Date(st.dateOfBirth) : null,
                    gender: st.gender || null,
                    entryIeltsScore: st.scoreOverall,
                    ieltsLevelId: plan.levelId,
                  },
                },
              },
            });

            // Ghi danh vào lớp học
            await tx.classEnrollment.create({
              data: {
                classId: classRecord.id,
                studentId: newUser.id,
                status: "STUDYING",
              },
            });

            // Ghi nhận ID User và Class vào bảng hồ sơ đợt tuyển sinh (nếu có bảng trong CSDL)
            if (st.id && !st.id.startsWith("cand-") && (tx as any).admissionCandidate) {
              await (tx as any).admissionCandidate.update({
                where: { id: st.id },
                data: {
                  assignedClassId: classRecord.id,
                  createdUserId: newUser.id,
                  actualLevelId: plan.levelId,
                },
              });
            }

            createdUserCount++;

            // Gửi email tài khoản không đồng bộ
            sendAccountCreatedEmail({
              to: st.email,
              fullName: st.fullName,
              username: userCode,
              tempPassword: defaultPassword,
              roleName: "Học viên",
            }).catch((e) => console.warn("[Email error]:", e));
          }
        }
      }

      // Cập nhật trạng thái đợt tuyển sinh sang HOÀN TẤT
      if (batchId && !batchId.startsWith("batch-") && (tx as any).admissionBatch) {
        await (tx as any).admissionBatch.update({
          where: { id: batchId },
          data: { status: "HOAN_TAT" },
        });
      }
    });

    return { success: true, createdUserCount, createdClassCount };
  } catch (err: any) {
    console.error("[commitAdmissionAllocationService] Lỗi:", err);
    return { success: false, createdUserCount: 0, createdClassCount: 0, error: err.message };
  }
}
