"use client";

const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const TESSERACT_CDN =
  "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

function loadScriptOnce(src: string, globalKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Chỉ chạy trên trình duyệt"));
      return;
    }
    if ((window as any)[globalKey]) {
      resolve((window as any)[globalKey]);
      return;
    }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any)[globalKey]));
      existing.addEventListener("error", () =>
        reject(new Error(`Không thể tải thư viện từ ${src}`))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve((window as any)[globalKey]);
    script.onerror = () => reject(new Error(`Không thể tải thư viện từ ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Quét OCR trực tiếp cho file PDF Scan (không có lớp văn bản) trên trình duyệt:
 * Render từng trang PDF ra Canvas (giống pdf-2-epub-docx) -> nhận diện chữ bằng Tesseract OCR
 */
export async function extractTextFromScannedPdfClient(
  file: File,
  onProgress?: (statusText: string) => void
): Promise<string> {
  onProgress?.("Đang khởi tạo công cụ đọc PDF Scan & AI OCR...");

  const [pdfjsLib, Tesseract] = await Promise.all([
    loadScriptOnce(PDFJS_CDN, "pdfjsLib"),
    loadScriptOnce(TESSERACT_CDN, "Tesseract"),
  ]);

  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const maxPages = Math.min(pdf.numPages || 1, 20);
  const pageTexts: string[] = [];

  const worker = await Tesseract.createWorker("eng");

  try {
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      onProgress?.(
        `Đang quét OCR trang ${pageNum}/${maxPages} từ tệp PDF Scan...`
      );
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      await page.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      const {
        data: { text },
      } = await worker.recognize(canvas);

      if (text && text.trim()) {
        pageTexts.push(text.trim());
      }
    }
  } finally {
    await worker.terminate();
  }

  const combined = pageTexts.join("\n\n").trim();
  if (combined.length < 20) {
    throw new Error(
      "Không nhận diện được chữ rõ ràng từ tệp PDF Scan này. Vui lòng kiểm tra độ nét của ảnh trong tệp!"
    );
  }

  return combined;
}
