import Anthropic from "@anthropic-ai/sdk";
import { ExamRead, ExamReadSchema } from "./schema";
import { EXAM_READER_SYSTEM_PROMPT, buildExamReaderUserPrompt } from "./prompt";

/**
 * Một lần gọi Claude để đọc đề (PDF gửi nguyên file, hoặc văn bản trích từ Word).
 * Hàm không ném lỗi: luôn trả về kết quả có `ok` để service quyết định leo thang hay quay về pipeline cũ.
 */

export type ExamReaderFailure =
  | "no_api_key"
  | "refusal"
  | "max_tokens"
  | "invalid_json"
  | "rate_limited"
  | "connection"
  | "api_error";

export interface ExamReaderUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export type ExamReaderResult =
  | { ok: true; data: ExamRead; usage: ExamReaderUsage }
  | { ok: false; failure: ExamReaderFailure; message: string; usage?: ExamReaderUsage };

export interface ExamReaderInput {
  model: string;
  teacherSkill: string;
  pdfBase64?: string;
  documentText?: string;
  isScannedPdf: boolean;
}

const MAX_OUTPUT_TOKENS = 32000;
const REQUEST_TIMEOUT_MS = 240_000;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) {
    // SDK tự đọc ANTHROPIC_API_KEY; tự thử lại 2 lần với 408/409/429/5xx và lỗi kết nối
    cachedClient = new Anthropic({ maxRetries: 2, timeout: REQUEST_TIMEOUT_MS });
  }
  return cachedClient;
}

export function hasClaudeApiKey(): boolean {
  return (process.env.ANTHROPIC_API_KEY || "").trim().length > 20;
}

/** Bỏ rào ```json nếu model lỡ thêm, rồi lấy khối {...} ngoài cùng */
function extractJsonText(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : raw).trim();
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  return first >= 0 && last > first ? body.slice(first, last + 1) : body;
}

export async function readExamWithClaude(input: ExamReaderInput): Promise<ExamReaderResult> {
  if (!hasClaudeApiKey()) {
    return { ok: false, failure: "no_api_key", message: "Chưa cấu hình ANTHROPIC_API_KEY." };
  }

  const content: Anthropic.ContentBlockParam[] = [];
  if (input.pdfBase64) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 },
    });
  } else if (input.documentText) {
    content.push({ type: "text", text: `--- EXAM DOCUMENT START ---\n${input.documentText}\n--- EXAM DOCUMENT END ---` });
  }
  content.push({
    type: "text",
    text: buildExamReaderUserPrompt({
      teacherSkill: input.teacherSkill,
      isScannedPdf: input.isScannedPdf,
      isTextOnly: !input.pdfBase64,
    }),
  });

  const startedAt = Date.now();
  let message: Anthropic.Message;
  try {
    // Streaming để không bị ngắt kết nối khi đầu ra dài; chỉ cần kết quả cuối
    message = await getClient()
      .messages.stream({
        model: input.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: EXAM_READER_SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      })
      .finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, failure: "rate_limited", message: "Dịch vụ AI đang quá tải (giới hạn tốc độ). Vui lòng thử lại sau ít phút." };
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { ok: false, failure: "connection", message: "Không kết nối được tới dịch vụ Claude." };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, failure: "api_error", message: `Claude API lỗi ${err.status ?? ""}: ${String(err.message).slice(0, 160)}` };
    }
    throw err;
  }

  const usage: ExamReaderUsage = {
    model: input.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    durationMs: Date.now() - startedAt,
  };
  console.log(
    `[ClaudeExamReader] model=${usage.model} in=${usage.inputTokens} out=${usage.outputTokens} ms=${usage.durationMs} stop=${message.stop_reason}`
  );

  if (message.stop_reason === "refusal") {
    const details = (message as { stop_details?: { category?: string | null } | null }).stop_details;
    return {
      ok: false,
      failure: "refusal",
      message: `Claude từ chối đọc tài liệu này${details?.category ? ` (nhóm: ${details.category})` : ""}.`,
      usage,
    };
  }
  if (message.stop_reason === "max_tokens") {
    return { ok: false, failure: "max_tokens", message: "Kết quả AI bị cắt do đề quá dài. Hãy tách file theo từng phần thi.", usage };
  }

  const rawText = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let json: unknown;
  try {
    json = JSON.parse(extractJsonText(rawText));
  } catch {
    return { ok: false, failure: "invalid_json", message: "AI trả về dữ liệu không phải JSON hợp lệ.", usage };
  }

  const parsed = ExamReadSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      failure: "invalid_json",
      message: `Dữ liệu AI sai cấu trúc tại "${issue?.path.join(".")}": ${issue?.message}`,
      usage,
    };
  }
  return { ok: true, data: parsed.data, usage };
}
