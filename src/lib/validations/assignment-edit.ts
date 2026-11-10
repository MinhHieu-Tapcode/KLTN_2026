import { z } from "zod";
import { QuestionType } from "@prisma/client";

/**
 * Kiểm tra dữ liệu đầu vào cho nghiệp vụ "Tìm kiếm" và "Chỉnh sửa" bài tập.
 * Mọi thông báo lỗi hiển thị cho người dùng bằng tiếng Việt.
 */

const optionalDate = z
  .string()
  .nullable()
  .optional()
  .refine((v) => v == null || v === "" || !Number.isNaN(new Date(v).getTime()), {
    message: "Ngày giờ không hợp lệ!",
  });

export const assignmentSearchSchema = z.object({
  keyword: z.string().trim().max(100, "Từ khóa tối đa 100 ký tự!").optional(),
  classId: z.string().trim().optional(),
  skill: z.enum(["ALL_SKILLS", "READING", "LISTENING", "WRITING", "SPEAKING"]).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
});
export type AssignmentSearchInput = z.infer<typeof assignmentSearchSchema>;

const editOptionSchema = z.object({
  optionLabel: z.string().trim().min(1, "Thiếu nhãn đáp án!").max(10),
  content: z.string().trim().min(1, "Nội dung đáp án không được để trống!"),
  isCorrect: z.boolean(),
});

const editQuestionSchema = z.object({
  id: z.string().optional(), // Không có id = câu hỏi mới thêm
  prompt: z.string().trim().min(1, "Đề bài của câu hỏi không được để trống!"),
  passageText: z.string().nullable().optional(),
  type: z.nativeEnum(QuestionType, { errorMap: () => ({ message: "Dạng câu hỏi không hợp lệ!" }) }),
  ieltsQuestionType: z.string().nullable().optional(),
  groupTitle: z.string().nullable().optional(),
  points: z.number({ invalid_type_error: "Điểm câu hỏi phải là số!" }).min(0, "Điểm không được âm!").max(100, "Điểm tối đa 100!"),
  correctAnswer: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  options: z.array(editOptionSchema).max(10).optional(),
});

export const assignmentEditSchema = z
  .object({
    assignmentId: z.string().min(1, "Thiếu mã bài tập!"),
    /** Dấu thời gian lúc mở form, dùng phát hiện 2 người sửa cùng lúc */
    expectedUpdatedAt: z.string().optional(),
    title: z.string().trim().min(1, "Tiêu đề bài tập không được để trống!").max(200, "Tiêu đề tối đa 200 ký tự!"),
    /** Chỉ là phần hướng dẫn làm bài (instruction), không phải JSON cấu trúc đề */
    instruction: z.string().max(5000, "Hướng dẫn tối đa 5000 ký tự!").nullable().optional(),
    durationMinutes: z
      .number({ invalid_type_error: "Thời lượng phải là số!" })
      .int("Thời lượng phải là số nguyên!")
      .min(1, "Thời lượng tối thiểu 1 phút!")
      .max(600, "Thời lượng tối đa 600 phút!")
      .nullable()
      .optional(),
    classSchedules: z
      .array(
        z.object({
          classId: z.string().min(1),
          startDate: optionalDate,
          dueDate: optionalDate,
        })
      )
      .optional(),
    questions: z.array(editQuestionSchema).min(1, "Bài tập phải có ít nhất 1 câu hỏi!").optional(),
  })
  .superRefine((val, ctx) => {
    (val.classSchedules || []).forEach((c, i) => {
      if (c.startDate && c.dueDate && new Date(c.dueDate) <= new Date(c.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["classSchedules", i, "dueDate"],
          message: "Hạn nộp phải sau thời điểm bắt đầu!",
        });
      }
    });
  });
export type AssignmentEditInput = z.infer<typeof assignmentEditSchema>;
