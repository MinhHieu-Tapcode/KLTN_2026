import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== BẮT ĐẦU NẠP DỮ LIỆU MẪU: QUẢN LÝ BÀI TẬP & BÁO CÁO THỐNG KÊ ===");

  // 1. Tìm lớp học, giáo viên và học viên
  const cls = await prisma.class.findFirst({
    where: { code: "IELTS_TD_01", isActive: true },
    include: { school: true },
  });

  if (!cls) {
    console.error("Không tìm thấy lớp học IELTS_TD_01!");
    return;
  }

  const teacher = await prisma.user.findFirst({
    where: { email: "teacher@simpace.vn" },
  });
  const student = await prisma.user.findFirst({
    where: { email: "student@simpace.vn" },
  });

  if (!teacher || !student) {
    console.error("Không tìm thấy tài khoản giáo viên hoặc học viên!");
    return;
  }

  console.log(`✓ Lớp học: ${cls.name} (${cls.code})`);
  console.log(`✓ Giáo viên: ${teacher.username} (${teacher.email})`);
  console.log(`✓ Học viên: ${student.username} (${student.email})\n`);

  // =========================================================================
  // 2. BÀI TẬP 1: IELTS READING (Mini-Test 01 - The History of Paper Making)
  // =========================================================================
  console.log("--- 1. Tạo bài tập READING & Bài làm đã chấm điểm ---");
  const readingAssignment = await prisma.assignment.upsert({
    where: { id: "asgn-reading-mini-01" },
    update: {},
    create: {
      id: "asgn-reading-mini-01",
      classId: cls.id,
      title: "IELTS Reading Mini-Test 01: The History of Paper Making",
      description: "Đọc đoạn văn ngắn về lịch sử sản xuất giấy và hoàn thành 3 câu hỏi đọc hiểu.",
      skill: "READING",
      type: "HOMEWORK",
      durationMinutes: 30,
      dueDate: new Date(Date.now() + 3 * 86400000),
      maxAttempts: 2,
      enableProctoring: true,
      maxTabSwitches: 3,
      createdById: teacher.id,
    },
  });

  const readingAssignClass = await prisma.assignmentClass.upsert({
    where: { id: "ac-reading-mini-01" },
    update: {},
    create: {
      id: "ac-reading-mini-01",
      assignmentId: readingAssignment.id,
      classId: cls.id,
      dueDate: new Date(Date.now() + 3 * 86400000),
      startDate: new Date(Date.now() - 5 * 86400000),
    },
  });

  // Tạo 3 câu hỏi Reading
  const q1Reading = await prisma.assignmentQuestion.upsert({
    where: { id: "q-read-01" },
    update: {},
    create: {
      id: "q-read-01",
      assignmentId: readingAssignment.id,
      questionNumber: 1,
      orderIndex: 1,
      ieltsQuestionType: "MULTIPLE_CHOICE",
      type: "MULTIPLE_CHOICE",
      points: 1.0,
      passageText: "Paper as we know it today was invented in ancient China during the Han dynasty, around 105 AD. Cai Lun, an imperial court official, is credited with standardising papermaking using mulberry bark, old rags, and hemp.",
      prompt: "Paper was first officially invented during which historical dynasty?",
      correctAnswer: "A",
      explanation: "Đoạn văn ghi rõ: '...invented in ancient China during the Han dynasty, around 105 AD.'",
      options: {
        create: [
          { optionLabel: "A", content: "Han Dynasty", isCorrect: true },
          { optionLabel: "B", content: "Tang Dynasty", isCorrect: false },
          { optionLabel: "C", content: "Song Dynasty", isCorrect: false },
          { optionLabel: "D", content: "Ming Dynasty", isCorrect: false },
        ],
      },
    },
  });

  const q2Reading = await prisma.assignmentQuestion.upsert({
    where: { id: "q-read-02" },
    update: {},
    create: {
      id: "q-read-02",
      assignmentId: readingAssignment.id,
      questionNumber: 2,
      orderIndex: 2,
      ieltsQuestionType: "TRUE_FALSE_NOT_GIVEN",
      type: "TRUE_FALSE_NG",
      points: 1.0,
      prompt: "Early paper made by Cai Lun relied entirely on silk fibres.",
      correctAnswer: "FALSE",
      explanation: "Đoạn văn nêu Cai Lun dùng 'mulberry bark, old rags, and hemp', không nói là hoàn toàn từ tơ lụa.",
      options: {
        create: [
          { optionLabel: "A", content: "TRUE", isCorrect: false },
          { optionLabel: "B", content: "FALSE", isCorrect: true },
          { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
        ],
      },
    },
  });

  const q3Reading = await prisma.assignmentQuestion.upsert({
    where: { id: "q-read-03" },
    update: {},
    create: {
      id: "q-read-03",
      assignmentId: readingAssignment.id,
      questionNumber: 3,
      orderIndex: 3,
      ieltsQuestionType: "SENTENCE_COMPLETION",
      type: "FILL_IN_BLANK",
      points: 1.0,
      prompt: "Paper making knowledge entered the Islamic world following the Battle of [BLANK] in 751 AD.",
      correctAnswer: "Talas",
      explanation: "Trận chiến Talas (Battle of Talas, 751 AD) giúp kỹ thuật làm giấy truyền sang thế giới Ả Rập.",
    },
  });

  // Bài nộp học sinh đã chấm
  const readingSubmission = await prisma.assignmentSubmission.upsert({
    where: { id: "sub-reading-01" },
    update: {},
    create: {
      id: "sub-reading-01",
      assignmentId: readingAssignment.id,
      assignmentClassId: readingAssignClass.id,
      studentId: student.id,
      attemptNumber: 1,
      startedAt: new Date(Date.now() - 2 * 86400000 - 30 * 60000),
      submittedAt: new Date(Date.now() - 2 * 86400000),
      status: "GRADED",
      score: 3.0,
      totalPoints: 3.0,
      teacherFeedback: "Em làm rất tốt, đọc quét từ khóa chính xác và nắm chắc logic câu hỏi T/F/NG!",
      gradedById: teacher.id,
      tabSwitchCount: 0,
      isCheatingFlagged: false,
    },
  });

  await prisma.submissionAnswer.upsert({
    where: { id: "ans-read-01" },
    update: {},
    create: {
      id: "ans-read-01",
      submissionId: readingSubmission.id,
      questionId: q1Reading.id,
      studentAnswer: "A",
      isCorrect: true,
      awardedPoints: 1.0,
      teacherComment: "Đúng",
    },
  });

  await prisma.submissionAnswer.upsert({
    where: { id: "ans-read-02" },
    update: {},
    create: {
      id: "ans-read-02",
      submissionId: readingSubmission.id,
      questionId: q2Reading.id,
      studentAnswer: "FALSE",
      isCorrect: true,
      awardedPoints: 1.0,
      teacherComment: "Đúng",
    },
  });

  await prisma.submissionAnswer.upsert({
    where: { id: "ans-read-03" },
    update: {},
    create: {
      id: "ans-read-03",
      submissionId: readingSubmission.id,
      questionId: q3Reading.id,
      studentAnswer: "Talas",
      isCorrect: true,
      awardedPoints: 1.0,
      teacherComment: "Chính xác",
    },
  });

  console.log("✔ Đã tạo bài tập Reading và lượt nộp bài đạt 3.0/3.0 (Band 8.0)");

  // =========================================================================
  // 3. BÀI TẬP 2: IELTS LISTENING (Section 1 - Campus Housing Form)
  // =========================================================================
  console.log("--- 2. Tạo bài tập LISTENING & Bài làm đã chấm điểm ---");
  const listeningAssignment = await prisma.assignment.upsert({
    where: { id: "asgn-listening-sec-01" },
    update: {},
    create: {
      id: "asgn-listening-sec-01",
      classId: cls.id,
      title: "IELTS Listening Practice: Campus Housing Application",
      description: "Nghe đoạn hội thoại đăng ký ký túc xá đại học và điền thông tin người đăng ký.",
      skill: "LISTENING",
      type: "QUIZ",
      durationMinutes: 20,
      dueDate: new Date(Date.now() + 2 * 86400000),
      maxAttempts: 1,
      audioUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
      enableProctoring: true,
      maxTabSwitches: 2,
      createdById: teacher.id,
    },
  });

  const listeningAssignClass = await prisma.assignmentClass.upsert({
    where: { id: "ac-listening-sec-01" },
    update: {},
    create: {
      id: "ac-listening-sec-01",
      assignmentId: listeningAssignment.id,
      classId: cls.id,
      dueDate: new Date(Date.now() + 2 * 86400000),
      startDate: new Date(Date.now() - 4 * 86400000),
    },
  });

  const q1Listening = await prisma.assignmentQuestion.upsert({
    where: { id: "q-listen-01" },
    update: {},
    create: {
      id: "q-listen-01",
      assignmentId: listeningAssignment.id,
      questionNumber: 1,
      orderIndex: 1,
      ieltsQuestionType: "FORM_COMPLETION",
      type: "FILL_IN_BLANK",
      points: 1.0,
      prompt: "Applicant's family name: [BLANK]",
      correctAnswer: "Patterson",
      explanation: "Người phụ nữ đánh vần họ: P-A-T-T-E-R-S-O-N.",
    },
  });

  const q2Listening = await prisma.assignmentQuestion.upsert({
    where: { id: "q-listen-02" },
    update: {},
    create: {
      id: "q-listen-02",
      assignmentId: listeningAssignment.id,
      questionNumber: 2,
      orderIndex: 2,
      ieltsQuestionType: "MULTIPLE_CHOICE",
      type: "MULTIPLE_CHOICE",
      points: 1.0,
      prompt: "What room facility is requested as a priority?",
      correctAnswer: "B",
      explanation: "Học sinh chọn 'Private bathroom' vì cần không gian cá nhân.",
      options: {
        create: [
          { optionLabel: "A", content: "Balcony", isCorrect: false },
          { optionLabel: "B", content: "Private bathroom", isCorrect: true },
          { optionLabel: "C", content: "Air conditioner", isCorrect: false },
          { optionLabel: "D", content: "Shared kitchen", isCorrect: false },
        ],
      },
    },
  });

  const listeningSubmission = await prisma.assignmentSubmission.upsert({
    where: { id: "sub-listening-01" },
    update: {},
    create: {
      id: "sub-listening-01",
      assignmentId: listeningAssignment.id,
      assignmentClassId: listeningAssignClass.id,
      studentId: student.id,
      attemptNumber: 1,
      startedAt: new Date(Date.now() - 86400000 - 20 * 60000),
      submittedAt: new Date(Date.now() - 86400000),
      status: "GRADED",
      score: 2.0,
      totalPoints: 2.0,
      teacherFeedback: "Kỹ năng nghe tên riêng và chọn chi tiết tốt, không bị bẫy.",
      gradedById: teacher.id,
      tabSwitchCount: 0,
      isCheatingFlagged: false,
    },
  });

  await prisma.submissionAnswer.upsert({
    where: { id: "ans-listen-01" },
    update: {},
    create: {
      id: "ans-listen-01",
      submissionId: listeningSubmission.id,
      questionId: q1Listening.id,
      studentAnswer: "Patterson",
      isCorrect: true,
      awardedPoints: 1.0,
    },
  });

  await prisma.submissionAnswer.upsert({
    where: { id: "ans-listen-02" },
    update: {},
    create: {
      id: "ans-listen-02",
      submissionId: listeningSubmission.id,
      questionId: q2Listening.id,
      studentAnswer: "B",
      isCorrect: true,
      awardedPoints: 1.0,
    },
  });

  console.log("✔ Đã tạo bài tập Listening và lượt nộp bài đạt 2.0/2.0 (Band 7.5)");

  // =========================================================================
  // 4. BÀI TẬP 3: IELTS WRITING (Task 1 - Line Graph Energy Production)
  // =========================================================================
  console.log("--- 3. Tạo bài tập WRITING & Bài làm chấm theo 4 tiêu chí chuẩn IELTS ---");
  const writingAssignment = await prisma.assignment.upsert({
    where: { id: "asgn-writing-task1-01" },
    update: {},
    create: {
      id: "asgn-writing-task1-01",
      classId: cls.id,
      title: "IELTS Writing Task 1: Electricity Generation in France (1995 - 2005)",
      description: "Tóm tắt biểu đồ đường biểu diễn tỷ trọng sản xuất điện tại Pháp trong giai đoạn 10 năm. Viết tối thiểu 150 từ.",
      skill: "WRITING",
      type: "HOMEWORK",
      durationMinutes: 40,
      dueDate: new Date(Date.now() + 4 * 86400000),
      maxAttempts: 1,
      enableProctoring: false,
      createdById: teacher.id,
    },
  });

  const writingAssignClass = await prisma.assignmentClass.upsert({
    where: { id: "ac-writing-task1-01" },
    update: {},
    create: {
      id: "ac-writing-task1-01",
      assignmentId: writingAssignment.id,
      classId: cls.id,
      dueDate: new Date(Date.now() + 4 * 86400000),
      startDate: new Date(Date.now() - 3 * 86400000),
    },
  });

  const q1Writing = await prisma.assignmentQuestion.upsert({
    where: { id: "q-writing-01" },
    update: {},
    create: {
      id: "q-writing-01",
      assignmentId: writingAssignment.id,
      questionNumber: 1,
      orderIndex: 1,
      ieltsQuestionType: "TASK_1_ACADEMIC",
      type: "ESSAY",
      points: 9.0,
      prompt: "The line graph below shows electricity production in France from 1995 to 2005. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
    },
  });

  const writingSubmission = await prisma.assignmentSubmission.upsert({
    where: { id: "sub-writing-01" },
    update: {},
    create: {
      id: "sub-writing-01",
      assignmentId: writingAssignment.id,
      assignmentClassId: writingAssignClass.id,
      studentId: student.id,
      attemptNumber: 1,
      startedAt: new Date(Date.now() - 36 * 3600000),
      submittedAt: new Date(Date.now() - 35 * 3600000),
      status: "GRADED",
      score: 7.0,
      totalPoints: 9.0,
      teacherFeedback: "Bài viết mạch lạc, bố cục chuẩn 4 đoạn. Phần Overview nêu bật được xu hướng tăng trưởng của năng lượng hạt nhân. Cần lưu ý sử dụng thêm từ nối chỉ sự tương phản.",
      gradedById: teacher.id,
    },
  });

  const writingAnswer = await prisma.submissionAnswer.upsert({
    where: { id: "ans-writing-01" },
    update: {},
    create: {
      id: "ans-writing-01",
      submissionId: writingSubmission.id,
      questionId: q1Writing.id,
      studentAnswer: "The line graph compares the amount of electricity produced by five energy sources in France between 1995 and 2005.\n\nOverall, nuclear power emerged as the primary source of electricity generation over the ten-year period, experiencing substantial growth, whereas fossil fuels and renewable sources accounted for significantly smaller fractions.\n\nIn 1995, coal and gas generated comparable amounts of electricity, standing at roughly 29% and 30% respectively. Over the decade, nuclear energy surged from approximately 35% to over 50% in 2005, dominating the country's national grid. Meanwhile, hydroelectric power remained relatively stable at just under 15%.\n\nIn conclusion, France increasingly prioritized nuclear power while gradually reducing its dependence on conventional coal.",
      awardedPoints: 7.0,
      teacherComment: "Đã chấm đủ 4 tiêu chí band điểm.",
    },
  });

  // Nạp 4 tiêu chí chấm điểm IELTS Writing chuẩn
  await prisma.submissionCriteriaScore.upsert({
    where: {
      submissionAnswerId_criterion: {
        submissionAnswerId: writingAnswer.id,
        criterion: "TA_TR",
      },
    },
    update: {},
    create: {
      submissionAnswerId: writingAnswer.id,
      criterion: "TA_TR",
      score: 7.5,
      comment: "Task Achievement tốt: Nêu đầy đủ tổng quan (Overview) và so sánh được số liệu chính.",
    },
  });

  await prisma.submissionCriteriaScore.upsert({
    where: {
      submissionAnswerId_criterion: {
        submissionAnswerId: writingAnswer.id,
        criterion: "CC",
      },
    },
    update: {},
    create: {
      submissionAnswerId: writingAnswer.id,
      criterion: "CC",
      score: 7.0,
      comment: "Coherence & Cohesion tốt: Phân đoạn logic, liên kết ý tự nhiên.",
    },
  });

  await prisma.submissionCriteriaScore.upsert({
    where: {
      submissionAnswerId_criterion: {
        submissionAnswerId: writingAnswer.id,
        criterion: "LR",
      },
    },
    update: {},
    create: {
      submissionAnswerId: writingAnswer.id,
      criterion: "LR",
      score: 7.0,
      comment: "Lexical Resource tốt: Sử dụng các cụm từ đắt (emerged as the primary source, dominating national grid).",
    },
  });

  await prisma.submissionCriteriaScore.upsert({
    where: {
      submissionAnswerId_criterion: {
        submissionAnswerId: writingAnswer.id,
        criterion: "GRA",
      },
    },
    update: {},
    create: {
      submissionAnswerId: writingAnswer.id,
      criterion: "GRA",
      score: 6.5,
      comment: "Grammar ổn: Chú ý sự nhất quán thì quá khứ đơn khi mô tả mốc thời gian 1995 - 2005.",
    },
  });

  console.log("✔ Đã tạo bài tập Writing Task 1 và 4 tiêu chí chấm Band Score 7.0 (TA: 7.5, CC: 7.0, LR: 7.0, GRA: 6.5)");

  // =========================================================================
  // 5. BÀI TẬP 4: IELTS SPEAKING (Part 2 - Đang mở, học sinh chưa nộp)
  // =========================================================================
  console.log("--- 4. Tạo bài tập SPEAKING (Đang mở để test giao diện nộp bài) ---");
  const speakingAssignment = await prisma.assignment.upsert({
    where: { id: "asgn-speaking-part2-01" },
    update: {},
    create: {
      id: "asgn-speaking-part2-01",
      classId: cls.id,
      title: "IELTS Speaking Part 2: Describe an impressive environmental project",
      description: "Chuẩn bị 1 phút và ghi âm bài nói từ 1.5 đến 2 phút theo gợi ý trên đề bài.",
      skill: "SPEAKING",
      type: "HOMEWORK",
      durationMinutes: 15,
      dueDate: new Date(Date.now() + 6 * 86400000),
      maxAttempts: 3,
      enableProctoring: false,
      createdById: teacher.id,
    },
  });

  await prisma.assignmentClass.upsert({
    where: { id: "ac-speaking-part2-01" },
    update: {},
    create: {
      id: "ac-speaking-part2-01",
      assignmentId: speakingAssignment.id,
      classId: cls.id,
      dueDate: new Date(Date.now() + 6 * 86400000),
      startDate: new Date(),
    },
  });

  await prisma.assignmentQuestion.upsert({
    where: { id: "q-speak-01" },
    update: {},
    create: {
      id: "q-speak-01",
      assignmentId: speakingAssignment.id,
      questionNumber: 1,
      orderIndex: 1,
      ieltsQuestionType: "PART_2",
      type: "SPEAKING_RECORD",
      points: 9.0,
      prompt: "Describe an environmental project or event that you found interesting. You should say: where it took place, what people did, why you found it interesting, and explain whether you think it was successful.",
    },
  });

  console.log("✔ Đã tạo bài tập Speaking Part 2 ở trạng thái đang mở (hạn nộp sau 6 ngày)");

  // =========================================================================
  // 6. NHẬN XÉT BÁO CÁO ĐỊNH KỲ (ReportComment)
  // =========================================================================
  console.log("--- 5. Tạo Nhận xét Báo cáo học tập (Cấp học sinh & Cấp lớp) ---");

  // Nhận xét riêng cho học sinh Nguyễn Văn An
  await prisma.reportComment.upsert({
    where: { id: "comment-student-an-01" },
    update: {},
    create: {
      id: "comment-student-an-01",
      scope: "STUDENT",
      classId: cls.id,
      studentId: student.id,
      periodKey: "30_DAYS",
      periodFrom: new Date(Date.now() - 30 * 86400000),
      periodTo: new Date(),
      authorId: teacher.id,
      content: "Em An có tinh thần học tập rất nghiêm túc và chủ động trong tháng vừa qua. Điểm kỹ năng Đọc (Band 8.0) và Nghe (Band 7.5) duy trì ổn định. Kỹ năng Viết Task 1 đạt Band 7.0 với Overview mạch lạc và lựa chọn số liệu tốt. Em tiếp tục duy trì và luyện thêm bài tập Speaking Part 2 nhé!",
      isReadByStudent: false,
    },
  });

  // Nhận xét chung cho lớp học
  await prisma.reportComment.upsert({
    where: { id: "comment-class-td01" },
    update: {},
    create: {
      id: "comment-class-td01",
      scope: "CLASS",
      classId: cls.id,
      studentId: null,
      periodKey: "30_DAYS",
      periodFrom: new Date(Date.now() - 30 * 86400000),
      periodTo: new Date(),
      authorId: teacher.id,
      content: "Cả lớp 10A1 hoàn thành tốt các bài tập tuần 1 và 2. Tỷ lệ nộp bài đạt 100%. Các em lưu ý hoàn thành bài Speaking Part 2 trước hạn chót để cô kịp nghe và phản hồi phát âm.",
      isReadByStudent: true,
    },
  });

  console.log("✔ Đã tạo 2 nhận xét đánh giá định kỳ từ giáo viên");
  console.log("\n=== HOÀN TẤT NẠP DỮ LIỆU THỬ NGHIỆM THÀNH CÔNG! ===");
}

main()
  .catch((e) => {
    console.error("Lỗi khi nạp dữ liệu bài tập & báo cáo:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
