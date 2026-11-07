import { ParsedQuestion, FlowchartGroup, FlowchartBox, TableCompletionGroup } from "./types";

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
];

export interface GeminiVisionParseOptions {
  missingNumbers?: number[];
  /** Mô tả các nhóm cần đọc từ ảnh, vd "Questions 31-35 (TABLE); Questions 36-40 (TABLE)" */
  groupHints?: string;
  hintContext?: string;
  partTitle?: string;
}

export interface GeminiVisionResult {
  questions: ParsedQuestion[];
  flowchart?: FlowchartGroup;
  /** Bảng đầu tiên (giữ để tương thích); dùng `tables` khi đề có nhiều bảng */
  table?: TableCompletionGroup;
  tables?: TableCompletionGroup[];
}

/**
 * Trích xuất các câu hỏi và cấu trúc sơ đồ (Flowchart, Diagram, Map, Table) trong tệp PDF bằng Gemini Vision
 */
export async function extractDiagramQuestionsWithGemini(
  pdfBuffer: Buffer | ArrayBuffer,
  options: GeminiVisionParseOptions = {}
): Promise<GeminiVisionResult> {
  const geminiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!geminiKey) {
    console.warn("[GeminiVision] Không tìm thấy GEMINI_API_KEY trong cấu hình môi trường");
    return { questions: [] };
  }

  const base64Data = Buffer.isBuffer(pdfBuffer)
    ? pdfBuffer.toString("base64")
    : Buffer.from(pdfBuffer).toString("base64");

  const targetNums =
    options.missingNumbers && options.missingNumbers.length > 0
      ? options.missingNumbers.join(", ")
      : "các câu hỏi dạng sơ đồ (ví dụ 18-23)";

  const promptText = `Bạn là chuyên gia phân tích đề thi IELTS từ tệp PDF có chứa sơ đồ hình ảnh (Flowchart, Diagram, Map, Table Completion).
Hãy NHÌN VÀO HÌNH ẢNH SƠ ĐỒ hoặc LƯU ĐỒ QUY TRÌNH (Flowchart) trong tệp PDF này.
${options.groupHints ? `CÁC NHÓM CÂU HỎI CẦN ĐỌC TỪ HÌNH ẢNH (văn bản của PDF không có nội dung): ${options.groupHints}.\nNếu PDF có NHIỀU bảng, trả về mảng "tables" (mỗi bảng một phần tử, mỗi ô chứa chỗ trống ghi rõ số câu dạng "(31) _______"); vẫn giữ "table" là bảng đầu tiên.\n` : ""}Nhiệm vụ:
1. Trích xuất CHÍNH XÁC nội dung các câu hỏi điền từ hoặc trắc nghiệm nằm bên trong các khối hộp hoặc nhãn của sơ đồ (đặc biệt là các câu: ${targetNums}).
2. Trích xuất CẤU TRÚC SƠ ĐỒ (các khối hộp và mũi tên liên kết giữa các hộp) để hệ thống tái hiện lại sơ đồ khối cho học sinh làm bài trực quan.

CÁC NGUYÊN TẮC BẮT BUỘC:
1. Đọc đúng chữ bên trong từng khối hộp (Box) có chỗ trống điền từ:
   Ví dụ trong bài Flow Chart "The Envisioning Process":
   - Hộp 1: "manager (having just obtained 18 _______)" (chứa câu 18)
   - Hộp 2: "people with greatly varied 19 _______" (chứa câu 19)
   - Hộp 3: "playing with language for a long time" (hộp trung gian cố định, không có chỗ điền, isStatic = true)
   - Hộp 4: "20 _______ set of words" (chứa câu 20)
   - Hộp 5: "- obeyed only at 21 _______\n- can cause lack of 22 _______" (chứa câu 21 và câu 22)
   - Hộp 6: "want 23 _______ payback" (chứa câu 23)
2. Nhận diện các mũi tên liên kết (nextBoxIds) giữa các hộp để tạo sơ đồ:
   - box-1 trỏ sang box-center
   - box-2 trỏ sang box-center và box-6
   - box-center trỏ sang box-4
   - box-4 trỏ sang box-5
3. Tuyệt đối KHÔNG sinh ra câu cộc lốc kiểu "Complete the flow chart (item 18)" hay "Complete the blank in the table (row 1, column 1)". Phải lấy ĐÚNG VĂN BẢN trong khối hộp hoặc ô của bảng (ví dụ: "Red wines use _______ in fermentation.")!
4. Chỗ trống được ký hiệu bằng "_______".
5. Phân loại chuẩn 3 dạng câu hỏi chính:
   - "TRUE_FALSE_NG": Khi đề bài yêu cầu "agree/contradict", "TRUE / FALSE / NOT GIVEN" hoặc "YES / NO / NOT GIVEN" (ví dụ các câu nhận định 1-4: "Blended wines are usually cheaper.").
   - "MULTIPLE_CHOICE": Khi câu hỏi có các lựa chọn chữ cái A, B, C, D... (ví dụ câu 11-13). BẮT BUỘC trích xuất đủ mảng "options" với từng phương án, kể cả khi đề thi viết dạng "A mostly better." (chỉ có dấu cách sau chữ cái A, không có dấu chấm).
   - "FILL_IN_BLANK": Chỗ trống điền từ trong sơ đồ, bảng biểu hoặc đoạn tóm tắt.
6. Trường "explanation": CHỈ ghi giải thích chi tiết đáp án nếu có. TUYỆT ĐỐI KHÔNG ghi lại câu chỉ dẫn làm bài (như "Do the following statements agree...", "Choose the correct letter...", "Complete the table..."). Nếu không có giải thích, để rỗng "".

Định dạng JSON trả về BẮT BUỘC (chỉ trả về JSON thuần):
{
  "title": "The Envisioning Process",
  "instruction": "Complete the flow chart. Choose NO MORE THAN THREE WORDS from the passage for each answer.",
  "boxes": [
    {
      "id": "box-1",
      "textTemplate": "manager (having just obtained 18 _______)",
      "questionNumbers": [18],
      "isStatic": false,
      "nextBoxIds": ["box-center"]
    },
    {
      "id": "box-2",
      "textTemplate": "people with greatly varied 19 _______",
      "questionNumbers": [19],
      "isStatic": false,
      "nextBoxIds": ["box-center", "box-6"]
    },
    {
      "id": "box-center",
      "textTemplate": "playing with language for a long time",
      "isStatic": true,
      "nextBoxIds": ["box-4"]
    },
    {
      "id": "box-4",
      "textTemplate": "20 _______ set of words",
      "questionNumbers": [20],
      "isStatic": false,
      "nextBoxIds": ["box-5"]
    },
    {
      "id": "box-5",
      "textTemplate": "- obeyed only at 21 _______\\n- can cause lack of 22 _______",
      "questionNumbers": [21, 22],
      "isStatic": false,
      "nextBoxIds": []
    },
    {
      "id": "box-6",
      "textTemplate": "want 23 _______ payback",
      "questionNumbers": [23],
      "isStatic": false,
      "nextBoxIds": []
    }
  ],
  "questions": [
    {
      "questionNumber": 4,
      "prompt": "Blended wines are usually cheaper.",
      "type": "TRUE_FALSE_NG",
      "options": [
        { "optionLabel": "A", "content": "TRUE" },
        { "optionLabel": "B", "content": "FALSE" },
        { "optionLabel": "C", "content": "NOT GIVEN" }
      ],
      "explanation": ""
    },
    {
      "questionNumber": 5,
      "prompt": "Red wines use _______ in fermentation.",
      "type": "FILL_IN_BLANK",
      "options": [],
      "explanation": ""
    },
    {
      "questionNumber": 11,
      "prompt": "Vintage wines are",
      "type": "MULTIPLE_CHOICE",
      "options": [
        { "optionLabel": "A", "content": "mostly better." },
        { "optionLabel": "B", "content": "often preferred." },
        { "optionLabel": "C", "content": "often discussed." },
        { "optionLabel": "D", "content": "more costly." }
      ],
      "explanation": ""
    },
    {
      "questionNumber": 18,
      "prompt": "manager (having just obtained 18 _______)",
      "type": "FILL_IN_BLANK",
      "options": [],
      "explanation": ""
    }
  ],
  "table": {
    "title": "Classification of wine",
    "instruction": "Complete the table. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
    "headers": ["Classification based on", "Associated fact", "Related example"],
    "rows": [
      ["Colour", "Red wines use (5) _______ in fermentation.", "(6) _______"],
      ["grape species", "can be (7) _______ or blended", "Cote Rotie wines"]
    ],
    "questionNumbers": [5, 6, 7]
  }
}`;

  let lastError = "";

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Khoá đặt trong header (không để trên URL để khỏi lộ vào log)
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Data,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        lastError = errJson?.error?.message || `HTTP ${response.status}`;
        console.warn(`[GeminiVision] Model ${model} gặp lỗi: ${lastError}. Đang thử model tiếp theo...`);
        continue;
      }

      const resData = await response.json();
      const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!rawText) {
        lastError = "Gemini Vision trả về nội dung rỗng";
        continue;
      }

      let parsed: any;
      try {
        const cleanJson = rawText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleanJson);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          continue;
        }
      }

      const questionsList = Array.isArray(parsed?.questions) ? parsed.questions : [];
      const boxesList: FlowchartBox[] = Array.isArray(parsed?.boxes)
        ? parsed.boxes.map((b: any, idx: number) => ({
            id: String(b.id || `box-${idx + 1}`),
            title: b.title ? String(b.title).trim() : undefined,
            textTemplate: String(b.textTemplate || b.prompt || "").trim(),
            questionNumbers: Array.isArray(b.questionNumbers)
              ? b.questionNumbers.map(Number).filter((n: number) => !isNaN(n) && n > 0)
              : [],
            isStatic: Boolean(b.isStatic),
            nextBoxIds: Array.isArray(b.nextBoxIds) ? b.nextBoxIds.map(String) : [],
          }))
        : [];

      let flowchartGroup: FlowchartGroup | undefined = undefined;
      if (boxesList.length > 0) {
        const allFlowchartQNums: number[] = [];
        boxesList.forEach((b) => {
          if (b.questionNumbers) {
            allFlowchartQNums.push(...b.questionNumbers);
          }
        });

        flowchartGroup = {
          id: `fc-${Date.now()}`,
          title: String(parsed?.title || options.partTitle || "The Envisioning Process").trim(),
          instruction: String(
            parsed?.instruction ||
              "Complete the flow chart. Choose NO MORE THAN THREE WORDS from the passage for each answer."
          ).trim(),
          boxes: boxesList,
          questionNumbers: Array.from(new Set(allFlowchartQNums)).sort((a, b) => a - b),
        };
      }

      const buildTable = (raw: any, idx: number): TableCompletionGroup | undefined => {
        if (!raw || !Array.isArray(raw.headers) || !Array.isArray(raw.rows)) return undefined;
        const tQNums: number[] = Array.isArray(raw.questionNumbers)
          ? raw.questionNumbers.map(Number).filter((n: number) => !isNaN(n) && n > 0)
          : [];
        return {
          id: `tbl-${Date.now()}-${idx}`,
          title: String(raw.title || options.partTitle || "Table Completion").trim(),
          instruction: String(
            raw.instruction || "Complete the table. Choose NO MORE THAN TWO WORDS from the passage for each answer."
          ).trim(),
          headers: raw.headers.map(String),
          rows: raw.rows,
          questionNumbers: tQNums,
        };
      };

      const rawTables: any[] = [
        ...(Array.isArray(parsed?.tables) ? parsed.tables : []),
        ...(parsed?.table ? [parsed.table] : []),
      ];
      const tableGroups: TableCompletionGroup[] = [];
      rawTables.forEach((rt, i) => {
        const t = buildTable(rt, i);
        if (!t) return;
        // Bỏ bảng trùng (cùng tập số câu) khi AI trả cả "table" lẫn "tables"
        const key = t.questionNumbers.join(",");
        if (key && tableGroups.some((x) => x.questionNumbers.join(",") === key)) return;
        tableGroups.push(t);
      });
      const tableGroup: TableCompletionGroup | undefined = tableGroups[0];

      if (questionsList.length > 0 || boxesList.length > 0 || tableGroup) {
        console.log(
          `[GeminiVision] Thành công trích xuất ${questionsList.length} câu hỏi, ${boxesList.length} khối sơ đồ và bảng Table bằng model ${model}!`
        );

        const mappedQuestions: ParsedQuestion[] = questionsList.map((q: any) => {
          const rawType = String(q.type || "").toUpperCase();
          const combinedContext = `${q.prompt || ""} ${q.explanation || ""}`.toLowerCase();
          
          let effectiveType: ParsedQuestion["type"] = "FILL_IN_BLANK";
          if (
            rawType.includes("TRUE") ||
            rawType.includes("FALSE") ||
            rawType.includes("NOT_GIVEN") ||
            rawType.includes("TFNG") ||
            combinedContext.includes("agree with the information") ||
            combinedContext.includes("true if the statement") ||
            combinedContext.includes("true/false/not given") ||
            combinedContext.includes("yes/no/not given")
          ) {
            effectiveType = "TRUE_FALSE_NG";
          } else if (
            (rawType.includes("MULTI") && (rawType.includes("SELECT") || rawType.includes("CHOICE"))) ||
            combinedContext.includes("choose two") ||
            combinedContext.includes("choose three")
          ) {
            effectiveType = "MULTIPLE_CHOICE_MULTI";
          } else if (
            rawType.includes("CHOICE") ||
            rawType.includes("MCQ") ||
            (Array.isArray(q.options) && q.options.length >= 2)
          ) {
            effectiveType = "MULTIPLE_CHOICE";
          } else if (rawType.includes("ESSAY") || rawType.includes("WRITING")) {
            effectiveType = "ESSAY";
          } else if (rawType.includes("SPEAK")) {
            effectiveType = "SPEAKING_RECORD";
          }

          let formattedOptions: ParsedQuestion["options"] = [];
          let correctAnswer = String(q.correctAnswer || "").trim();

          if (effectiveType === "TRUE_FALSE_NG") {
            formattedOptions = [
              { optionLabel: "A", content: "TRUE", isCorrect: correctAnswer === "TRUE" },
              { optionLabel: "B", content: "FALSE", isCorrect: correctAnswer === "FALSE" },
              { optionLabel: "C", content: "NOT GIVEN", isCorrect: correctAnswer === "NOT GIVEN" },
            ];
            if (!correctAnswer) correctAnswer = "TRUE";
          } else if (effectiveType === "MULTIPLE_CHOICE" || effectiveType === "MULTIPLE_CHOICE_MULTI") {
            const rawOpts = Array.isArray(q.options) ? q.options : [];
            const labels = ["A", "B", "C", "D", "E", "F", "G", "H"];
            if (rawOpts.length >= 2) {
              formattedOptions = rawOpts.map((opt: any, idx: number) => {
                const label = String(opt?.optionLabel || labels[idx] || String.fromCharCode(65 + idx))
                  .replace(/[^A-Za-z]/g, "")
                  .toUpperCase() || labels[idx];
                const content = String(opt?.content || "")
                  .replace(/^[A-H][\.\)\-\:]\s*/i, "")
                  .trim();
                return {
                  optionLabel: label,
                  content: content || `Lựa chọn ${label}`,
                  isCorrect: opt?.isCorrect ?? (idx === 0),
                };
              });
            } else {
              formattedOptions = labels.slice(0, 4).map((lbl, idx) => ({
                optionLabel: lbl,
                content: `Lựa chọn ${lbl}`,
                isCorrect: idx === 0,
              }));
            }
            if (!correctAnswer) correctAnswer = formattedOptions[0]?.optionLabel || "A";
          }

          // Dọn dẹp explanation nếu AI vô tình copy câu chỉ dẫn đề thi
          let cleanExplanation = String(q.explanation || "").trim();
          if (
            /^(?:Do the following statements|Choose the correct letter|Complete the (?:table|flow chart|notes|summary)|Write NO MORE THAN|In boxes \d+)/i.test(
              cleanExplanation
            )
          ) {
            cleanExplanation = "";
          }

          return {
            questionNumber: Number(q.questionNumber) || 1,
            passageText: options.partTitle || "Sơ đồ Flow Chart / Table Completion",
            prompt: String(q.prompt || "").trim() || `Câu hỏi số ${q.questionNumber}`,
            type: effectiveType,
            points: 1.0,
            correctAnswer,
            explanation:
              cleanExplanation ||
              (effectiveType === "TRUE_FALSE_NG"
                ? "Đọc kỹ bài đọc để xác định thông tin là TRUE, FALSE hay NOT GIVEN."
                : effectiveType === "MULTIPLE_CHOICE"
                ? "Chọn phương án đúng nhất A, B, C hoặc D."
                : "Quan sát bảng hoặc sơ đồ để điền từ thích hợp."),
            options: formattedOptions,
            flowchartGroupTitle: flowchartGroup?.title || tableGroup?.title,
            flowchartBoxText: String(q.prompt || "").trim(),
          };
        });

        return {
          questions: mappedQuestions,
          flowchart: flowchartGroup,
          table: tableGroup,
          tables: tableGroups,
        };
      }
    } catch (err: any) {
      lastError = err.message || "Lỗi kết nối Gemini API";
    }
  }

  console.warn(`[GeminiVision] Không thể trích xuất câu hỏi sơ đồ qua Gemini Vision: ${lastError}`);
  return { questions: [] };
}
