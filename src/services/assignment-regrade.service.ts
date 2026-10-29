import { prisma, isDbAlive } from "@/lib/prisma";
import { isAnswerCorrect, isObjectiveOnly, isObjectiveType } from "@/lib/grading";

const globalAssignmentsStore = globalThis as unknown as {
  demoAssignments?: any[];
};

/**
 * Tự động chấm lại toàn bộ bài nộp trắc nghiệm khi Giáo viên/Admin sửa đáp án
 * Bảo toàn trạng thái SUBMITTED của bài có câu tự luận/nói chưa chấm xong (BR-07, BR-08, BR-13).
 */
export async function regradeAssignmentSubmissionsService(
  assignmentId: string,
  classId?: string
): Promise<{
  success: boolean;
  regradedCount: number;
  message?: string;
  error?: string;
}> {
  if (!(await isDbAlive())) {
    const assign = (globalAssignmentsStore.demoAssignments || []).find(
      (a: any) => a.id === assignmentId
    );
    if (!assign) {
      return { success: false, regradedCount: 0, error: "Không tìm thấy bài tập để chấm lại!" };
    }

    const objectiveOnly = isObjectiveOnly(assign.questions || []);
    let count = 0;
    const submissions = (assign.submissions || []).filter((s: any) => {
      if (!classId) return true;
      return !s.classId || s.classId === classId;
    });

    for (const sub of submissions) {
      let totalScore = 0;
      for (const ans of sub.answers || []) {
        const q = (assign.questions || []).find(
          (quest: any) =>
            quest.id === ans.questionId || quest.questionNumber === ans.questionNumber
        );
        if (q && isObjectiveType(q.type || q.questionType)) {
          const isCorrect = isAnswerCorrect(q.correctAnswer, ans.studentAnswer);
          ans.isCorrect = isCorrect;
          ans.awardedPoints = isCorrect ? Number(q.points) || 1 : 0;
          totalScore += ans.awardedPoints;
        } else if (typeof ans.awardedPoints === "number") {
          totalScore += ans.awardedPoints;
        }
      }
      if (objectiveOnly || sub.status === "GRADED") {
        sub.score = totalScore;
        sub.status = "GRADED";
      }
      count++;
    }

    return {
      success: true,
      regradedCount: count,
      message: `Đã chấm lại thành công ${count} bài nộp theo đáp án mới nhất!`,
    };
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });

  if (!assignment) {
    return { success: false, regradedCount: 0, error: "Không tìm thấy bài tập để chấm lại!" };
  }

  const objectiveOnly = isObjectiveOnly(assignment.questions);

  const whereSubmissions: any = {
    assignmentId,
  };
  if (classId) {
    whereSubmissions.OR = [{ classId }, { classId: null }];
  }

  const submissions = await prisma.assignmentSubmission.findMany({
    where: whereSubmissions,
    include: {
      answers: true,
    },
  });

  if (submissions.length === 0) {
    return {
      success: true,
      regradedCount: 0,
      message: "Chưa có bài nộp nào cần chấm lại.",
    };
  }

  let count = 0;
  for (const sub of submissions) {
    let recalculatedScore = 0;
    for (const ans of sub.answers) {
      const q = assignment.questions.find((quest) => quest.id === ans.questionId);
      if (q && isObjectiveType(q.type)) {
        const isCorrect = isAnswerCorrect(q.correctAnswer, ans.studentAnswer);
        const awardedPoints = isCorrect ? q.points : 0;
        await prisma.submissionAnswer.update({
          where: { id: ans.id },
          data: {
            isCorrect,
            awardedPoints,
          },
        });
        recalculatedScore += awardedPoints;
      } else if (typeof ans.awardedPoints === "number") {
        recalculatedScore += ans.awardedPoints;
      }
    }

    const shouldBeGraded = objectiveOnly || sub.status === "GRADED";
    await prisma.assignmentSubmission.update({
      where: { id: sub.id },
      data: {
        score: shouldBeGraded ? recalculatedScore : null,
        status: shouldBeGraded ? "GRADED" : "SUBMITTED",
      },
    });
    count++;
  }

  return {
    success: true,
    regradedCount: count,
    message: `Đã chấm lại thành công ${count} bài nộp trắc nghiệm theo đáp án mới!`,
  };
}
