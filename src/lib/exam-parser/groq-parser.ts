import {
  GroqPartOutputSchema,
  ParsedExamResult,
  ParsedQuestion,
  ParsedSection,
  QuestionTypeEnum,
} from "./types";
import { splitIntoExamParts } from "./extract-text";
import { executeWithGroqKeyPool, getGroqKeyPool } from "./groq-key-pool";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const ACTIVE_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

const SYSTEM_PROMPT = `Bạn là bộ máy bóc tách đề thi IELTS chuyên nghiệp sang định dạng Ebook 2 Cột tương tác.
Nhiệm vụ của bạn là đọc toàn bộ văn bản của một Phần thi IELTS và trích xuất TOÀN DIỆN, ĐẦY ĐỦ 100% tất cả các câu hỏi sang JSON.

CÁC NGUYÊN TẮC BẮT BUỘC:
1. TIẾT KIỆM TOKEN & BẢO TOÀN BÀI ĐỌC GỐC:
   - Trường "passageText":
     + Với bài READING: ĐỂ TRÁNH TRÀN BỘ NHỚ VÀ KHÔNG BỊ CẮT CỤT CÂU HỎI, BẮT BUỘC đặt "passageText": "" và điền chính xác dòng tiêu đề bắt đầu phần câu hỏi đầu tiên vào "questionStartMarker" (ví dụ: "Questions 1-4" hoặc "Questions 1–13"). Hệ thống sẽ tự động cắt nguyên văn 100% bài đọc phía trên marker đó cho Cột 1! Tuyệt đối KHÔNG sao chép lại bài đọc vào JSON.
     + Với bài LISTENING / WRITING / SPEAKING: Chép nội dung biểu mẫu / đề bài vào "passageText".
2. TÁCH TRỌN VẸN 100% CÂU HỎI (Cột 2 Ebook):
   - ĐẶC BIỆT CHÚ Ý DẠNG BẢNG BIỂU (Table Completion) hoặc Điền từ tóm tắt (Summary Completion):
     Các câu hỏi có thể nằm rải rác bên trong các ô của bảng (ví dụ: "Red wines use 5. _____ in fermentation | 6. _____") hoặc trên cùng 1 dòng (ví dụ: "9. _____ | Can allow 10. _____ to remain"). BẮT BUỘC PHẢI TRÍCH XUẤT TẤT CẢ CÁC SỐ CÂU HỎI ĐÓ (ví dụ có 5, 6, 7, 8, 9, 10 thì phải tạo đủ 6 phần tử question tương ứng với questionNumber: 5, 6, 7, 8, 9, 10). KHÔNG ĐƯỢC BỎ SÓT!
   - DẠNG TRUE/FALSE/NOT GIVEN hoặc YES/NO/NOT GIVEN:
     Bất cứ khi nào đề bài yêu cầu "agree/contradict", "TRUE/FALSE/NOT GIVEN" hay "YES/NO/NOT GIVEN" (ví dụ các câu nhận định 1-4: "Blended wines are usually cheaper."), BẮT BUỘC gán type = "TRUE_FALSE_NG".
   - DẠNG MULTIPLE CHOICE (Trắc nghiệm):
     Bắt buộc trích xuất đầy đủ mảng options: A, B, C, D... type = "MULTIPLE_CHOICE".
     ĐẶC BIỆT LƯU Ý: Các phương án có thể viết dạng "A mostly better." (chỉ có dấu cách sau chữ cái A, không có dấu chấm). Vẫn phải tách thành optionLabel: "A", content: "mostly better.".
   - TRƯỜNG "explanation": CHỈ ghi giải thích chi tiết đáp án nếu có trong lời giải. TUYỆT ĐỐI KHÔNG ghi lại câu chỉ dẫn làm bài (như "Choose the correct letter, A, B, C, or D.", "Do the following statements agree...", "Write NO MORE THAN..."). Nếu không có giải thích, để rỗng "".
   - Trích xuất ĐẦY ĐỦ từ câu đầu tiên đến câu cuối cùng của đề thi trong mảng "questions".

Định dạng JSON trả về BẮT BUỘC:
{
  "partTitle": "Tiêu đề phần thi (ví dụ: Reading Passage 1: Make That Wine)",
  "skill": "READING" | "LISTENING" | "WRITING" | "SPEAKING",
  "questionStartMarker": "Dòng bắt đầu phần câu hỏi đầu tiên trong văn bản (ví dụ: Questions 1-4)",
  "passageText": "Nội dung bài đọc/biểu mẫu (để rỗng \"\" đối với READING)",
  "matchingHeadings": {
    "title": "List of Headings",
    "instruction": "Choose the correct heading for each section from the list of headings below.",
    "headings": [{ "id": "1", "romanNumeral": "i", "text": "Heading text" }],
    "items": [{ "questionNumber": 1, "paragraphLabel": "Paragraph A" }]
  },
  "tables": [
    {
      "title": "Table Title",
      "instruction": "Complete the table below.",
      "headers": ["Col 1", "Col 2"],
      "rows": [["Cell 1", "Cell 2"]],
      "questionNumbers": [5, 6]
    }
  ],
  "summaries": [
    {
      "title": "Summary Title",
      "instruction": "Complete the summary below.",
      "summaryText": "Summary with (1) _______ and (2) _______",
      "questionNumbers": [1, 2]
    }
  ],
  "questions": [
    {
      "questionNumber": 1,
      "prompt": "Nội dung câu hỏi số 1...",
      "type": "TRUE_FALSE_NG" | "MULTIPLE_CHOICE" | "MULTIPLE_CHOICE_MULTI" | "FILL_IN_BLANK" | "ESSAY" | "SPEAKING_RECORD",
      "options": [
        { "optionLabel": "A", "content": "Nội dung lựa chọn A" }
      ],
      "explanation": "Giải thích chi tiết vì sao đáp án đúng (để rỗng \"\" nếu không có lời giải)"
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
    if (idx > 120) {
      return partContent.slice(0, idx).trim();
    }
  }

  // Tìm mốc "Questions 1-..." hoặc "Questions 14-..." tự nhiên trong văn bản
  const qHeaderMatch = partContent.match(
    /\n(?=(?:Questions?\s+\d+\s*[–\-\–to]+\s*\d+|Questions?\s+\d+\b|SECTION\s+QUESTIONS))/i
  );
  if (qHeaderMatch && qHeaderMatch.index && qHeaderMatch.index > 120) {
    return partContent.slice(0, qHeaderMatch.index).trim();
  }

  // Tìm mốc câu hỏi số 1: ví dụ "\n1. " hoặc "\n(1) "
  const firstQMatch = partContent.match(/\n(?=(?:\[?(?:Question\s*)?1[\.\)]\s|\(1\)\s))/i);
  if (firstQMatch && firstQMatch.index && firstQMatch.index > 120) {
    return partContent.slice(0, firstQMatch.index).trim();
  }

  if (aiPassageText && aiPassageText.trim().length > 80) {
    return aiPassageText.trim();
  }

  return partContent;
}

/**
 * Gọi Groq AI cho 1 phần đề thi qua Key Pool (xoay vòng + failover)
 */
async function callGroqForPart(
  partContent: string,
  defaultSkill: string,
  preferredKeyIdx?: number
): Promise<any> {
  // Tìm mốc bắt đầu khu vực câu hỏi (ví dụ Questions 1-4, Questions 14-26...)
  const qMarkerMatch = partContent.match(
    /\n(?=(?:Questions?\s+\d+\s*[–\-\–to]+\s*\d+|Questions?\s+\d+\b|SECTION\s+QUESTIONS))/i
  );
  
  // Tinh hoa: Chỉ gửi khối câu hỏi (questionBlock) cho Groq nếu tìm thấy mốc câu hỏi rõ ràng
  // Điều này giúp tiết kiệm 75% token, loại bỏ hoàn toàn nguy cơ chạm trần 8.000 TPM
  const isQuestionBlockSeparated = Boolean(qMarkerMatch && qMarkerMatch.index && qMarkerMatch.index > 150);
  const textToSend = isQuestionBlockSeparated
    ? partContent.slice(qMarkerMatch!.index).trim()
    : partContent;

  const userMessage = `Kỹ năng mặc định giáo viên chọn: ${defaultSkill}.
Hãy bóc tách danh sách câu hỏi đề thi dưới đây thành JSON chuẩn cho Ebook 2 cột:

--- BẮT ĐẦU PHẦN CÂU HỎI ĐỀ THI ---
${textToSend}
--- KẾT THÚC PHẦN CÂU HỎI ĐỀ THI ---`;

  // Đếm sơ bộ số câu hỏi đánh số rõ ràng trong văn bản để kiểm tra đối chiếu
  const questionMatches = textToSend.match(/(?:^|\n|\s)(\d{1,3})[\.\)]/g) || [];
  const expectedMinQuestions = Math.min(questionMatches.length, 40);

  return executeWithGroqKeyPool(async (apiKey) => {
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
            max_tokens: 8192,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMessage },
            ],
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          const errMsg = errBody?.error?.message || `Groq HTTP ${response.status}`;
          lastError = errMsg;

          if (response.status === 429) {
            throw new Error(`429 Rate Limit: ${errMsg}`);
          }
          if (response.status === 401 || response.status === 403) {
            throw new Error(`401/403 Invalid API Key: ${errMsg}`);
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
        const finalResult = validated.success
          ? {
              ...validated.data,
              questionStartMarker: parsed.questionStartMarker,
              matchingHeadings: parsed.matchingHeadings,
              tables: parsed.tables,
              summaries: parsed.summaries,
            }
          : parsed;

        const count = Array.isArray(finalResult?.questions) ? finalResult.questions.length : 0;
        // Kiểm tra đối chiếu số câu: Nếu văn bản gốc có 8+ câu đánh số mà AI trả về quá ít (<50%) -> ném lỗi để đổi key/model
        if (expectedMinQuestions >= 8 && count < Math.floor(expectedMinQuestions * 0.5)) {
          throw new Error(
            `AI chỉ trích xuất được ${count}/${expectedMinQuestions} câu hỏi. Đang đổi API key để phân tích lại.`
          );
        }

        return finalResult;
      } catch (err: any) {
        lastError = err.message || "Lỗi kết nối Groq API";
        if (
          lastError.includes("429") ||
          lastError.includes("Rate Limit") ||
          lastError.includes("Invalid API Key") ||
          lastError.includes("Đang đổi API key")
        ) {
          throw err;
        }
      }
    }

    throw new Error(lastError || "Không thể gọi dịch vụ AI bóc tách đề thi");
  }, preferredKeyIdx);
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
  const contextForType = `${rawQ?.prompt || ""} ${rawQ?.explanation || ""}`.toLowerCase();

  let normalizedType: ParsedQuestion["type"] = "FILL_IN_BLANK";
  if (
    rawType.includes("TRUE") ||
    rawType.includes("FALSE") ||
    rawType.includes("YES") ||
    rawType.includes("NOT_GIVEN") ||
    contextForType.includes("agree with the information") ||
    contextForType.includes("true if the statement") ||
    contextForType.includes("true/false/not given") ||
    contextForType.includes("yes/no/not given")
  ) {
    normalizedType = "TRUE_FALSE_NG";
  } else if (rawType.includes("MULTI") && rawType.includes("SELECT")) {
    normalizedType = "MULTIPLE_CHOICE_MULTI";
  } else if (
    rawType.includes("CHOICE") ||
    rawType.includes("MCQ") ||
    (Array.isArray(rawQ?.options) && rawQ.options.length >= 2)
  ) {
    normalizedType = "MULTIPLE_CHOICE";
  } else if (rawType.includes("ESSAY") || rawType.includes("WRITING")) {
    normalizedType = "ESSAY";
  } else if (rawType.includes("SPEAK")) {
    normalizedType = "SPEAKING_RECORD";
  } else if (QuestionTypeEnum.options.includes(rawType as any)) {
    normalizedType = rawType as ParsedQuestion["type"];
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

  let cleanExplanation = String(rawQ?.explanation || "").trim();
  if (
    /^(?:Do the following statements|Choose the correct letter|Complete the (?:table|flow chart|notes|summary)|Write NO MORE THAN|In boxes \d+)/i.test(
      cleanExplanation
    )
  ) {
    cleanExplanation = "";
  }

  return {
    questionNumber: qNum,
    passageText: partTitle || `Phần ${skill}`,
    prompt: promptText,
    type: normalizedType,
    points,
    correctAnswer: defaultAnswer,
    explanation:
      cleanExplanation ||
      (normalizedType === "TRUE_FALSE_NG"
        ? "Đọc kỹ bài đọc để đối chiếu nhận định là TRUE, FALSE hay NOT GIVEN."
        : normalizedType === "MULTIPLE_CHOICE"
        ? "Chọn phương án đúng nhất A, B, C hoặc D."
        : "Đối chiếu nội dung đề bài và nạp file Excel đáp án để chấm điểm tự động."),
    options,
  };
}

/**
 * Phương án dự phòng bằng quy tắc (Rule-based Fallback) khi không có kết nối AI
 * Mở rộng: Hỗ trợ trọn vẹn cả Table Completion, Matching Headings, True/False/Not Given
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

    // 1. Quét Table Completion: Bắt tất cả các ô chứa chỗ trống dạng "5. _____" hoặc "6. _____"
    const tableMatches = Array.from(
      line.matchAll(/(?:^|\||[:\s])(?:(?:\((\d{1,3})\)|\b(\d{1,3})[\.\)]?)\s*(?:_{2,}|\.{3,})|(?:_{2,}|\.{3,})\s*(?:\((\d{1,3})\)|\b(\d{1,3})[\.\)]?))/g)
    );
    if (tableMatches.length > 0) {
      for (const m of tableMatches) {
        const qNumStr = m[1] || m[2] || m[3] || m[4];
        if (qNumStr) {
          const qNum = parseInt(qNumStr, 10);
          if (qNum >= 1 && qNum <= 60 && !questions.some((q) => q.questionNumber === qNum)) {
            const prompt = line.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
            questions.push(
              normalizeQuestion(
                {
                  questionNumber: qNum,
                  prompt: `${prompt}`,
                  type: "FILL_IN_BLANK",
                },
                startNumber + questions.length,
                partTitle,
                skill
              )
            );
          }
        }
      }
      continue;
    }

    // 2. Dạng [Question N] hoặc [N]
    const bracketMatch = line.match(/^(.*)\[(?:Question\s*)?(\d{1,3})\](.*)$/i);
    // 3. Dạng inline blank: (1) _______ hoặc 1 _______
    const inlineBlankMatch = line.match(
      /^(.*?)(\d{1,3})\s*(?:_{2,}|\.{3,})(.*)$/
    );
    // 4. Dạng Form Completion: Name: (1) _______ hoặc Address: _______
    const formMatch = line.match(/^([A-Za-z\s]{2,30}):\s*(?:(?:\((\d{1,3})\))?\s*(___+|\.{3,}))/);
    // 5. Dạng câu hỏi đánh số thông thường: 1. prompt hoặc 1) prompt
    const numMatch = line.match(/^(?:\()?(\d{1,3})(?:[\.\)]\s*|\s{1,3})(.+)$/);
    // 6. Dạng Matching Headings số La Mã: i. Headings title hoặc vii) ...
    const romanMatch = line.match(/^([ivxlc]+)[\.\)]\s+(.+)$/i);

    if (bracketMatch) {
      const qNum = parseInt(bracketMatch[2], 10);
      const prompt = line.replace(/\[(?:Question\s*)?\d{1,3}\]/gi, "_______");
      questions.push(
        normalizeQuestion(
          { questionNumber: qNum, prompt, type: "FILL_IN_BLANK" },
          startNumber + questions.length,
          partTitle,
          skill
        )
      );
    } else if (formMatch) {
      const qNum = formMatch[2] ? parseInt(formMatch[2], 10) : startNumber + questions.length;
      const prompt = `${formMatch[1].trim()}: (${qNum}) _______`;
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
    } else if (romanMatch && romanMatch[2].length > 5) {
      const romanLabel = romanMatch[1].toLowerCase();
      questions.push(
        normalizeQuestion(
          {
            questionNumber: startNumber + questions.length,
            prompt: `Choose the correct heading for paragraph: ${romanMatch[2].trim()}`,
            type: "FILL_IN_BLANK",
            explanation: `Heading label: ${romanLabel}`,
          },
          startNumber + questions.length,
          partTitle,
          skill
        )
      );
    } else if (numMatch && parseInt(numMatch[1], 10) >= 1 && parseInt(numMatch[1], 10) <= 60) {
      const qNum = parseInt(numMatch[1], 10);
      const prompt = numMatch[2].trim();

      const opts: Array<{ optionLabel: string; content: string }> = [];
      let j = i + 1;
      while (j < lines.length) {
        const lineJ = lines[j].trim();
        if (!lineJ) {
          j++;
          continue;
        }

        // Trường hợp 1: Có nhiều phương án trên cùng 1 dòng (ví dụ 2 hoặc 4 phương án in ngang)
        const multiMatches = Array.from(
          lineJ.matchAll(/(?:^|\s{2,}|\t)([A-H])(?:[\.\)]\s*|\s+)(.+?)(?=(?:\s{2,}|\t)[A-H](?:[\.\)]\s*|\s+)|$)/gi)
        );
        if (multiMatches.length >= 2) {
          for (const m of multiMatches) {
            opts.push({
              optionLabel: m[1].toUpperCase(),
              content: m[2].trim(),
            });
          }
          j++;
          continue;
        }

        // Trường hợp 2: Mỗi dòng 1 phương án (hỗ trợ cả định dạng Cambridge không có chấm "A text")
        const optMatch = lineJ.match(/^([A-H])(?:[\.\)]\s*|\s+)(.+)$/i);
        if (optMatch) {
          const expectedLabel = String.fromCharCode(65 + opts.length);
          const matchedLabel = optMatch[1].toUpperCase();
          if (matchedLabel === expectedLabel || (opts.length > 0 && matchedLabel.charCodeAt(0) > opts[opts.length - 1].optionLabel.charCodeAt(0))) {
            opts.push({
              optionLabel: matchedLabel,
              content: optMatch[2].trim(),
            });
            j++;
            continue;
          }
        }
        break;
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
 * Hỗ trợ bóc tách song song các Part khi có từ 2 Keys Groq trở lên
 */
export async function parseExamTextWithGroq(params: {
  title: string;
  skill: string;
  durationMinutes: number;
  audioUrl: string | null;
  cleanedText: string;
}): Promise<ParsedExamResult> {
  const { title, skill, durationMinutes, audioUrl, cleanedText } = params;
  const keyPool = getGroqKeyPool();
  const rawParts = splitIntoExamParts(cleanedText);
  const warnings: string[] = [];

  // Bóc tách từng Part:
  const partTasks = rawParts.map(async (part, idx) => {
    const effectiveSkill: "READING" | "LISTENING" | "WRITING" | "SPEAKING" =
      skill === "ALL_SKILLS"
        ? part.detectedSkill || "READING"
        : (skill as any) || "READING";

    const partTitle = part.title || `${title} - Phần ${idx + 1}`;
    let passageText = extractVerbatimPassage(part.content);
    let partQuestions: ParsedQuestion[] = [];
    let aiResult: any = null;

    if (keyPool.length > 0) {
      try {
        const preferredKeyIdx = idx % keyPool.length;
        aiResult = await callGroqForPart(part.content, effectiveSkill, preferredKeyIdx);
        if (aiResult) {
          passageText = extractVerbatimPassage(
            part.content,
            aiResult.passageText,
            aiResult.questionStartMarker
          );
          const rawQuestions = Array.isArray(aiResult.questions) ? aiResult.questions : [];
          partQuestions = rawQuestions.map((rq: any, qIdx: number) =>
            normalizeQuestion(rq, qIdx + 1, partTitle, effectiveSkill)
          );
        }
      } catch (err: any) {
        console.warn(`[parseExamTextWithGroq] Fallback cho phần ${idx + 1}:`, err.message);
        warnings.push(`Phần ${idx + 1}: Đã kích hoạt bộ phân tích quy tắc dự phòng (${err.message}).`);
      }
    }

    if (partQuestions.length === 0) {
      const fallback = fallbackRuleBasedParse(partTitle, part.content, effectiveSkill, 1);
      passageText = fallback.passageText;
      partQuestions = fallback.questions;
    }

    return {
      partIndex: idx,
      partTitle,
      effectiveSkill,
      passageText,
      questions: partQuestions,
      matchingHeadings: aiResult?.matchingHeadings,
      tables: aiResult?.tables,
      summaries: aiResult?.summaries,
    };
  });

  const partResults = await Promise.all(partTasks);

  // Sắp xếp lại thứ tự câu hỏi xuyên suốt toàn bộ đề thi để không bị trùng lặp
  const sections: ParsedSection[] = [];
  const allQuestions: ParsedQuestion[] = [];
  let runningQuestionNum = 1;

  for (let idx = 0; idx < partResults.length; idx++) {
    const res = partResults[idx];
    const usedNums = new Set(allQuestions.map((q) => q.questionNumber));

    const adjustedQuestions = res.questions.map((q) => {
      let num = q.questionNumber;
      if (usedNums.has(num) || num <= 0) {
        num = runningQuestionNum;
      }
      usedNums.add(num);
      runningQuestionNum = Math.max(runningQuestionNum, num + 1);
      return {
        ...q,
        questionNumber: num,
        passageText: res.passageText || q.passageText || res.partTitle,
      };
    });

    allQuestions.push(...adjustedQuestions);

    const secId = `${res.effectiveSkill.toLowerCase()}_${idx + 1}`;
    sections.push({
      id: secId,
      key: `${res.effectiveSkill}_${idx + 1}`,
      skill: res.effectiveSkill,
      title: res.partTitle.includes(title) ? res.partTitle : `${title} - ${res.partTitle}`,
      durationMinutes: Math.max(15, Math.round(durationMinutes / Math.max(1, rawParts.length))),
      audioUrl: res.effectiveSkill === "LISTENING" ? audioUrl : null,
      passageText: res.passageText,
      questions: adjustedQuestions,
    });
  }

  const allMatchingHeadings: any[] = [];
  const allTables: any[] = [];
  const allSummaries: any[] = [];

  for (const r of partResults) {
    if (r.matchingHeadings) {
      if (Array.isArray(r.matchingHeadings)) {
        allMatchingHeadings.push(...r.matchingHeadings);
      } else {
        allMatchingHeadings.push(r.matchingHeadings);
      }
    }
    if (r.tables && Array.isArray(r.tables)) {
      allTables.push(...r.tables);
    }
    if (r.summaries && Array.isArray(r.summaries)) {
      allSummaries.push(...r.summaries);
    }
  }

  return {
    title,
    skill,
    durationMinutes,
    audioUrl,
    passageText: sections[0]?.passageText || cleanedText,
    questions: allQuestions,
    sections: sections.length > 1 || skill === "ALL_SKILLS" ? sections : undefined,
    matchingHeadings: allMatchingHeadings.length > 0 ? allMatchingHeadings : undefined,
    tables: allTables.length > 0 ? allTables : undefined,
    summaries: allSummaries.length > 0 ? allSummaries : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
