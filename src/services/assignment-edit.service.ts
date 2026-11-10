import { prisma, isDbAlive } from "@/lib/prisma";
import type { AssignmentEditInput } from "@/lib/validations/assignment-edit";

/**
 * Sửa bài tập AN TOÀN cho dữ liệu bài làm:
 * - Câu hỏi cũ được cập nhật tại chỗ (giữ nguyên id) nên không mất bài làm của học viên.
 * - Câu hỏi đã có học viên làm bài thì KHÔNG được xóa.
 * - Toàn bộ chạy trong 1 transaction: lỗi ở đâu thì không lưu gì.
 */

class EditRuleError extends Error {}

function readInstruction(description: string | null): { instruction: string; meta: any | null } {
  if (description && description.startsWith("{")) {
    try {
      const meta = JSON.parse(description);
      return { instruction: typeof meta?.instruction === "string" ? meta.instruction : "", meta };
    } catch {
      /* mô tả thường, không phải JSON */
    }
  }
  return { instruction: description || "", meta: null };
}

const norm = (v: string | null | undefined) => (v ?? "").trim();

/** Nạp dữ liệu hiện tại của bài tập để đưa vào form chỉnh sửa. */
export async function getAssignmentForEditService(assignmentId: string) {
  if (!(await isDbAlive())) {
    return { success: false as const, error: "Hệ thống đang bảo trì CSDL, chưa thể mở bài tập để sửa!" };
  }
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      assignedClasses: {
        where: { isActive: true },
        include: { class: { select: { id: true, name: true, code: true } } },
      },
      questions: {
        orderBy: { orderIndex: "asc" },
        include: {
          options: { orderBy: { optionLabel: "asc" } },
          _count: { select: { submissionAnswers: true } },
        },
      },
      _count: { select: { submissions: true } },
    },
  });
  if (!a || !a.isActive) return { success: false as const, error: "Không tìm thấy bài tập!" };

  return {
    success: true as const,
    assignment: {
      id: a.id,
      title: a.title,
      skill: a.skill,
      instruction: readInstruction(a.description).instruction,
      durationMinutes: a.durationMinutes,
      updatedAt: a.updatedAt.toISOString(),
      submissionCount: a._count.submissions,
      classes: a.assignedClasses.map((ac) => ({
        classId: ac.classId,
        name: ac.class.name,
        code: ac.class.code,
        startDate: ac.startDate ? ac.startDate.toISOString() : null,
        dueDate: ac.dueDate ? ac.dueDate.toISOString() : null,
      })),
      questions: a.questions.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        prompt: q.prompt,
        passageText: q.passageText,
        type: q.type,
        ieltsQuestionType: q.ieltsQuestionType,
        groupTitle: q.groupTitle,
        points: q.points,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        answerCount: q._count.submissionAnswers,
        options: q.options.map((o) => ({
          optionLabel: o.optionLabel,
          content: o.content,
          isCorrect: o.isCorrect,
        })),
      })),
    },
  };
}

export async function updateAssignmentSafeService(
  data: AssignmentEditInput
): Promise<{
  success: boolean;
  needsRegrade?: boolean;
  submissionCount?: number;
  message?: string;
  error?: string;
}> {
  if (!(await isDbAlive())) {
    return { success: false, error: "Hệ thống đang bảo trì CSDL, chưa thể lưu thay đổi!" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.assignment.findUnique({
        where: { id: data.assignmentId },
        include: {
          questions: {
            include: { options: true, _count: { select: { submissionAnswers: true } } },
          },
          _count: { select: { submissions: true } },
        },
      });
      if (!current || !current.isActive) throw new EditRuleError("Không tìm thấy bài tập!");

      if (data.expectedUpdatedAt && current.updatedAt.toISOString() !== data.expectedUpdatedAt) {
        throw new EditRuleError(
          "Bài tập vừa được người khác chỉnh sửa. Vui lòng đóng form, mở lại để lấy bản mới nhất rồi sửa tiếp!"
        );
      }

      let needsRegrade = false;

      if (data.questions) {
        const existing = new Map(current.questions.map((q) => [q.id, q]));
        const keptIds = new Set<string>();

        for (const q of data.questions) {
          if (q.id) {
            if (!existing.has(q.id)) {
              throw new EditRuleError("Có câu hỏi không thuộc bài tập này, vui lòng tải lại trang!");
            }
            keptIds.add(q.id);
          }
        }

        // 1) Câu bị gỡ khỏi đề: chỉ được xóa khi chưa có bài làm
        for (const old of current.questions) {
          if (keptIds.has(old.id)) continue;
          if (old._count.submissionAnswers > 0) {
            throw new EditRuleError(
              `Câu hỏi số ${old.questionNumber} đã có học viên làm bài, không thể xóa. Hãy sửa nội dung câu hỏi thay vì xóa!`
            );
          }
          await tx.assignmentQuestion.delete({ where: { id: old.id } });
        }

        // 2) Cập nhật tại chỗ câu cũ, tạo mới câu thêm
        let nextNumber = current.questions.reduce((m, q) => Math.max(m, q.questionNumber), 0) + 1;
        for (let idx = 0; idx < data.questions.length; idx++) {
          const q = data.questions[idx];
          const options = (q.options || []).map((o) => ({
            optionLabel: o.optionLabel,
            content: o.content,
            isCorrect: o.isCorrect,
          }));
          const base = {
            passageText: norm(q.passageText) || null,
            prompt: q.prompt.trim(),
            type: q.type,
            ieltsQuestionType: q.ieltsQuestionType ?? null,
            groupTitle: norm(q.groupTitle) || null,
            points: q.points,
            correctAnswer: norm(q.correctAnswer) || null,
            explanation: norm(q.explanation) || null,
            orderIndex: idx,
          };

          if (q.id) {
            const old = existing.get(q.id)!;
            if (old._count.submissionAnswers > 0) {
              const optKey = (list: { optionLabel: string; content: string; isCorrect: boolean }[]) =>
                JSON.stringify(
                  [...list]
                    .map((o) => [o.optionLabel, o.content.trim(), o.isCorrect])
                    .sort((x, y) => String(x[0]).localeCompare(String(y[0])))
                );
              if (
                norm(old.correctAnswer) !== norm(base.correctAnswer) ||
                old.points !== base.points ||
                old.type !== base.type ||
                optKey(old.options) !== optKey(options)
              ) {
                needsRegrade = true;
              }
            }
            await tx.assignmentQuestion.update({ where: { id: q.id }, data: base });
            await tx.questionOption.deleteMany({ where: { questionId: q.id } });
            if (options.length > 0) {
              await tx.questionOption.createMany({
                data: options.map((o) => ({ ...o, questionId: q.id! })),
              });
            }
          } else {
            await tx.assignmentQuestion.create({
              data: {
                ...base,
                assignmentId: data.assignmentId,
                questionNumber: nextNumber++,
                options: options.length > 0 ? { create: options } : undefined,
              },
            });
          }
        }
      }

      // 3) Hạn nộp / thời điểm bắt đầu theo từng lớp
      for (const c of data.classSchedules || []) {
        const res = await tx.assignmentClass.updateMany({
          where: { assignmentId: data.assignmentId, classId: c.classId, isActive: true },
          data: {
            startDate: c.startDate ? new Date(c.startDate) : null,
            dueDate: c.dueDate ? new Date(c.dueDate) : null,
          },
        });
        if (res.count === 0) throw new EditRuleError("Lớp được chọn không còn được giao bài tập này!");
      }

      // 4) Thông tin chung. Nếu mô tả đang là JSON cấu trúc đề thì chỉ sửa trường instruction.
      const updateData: Record<string, unknown> = { title: data.title.trim() };
      if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
      if (data.instruction !== undefined) {
        const { meta } = readInstruction(current.description);
        const text = data.instruction?.trim() || "";
        updateData.description = meta ? JSON.stringify({ ...meta, instruction: text }) : text || null;
      }
      await tx.assignment.update({ where: { id: data.assignmentId }, data: updateData });

      return {
        success: true,
        needsRegrade,
        submissionCount: current._count.submissions,
        message: "Cập nhật bài tập thành công!",
      };
    }, { timeout: 30000, maxWait: 10000 });
  } catch (err: any) {
    if (err instanceof EditRuleError) return { success: false, error: err.message };
    console.error("[updateAssignmentSafeService] Lỗi:", err);
    return { success: false, error: "Không thể lưu thay đổi, vui lòng thử lại!" };
  }
}
