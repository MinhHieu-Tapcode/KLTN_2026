"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { CircleCheck, Download, FileSpreadsheet, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  commitImportUsersAction,
  parseAndValidateExcelAction,
} from "@/actions/users";

export function ImportPageView({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMsg("");
    setReport(null);
    setAnalyzing(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      let res: any;

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selected);
          reader.onload = () => {
            const resultStr = reader.result as string;
            resolve(resultStr.includes(",") ? resultStr.split(",")[1] : resultStr);
          };
          reader.onerror = (err) => reject(err);
        });
        res = await parseAndValidateExcelAction(base64);
      } catch (serverErr) {
        console.warn("[handleFileChange] Server action parse failed, using client fallback:", serverErr);
      }

      if (!res || !res.success) {
        try {
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rawRows.length < 2) {
            setErrorMsg("Tệp Excel rỗng hoặc không có dữ liệu hợp lệ!");
            return;
          }

          const header = rawRows[0].map((h: any) => (h ? String(h).trim().toLowerCase() : ""));
          const colFullName = header.findIndex(
            (h: string) =>
              h.includes("họ và tên") ||
              h.includes("họ tên") ||
              h.includes("tên") ||
              h === "name" ||
              h === "fullname"
          );
          const colEmail = header.findIndex(
            (h: string) => h.includes("email") || h.includes("thư điện tử") || h.includes("mail")
          );
          const colClass = header.findIndex(
            (h: string) =>
              h.includes("mã lớp") ||
              h.includes("lớp") ||
              h.includes("class") ||
              h.includes("code")
          );
          const colPhone = header.findIndex(
            (h: string) =>
              h.includes("số điện thoại") ||
              h.includes("sđt") ||
              h.includes("phone") ||
              h.includes("điện thoại")
          );
          const colDob = header.findIndex(
            (h: string) =>
              h.includes("ngày sinh") ||
              h.includes("dob") ||
              h.includes("birth") ||
              h.includes("ngaysinh")
          );
          const colGender = header.findIndex(
            (h: string) =>
              h.includes("giới tính") ||
              h.includes("gender") ||
              h.includes("phái")
          );

          if (colFullName === -1 || colEmail === -1) {
            setErrorMsg("File Excel thiếu các cột bắt buộc: 'Họ và tên' và 'Email'!");
            return;
          }

          const validRows: any[] = [];
          const errorRows: any[] = [];
          const seenEmails = new Set<string>();

          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0 || row.every((c: any) => c === null || c === undefined || String(c).trim() === "")) {
              continue;
            }

            const stt = row[0] || i;
            const fullName = (row[colFullName] || "").toString().trim();
            const email = (row[colEmail] || "").toString().trim().toLowerCase();
            const classCode = colClass !== -1 && row[colClass] ? (row[colClass] || "").toString().trim().toUpperCase() : "";
            const phoneNumber = colPhone !== -1 && row[colPhone] ? (row[colPhone] || "").toString().trim() : "";
            const dateOfBirth = colDob !== -1 && row[colDob] ? (row[colDob] || "").toString().trim() : "";
            const gender = colGender !== -1 && row[colGender] ? (row[colGender] || "").toString().trim() : "";

            if (!fullName) {
              errorRows.push({ stt, fullName: "—", email: email || "—", classCode: classCode || "—", reason: "Họ và tên không được để trống" });
              continue;
            }
            if (!email) {
              errorRows.push({ stt, fullName, email: "—", classCode: classCode || "—", reason: "Thiếu địa chỉ email" });
              continue;
            }
            const RFC5322 = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!RFC5322.test(email)) {
              errorRows.push({ stt, fullName, email, classCode: classCode || "—", reason: "Email sai định dạng (thiếu tên miền hợp lệ)" });
              continue;
            }
            if (seenEmails.has(email)) {
              errorRows.push({ stt, fullName, email, classCode: classCode || "—", reason: "Email bị trùng lặp trong file" });
              continue;
            }
            seenEmails.add(email);

            validRows.push({
              stt,
              fullName,
              email,
              classCode,
              phoneNumber,
              dateOfBirth,
              gender,
            });
          }

          res = {
            success: true,
            totalRows: rawRows.length - 1,
            validCount: validRows.length,
            errorCount: errorRows.length,
            validRows,
            errorRows,
          };
        } catch (clientParseErr: any) {
          setErrorMsg("Không thể đọc file Excel: " + (clientParseErr.message || String(clientParseErr)));
          return;
        }
      }

      if (res && res.success) {
        setReport(res);
      } else {
        setErrorMsg(res?.error || "Lỗi xử lý file Excel!");
      }
    } catch (err: any) {
      setErrorMsg("Không thể đọc file: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!report?.errorRows || report.errorRows.length === 0) return;

    const exportData = report.errorRows.map((r: any) => ({
      STT: r.stt,
      "Họ và tên": r.fullName,
      Email: r.email,
      "Mã lớp IELTS": r.classCode,
      "Lý do từ chối (Ghi chú hệ thống)": r.reason,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Loi");
    XLSX.writeFile(wb, `SIMPACE_Bao_Cao_Loi_${Date.now()}.xlsx`);
  };

  const handleCommitImport = async () => {
    if (!report?.validRows || report.validRows.length === 0) return;
    setCommitting(true);

    try {
      const res = await commitImportUsersAction(report.validRows, file?.name || "import.xlsx");
      if (!res.success) {
        setErrorMsg(res.error || "Lỗi khi lưu dữ liệu!");
      } else {
        onImportSuccess();
        setReport(null);
        setFile(null);
      }
    } catch (err: any) {
      setErrorMsg("Lỗi khi lưu học viên: " + err.message);
    } finally {
      setCommitting(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        STT: 1,
        "Họ và tên": "Nguyễn Văn An",
        Email: "an.nguyen@gmail.com",
        "Mã lớp IELTS": "IELTS_TD_01",
        "Số điện thoại": "0987654321",
        "Ngày sinh": "15/08/2008",
        "Giới tính": "Nam",
      },
      {
        STT: 2,
        "Họ và tên": "Trần Thị Mai",
        Email: "mai.tran@gmail.com",
        "Mã lớp IELTS": "IELTS_TD_01",
        "Số điện thoại": "0912345678",
        "Ngày sinh": "20/11/2008",
        "Giới tính": "Nữ",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hoc_Vien");
    XLSX.writeFile(wb, "SIMPACE_Mau_Import_HocVien.xlsx");
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-[#64748B]">
          Điều kiện: Bắt buộc có <b>Email</b> hợp lệ và <b>Mã lớp IELTS</b> phải tồn tại trên hệ thống.
        </p>
        <Button variant="outline" size="sm" onClick={handleDownloadSample} className="rounded-xl">
          <Download className="mr-1.5 size-4" /> Tải file Excel mẫu chuẩn 7 cột
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex min-h-48 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-white p-8 hover:border-[#EA580C] cursor-pointer transition shadow-sm"
      >
        <FileSpreadsheet className="mb-3 size-12 text-emerald-500" />
        <b className="text-base text-[#0F172A]">Kéo thả file Excel vào đây hoặc bấm để chọn file</b>
        <span className="mt-1 text-sm text-[#94A3B8]">
          Hỗ trợ định dạng .xlsx, .xls (Tối đa 10MB)
        </span>
      </div>

      {analyzing && (
        <div className="panel mt-4 flex items-center justify-center gap-3 py-6">
          <Loader2 className="size-6 animate-spin text-[#EA580C]" />
          <span className="font-semibold text-sm">Đang phân tích và đối chiếu từng dòng dữ liệu...</span>
        </div>
      )}

      {errorMsg && (
        <div className="panel mt-4 border-red-200 bg-red-50 text-sm text-red-600">
          <b>Lỗi:</b> {errorMsg}
        </div>
      )}

      {report && (
        <div className="mt-6 space-y-6">
          <div className="panel flex items-center gap-4">
            <FileSpreadsheet className="size-8 text-emerald-500 shrink-0" />
            <div className="flex-1">
              <b className="text-sm text-[#0F172A]">{file?.name}</b>
              <div className="mt-2 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                <div className="h-full w-full bg-[#EA580C]" />
              </div>
            </div>
            <CircleCheck className="size-6 text-emerald-500 shrink-0" />
            <span className="text-sm font-semibold text-emerald-700">Đã kiểm tra xong</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="panel flex items-center gap-4 border-emerald-200 bg-emerald-50/50">
              <CircleCheck className="size-10 text-emerald-500" />
              <div>
                <b className="text-2xl font-extrabold text-emerald-700">{report.validCount}</b>
                <p className="text-sm text-emerald-800 font-medium">Bản ghi hợp lệ (Sẵn sàng tạo)</p>
              </div>
            </div>

            <div className="panel flex items-center gap-4 border-red-200 bg-red-50/50">
              <X className="size-10 text-red-500" />
              <div>
                <b className="text-2xl font-extrabold text-red-600">{report.errorCount}</b>
                <p className="text-sm text-red-700 font-medium">Bản ghi phát hiện lỗi</p>
              </div>
            </div>
          </div>

          {report.validCount > 0 && (
            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={handleCommitImport}
                disabled={committing}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white rounded-xl font-bold"
              >
                {committing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Đang tạo tài khoản...
                  </>
                ) : (
                  `Xác nhận Import ${report.validCount} học viên hợp lệ`
                )}
              </Button>
            </div>
          )}

          {report.errorCount > 0 && (
            <section className="panel">
              <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
                <h2 className="font-bold text-base text-red-600">
                  Chi tiết các dòng bị từ chối ({report.errorCount})
                </h2>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDownloadErrorReport}
                  className="rounded-xl"
                >
                  <Download className="mr-1.5 size-4" /> Tải file Excel báo cáo lỗi
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">STT</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Họ và tên</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Email</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Mã lớp</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#64748B]">Lý do từ chối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] bg-white">
                    {report.errorRows.map((r: any) => (
                      <tr key={r.stt} className="hover:bg-red-50/40">
                        <td className="px-4 py-3 font-mono text-xs">{r.stt}</td>
                        <td className="px-4 py-3 font-bold text-[#0F172A]">{r.fullName}</td>
                        <td className="px-4 py-3 text-[#64748B]">{r.email}</td>
                        <td className="px-4 py-3 font-mono text-xs">{r.classCode}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
