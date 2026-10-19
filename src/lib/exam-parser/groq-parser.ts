import {
  GroqPartOutputSchema,
  ParsedExamResult,
  ParsedQuestion,
  ParsedSection,
  QuestionTypeEnum,
} from "./types";
import { splitIntoExamParts } from "./extract-text";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const ACTIVE_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

const SYSTEM_PROMPT = `Bạn là bộ máy bóc tách đề thi IELTS chuyên nghiệp sang định dạng Ebook 2 Cột tương tác.
Nhiệm vụ của bạn là đọc văn bản một phần đề thi IELTS và trích xuất CHÍNH XÁC danh sách câu hỏi sang JSON.

CÁC NGUYÊN TẮC BẮT BUỘC:
1. TIẾT KIỆM TOKEN & BẢO TOÀN BÀI ĐỌC GỐC:
   - Trường "passageText":
     + Với bài READING dài: Để tránh tràn bộ nhớ JSON, chỉ cần đặt "passageText": "" và điền chính xác dòng tiêu đề bắt đầu khu vực câu hỏi vào "questionStartMarker" (ví dụ: "Questions 1-6" hoặc "Questions 1–13"). Hệ thống sẽ tự động cắt nguyên văn 100% bài đọc phía trên marker đó cho Cột 1!
     + Với bài LISTENING (Form/Note/Table completion), WRITING hoặc SPEAKING: Chép nguyên văn nội dung biểu mẫu / đề bài vào "passageText".
2. TÁCH CÂU HỎI CHÍNH XÁC (Cột 2 Ebook):
   - Trích xuất TẤT CẢ các câu hỏi xuất hiện trong văn bản vào mảng "questions" theo đúng "questionNumber".
   - Giữ nguyên nội dung câu hỏi trong "prompt". Nếu là câu điền từ vào chỗ trống, biểu diễn chỗ trống bằng "_______" kèm quy tắc giới hạn từ nếu có (ví dụ: "(ONE WORD ONLY)" hoặc "(NO MORE THAN TWO WORDS AND/OR A NUMBER)").
   - Nếu là bài Writing Task 1 / Task 2 mà không đánh số câu hỏi con, tạo 1 câu hỏi loại "ESSAY" với prompt là yêu cầu viết bài.
   - Nếu là bài Speaking Cue Card / Part 1-2-3, tạo các câu hỏi loại "SPEAKING_RECORD".
3. PHÂN LOẠI ĐÚNG "type" CỦA TỪNG CÂU HỎI (chỉ dùng 1 trong 6 giá trị sau):
   - "TRUE_FALSE_NG": Câu hỏi True/False/Not Given hoặc Yes/No/Not Given.
   - "MULTIPLE_CHOICE": Câu hỏi trắc nghiệm chọn 1 đáp án (A, B, C, D). Phải trích xuất đầy đủ mảng "options" gồm [{"optionLabel": "A", "content": "..."}, ...].
   - "MULTIPLE_CHOICE_MULTI": Câu hỏi chọn nhiều đáp án (Choose TWO letters A-E).
   - "FILL_IN_BLANK": Câu hỏi điền từ vào chỗ trống, hoàn thành câu/bảng/biểu mẫu (Form/Note/Table/Sentence/Summary completion), trả lời ngắn (Short-answer), nối thông tin/tiêu đề (Matching Headings/Information/Features), hoặc dán nhãn bản đồ/biểu đồ (Map/Diagram labelling).
   - "ESSAY": Bài viết IELTS Writing.
   - "SPEAKING_RECORD": Bài nói IELTS Speaking.

Định dạng JSON trả về BẮT BUỘC:
{
  "partTitle": "Tiêu đề phần thi (ví dụ: Reading Passage 1: Urban Beekeeping)",
  "skill": "READING" | "LISTENING" | "WRITING" | "SPEAKING",
  "questionStartMarker": "Dòng bắt đầu phần câu hỏi trong văn bản gốc (ví dụ: Questions 1-6)",
  "passageText": "Nội dung bài đọc/biểu mẫu (có thể để rỗng nếu đã có questionStartMarker)",
  "questions": [
    {
      "questionNumber": 1,
      "prompt": "Nội dung câu hỏi số 1...",
      "type": "TRUE_FALSE_NG" | "MULTIPLE_CHOICE" | "MULTIPLE_CHOICE_MULTI" | "FILL_IN_BLANK" | "ESSAY" | "SPEAKING_RECORD",
      "options": [
        { "optionLabel": "A", "content": "Nội dung lựa chọn A" }
      ],
      "explanation": "Ghi chú hướng dẫn làm bài (ví dụ: Write ONE WORD ONLY / Paragraph A)"
    }
  ]
}`;

/**
 * Tự động dọn thẻ markdown và khôi phục JSON nếu bị cắt ngang ở cuối
 */
function safeParseAndRepairJson(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?([\s\S]*?)```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    // Nếu JSON bị cắt cụt ở cuối mảng questions, tìm dấu đóng `}` hợp lệ cuối cùng của một phần tử question
    const lastQuestionEnd = cleaned.lastIndexOf("}");
    if (lastQuestionEnd > 0) {
      const candidates = [
        cleaned.slice(0, lastQuestionEnd + 1) + "]}",
        cleaned.slice(0, lastQuestionEnd + 1) + "]} }",
      ];
      for (const candidate of candidates) {
        try {
          return JSON.parse(candidate);
        } catch {
          // thử tiếp
        }
      }
    }
    throw new Error("Không thể phân tích cú pháp JSON từ AI");
  }
}

/**
 * Cắt nguyên văn bài đọc (passageText) từ văn bản gốc để đảm bảo không mất 1 chữ nào ở Cột 1
 */
function extractVerbatimPassage(
  partContent: string,
  aiPassageText?: string,
  questionStartMarker?: string
): string {
  if (questionStartMarker && questionStartMarker.trim().length >= 5) {
    const marker = questionStartMarker.trim();
    const idx = partContent.toLowerCase().indexOf(marker.toLowerCase());
    if (idx > 150) {
      return partContent.slice(0, idx).trim();
    }
  }

  // Tìm mốc "Questions 1-..." hoặc "Questions 14-..." tự nhiên trong văn bản
  const qHeaderMatch = partContent.match(
    /\n(?=(?:Questions?\s+\d+\s*[–\-\–to]+\s*\d+|Questions?\s+\d+\b|SECTION\s+QUESTIONS))/i
  );
  if (qHeaderMatch && qHeaderMatch.index && qHeaderMatch.index > 150) {
    return partContent.slice(0, qHeaderMatch.index).trim();
  }

  if (aiPassageText && aiPassageText.trim().length > 80) {
    return aiPassageText.trim();
  }

  return partContent;
}

/**
 * Gọi Groq AI cho 1 phần đề thi qua chuỗi model chuẩn (openai/gpt-oss-120b -> qwen/qwen3.8-27b -> openai/gpt-oss-20b)
 */
async function callGroqForPart(
  partContent: string,
  defaultSkill: string,
  apiKey: string
): Promise<any> {
  const userMessage = `Kỹ năng mặc định giáo viên chọn: ${defaultSkill}.
Hãy bóc tách văn bản đề thi dưới đây thành JSON chuẩn cho Ebook 2 cột:

--- BẮT ĐẦU VĂN BẢN ĐỀ THI ---
${partContent}
--- KẾT THÚC VĂN BẢN ĐỀ THI ---`;

  let lastError = "";

  for (const model of ACTIVE_MODELS) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 6000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        lastError = errBody?.error?.message || `Groq HTTP ${response.status}`;
        if (response.status === 401 || response.status === 403) {
          throw new Error("GROQ_API_KEY không hợp lệ hoặc đã hết hạn!");
        }
        continue;
      }

      const data = await response.json();
      const rawJson = data?.choices?.[0]?.message?.content || "";
      if (!rawJson) {
        lastError = "Groq AI trả về nội dung rỗng";
        continue;
      }

      const parsed = safeParseAndRepairJson(rawJson);
      const validated = GroqPartOutputSchema.safeParse(parsed);
      if (validated.success) {
        return { ...validated.data, questionStartMarker: parsed.questionStartMarker };
      }
      return parsed;
    } catch (err: any) {
      lastError = err.message || "Lỗi kết nối Groq API";
      if (lastError.includes("GROQ_API_KEY không hợp lệ")) {
        throw err;
      }
    }
  }

  throw new Error(lastError || "Không thể gọi dịch vụ AI bóc tách đề thi");
}

/**
 * Chuẩn hóa một câu hỏi từ đầu ra AI sang đúng chuẩn giao diện Ebook 2 cột
 */
function normalizeQuestion(
  rawQ: any,
  fallbackNumber: number,
  partTitle: string,
  skill: string
): ParsedQuestion {
  const rawType = String(rawQ?.type || "FILL_IN_BLANK")
    .trim()
    .toUpperCase();

  let normalizedType: ParsedQuestion["type"] = "FILL_IN_BLANK";
  if (QuestionTypeEnum.options.includes(rawType as any)) {
    normalizedType = rawType as ParsedQuestion["type"];
  } else if (rawType.includes("TRUE") || rawType.includes("FALSE") || rawType.includes("YES")) {
    normalizedType = "TRUE_FALSE_NG";
  } else if (rawType.includes("MULTI") && rawType.includes("SELECT")) {
    normalizedType = "MULTIPLE_CHOICE_MULTI";
  } else if (rawType.includes("CHOICE") || rawType.includes("MCQ")) {
    normalizedType = "MULTIPLE_CHOICE";
  } else if (rawType.includes("ESSAY") || rawType.includes("WRITING")) {
    normalizedType = "ESSAY";
  } else if (rawType.includes("SPEAK")) {
    normalizedType = "SPEAKING_RECORD";
  }

  let options: ParsedQuestion["options"] = [];
  let defaultAnswer = "";

  if (normalizedType === "TRUE_FALSE_NG") {
    options = [
      { optionLabel: "A", content: "TRUE", isCorrect: false },
      { optionLabel: "B", content: "FALSE", isCorrect: false },
      { optionLabel: "C", content: "NOT GIVEN", isCorrect: false },
    ];
    defaultAnswer = "TRUE";
  } else if (
    normalizedType === "MULTIPLE_CHOICE" ||
    normalizedType === "MULTIPLE_CHOICE_MULTI"
  ) {
    const rawOpts = Array.isArray(rawQ?.options) ? rawQ.options : [];
    if (rawOpts.length >= 2) {
      const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
      options = rawOpts.map((opt: any, idx: number) => {
        const cleanLabel =
          String(opt?.optionLabel || labels[idx] || String.fromCharCode(65 + idx))
            .replace(/[^A-Za-z]/g, "")
            .toUpperCase() || labels[idx];
        const cleanContent = String(opt?.content || "")
          .replace(/^[A-H][\.\)\-\:]\s*/i, "")
          .trim();
        return {
          optionLabel: cleanLabel,
          content: cleanContent || `Lựa chọn ${cleanLabel}`,
          isCorrect: idx === 0,
        };
      });
    } else {
      options = [
        { optionLabel: "A", content: "Lựa chọn A", isCorrect: true },
        { optionLabel: "B", content: "Lựa chọn B", isCorrect: false },
        { optionLabel: "C", content: "Lựa chọn C", isCorrect: false },
        { optionLabel: "D", content: "Lựa chọn D", isCorrect: false },
      ];
    }
    defaultAnswer = options[0]?.optionLabel || "A";
  }

  const qNum =
    typeof rawQ?.questionNumber === "number" && rawQ.questionNumber > 0
      ? rawQ.questionNumber
      : fallbackNumber;

  const promptText =
    String(rawQ?.prompt || "").trim() ||
    (normalizedType === "ESSAY"
      ? "Viết bài luận hoàn chỉnh tối thiểu 250 từ theo chủ đề ở cột bài đọc."
      : normalizedType === "SPEAKING_RECORD"
      ? "Ghi âm bài nói theo chủ đề Cue Card ở cột bên trái."
      : `Câu hỏi số ${qNum}`);

  const points =
    normalizedType === "ESSAY" || normalizedType === "SPEAKING_RECORD"
      ? 9.0
      : 1.0;

  return {
    questionNumber: qNum,
    passageText: partTitle || `Phần ${skill}`,
    prompt: promptText,
    type: normalizedType,
    points,
    correctAnswer: defaultAnswer,
    explanation:
      String(rawQ?.explanation || "").trim() ||
      "Đối chiếu nội dung đề bài và nạp file Excel đáp án để chấm điểm tự động.",
    options,
  };
}

/**
 * Phương án dự phòng bằng quy tắc (Rule-based Fallback) khi không có kết nối AI
 * Hỗ trợ đầy đủ: [Question N], (1) ..., 1. ..., câu hỏi điền từ trong dòng và trắc nghiệm A-D
 */
export function fallbackRuleBasedParse(
  partTitle: string,
  partContent: string,
  skill: "READING" | "LISTENING" | "WRITING" | "SPEAKING",
  startNumber: number
): { passageText: string; questions: ParsedQuestion[] } {
  if (skill === "WRITING") {
    return {
      passageText: partContent,
      questions: [
        {
          questionNumber: startNumber,
          passageText: partTitle,
          prompt: "Viết bài luận hoàn chỉnh theo yêu cầu đề bài ở cột bên trái.",
          type: "ESSAY",
          points: 9.0,
          correctAnswer: "",
          explanation:
            "Chấm điểm theo 4 tiêu chí IELTS Writing: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.",
          options: [],
        },
      ],
    };
  }

  if (skill === "SPEAKING") {
    return {
      passageText: partContent,
      questions: [
        {
          questionNumber: startNumber,
          passageText: partTitle,
          prompt: "Ghi âm phần trả lời Speaking theo gợi ý ở cột bên trái.",
          type: "SPEAKING_RECORD",
          points: 9.0,
          correctAnswer: "",
          explanation:
            "Chấm điểm theo 4 tiêu chí IELTS Speaking: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation.",
          options: [],
        },
      ],
    };
  }

  const passageText = extractVerbatimPassage(partContent);
  const qSplitMatch = partContent.match(
    /\n(?=(?:Questions?\s+\d+|SECTION\s+QUESTIONS))/i
  );
  const questionZone =
    qSplitMatch && qSplitMatch.index
      ? partContent.slice(qSplitMatch.index).trim()
      : partContent;

  const questions: ParsedQuestion[] = [];
  const lines = questionZone.split("\n");
  let currentSubZoneIsTfng = /TRUE\s*\/?\s*FALSE\s*\/?\s*NOT\s+GIVEN|YES\s*\/?\s*NO\s*\/?\s*NOT\s+GIVEN/i.test(
    questionZone
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (/^Questions?\s+\d+/i.test(line)) {
      const lookahead = lines.slice(i, i + 6).join(" ");
      currentSubZoneIsTfng =
        /TRUE\s*\/?\s*FALSE\s*\/?\s*NOT\s+GIVEN|YES\s*\/?\s*NO\s*\/?\s*NOT\s+GIVEN/i.test(
          lookahead
        );
      continue;
    }

    const bracketMatch = line.match(/^(.*)\[(?:Question\s*)?(\d{1,2})\](.*)$/i);
    const inlineBlankMatch = line.match(
      /^(.*?)(\d{1,2})\s*(?:_{2,}|\.{3,})(.*)$/
    );
    const numMatch = line.match(/^(?:\()?(\d{1,2})(?:[\.\)]\s*|\s{1,3})(?=[A-Z0-9"'])(.+)$/);

    if (bracketMatch) {
      const qNum = parseInt(bracketMatch[2], 10);
      const prompt = line.replace(/\[(?:Question\s*)?\d{1,2}\]/gi, "_______");
      questions.push(
        normalizeQuestion(
          { questionNumber: qNum, prompt, type: "FILL_IN_BLANK" },
          startNumber + questions.length,
          partTitle,
          skill
        )
      );
    } else if (inlineBlankMatch && !numMatch) {
      const qNum = parseInt(inlineBlankMatch[2], 10);
      const prompt = `${inlineBlankMatch[1].trim()} (${qNum}) _______ ${inlineBlankMatch[3].trim()}`.trim();
      questions.push(
        normalizeQuestion(
          { questionNumber: qNum, prompt, type: "FILL_IN_BLANK" },
          startNumber + questions.length,
          partTitle,
          skill
        )
      );
    } else if (numMatch && parseInt(numMatch[1], 10) >= 1 && parseInt(numMatch[1], 10) <= 40) {
      const qNum = parseInt(numMatch[1], 10);
      const prompt = numMatch[2].trim();

      const opts: Array<{ optionLabel: string; content: string }> = [];
      let j = i + 1;
      while (j < lines.length) {
        const optMatch = lines[j].trim().match(/^([A-H])[\.\)]\s+(.+)$/);
        if (optMatch) {
          opts.push({
            optionLabel: optMatch[1].toUpperCase(),
            content: optMatch[2].trim(),
          });
          j++;
        } else {
          break;
        }
      }

      if (opts.length >= 2) {
        i = j - 1;
        questions.push(
          normalizeQuestion(
            {
              questionNumber: qNum,
              prompt,
              type: "MULTIPLE_CHOICE",
              options: opts,
            },
            startNumber + questions.length,
            partTitle,
            skill
          )
        );
      } else {
        const qType = /_{2,}|\.{3,}/.test(prompt)
          ? "FILL_IN_BLANK"
          : currentSubZoneIsTfng
          ? "TRUE_FALSE_NG"
          : "FILL_IN_BLANK";
        questions.push(
          normalizeQuestion(
            { questionNumber: qNum, prompt, type: qType },
            startNumber + questions.length,
            partTitle,
            skill
          )
        );
      }
    }
  }

  if (questions.length === 0) {
    questions.push(
      normalizeQuestion(
        {
          questionNumber: startNumber,
          prompt:
            "Câu hỏi số 1 (Giáo viên có thể chỉnh sửa hoặc bấm + Thêm câu hỏi mới)",
          type: "FILL_IN_BLANK",
        },
        startNumber,
        partTitle,
        skill
      )
    );
  }

  return { passageText, questions };
}

/**
 * Pipeline chính: Bóc tách văn bản đề thi đã dọn sạch thành cấu trúc Ebook 2 Cột bằng Groq AI
 */
export async function parseExamTextWithGroq(params: {
  title: string;
  skill: string;
  durationMinutes: number;
  audioUrl: string | null;
  cleanedText: string;
}): Promise<ParsedExamResult> {
  const { title, skill, durationMinutes, audioUrl, cleanedText } = params;
  const apiKey = (process.env.GROQ_API_KEY || "").trim();

  const rawParts = splitIntoExamParts(cleanedText);
  const sections: ParsedSection[] = [];
  const allQuestions: ParsedQuestion[] = [];
  const warnings: string[] = [];

  let runningQuestionNum = 1;

  for (let idx = 0; idx < rawParts.length; idx++) {
    const part = rawParts[idx];
    const effectiveSkill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" =
      skill === "ALL_SKILLS"
        ? part.detectedSkill || "READING"
        : (skill as any) || "READING";

    let partTitle = part.title || `${title} - Phần ${idx + 1}`;
    let passageText = extractVerbatimPassage(part.content);
    let partQuestions: ParsedQuestion[] = [];

    if (apiKey) {
      try {
        const aiResult = await callGroqForPart(part.content, effectiveSkill, apiKey);
        if (aiResult) {
          partTitle = aiResult.partTitle?.trim() || partTitle;
          passageText = extractVerbatimPassage(
            part.content,
            aiResult.passageText,
            aiResult.questionStartMarker
          );
          const rawQuestions = Array.isArray(aiResult.questions)
            ? aiResult.questions
            : [];

          partQuestions = rawQuestions.map((rq: any, qIdx: number) =>
            normalizeQuestion(
              rq,
              runningQuestionNum + qIdx,
              partTitle,
              effectiveSkill
            )
          );
        }
      } catch (err: any) {
        console.warn(`[parseExamTextWithGroq] Fallback cho phần ${idx + 1}:`, err.message);
        warnings.push(
          `Phần ${idx + 1}: Đã dùng bộ phân tích quy tắc dự phòng (${err.message}).`
        );
      }
    }

    if (partQuestions.length === 0) {
      const fallback = fallbackRuleBasedParse(
        partTitle,
        part.content,
        effectiveSkill,
        runningQuestionNum
      );
      passageText = fallback.passageText;
      partQuestions = fallback.questions;
    }

    // Đảm bảo số thứ tự câu hỏi không bị trùng lặp trên toàn đề và gán đầy đủ nội dung bài đọc (passageText) vào từng câu hỏi
    const usedNums = new Set(allQuestions.map((q) => q.questionNumber));
    partQuestions = partQuestions.map((q) => {
      let num = q.questionNumber;
      if (usedNums.has(num) || num <= 0) {
        num = runningQuestionNum;
      }
      usedNums.add(num);
      runningQuestionNum = Math.max(runningQuestionNum, num + 1);
      return {
        ...q,
        questionNumber: num,
        passageText: passageText || q.passageText || partTitle,
      };
    });

    allQuestions.push(...partQuestions);

    const sectionSkill = effectiveSkill;
    const secId = `${sectionSkill.toLowerCase()}_${idx + 1}`;
    sections.push({
      id: secId,
      key: `${sectionSkill}_${idx + 1}`,
      skill: sectionSkill,
      title: partTitle.includes(title) ? partTitle : `${title} - ${partTitle}`,
      durationMinutes: Math.max(
        15,
        Math.round(durationMinutes / Math.max(1, rawParts.length))
      ),
      audioUrl: sectionSkill === "LISTENING" ? audioUrl : null,
      passageText,
      questions: partQuestions,
    });
  }

  return {
    title,
    skill,
    durationMinutes,
    audioUrl,
    passageText: sections[0]?.passageText || cleanedText,
    questions: allQuestions,
    sections: sections.length > 1 || skill === "ALL_SKILLS" ? sections : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
