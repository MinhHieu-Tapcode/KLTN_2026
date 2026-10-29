import * as XLSX from "xlsx";
import { prisma, isDbAlive } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendAccountCreatedEmail } from "@/lib/mail";

const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const DEFAULT_IELTS_LEVELS = [
  { id: "lvl-basic", code: "BASIC", name: "Cơ bản", minScore: 3.5, maxScore: 4.5, targetClassCount: 1, sortOrder: 1, isActive: true },
  { id: "lvl-medium", code: "MEDIUM", name: "Trung bình", minScore: 4.5, maxScore: 6.5, targetClassCount: 2, sortOrder: 2, isActive: true },
  { id: "lvl-advanced", code: "ADVANCED", name: "Nâng cao", minScore: 6.5, maxScore: 9.0, targetClassCount: 3, sortOrder: 3, isActive: true },
];

export async function getAvailableIeltsLevels(): Promise<any[]> {
  if (await isDbAlive()) {
    try {
      const levels = await prisma.ieltsLevel.findMany({
        where: { isActive: true },
        orderBy: { minScore: "asc" },
      });
      if (levels && levels.length > 0) return levels;
    } catch (e) {
      console.warn("[bulk-allocation] Failed to load levels from DB, using defaults:", e);
    }
  }
  return DEFAULT_IELTS_LEVELS;
}

export interface ValidatedStudentRow {
  rowNumber: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  ieltsScore: number;
  scoreListening?: number;
  scoreReading?: number;
  scoreWriting?: number;
  scoreSpeaking?: number;
  isBelowCutoff?: boolean;
  status?: "CHO_XAC_NHAN" | "DONG_Y_HOC" | "TU_CHOI" | "DUOI_DIEM_SAN" | "CAN_XU_LY" | "NGOAI_LE";
  issueReason?: string;
  overrideReason?: string;
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
    totalBelowCutoff?: number;
  };
  belowCutoffStudents?: ValidatedStudentRow[];
  levelPlans: LevelAllocationPlan[];
  invalidRows: InvalidStudentRow[];
}

export async function parseAndValidateBulkStudentsService(fileBase64: string): Promise<{
  success: boolean;
  validRows?: ValidatedStudentRow[];
  invalidRows?: InvalidStudentRow[];
  totalRows?: number;
  error?: string;
}> {
  const buffer = Buffer.from(fileBase64, "base64");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawRows.length < 2) {
    return { success: false, error: "Tệp Excel/CSV rỗng hoặc không có dòng dữ liệu hợp lệ!" };
  }

  const ieltsLevels = await getAvailableIeltsLevels();
  const header = rawRows[0].map((h: any) => (h ? String(h).trim().toLowerCase() : ""));

  const colFullName = header.findIndex(
    (h: string) => h.includes("họ và tên") || h.includes("họ tên") || h === "name" || h === "fullname"
  );
  const colEmail = header.findIndex((h: string) => h.includes("email") || h.includes("thư điện tử"));
  const colPhone = header.findIndex(
    (h: string) => h.includes("số điện thoại") || h.includes("sđt") || h.includes("phone")
  );
  const colDob = header.findIndex(
    (h: string) => h.includes("ngày sinh") || h.includes("dob") || h.includes("birth")
  );
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
      error: "Tệp tải lên thiếu các cột bắt buộc: 'Họ và tên', 'Email', 'Điểm đầu vào'!",
    };
  }

  const existingEmailSet = new Set<string>();
  if (await isDbAlive()) {
    try {
      const existingUsers = await prisma.user.findMany({
        select: { email: true },
      });
      existingUsers.forEach((u) => existingEmailSet.add(u.email.toLowerCase()));
    } catch (e) {
      console.warn("[parseAndValidateBulkStudentsService] Fallback to memory emails:", e);
    }
  } else {
    const demoUsers = (globalThis as any).demoUsers || [];
    demoUsers.forEach((u: any) => {
      if (u.email) existingEmailSet.add(u.email.toLowerCase());
    });
  }

  const validRows: ValidatedStudentRow[] = [];
  const invalidRows: InvalidStudentRow[] = [];
  const seenEmailsInFile = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (
      !row ||
      row.length === 0 ||
      row.every((c: any) => c === null || c === undefined || String(c).trim() === "")
    ) {
      continue;
    }

    const rowNumber = i + 1;
    const fullName = row[colFullName] ? String(row[colFullName]).trim() : "";
    const rawEmail = row[colEmail] ? String(row[colEmail]).trim().toLowerCase() : "";
    const rawPhone = colPhone !== -1 && row[colPhone] ? String(row[colPhone]).trim() : "";
    const rawDob = colDob !== -1 && row[colDob] ? String(row[colDob]).trim() : "";
    const rawGender =
      colGender !== -1 && row[colGender] ? String(row[colGender]).trim().toLowerCase() : "";
    const rawScoreVal = row[colScore];

    if (!fullName) {
      invalidRows.push({
        rowNumber,
        email: rawEmail,
        rawScore: rawScoreVal,
        errorReason: "Họ và tên không được để trống",
      });
      continue;
    }

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
        errorReason: "Email bị trùng lặp nhiều lần ngay trong tệp tải lên",
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
        errorReason: "Email đã tồn tại và đang hoạt động trong hệ thống",
      });
      continue;
    }

    const score = Number(String(rawScoreVal).replace(",", "."));
    if (
      rawScoreVal === null ||
      rawScoreVal === undefined ||
      isNaN(score) ||
      score < 0 ||
      score > 9.0
    ) {
      invalidRows.push({
        rowNumber,
        fullName,
        email: rawEmail,
        rawScore: rawScoreVal,
        errorReason: "Điểm đầu vào phải là số từ 0.0 đến 9.0",
      });
      continue;
    }

    let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
    if (rawGender.includes("nữ") || rawGender === "female" || rawGender === "f") {
      gender = "FEMALE";
    } else if (rawGender.includes("khác") || rawGender === "other") {
      gender = "OTHER";
    }

    const isBelowCutoff = score < 3.5;
    if (isBelowCutoff) {
      validRows.push({
        rowNumber,
        fullName,
        email: rawEmail,
        phoneNumber: rawPhone || undefined,
        dateOfBirth: rawDob || undefined,
        gender,
        ieltsScore: score,
        isBelowCutoff: true,
        status: "DUOI_DIEM_SAN",
        issueReason: "Điểm Overall dưới điểm sàn tuyển sinh (< 3.5)",
        levelId: "lvl-below-cutoff",
        levelCode: "BELOW_CUTOFF",
        levelName: "Dưới điểm sàn",
      });
      continue;
    }

    const matchedLevel = ieltsLevels.find(
      (lvl) => score >= lvl.minScore && score <= lvl.maxScore
    );
    if (!matchedLevel) {
      invalidRows.push({
        rowNumber,
        fullName,
        email: rawEmail,
        rawScore: score,
        errorReason: `Điểm đầu vào (${score}) không khớp với bất kỳ khoảng trình độ nào đã cấu hình`,
      });
      continue;
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
}

export async function distributeStudentsBalancedService(
  students: ValidatedStudentRow[],
  classCount: number,
  levelCode: string,
  levelName: string,
  levelId: string,
  schoolCode: string = "TD"
): Promise<ProposedClass[]> {
  const S = students.length;
  const N = Math.max(1, classCount);

  if (S === 0) {
    return [];
  }

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

export async function generateBulkClassSuggestionService(
  validRows: ValidatedStudentRow[],
  schoolId?: string,
  classCountOverrides?: Record<string, number>
): Promise<{
  success: boolean;
  suggestion?: BulkAllocationSuggestion;
  error?: string;
}> {
  const levels = await getAvailableIeltsLevels();

  let schoolCode = "TD";
  if (schoolId) {
    if (await isDbAlive()) {
      try {
        const school = await prisma.school.findUnique({ where: { id: schoolId } });
        if (school) schoolCode = school.code.replace(/[^a-zA-Z0-9]/g, "");
      } catch {}
    } else {
      const demoSchools = (globalThis as any).demoSchools || [
        { id: "demo-school-1", code: "SCH_TD", name: "THPT Trương Định" },
        { id: "demo-school-2", code: "SCH_KL", name: "THPT Kim Liên" },
      ];
      const sch = demoSchools.find((s: any) => s.id === schoolId);
      if (sch) schoolCode = sch.code.replace(/[^a-zA-Z0-9]/g, "");
    }
  }

  const admissibleStudents = validRows.filter((s) => !s.isBelowCutoff && s.ieltsScore >= 3.5);
  const belowCutoffStudents = validRows.filter((s) => s.isBelowCutoff || s.ieltsScore < 3.5);

  const studentsByLevel: Record<string, ValidatedStudentRow[]> = {};
  for (const lvl of levels) {
    studentsByLevel[lvl.id] = [];
  }

  for (const student of admissibleStudents) {
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
      continue;
    }

    const DEFAULT_CAPACITY_PER_CLASS = 25;
    let classCount = Math.max(1, Math.ceil(studentsInLevel.length / DEFAULT_CAPACITY_PER_CLASS));
    if (classCountOverrides && classCountOverrides[lvl.id]) {
      classCount = Math.max(1, classCountOverrides[lvl.id]);
    }

    const proposedClasses = await distributeStudentsBalancedService(
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
      totalBelowCutoff: belowCutoffStudents.length,
    },
    levelPlans,
    invalidRows: [],
    belowCutoffStudents,
  };

  return { success: true, suggestion };
}

export async function rebalanceOnStudentTransferService(
  currentPlan: LevelAllocationPlan,
  studentEmail: string,
  targetClassTempId: string
): Promise<{
  success: boolean;
  updatedPlan?: LevelAllocationPlan;
  message?: string;
  error?: string;
}> {
  let transferredStudent: ValidatedStudentRow | undefined;
  let sourceClassName = "";

  const classesWithoutStudent = currentPlan.classes.map((c) => {
    const idx = c.students.findIndex((s) => s.email.toLowerCase() === studentEmail.toLowerCase());
    if (idx !== -1) {
      transferredStudent = c.students[idx];
      sourceClassName = c.name;
      return {
        ...c,
        students: c.students.filter((_, i) => i !== idx),
      };
    }
    return c;
  });

  if (!transferredStudent) {
    return { success: false, error: "Không tìm thấy học sinh được chỉ định trong phương án!" };
  }

  const targetClass = classesWithoutStudent.find((c) => c.tempId === targetClassTempId);
  if (!targetClass) {
    return { success: false, error: "Không tìm thấy lớp học đích!" };
  }

  const activeClasses = classesWithoutStudent
    .map((c) => {
      if (c.tempId === targetClassTempId) {
        return {
          ...c,
          students: [...c.students, transferredStudent!],
        };
      }
      return c;
    })
    .filter((c) => c.students.length > 0);

  const updatedPlan: LevelAllocationPlan = {
    ...currentPlan,
    classes: activeClasses,
    classCount: activeClasses.length,
    studentCount: activeClasses.reduce((sum, c) => sum + c.students.length, 0),
  };

  return {
    success: true,
    updatedPlan,
    message: `Đã chuyển học sinh ${transferredStudent.fullName} từ ${sourceClassName} sang ${targetClass.name}.`,
  };
}

export async function rebalanceOnClassCountChangeService(
  currentPlan: LevelAllocationPlan,
  newClassCount: number,
  schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlan?: LevelAllocationPlan;
  message?: string;
  error?: string;
}> {
  const N = Math.floor(Number(newClassCount));
  if (isNaN(N) || N < 1) {
    return { success: false, error: "Số lớp phải là số nguyên dương lớn hơn hoặc bằng 1!" };
  }

  const allStudents: ValidatedStudentRow[] = [];
  for (const c of currentPlan.classes) {
    for (const s of c.students) {
      allStudents.push(s);
    }
  }

  const rebalancedClasses = await distributeStudentsBalancedService(
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
}

export async function rebalanceByCapacityService(
  currentPlans: LevelAllocationPlan[],
  maxCapacity: number,
  schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlans?: LevelAllocationPlan[];
  message?: string;
  error?: string;
}> {
  const cap = Math.max(5, Math.floor(Number(maxCapacity) || 30));
  const newPlans: LevelAllocationPlan[] = [];

  for (const plan of currentPlans) {
    const allStudents: ValidatedStudentRow[] = [];
    for (const c of plan.classes) {
      allStudents.push(...c.students);
    }
    const S = allStudents.length;
    if (S === 0) {
      newPlans.push(plan);
      continue;
    }
    const newClassCount = Math.max(1, Math.ceil(S / cap));
    const rebalanced = await distributeStudentsBalancedService(
      allStudents,
      newClassCount,
      plan.levelCode,
      plan.levelName,
      plan.levelId,
      schoolCode
    );
    const updatedClasses = rebalanced.map((c) => ({ ...c, capacity: cap }));
    newPlans.push({
      ...plan,
      classCount: updatedClasses.length,
      classes: updatedClasses,
    });
  }

  return {
    success: true,
    updatedPlans: newPlans,
    message: `Đã chia lại các lớp theo sĩ số tối đa ${cap} học sinh/lớp.`,
  };
}

export async function removeClassAndRebalanceService(
  currentPlan: LevelAllocationPlan,
  _classTempIdToRemove: string,
  schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlan?: LevelAllocationPlan;
  message?: string;
  error?: string;
}> {
  if (currentPlan.classes.length <= 1) {
    return { success: false, error: "Không thể xóa lớp duy nhất của trình độ này!" };
  }

  const allStudents: ValidatedStudentRow[] = [];
  for (const c of currentPlan.classes) {
    allStudents.push(...c.students);
  }

  const newClassCount = currentPlan.classes.length - 1;
  const rebalancedClasses = await distributeStudentsBalancedService(
    allStudents,
    newClassCount,
    currentPlan.levelCode,
    currentPlan.levelName,
    currentPlan.levelId,
    schoolCode
  );

  const updatedPlan: LevelAllocationPlan = {
    ...currentPlan,
    classCount: newClassCount,
    classes: rebalancedClasses,
  };

  return {
    success: true,
    updatedPlan,
    message: `Đã xóa lớp và phân bổ lại ${allStudents.length} học sinh vào ${newClassCount} lớp còn lại.`,
  };
}

export async function updateClassCapacitiesAndRebalanceService(
  currentPlans: LevelAllocationPlan[],
  classSettings: Record<string, { capacity: number; isRemoved?: boolean }>,
  schoolCode: string = "TD"
): Promise<{
  success: boolean;
  updatedPlans?: LevelAllocationPlan[];
  message?: string;
  error?: string;
}> {
  const newPlans: LevelAllocationPlan[] = [];
  let totalRemoved = 0;

  for (const plan of currentPlans) {
    const activeClasses = plan.classes.filter((c) => {
      const setting = classSettings[c.tempId];
      if (setting && (setting.isRemoved || setting.capacity <= 0)) {
        return false;
      }
      return true;
    });

    if (activeClasses.length === 0 && plan.studentCount > 0) {
      return {
        success: false,
        error: `Trình độ ${plan.levelName} không thể giải thể tất cả các lớp khi vẫn có học sinh!`,
      };
    }

    const allStudents: ValidatedStudentRow[] = [];
    for (const c of plan.classes) {
      allStudents.push(...c.students);
    }

    if (activeClasses.length < plan.classes.length) {
      const removedCount = plan.classes.length - activeClasses.length;
      totalRemoved += removedCount;
      const newClassCount = activeClasses.length;
      const rebalanced = await distributeStudentsBalancedService(
        allStudents,
        newClassCount,
        plan.levelCode,
        plan.levelName,
        plan.levelId,
        schoolCode
      );

      const updatedClasses = rebalanced.map((c) => ({
        ...c,
        capacity: Math.max(10, c.capacity),
      }));

      newPlans.push({
        ...plan,
        classCount: updatedClasses.length,
        classes: updatedClasses,
      });
    } else {
      const updatedClasses = plan.classes.map((c) => {
        const setting = classSettings[c.tempId];
        const newCap = setting && setting.capacity > 0 ? setting.capacity : c.capacity;
        return { ...c, capacity: newCap };
      });

      newPlans.push({
        ...plan,
        classes: updatedClasses,
      });
    }
  }

  const message =
    totalRemoved > 0
      ? `Đã giải thể ${totalRemoved} lớp (sĩ số = 0) và tự động chuyển học sinh sang các lớp khác cùng trình độ.`
      : "Đã cập nhật cấu hình sĩ số các lớp thành công.";

  return {
    success: true,
    updatedPlans: newPlans,
    message,
  };
}

export async function commitBulkAllocationService(
  plans: LevelAllocationPlan[],
  schoolId: string,
  fileName: string = "import_ielts.xlsx"
): Promise<{
  success: boolean;
  createdCount?: number;
  createdClassesCount?: number;
  summary?: { email: string; fullName: string; username: string; className: string }[];
  error?: string;
}> {
  if (!(await isDbAlive())) {
    const globalStore = globalThis as any;
    if (!globalStore.demoUsers) globalStore.demoUsers = [];
    if (!globalStore.demoClasses) globalStore.demoClasses = [];
    const demoSchools = globalStore.demoSchools || [
      { id: "demo-school-1", code: "SCH_TD", name: "THPT Trương Định" },
      { id: "demo-school-2", code: "SCH_KL", name: "THPT Kim Liên" },
    ];
    const school = demoSchools.find((s: any) => s.id === schoolId) ||
      demoSchools[0] || {
        id: schoolId,
        code: "SCH_TD",
        name: "Trường đối tác",
      };

    const createdUsersSummary: {
      email: string;
      fullName: string;
      username: string;
      className: string;
    }[] = [];
    let currentStudentCount = globalStore.demoUsers.filter(
      (u: any) => u.role?.code === "STUDENT"
    ).length;

    for (const plan of plans) {
      for (const propClass of plan.classes) {
        if (propClass.students.length === 0) continue;

        let classRecord = globalStore.demoClasses.find((c: any) => c.code === propClass.code);
        if (!classRecord) {
          classRecord = {
            id: `class-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            schoolId: school.id,
            code: propClass.code,
            name: propClass.name,
            program: "IELTS",
            level: plan.levelName,
            ieltsLevelId: plan.levelId,
            capacity: propClass.capacity,
            status: "ACTIVE",
            isActive: true,
            school: { id: school.id, name: school.name, code: school.code },
            assignments: [],
            enrollments: [],
            _count: { enrollments: 0 },
          };
          globalStore.demoClasses.push(classRecord);
        }

        for (const student of propClass.students) {
          currentStudentCount++;
          let username = `HV${(1000 + currentStudentCount).toString()}`;
          while (globalStore.demoUsers.some((u: any) => u.username === username)) {
            currentStudentCount++;
            username = `HV${(1000 + currentStudentCount).toString()}`;
          }

          const cleanEmail = student.email.trim().toLowerCase();
          const enrollmentId = `en-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const newStudentUser: any = {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            username,
            email: cleanEmail,
            role: { code: "STUDENT", name: "Học viên" },
            isActive: true,
            profile: {
              fullName: student.fullName.trim(),
              phoneNumber: student.phoneNumber || null,
              dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
              gender: student.gender || null,
              entryIeltsScore: student.ieltsScore,
              ieltsLevel: { id: plan.levelId, name: plan.levelName, code: plan.levelCode },
            },
            classAssignments: [],
            classEnrollments: [
              {
                id: enrollmentId,
                classId: classRecord.id,
                class: {
                  id: classRecord.id,
                  name: classRecord.name,
                  code: classRecord.code,
                  school: { id: school.id, name: school.name, code: school.code },
                },
              },
            ],
            managedSchools: [],
          };

          globalStore.demoUsers.unshift(newStudentUser);
          if (!classRecord.enrollments) classRecord.enrollments = [];
          classRecord.enrollments.push({
            id: enrollmentId,
            studentId: newStudentUser.id,
            status: "STUDYING",
            student: newStudentUser,
          });
          classRecord._count = { enrollments: classRecord.enrollments.length };

          createdUsersSummary.push({
            email: cleanEmail,
            fullName: student.fullName,
            username,
            className: classRecord.name,
          });
        }
      }
    }

    return {
      success: true,
      createdCount: createdUsersSummary.length,
      createdClassesCount: plans.reduce((acc, p) => acc + p.classes.length, 0),
      summary: createdUsersSummary,
    };
  }

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
  const createdUsersSummary: {
    email: string;
    fullName: string;
    username: string;
    className: string;
  }[] = [];

  await prisma.$transaction(async (tx) => {
    let currentStudentCount = await tx.user.count({
      where: { role: { code: "STUDENT" } },
    });

    for (const plan of plans) {
      const matchedDbLevel = await tx.ieltsLevel
        .findFirst({
          where: {
            OR: [{ id: plan.levelId }, { code: plan.levelCode as any }],
          },
        })
        .catch(() => null);
      const validDbLevelId = matchedDbLevel ? matchedDbLevel.id : null;

      for (const propClass of plan.classes) {
        if (propClass.students.length === 0) continue;

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
              ieltsLevelId: validDbLevelId,
              capacity: propClass.capacity,
              status: "ACTIVE",
              isActive: true,
            },
          });
        }

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
                  ieltsLevelId: validDbLevelId,
                },
              },
            },
          });

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

    const adminUser = await tx.user.findFirst({ where: { role: { code: "ADMIN" } } });
    if (adminUser) {
      await tx.importLog
        .create({
          data: {
            importedById: adminUser.id,
            fileName,
            totalRows: createdUsersSummary.length,
            successCount: createdUsersSummary.length,
            errorCount: 0,
          },
        })
        .catch(() => null);
    }
  });

  for (const u of createdUsersSummary) {
    sendAccountCreatedEmail({
      to: u.email,
      fullName: u.fullName,
      username: u.username,
      tempPassword: defaultPassword,
      roleName: "Học sinh",
    }).catch((err) => console.error("Lỗi gửi mail học sinh:", err));
  }

  return {
    success: true,
    createdCount: createdUsersSummary.length,
    createdClassesCount: plans.reduce((acc, p) => acc + p.classes.length, 0),
    summary: createdUsersSummary,
  };
}
