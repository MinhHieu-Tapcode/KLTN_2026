"use client";

import {
  CDN_PDFJS,
  CDN_PDFJS_WORKER,
  LOCAL_PDFJS,
  LOCAL_PDFJS_WORKER,
  loadScriptWithFallback,
} from "./client-ocr";
import { uploadMaterialFileClient } from "@/lib/upload-material-client";

/**
 * Cắt ảnh minh hoạ (bảng / sơ đồ / biểu đồ) từ trang PDF ngay trên trình duyệt rồi tải lên máy chủ.
 * Vùng cắt dùng thang 0-1000: [ymin, xmin, ymax, xmax] (docs/flows/exam-parser-claude-pipeline.md mục 8).
 */

export type FigureBox = [number, number, number, number];

const RENDER_SCALE = 2;
const PADDING_RATIO = 0.03;

// Mỗi tệp PDF chỉ nạp 1 lần dù cắt nhiều vùng
const docCache = new WeakMap<File, Promise<any>>();

async function loadPdfJs(): Promise<any> {
  const pdfjsLib = await loadScriptWithFallback(LOCAL_PDFJS, CDN_PDFJS, "pdfjsLib");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_PDFJS_WORKER;
  }
  return pdfjsLib;
}

async function openDocument(file: File): Promise<any> {
  const pdfjsLib = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  try {
    return await pdfjsLib.getDocument({ data }).promise;
  } catch {
    // Worker cục bộ lỗi thì dùng worker CDN (giống client-ocr.ts)
    pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_PDFJS_WORKER;
    return await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  }
}

export function getPdfDocument(file: File): Promise<any> {
  let cached = docCache.get(file);
  if (!cached) {
    cached = openDocument(file);
    cached.catch(() => docCache.delete(file));
    docCache.set(file, cached);
  }
  return cached;
}

export async function getPdfPageCount(file: File): Promise<number> {
  const pdf = await getPdfDocument(file);
  return pdf.numPages || 1;
}

/** Render một trang (từ 1) ra canvas */
export async function renderPdfPage(file: File, pageNumber: number, scale = RENDER_SCALE): Promise<HTMLCanvasElement> {
  const pdf = await getPdfDocument(file);
  const safePage = Math.min(Math.max(1, Math.round(pageNumber)), pdf.numPages || 1);
  const page = await pdf.getPage(safePage);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ vẽ canvas.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

/** Cắt vùng (thang 0-1000) kèm lề nhỏ để không mất viền bảng */
export function cropCanvas(source: HTMLCanvasElement, box: FigureBox, padding = PADDING_RATIO): HTMLCanvasElement {
  const [ymin, xmin, ymax, xmax] = box;
  const padY = (ymax - ymin) * padding + 5;
  const padX = (xmax - xmin) * padding + 5;
  const x0 = Math.max(0, ((xmin - padX) / 1000) * source.width);
  const y0 = Math.max(0, ((ymin - padY) / 1000) * source.height);
  const x1 = Math.min(source.width, ((xmax + padX) / 1000) * source.width);
  const y1 = Math.min(source.height, ((ymax + padY) / 1000) * source.height);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(x1 - x0));
  out.height = Math.max(1, Math.round(y1 - y0));
  out.getContext("2d")?.drawImage(source, x0, y0, x1 - x0, y1 - y0, 0, 0, out.width, out.height);
  return out;
}

function canvasToPngFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Không tạo được ảnh từ trang PDF."));
      resolve(new File([blob], fileName, { type: "image/png" }));
    }, "image/png");
  });
}

export interface CropUploadResult {
  url: string;
  // false khi máy chủ không nhận tệp: ảnh chỉ là URL tạm của trình duyệt, mất khi tải lại trang
  persisted: boolean;
}

export async function cropFigureAndUpload(
  file: File,
  pageNumber: number,
  box: FigureBox,
  label: string
): Promise<CropUploadResult> {
  const pageCanvas = await renderPdfPage(file, pageNumber);
  const cropped = cropCanvas(pageCanvas, box);
  const safeLabel = label.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40) || "figure";
  const png = await canvasToPngFile(cropped, `de_goc_${safeLabel}_p${pageNumber}.png`);
  const res = await uploadMaterialFileClient(png);
  return { url: res.url, persisted: !res.url.startsWith("blob:") };
}
