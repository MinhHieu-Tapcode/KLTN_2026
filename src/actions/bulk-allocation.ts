"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { hashPassword } from "@/lib/auth";
import { generateUserCode } from "@/actions/users";
import { sendAccountCreatedEmail } from "@/lib/mail";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface ValidatedStudentRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  ieltsScore: number;
  levelId: string;
  levelCode: string;
  levelName: string;
}

export interface InvalidStudentRow {
  rowNumber: number;
  fullName?: string;
  email?: string;
  rawScore?: any;
  errorReason: string;
}

export interface ProposedClass {
  tempId: string;
  levelId: string;
  levelCode: string;
  levelName: string;
  classIndex: number;
  code: string;
  name: string;
  capacity: number;
  students: ValidatedStudentRow[];
}

export interface LevelAllocationPlan {
  levelId: string;
  levelCode: string;
  levelName: string;
  studentCount: number;
  classCount: number;
  classes: ProposedClass[];
}

export interface BulkAllocationSuggestion {
  summary: {
    totalRows: number;
    totalValid: number;
    totalInvalid: number;
    totalLevels: number;
    totalClasses: number;
    totalAllocatedStudents: number;
  };
  levelPlans: LevelAllocationPlan[];
  invalidRows: InvalidStudentRow[];
}

/**
 * 1. Phân tích tệp Excel/CSV học sinh IELTS
 * Bỏ trường Địa chỉ và Trình độ; tự suy trình độ từ Điểm IELTS đầu vào.
 */
export async function parseAndValidateBulkStudentsAction(fileBase64: string) {
  try {
    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawRows.length < 2) {
      return { success: false, error: "Tệp Excel/CSV rỗng hoặc không có dòng dữ liệu hợp lệ!" };
    }

    // Lấy cấu hình các trình độ IELTS hiện tại
    const ieltsLevels = await prisma.ieltsLevel.findMany({
      where: { isActive: true },
      orderBy: { minScore: "asc" },
    });

    if (ieltsLevels.length === 0) {
      return {
        success: false,
        error: "Hệ thống chưa có cấu hình Trình độ IELTS nào đang hoạt động! Vui lòng vào Cài đặt để thiết lập trước.",
      };
    }

    const header = rawRows[0].map((h: any) => (h ? String(h).trim().toLowerCase() : ""));

    // Nhận diện các cột
    const colFullName = header.findIndex((h: string) => h.includes("họ và tên") || h.includes("họ tên") || h === "name" || h === "fullname");
    const colEmail = header.findIndex((h: string) => h.includes("email") || h.includes("thư điện tử"));
    const colPhone = header.findIndex((h: string) => h.includes("số điện thoại") || h.includes("sđt") || h.includes("phone"));
    const colDob = header.findIndex((h: string) => h.includes("ngày sinh") || h.includes("dob") || h.includes("birth"));
    const colGender = header.findIndex((h: string) => h.includes("giới tính") || h.includes("gender"));
    const colScore = header.findIndex(
      (h: string) =>
        h.includes("điểm ielts") ||
        h.includes("điểm đầu vào") ||
        h.includes("ielts") ||
        h.includes("score") ||
        h.includes("band")
    );

    if (colFullName === -1 || colEmail === -1 || colScore === -1) {
      return {
        success: false,
        error: "Tệp tải lên thiếu các cột bắt buộc: 'Họ và tên', 'Email', 'Điểm IELTS'!",
      };
    }

    // Lấy danh sách email đã tồn tại trong DB để chống trùng lặp
    const existingUsers = await prisma.user.findMany({
      select: { email: true },
    });
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const validRows: ValidatedStudentRow[] = [];
    const invalidRows: InvalidStudentRow[] = [];
    const seenEmailsInFile = new Set<string>();

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0 || row.every((c: any) => c === null || c === undefined || String(c).trim() === "")) {
        continue; // Bỏ qua dòng hoàn toàn rỗng
      }

      const rowNumber = i + 1;
      const fullName = row[colFullName] ? String(row[colFullName]).trim() : "";
      const rawEmail = row[colEmail] ? String(row[colEmail]).trim().toLowerCase() : "";
      const rawPhone = colPhone !== -1 && row[colPhone] ? String(row[colPhone]).trim() : "";
      const rawDob = colDob !== -1 && row[colDob] ? String(row[colDob]).trim() : "";
      const rawGender = colGender !== -1 && row[colGender] ? String(row[colGender]).trim().toLowerCase() : "";
      const rawScoreVal = row[colScore];

      // 1. Kiểm tra Họ và tên
      if (!fullName) {
        invalidRows.push({
          rowNumber,
          email: rawEmail,
          rawScore: rawScoreVal,
          errorReason: "Họ và tên không được để trống",
        });
        continue;
      }

      // 2. Kiểm tra Email
      if (!rawEmail) {
        invalidRows.push({
          rowNumber,
          fullName,
          rawScore: rawScoreVal,
          errorReason: "Địa chỉ Email không được để trống",
        });
        continue;
      }

      if (!RFC5322_EMAIL_REGEX.test(rawEmail)) {
        invalidRows.push({
          rowNumber,
          fullName,
          email: rawEmail,
          rawScore: rawScoreVal,
          errorReason: "Email không đúng định dạng chuẩn RFC 5322 (phải có tên miền hợp lệ)",
        });
        continue;
      }

      if (seenEmailsInFile.has(rawEmail)) {
        invalidRows.push({
          rowNumber,
          fullName,
          email: rawEmail,
          rawScore: rawScoreVal,
          errorReason: `Email bị trùng lặp nhiều lần ngay trong tệp tải lên`,
        });
        continue;
      }
      seenEmailsInFile.add(rawEmail);

      if (existingEmailSet.has(rawEmail)) {
        invalidRows.push({
          rowNumber,
          fullName,
          email: rawEmail,
          rawScore: rawScoreVal,
          errorReason: `Email đã tồn tại và đang hoạt động trong hệ thống`,
        });
        continue;
      }

      // 3. Kiểm tra Điểm IELTS đầu vào
      const score = Number(String(rawScoreVal).replace(",", "."));
      if (rawScoreVal === null || rawScoreVal === undefined || isNaN(score) || score < 0 || score > 9.0) {
        invalidRows.push({
          rowNumber,
          fullName,
          email: rawEmail,
          rawScore: rawScoreVal,
          errorReason: "Điểm IELTS phải là số từ 0.0 đến 9.0",
        });
        continue;
      }

      // 4. Tự động xác định Trình độ IELTS từ điểm
      const matchedLevel = ieltsLevels.find((lvl) => score >= lvl.minScore && score <= lvl.maxScore);
      if (!matchedLevel) {
        invalidRows.push({
          rowNumber,
          fullName,
          email: rawEmail,
          rawScore: score,
          errorReason: `Điểm IELTS (${score}) không khớp với bất kỳ khoảng trình độ nào đã cấu hình`,
        });
        continue;
      }

      // Chuẩn hóa Giới tính
      let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
      if (rawGender.includes("nữ") || rawGender === "female" || rawGender === "f") {
        gender = "FEMALE";
      } else if (rawGender.includes("khác") || rawGender === "other") {
        gender = "OTHER";
      }

      validRows.push({
        rowNumber,
        fullName,
        email: rawEmail,
        phoneNumber: rawPhone || undefined,
        dateOfBirth: rawDob || undefined,
        gender,
        ieltsScore: score,
        levelId: matchedLevel.id,
        levelCode: matchedLevel.code,
        levelName: matchedLevel.name,
      });
    }

    return {
      success: true,
      validRows,
      invalidRows,
      totalRows: validRows.length + invalidRows.length,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi xử lý tệp học sinh!" };
  }
}

/**
 * 2. Thuật toán chia đều học sinh vào N lớp (chênh lệch sĩ số giữa các lớp <= 1)
 */
export function distributeStudentsBalanced(
  students: ValidatedStudentRow[],
  classCount: number,
  levelCode: string,
  levelName: string,
  levelId: string,
  schoolCode: string = "TD"
): ProposedClass[] {
  const S = students.length;
  const N = Math.max(1, classCount);

  if (S === 0) {
    return [];
  }

  // Base size và số lớp nhận thêm 1 học sinh dư
  const baseSize = Math.floor(S / N);
  const remainder = S % N;

  const classes: ProposedClass[] = [];
  let currentIndex = 0;

  for (let i = 0; i < N; i++) {
    const classSize = baseSize + (i < remainder ? 1 : 0);
    const assignedStudents = students.slice(currentIndex, currentIndex + classSize);
    currentIndex += classSize;

    const classNum = String(i + 1).padStart(2, "0");
    const code = `IELTS_${levelCode}_${schoolCode}_${classNum}`;
    const name = `IELTS ${levelName} - Lớp ${classNum}`;

    classes.push({
      tempId: `temp_${levelCode}_${i + 1}_${Date.now()}`,
      levelId,
      levelCode,
      levelName,
      classIndex: i + 1,
      code,
      name,
      capacity: Math.max(30, classSize + 5),
      students: assignedStudents,
    });
  }

  return classes;
}

/**
 * 3. Tạo phương án phân lớp đề xuất (Suggestion Generation)
 */
export async function generateBulkClassSuggestionAction(
  validRows: ValidatedStudentRow[],
  schoolId?: string,
  classCountOverrides?: Record<string, number>
) {
  try {
    const levels = await prisma.ieltsLevel.findMany({
      where: { isActive: true },
      orderBy: { minScore: "asc" },
    });

    let schoolCode = "TD";
    if (schoolId) {
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      if (school) schoolCode = school.code.replace(/[^a-zA-Z0-9]/g, "");
    }

    // Nhóm học sinh theo level
    const studentsByLevel: Record<string, ValidatedStudentRow[]> = {};
    for (const lvl of levels) {
      studentsByLevel[lvl.id] = [];
    }

    for (const student of validRows) {
      if (!studentsByLevel[student.levelId]) {
        studentsByLevel[student.levelId] = [];
      }
      studentsByLevel[student.levelId].push(student);
    }

    const levelPlans: LevelAllocationPlan[] = [];
    let totalClasses = 0;
    let totalAllocatedStudents = 0;

    for (const lvl of levels) {
      const studentsInLevel = studentsByLevel[lvl.id] || [];
      if (studentsInLevel.length === 0) {
        continue; // Không tạo lớp trống nếu trình độ không có học sinh
      }

      // Xác định số lớp: Ưu tiên override -> cấu hình DB
      let classCount = lvl.targetClassCount || 1;
      if (classCountOverrides && classCountOverrides[lvl.id]) {
        classCount = Math.max(1, classCountOverrides[lvl.id]);
      }

      const proposedClasses = distributeStudentsBalanced(
        studentsInLevel,
        classCount,
        lvl.code,
        lvl.name,
        lvl.id,
        schoolCode
      );

      totalClasses += proposedClasses.length;
      totalAllocatedStudents += studentsInLevel.length;

      levelPlans.push({
        levelId: lvl.id,
        levelCode: lvl.code,
        levelName: lvl.name,
        studentCount: studentsInLevel.length,
        classCount: proposedClasses.length,
        classes: proposedClasses,
      });
    }

    const suggestion: BulkAllocationSuggestion = {
      summary: {
        totalRows: validRows.length,
        totalValid: validRows.length,
        totalInvalid: 0,
        totalLevels: levelPlans.length,
        totalClasses,
        totalAllocatedStudents,
      },
      levelPlans,
      invalidRows: [],
    };

    return { success: true, suggestion };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo phương án đề xuất phân lớp!" };
  }
}

/**
 * 4. Chuyển học sinh giữa các lớp cùng trình độ & chia lại toàn bộ
 */
export async function rebalanceOnStudentTransferAction(
  currentPlan: LevelAllocationPlan,
  studentEmail: string,
  targetClassTempId: string,
  schoolCode: string = "TD"
) {
  try {
    // 1. Thu thập lại toàn bộ học sinh của trình độ này
    const allStudents: ValidatedStudentRow[] = [];
    let foundStudent: ValidatedStudentRow | undefined;

    for (const c of currentPlan.classes) {
      for (const s of c.students) {
        if (s.email.toLowerCase() === studentEmail.toLowerCase()) {
          foundStudent = s;
        }
        allStudents.push(s);
      }
    }

    if (!foundStudent) {
      return { success: false, error: "Không tìm thấy học sinh được chỉ định trong phương án!" };
    }

    const targetClass = currentPlan.classes.find((c) => c.tempId === targetClassTempId);
    if (!targetClass) {
      return { success: false, error: "Không tìm thấy lớp học đích!" };
    }

    // 2. Chạy lại thuật toán chia đều toàn bộ học sinh theo số lớp đang có
    const rebalancedClasses = distributeStudentsBalanced(
      allStudents,
      currentPlan.classCount,
      currentPlan.levelCode,
      currentPlan.levelName,
      currentPlan.levelId,
      schoolCode
    );

    const updatedPlan: LevelAllocationPlan = {
      ...currentPlan,
      classes: rebalancedClasses,
    };

    return {
      success: true,
      updatedPlan,
      message: `Đã cập nhật phương án phân lớp trình độ ${currentPlan.levelName}. Hệ thống đã phân bổ lại ${allStudents.length} học sinh vào ${currentPlan.classCount} lớp.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi chuyển lớp và phân bổ lại!" };
  }
}

/**
 * 5. Điều chỉnh số lớp của một trình độ & chia lại toàn bộ
 */
export async function rebalanceOnClassCountChangeAction(
  currentPlan: LevelAllocationPlan,
  newClassCount: number,
  schoolCode: string = "TD"
) {
  try {
    const N = Math.floor(Number(newClassCount));
    if (isNaN(N) || N < 1) {
      return { success: false, error: "Số lớp phải là số nguyên dương lớn hơn hoặc bằng 1!" };
    }

    // Thu thập toàn bộ học sinh của trình độ này
    const allStudents: ValidatedStudentRow[] = [];
    for (const c of currentPlan.classes) {
      for (const s of c.students) {
        allStudents.push(s);
      }
    }

    const rebalancedClasses = distributeStudentsBalanced(
      allStudents,
      N,
      currentPlan.levelCode,
      currentPlan.levelName,
      currentPlan.levelId,
      schoolCode
    );

    const updatedPlan: LevelAllocationPlan = {
      ...currentPlan,
      classCount: N,
      classes: rebalancedClasses,
    };

    return {
      success: true,
      updatedPlan,
      message: `Đã cập nhật phương án phân lớp trình độ ${currentPlan.levelName}. Hệ thống đã phân bổ lại ${allStudents.length} học sinh vào ${N} lớp.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi điều chỉnh số lớp!" };
  }
}

/**
 * 6. XÁC NHẬN PHÂN LỚP HÀNG LOẠT (COMMIT TRANSACTION)
 * Tạo User -> UserProfile (kèm Điểm IELTS & Trình độ) -> Tạo Class -> ClassEnrollment
 */
export async function commitBulkAllocationAction(
  plans: LevelAllocationPlan[],
  schoolId: string,
  fileName: string = "import_ielts.xlsx"
) {
  try {
    const studentRole = await prisma.role.findUnique({ where: { code: "STUDENT" } });
    if (!studentRole) {
      return { success: false, error: "Không tìm thấy vai trò STUDENT trong hệ thống!" };
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return { success: false, error: "Trường học được chọn không tồn tại!" };
    }

    const defaultPassword = "Simpace@2026";
    const passwordHash = await hashPassword(defaultPassword);

    const createdUsersSummary: { email: string; fullName: string; username: string; className: string }[] = [];

    // Chạy trong Transaction đảm bảo tính nguyên tử (Atomicity)
    await prisma.$transaction(async (tx) => {
      // 1. Xác định số học sinh hiện tại để sinh mã tuần tự HV1001+
      let currentStudentCount = await tx.user.count({
        where: { role: { code: "STUDENT" } },
      });

      for (const plan of plans) {
        for (const propClass of plan.classes) {
          if (propClass.students.length === 0) continue;

          // Kiểm tra xem lớp đã tồn tại chưa, nếu chưa thì tạo mới
          let classRecord = await tx.class.findUnique({
            where: { code: propClass.code },
          });

          if (!classRecord) {
            classRecord = await tx.class.create({
              data: {
                schoolId,
                code: propClass.code,
                name: propClass.name,
                program: "IELTS",
                level: plan.levelName,
                ieltsLevelId: plan.levelId,
                capacity: propClass.capacity,
                status: "ACTIVE",
                isActive: true,
              },
            });
          }

          // Tạo từng học sinh và ghi danh vào lớp
          for (const student of propClass.students) {
            currentStudentCount++;
            let username = `HV${(1000 + currentStudentCount).toString()}`;
            while (await tx.user.findUnique({ where: { username } })) {
              currentStudentCount++;
              username = `HV${(1000 + currentStudentCount).toString()}`;
            }

            const cleanEmail = student.email.trim().toLowerCase();

            const newUser = await tx.user.create({
              data: {
                username,
                email: cleanEmail,
                passwordHash,
                roleId: studentRole.id,
                mustChangePassword: true,
                isActive: true,
                profile: {
                  create: {
                    fullName: student.fullName.trim(),
                    phoneNumber: student.phoneNumber || null,
                    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
                    gender: student.gender || null,
                    entryIeltsScore: student.ieltsScore,
                    ieltsLevelId: plan.levelId,
                    // BỎ trường address theo yêu cầu
                  },
                },
              },
            });

            // Ghi danh vào lớp
            await tx.classEnrollment.create({
              data: {
                classId: classRecord.id,
                studentId: newUser.id,
                status: "STUDYING",
              },
            });

            createdUsersSummary.push({
              email: cleanEmail,
              fullName: student.fullName,
              username,
              className: classRecord.name,
            });
          }
        }
      }

      // Lưu nhật ký Import
      const adminUser = await tx.user.findFirst({ where: { role: { code: "ADMIN" } } });
      await tx.importLog.create({
        data: {
          importedById: adminUser?.id || "",
          fileName,
          totalRows: createdUsersSummary.length,
          successCount: createdUsersSummary.length,
          errorCount: 0,
        },
      });
    });

    // Gửi email thông báo tài khoản cho học sinh mới (không hiển thị pass cho admin)
    for (const u of createdUsersSummary) {
      sendAccountCreatedEmail({
        to: u.email,
        fullName: u.fullName,
        username: u.username,
        tempPassword: defaultPassword,
        roleName: "Học sinh",
      }).catch((err) => console.error("Lỗi gửi mail học sinh:", err));
    }

    safeRevalidate("/users");
    safeRevalidate("/classes");
    safeRevalidate("/schools");

    return {
      success: true,
      createdCount: createdUsersSummary.length,
      createdClassesCount: plans.reduce((acc, p) => acc + p.classes.length, 0),
      summary: createdUsersSummary,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Lỗi khi lưu phương án phân lớp vào hệ thống!" };
  }
}
