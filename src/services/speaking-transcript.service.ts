import fs from "fs";
import path from "path";
import {
  SpeakingTranscriptPayload,
  SpeakingWordToken,
  buildWordTokensFromRawText,
} from "@/lib/ielts-report-config";

export { buildWordTokensFromRawText };

const FILLER_WORDS = new Set(["um", "uh", "er", "ah", "hmm", "erm", "uhm"]);

/**
 * Gọi trực tiếp Groq Whisper API (whisper-large-v3-turbo) để chuyển file ghi âm thật của học viên thành văn bản.
 * Tuyệt đối KHÔNG trả về văn bản mẫu giả nếu file âm thanh không có lời nói hoặc API lỗi.
 */
export async function transcribeSpeakingAudioService(params: {
  audioUrl?: string | null;
  questionPrompt?: string;
}): Promise<{
  success: boolean;
  transcript?: SpeakingTranscriptPayload;
  source?: "GROQ_WHISPER";
  error?: string;
}> {
  const rawUrl = (params.audioUrl || "").trim();

  if (!rawUrl) {
    return {
      success: false,
      error: "Không tìm thấy tệp ghi âm của học viên để tạo bản ghi chữ!",
    };
  }

  const apiKeys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter((k): k is string => Boolean(k && k.trim()));

  if (apiKeys.length === 0) {
    return {
      success: false,
      error: "Hệ thống chưa cấu hình GROQ_API_KEY trong môi trường (.env) để gọi mô hình Whisper!",
    };
  }

  let audioBuffer: Buffer;
  let mimeType = "audio/wav";
  let fileName = "speaking.wav";

  try {
    if (rawUrl.startsWith("data:")) {
      const match = rawUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return {
          success: false,
          error: "Định dạng dữ liệu thu âm (Data URL) không hợp lệ!",
        };
      }
      mimeType = match[1] || "audio/webm";
      audioBuffer = Buffer.from(match[2], "base64");
      const ext = mimeType.includes("wav")
        ? "wav"
        : mimeType.includes("mp3") || mimeType.includes("mpeg")
        ? "mp3"
        : "webm";
      fileName = `speaking.${ext}`;
    } else if (rawUrl.startsWith("/")) {
      const relPath = rawUrl.replace(/^\/+/, "");
      const fullPath = path.join(process.cwd(), "public", relPath);
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: `Không tìm thấy tệp âm thanh trên máy chủ (${rawUrl})!`,
        };
      }
      audioBuffer = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      if (ext === ".mp3") {
        mimeType = "audio/mpeg";
        fileName = "speaking.mp3";
      } else if (ext === ".webm") {
        mimeType = "audio/webm";
        fileName = "speaking.webm";
      } else {
        mimeType = "audio/wav";
        fileName = "speaking.wav";
      }
    } else if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      const response = await fetch(rawUrl);
      if (!response.ok) {
        return {
          success: false,
          error: `Không thể tải tệp âm thanh từ đường dẫn (${response.status})!`,
        };
      }
      const arrBuf = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrBuf);
      mimeType = response.headers.get("content-type") || "audio/mpeg";
      fileName = rawUrl.endsWith(".wav")
        ? "speaking.wav"
        : rawUrl.endsWith(".mp3")
        ? "speaking.mp3"
        : "speaking.webm";
    } else {
      return {
        success: false,
        error: "Đường dẫn tệp âm thanh không hợp lệ hoặc là blob tạm thời đã hết hạn!",
      };
    }
  } catch (readErr: any) {
    return {
      success: false,
      error: `Lỗi đọc tệp âm thanh: ${readErr?.message || "Không xác định"}`,
    };
  }

  let lastError = "Không thể kết nối tới Groq Whisper API.";

  for (const apiKey of apiKeys) {
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
      formData.append("file", blob, fileName);
      formData.append("model", "whisper-large-v3-turbo");
      formData.append("language", "en");
      formData.append("response_format", "verbose_json");
      formData.append("timestamp_granularities[]", "word");
      formData.append("timestamp_granularities[]", "segment");

      const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!groqRes.ok) {
        const errBody = await groqRes.text().catch(() => "");
        lastError = `Groq Whisper API trả về mã lỗi ${groqRes.status}: ${errBody.slice(0, 120)}`;
        continue;
      }

      const json: any = await groqRes.json();
      const rawText = (json.text || "").trim();

      if (!rawText) {
        return {
          success: false,
          error:
            "AI Whisper không phát hiện được giọng nói tiếng Anh trong tệp âm thanh này (tệp im lặng hoặc chỉ có nhạc nền).",
        };
      }

      const durationSec = Math.max(1, Math.round(Number(json.duration) || 30));
      const apiWords: any[] = Array.isArray(json.words) ? json.words : [];

      let words: SpeakingWordToken[] = [];
      if (apiWords.length > 0) {
        words = apiWords.map((w, idx) => {
          const wordStr = String(w.word || "").trim();
          const cleaned = wordStr.replace(/[.,!?;:"'()]/g, "").toLowerCase();
          const startSec = Number(Number(w.start || 0).toFixed(1));
          const endSec = Number(Number(w.end || startSec + 0.35).toFixed(1));
          const nextWord = apiWords[idx + 1];
          const gap =
            nextWord && typeof nextWord.start === "number"
              ? Number((nextWord.start - endSec).toFixed(1))
              : 0;

          return {
            word: wordStr,
            startSec,
            endSec,
            isFiller: FILLER_WORDS.has(cleaned),
            pauseAfterSec: gap >= 1.0 ? gap : undefined,
          };
        });
      } else {
        words = buildWordTokensFromRawText(rawText, durationSec);
      }

      return {
        success: true,
        transcript: {
          rawText: words.map((w) => w.word).join(" "),
          words,
          durationSec,
          isVisibleToStudent: true,
          generatedAt: new Date().toISOString(),
        },
        source: "GROQ_WHISPER",
      };
    } catch (err: any) {
      lastError = err?.message || "Lỗi kết nối mạng tới Groq Whisper API.";
    }
  }

  return {
    success: false,
    error: lastError,
  };
}
