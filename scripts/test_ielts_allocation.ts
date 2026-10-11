import { prisma } from "../src/lib/prisma";
import {
  getIeltsLevelsAction,
  determineIeltsLevelAction,
  createIeltsLevelAction,
  updateIeltsLevelAction,
} from "../src/actions/ielts-levels";
import {
  distributeStudentsBalanced,
  generateBulkClassSuggestionAction,
  rebalanceOnClassCountChangeAction,
  rebalanceOnStudentTransferAction,
  commitBulkAllocationAction,
  ValidatedStudentRow,
} from "../src/actions/bulk-allocation";

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM THỬ TÍNH NĂNG CẤU HÌNH & PHÂN LỚP IELTS ===");

  // 1. Kiểm tra cấu hình và tự xác định trình độ
  console.log("\n--- TEST 1: TỰ ĐỘNG XÁC ĐỊNH TRÌNH ĐỘ IELTS TỪ ĐIỂM ĐẦU VÀO ---");
  const testScores = [
    { score: 3.5, expected: "BASIC" },
    { score: 5.5, expected: "INTERMEDIATE" },
    { score: 7.5, expected: "ADVANCED" },
    { score: 9.0, expected: "ADVANCED" },
    { score: 0.0, expected: "BASIC" },
  ];

  for (const t of testScores) {
    const res = await determineIeltsLevelAction(t.score);
    if (!res.success || !res.level) {
      throw new Error(`FAIL: Không xác định được trình độ cho điểm ${t.score}: ${res.error}`);
    }
    if (res.level.code !== t.expected) {
      throw new Error(
        `FAIL: Điểm ${t.score} mong đợi ${t.expected} nhưng nhận được ${res.level.code}`
      );
    }
    console.log(`✓ Điểm ${t.score} -> Trình độ: ${res.level.name} (${res.level.code})`);
  }

  // Điểm ngoài khoảng 0 - 9
  const invalidScoreRes = await determineIeltsLevelAction(10.5);
  if (invalidScoreRes.success) {
    throw new Error("FAIL: Điểm 10.5 không được phép hợp lệ!");
  }
  console.log("✓ Chặn thành công điểm không hợp lệ 10.5:", invalidScoreRes.error);

  // 2. Kiểm tra chặn chồng lấn khoảng điểm (Overlap validation)
  console.log("\n--- TEST 2: KIỂM TRA CHẶN CHỒNG LẤN KHOẢNG ĐIỂM (OVERLAP) ---");
  const overlapRes = await createIeltsLevelAction({
    code: "OVERLAP_TEST",
    name: "Trình độ Thử nghiệm Chồng lấn",
    minScore: 3.0,
    maxScore: 5.5,
    description: "Test overlap",
  });
  if (overlapRes.success) {
    throw new Error("FAIL: Khoảng điểm [3.0 - 5.5] bị chồng lấn nhưng hệ thống không chặn!");
  }
  console.log("✓ Chặn thành công khoảng điểm chồng lấn:", overlapRes.error);

  // 3. Kiểm tra thuật toán chia đều học sinh (sĩ số chênh lệch <= 1)
  console.log("\n--- TEST 3: THUẬT TOÁN CHIA ĐỀU HỌC SINH (CHÊNH LỆCH <= 1) ---");
  const makeMockStudents = (count: number, levelCode: string, levelName: string, levelId: string): ValidatedStudentRow[] => {
    return Array.from({ length: count }, (_, i) => ({
      rowNumber: i + 1,
      fullName: `Học sinh ${levelCode} ${i + 1}`,
      email: `student_${levelCode.toLowerCase()}_${i + 1}_${Date.now()}@test.edu.vn`,
      phoneNumber: "0987654321",
      dateOfBirth: "2008-01-01",
      gender: "MALE" as const,
      ieltsScore: 5.5,
      levelId,
      levelCode,
      levelName,
    }));
  };

  const levelsRes = await getIeltsLevelsAction();
  const basicLvl = levelsRes.levels?.find((l) => l.code === "BASIC")!;
  const interLvl = levelsRes.levels?.find((l) => l.code === "INTERMEDIATE")!;
  const advLvl = levelsRes.levels?.find((l) => l.code === "ADVANCED")!;

  // 52 học sinh chia 2 lớp -> 26, 26
  const students52 = makeMockStudents(52, interLvl.code, interLvl.name, interLvl.id);
  const classes52 = await distributeStudentsBalanced(students52, 2, interLvl.code, interLvl.name, interLvl.id, "TD");
  const sizes52 = classes52.map((c) => c.students.length);
  console.log("52 học sinh / 2 lớp:", sizes52);
  if (sizes52[0] !== 26 || sizes52[1] !== 26) {
    throw new Error(`FAIL: 52 học sinh chia 2 lớp phải là [26, 26], thực tế: ${JSON.stringify(sizes52)}`);
  }

  // 50 học sinh chia 3 lớp -> 17, 17, 16
  const students50 = makeMockStudents(50, interLvl.code, interLvl.name, interLvl.id);
  const classes50 = await distributeStudentsBalanced(students50, 3, interLvl.code, interLvl.name, interLvl.id, "TD");
  const sizes50 = classes50.map((c) => c.students.length);
  console.log("50 học sinh / 3 lớp:", sizes50);
  if (sizes50[0] !== 17 || sizes50[1] !== 17 || sizes50[2] !== 16) {
    throw new Error(`FAIL: 50 học sinh chia 3 lớp phải là [17, 17, 16], thực tế: ${JSON.stringify(sizes50)}`);
  }
  const maxDiff50 = Math.max(...sizes50) - Math.min(...sizes50);
  if (maxDiff50 > 1) {
    throw new Error(`FAIL: Chênh lệch sĩ số giữa các lớp vượt quá 1 (${maxDiff50})`);
  }
  console.log("✓ Chênh lệch sĩ số giữa các lớp tối đa là 1:", maxDiff50);

  // 4. Kiểm tra Suggestion Generation
  console.log("\n--- TEST 4: TẠO PHƯƠNG ÁN ĐỀ XUẤT PHÂN LỚP (SUGGESTION) ---");
  const allMockStudents = [
    ...makeMockStudents(20, basicLvl.code, basicLvl.name, basicLvl.id),
    ...makeMockStudents(50, interLvl.code, interLvl.name, interLvl.id),
    ...makeMockStudents(30, advLvl.code, advLvl.name, advLvl.id),
  ];

  const targetSchool = await prisma.school.findFirst();
  if (!targetSchool) {
    throw new Error("FAIL: Không tìm thấy trường học nào trong DB!");
  }

  const sugRes = await generateBulkClassSuggestionAction(allMockStudents, targetSchool.id);
  if (!sugRes.success || !sugRes.suggestion) {
    throw new Error(`FAIL: Không tạo được phương án: ${sugRes.error}`);
  }
  const sug = sugRes.suggestion;
  console.log("✓ Phương án đề xuất:", {
    totalValid: sug.summary.totalValid,
    totalLevels: sug.summary.totalLevels,
    totalClasses: sug.summary.totalClasses,
    totalAllocatedStudents: sug.summary.totalAllocatedStudents,
  });

  if (sug.summary.totalAllocatedStudents !== 100) {
    throw new Error(`FAIL: Tổng học sinh phân lớp phải là 100, thực tế: ${sug.summary.totalAllocatedStudents}`);
  }

  // 5. Kiểm tra điều chỉnh số lớp và chia đều lại (Rebalance on class count change)
  console.log("\n--- TEST 5: ĐIỀU CHỈNH SỐ LỚP VÀ TỰ ĐỘNG CHIA LẠI TOÀN BỘ ---");
  const interPlan = sug.levelPlans.find((p) => p.levelId === interLvl.id)!;
  console.log(`Số lớp ban đầu trình độ ${interPlan.levelName}: ${interPlan.classCount} lớp`);
  
  const rebalanceCountRes = await rebalanceOnClassCountChangeAction(interPlan, 4, "TD");
  if (!rebalanceCountRes.success || !rebalanceCountRes.updatedPlan) {
    throw new Error(`FAIL: Không điều chỉnh được số lớp: ${rebalanceCountRes.error}`);
  }
  const updatedPlan = rebalanceCountRes.updatedPlan;
  const newSizes = updatedPlan.classes.map((c) => c.students.length);
  console.log(`50 học sinh sau khi đổi sang 4 lớp:`, newSizes);
  // 50 / 4 = 12 remainder 2 -> [13, 13, 12, 12]
  if (JSON.stringify(newSizes) !== JSON.stringify([13, 13, 12, 12])) {
    throw new Error(`FAIL: 50 học sinh chia 4 lớp phải là [13, 13, 12, 12], thực tế: ${JSON.stringify(newSizes)}`);
  }
  console.log("✓ Đã chia đều lại toàn bộ học sinh khi đổi số lớp!");

  // 6. Kiểm tra chuyển học sinh và chia đều lại (Rebalance on transfer)
  console.log("\n--- TEST 6: CHUYỂN HỌC SINH GIỮA CÁC LỚP CÙNG TRÌNH ĐỘ & CHIA LẠI ---");
  const studentToTransfer = updatedPlan.classes[0].students[0];
  const targetClass = updatedPlan.classes[3];
  
  const transferRes = await rebalanceOnStudentTransferAction(
    updatedPlan,
    studentToTransfer.email,
    targetClass.tempId,
    "TD"
  );
  if (!transferRes.success || !transferRes.updatedPlan) {
    throw new Error(`FAIL: Lỗi khi chuyển lớp: ${transferRes.error}`);
  }
  console.log("✓ Kết quả chuyển lớp & rebalance:", transferRes.message);

  // 7. Kiểm tra commit phân lớp vào Database
  console.log("\n--- TEST 7: XÁC NHẬN PHÂN LỚP HÀNG LOẠT VÀO CSDL (COMMIT) ---");
  // Tạo tập mẫu nhỏ 6 học sinh để commit thực tế
  const smallTestStudents = [
    ...makeMockStudents(2, basicLvl.code, basicLvl.name, basicLvl.id),
    ...makeMockStudents(4, interLvl.code, interLvl.name, interLvl.id),
  ];
  const smallSugRes = await generateBulkClassSuggestionAction(smallTestStudents, targetSchool.id);
  const smallSug = smallSugRes.suggestion!;

  const commitRes = await commitBulkAllocationAction(
    smallSug.levelPlans,
    targetSchool.id,
    "test_ielts_bulk.xlsx"
  );

  if (!commitRes.success) {
    throw new Error(`FAIL: Commit phân lớp thất bại: ${commitRes.error}`);
  }
  console.log(`✓ Commit thành công ${commitRes.createdCount} học sinh vào CSDL!`);

  // Kiểm tra dữ liệu thực tế trong CSDL
  for (const st of smallTestStudents) {
    const user = await prisma.user.findUnique({
      where: { email: st.email.toLowerCase() },
      include: {
        profile: {
          include: { ieltsLevel: true },
        },
        classEnrollments: {
          include: { class: { include: { ieltsLevel: true } } },
        },
      },
    });

    if (!user) {
      throw new Error(`FAIL: Không tìm thấy học sinh ${st.email} trong DB sau khi commit!`);
    }
    if (user.profile?.entryIeltsScore !== st.ieltsScore) {
      throw new Error(`FAIL: Điểm IELTS đầu vào không khớp cho học sinh ${st.email}`);
    }
    if (user.profile?.ieltsLevelId !== st.levelId) {
      throw new Error(`FAIL: Trình độ IELTS không khớp cho học sinh ${st.email}`);
    }
    if (user.classEnrollments.length === 0) {
      throw new Error(`FAIL: Học sinh ${st.email} chưa được ghi danh vào lớp học!`);
    }
    console.log(
      `✓ Đã xác thực DB học sinh: ${user.profile?.fullName} (${user.email}) -> Điểm: ${user.profile?.entryIeltsScore}, Trình độ: ${user.profile?.ieltsLevel?.name}, Lớp: ${user.classEnrollments[0]?.class?.name}`
    );
  }

  console.log("\n========================================================");
  console.log("=== TẤT CẢ 7 BÀI TEST NGHIỆP VỤ IELTS ĐÃ VƯỢT QUA 100% ===");
  console.log("========================================================");
}

runTests()
  .catch((err) => {
    console.error("LỖI KIỂM THỬ:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
