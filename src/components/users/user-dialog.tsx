"use client";

import React, { useState, useEffect, useTransition } from "react";
import { ChevronLeft, CirclePlus, Download, Eye, FileSpreadsheet, Plus, X, Loader2, Check, RotateCcw, ArrowRightLeft, AlertTriangle, Sparkles, Sliders } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createUserAction, getNextUserCodeAction } from "@/actions/users";
import { parseAndValidateBulkStudentsAction, generateBulkClassSuggestionAction, rebalanceOnStudentTransferAction, rebalanceOnClassCountChangeAction, commitBulkAllocationAction, ValidatedStudentRow, InvalidStudentRow, ProposedClass, LevelAllocationPlan, BulkAllocationSuggestion } from "@/actions/bulk-allocation";
import { RoleCode } from "@prisma/client";
import { Field } from "@/components/shared/common-widgets";

export function UserDialog({
  open,
  onOpenChange,
  schools,
  classes,
  users = [],
  ieltsLevels = [],
  onAddClassShortcut,
  onAddSchoolShortcut,
  onCreatedSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schools: any[];
  classes: any[];
  users?: any[];
  ieltsLevels?: any[];
  onAddClassShortcut: () => void;
  onAddSchoolShortcut?: () => void;
  onCreatedSuccess: (acc: any) => void;
}) {
  const [modalMode, setModalMode] = useState<"manual" | "excel">("manual");
  const [selectedRole, setSelectedRole] = useState<RoleCode>("STUDENT");
  const [previewCode, setPreviewCode] = useState<string>("HV1001");
  const [emailValue, setEmailValue] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  // Điểm IELTS đầu vào cho học sinh khi nhập thủ công
  const [entryIeltsScoreInput, setEntryIeltsScoreInput] = useState<string>("");

  // Tự động xác định trình độ IELTS từ cấu hình hiện tại (Admin không được tự ý sửa)
  const parsedManualScore = parseFloat(entryIeltsScoreInput);
  const detectedManualLevel =
    !isNaN(parsedManualScore) && parsedManualScore >= 0 && parsedManualScore <= 9
      ? (ieltsLevels || []).find(
          (l: any) => l.isActive && parsedManualScore >= l.minScore && parsedManualScore <= l.maxScore
        )
      : null;

  // Multi-assignment dynamic lists với dấu (+)
  const [managerSchools, setManagerSchools] = useState<string[]>([""]);
  const [staffClasses, setStaffClasses] = useState<string[]>([""]);
  const [studentClasses, setStudentClasses] = useState<string[]>([""]);

  // ==========================================================
  // STATE CHO QUY TRÌNH NHẬP HÀNG LOẠT & PHÂN LỚP IELTS
  // ==========================================================
  const [excelStep, setExcelStep] = useState<"upload" | "suggestion">("upload");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(schools[0]?.id || "");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [analyzingExcel, setAnalyzingExcel] = useState(false);
  const [committingExcel, setCommittingExcel] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [allocationSuggestion, setAllocationSuggestion] = useState<BulkAllocationSuggestion | null>(null);
  const [invalidRowsList, setInvalidRowsList] = useState<InvalidStudentRow[]>([]);
  const [actionNotification, setActionNotification] = useState<string>("");

  // Sub-dialog states for Suggestion screen
  const [selectedClassDetail, setSelectedClassDetail] = useState<ProposedClass | null>(null);
  const [transferStudent, setTransferStudent] = useState<ValidatedStudentRow | null>(null);
  const [targetClassTempId, setTargetClassTempId] = useState<string>("");
  const [transferError, setTransferError] = useState<string>("");
  const [adjustClassLevel, setAdjustClassLevel] = useState<LevelAllocationPlan | null>(null);
  const [newClassCountInput, setNewClassCountInput] = useState<number>(1);
  const [confirmCommitOpen, setConfirmCommitOpen] = useState(false);
  const [showInvalidListModal, setShowInvalidListModal] = useState(false);

  // Sync default school if empty
  useEffect(() => {
    if (!selectedSchoolId && schools.length > 0) {
      setSelectedSchoolId(schools[0].id);
    }
  }, [schools, selectedSchoolId]);

  // Cập nhật preview mã tài khoản khi đổi vai trò
  useEffect(() => {
    let active = true;
    getNextUserCodeAction(selectedRole).then((res) => {
      if (active && res.success && res.code) {
        setPreviewCode(res.code);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedRole]);

  // Kiểm tra email theo chuẩn RFC 5322
  const validateEmail = (val: string) => {
    setEmailValue(val);
    if (!val.trim()) {
      setEmailError("");
      return;
    }
    const clean = val.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(clean)) {
      setEmailError("Email sai định dạng (phải có tên miền hợp lệ như .com, .vn, .edu.vn)");
    } else {
      setEmailError("");
    }
  };

  // Tải file mẫu mới (có Điểm IELTS đầu vào, KHÔNG có Địa chỉ và Trình độ)
  const handleDownloadSample = () => {
    const sampleData = [
      {
        STT: 1,
        "Họ và tên": "Nguyễn Văn An",
        Email: "an.nguyen@gmail.com",
        "Điểm IELTS": 5.5,
        "Số điện thoại": "0987654321",
        "Ngày sinh": "15/08/2008",
        "Giới tính": "Nam",
      },
      {
        STT: 2,
        "Họ và tên": "Trần Thị Mai",
        Email: "mai.tran@gmail.com",
        "Điểm IELTS": 7.0,
        "Số điện thoại": "0912345678",
        "Ngày sinh": "20/11/2008",
        "Giới tính": "Nữ",
      },
      {
        STT: 3,
        "Họ và tên": "Lê Hoàng Long",
        Email: "long.le@gmail.com",
        "Điểm IELTS": 3.5,
        "Số điện thoại": "0901234567",
        "Ngày sinh": "10/05/2008",
        "Giới tính": "Nam",
      },
      {
        STT: 4,
        "Họ và tên": "Phạm Quỳnh Anh",
        Email: "quynhanh.pham@gmail.com",
        "Điểm IELTS": 5.0,
        "Số điện thoại": "0934567890",
        "Ngày sinh": "12/03/2008",
        "Giới tính": "Nữ",
      },
      {
        STT: 5,
        "Họ và tên": "Hoàng Đức Minh",
        Email: "ducminh.hoang@gmail.com",
        "Điểm IELTS": 6.5,
        "Số điện thoại": "0945678901",
        "Ngày sinh": "25/09/2008",
        "Giới tính": "Nam",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hoc_Vien_IELTS");
    XLSX.writeFile(wb, "SIMPACE_Mau_Import_Hoc_Vien_IELTS.xlsx");
  };

  // Xử lý upload file Excel -> Validate -> Sinh gợi ý phân lớp Suggestion
  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setExcelFile(selected);
    setExcelError("");
    setAllocationSuggestion(null);
    setInvalidRowsList([]);
    setActionNotification("");
    setAnalyzingExcel(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      let res: any;

      try {
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        res = await parseAndValidateBulkStudentsAction(base64);
      } catch (networkErr: any) {
        console.warn("[handleExcelChange] Server Action call failed, using client fallback:", networkErr);
      }

      // Nếu Server Action không trả về hoặc lỗi mạng -> Tự động parse trên Client bằng XLSX
      if (!res || !res.success) {
        try {
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (rawRows.length < 2) {
            setExcelError("Tệp Excel rỗng hoặc không có dòng dữ liệu hợp lệ!");
            return;
          }

          const header = rawRows[0].map((h: any) => (h ? String(h).trim().toLowerCase() : ""));
          const colFullName = header.findIndex((h: string) => h.includes("họ và tên") || h.includes("họ tên") || h === "name" || h === "fullname");
          const colEmail = header.findIndex((h: string) => h.includes("email") || h.includes("thư điện tử"));
          const colPhone = header.findIndex((h: string) => h.includes("số điện thoại") || h.includes("sđt") || h.includes("phone"));
          const colDob = header.findIndex((h: string) => h.includes("ngày sinh") || h.includes("dob") || h.includes("birth"));
          const colGender = header.findIndex((h: string) => h.includes("giới tính") || h.includes("gender"));
          const colScore = header.findIndex(
            (h: string) =>
              h.includes("điểm ielts") ||
              h.includes("điểm đầu vào") ||
              h.includes("ielts") ||
              h.includes("score") ||
              h.includes("band")
          );

          if (colFullName === -1 || colEmail === -1 || colScore === -1) {
            setExcelError("Tệp tải lên thiếu các cột bắt buộc: 'Họ và tên', 'Email', 'Điểm IELTS'!");
            return;
          }

          const activeLevels = (ieltsLevels && ieltsLevels.length > 0)
            ? ieltsLevels
            : [
                { id: "lvl-basic", code: "BASIC", name: "Cơ bản", minScore: 0.0, maxScore: 4.5, targetClassCount: 1 },
                { id: "lvl-medium", code: "MEDIUM", name: "Trung bình", minScore: 4.5, maxScore: 6.5, targetClassCount: 2 },
                { id: "lvl-advanced", code: "ADVANCED", name: "Nâng cao", minScore: 6.5, maxScore: 9.0, targetClassCount: 3 },
              ];

          const existingEmailSet = new Set((users || []).map((u: any) => u.email?.toLowerCase()));
          const validRows: ValidatedStudentRow[] = [];
          const invalidRows: InvalidStudentRow[] = [];
          const seenEmailsInFile = new Set<string>();

          for (let i = 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0 || row.every((c: any) => c === null || c === undefined || String(c).trim() === "")) {
              continue;
            }

            const rowNumber = i + 1;
            const fullName = row[colFullName] ? String(row[colFullName]).trim() : "";
            const rawEmail = row[colEmail] ? String(row[colEmail]).trim().toLowerCase() : "";
            const rawPhone = colPhone !== -1 && row[colPhone] ? String(row[colPhone]).trim() : "";
            const rawDob = colDob !== -1 && row[colDob] ? String(row[colDob]).trim() : "";
            const rawGender = colGender !== -1 && row[colGender] ? String(row[colGender]).trim().toLowerCase() : "";
            const rawScoreVal = row[colScore];

            if (!fullName) {
              invalidRows.push({ rowNumber, email: rawEmail, rawScore: rawScoreVal, errorReason: "Họ và tên không được để trống" });
              continue;
            }
            if (!rawEmail) {
              invalidRows.push({ rowNumber, fullName, rawScore: rawScoreVal, errorReason: "Email không được để trống" });
              continue;
            }
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(rawEmail)) {
              invalidRows.push({ rowNumber, fullName, email: rawEmail, rawScore: rawScoreVal, errorReason: "Email không đúng định dạng chuẩn RFC 5322" });
              continue;
            }
            if (seenEmailsInFile.has(rawEmail)) {
              invalidRows.push({ rowNumber, fullName, email: rawEmail, rawScore: rawScoreVal, errorReason: "Email bị trùng lặp trong tệp" });
              continue;
            }
            seenEmailsInFile.add(rawEmail);

            if (existingEmailSet.has(rawEmail)) {
              invalidRows.push({ rowNumber, fullName, email: rawEmail, rawScore: rawScoreVal, errorReason: "Email đã tồn tại trong hệ thống" });
              continue;
            }

            const score = Number(String(rawScoreVal).replace(",", "."));
            if (rawScoreVal === null || rawScoreVal === undefined || isNaN(score) || score < 0 || score > 9.0) {
              invalidRows.push({ rowNumber, fullName, email: rawEmail, rawScore: rawScoreVal, errorReason: "Điểm IELTS phải là số từ 0.0 đến 9.0" });
              continue;
            }

            const matchedLevel = activeLevels.find((lvl: any, idx: number) => {
              if (idx === activeLevels.length - 1) return score >= lvl.minScore && score <= lvl.maxScore;
              return score >= lvl.minScore && score < lvl.maxScore;
            }) || activeLevels.find((lvl: any) => score >= lvl.minScore && score <= lvl.maxScore) || activeLevels[0];

            let gender: "MALE" | "FEMALE" | "OTHER" = "MALE";
            if (rawGender.includes("nữ") || rawGender === "female" || rawGender === "f") gender = "FEMALE";
            else if (rawGender.includes("khác") || rawGender === "other") gender = "OTHER";

            validRows.push({
              rowNumber,
              fullName,
              email: rawEmail,
              phoneNumber: rawPhone || undefined,
              dateOfBirth: rawDob || undefined,
              gender,
              ieltsScore: score,
              levelId: matchedLevel.id,
              levelCode: matchedLevel.code,
              levelName: matchedLevel.name,
            });
          }

          res = { success: true, validRows, invalidRows };
        } catch (clientParseErr: any) {
          setExcelError("Không thể đọc tệp: " + (clientParseErr.message || String(clientParseErr)));
          return;
        }
      }

      setInvalidRowsList(res.invalidRows || []);

      if (!res.validRows || res.validRows.length === 0) {
        setExcelError("Không tìm thấy dòng học sinh hợp lệ nào để phân lớp! Vui lòng kiểm tra danh sách lỗi bên dưới.");
        return;
      }

      // Tạo phương án phân lớp đề xuất
      let sugRes: any = null;
      try {
        sugRes = await generateBulkClassSuggestionAction(res.validRows, selectedSchoolId);
      } catch (sugErr) {
        console.warn("[handleExcelChange] Server suggestion failed, using client fallback:", sugErr);
      }

      if (!sugRes || !sugRes.success || !sugRes.suggestion) {
        // Client fallback tạo phương án phân lớp đề xuất
        const schoolObj = schools.find((s) => s.id === selectedSchoolId);
        const schoolCode = schoolObj ? schoolObj.code.replace(/[^a-zA-Z0-9]/g, "") : "TD";
        const studentsByLevel: Record<string, any[]> = {};
        for (const s of res.validRows) {
          if (!studentsByLevel[s.levelId]) studentsByLevel[s.levelId] = [];
          studentsByLevel[s.levelId].push(s);
        }
        const levelPlans: any[] = [];
        let totalClasses = 0;
        let totalAllocatedStudents = 0;
        for (const lvlId in studentsByLevel) {
          const stList = studentsByLevel[lvlId];
          const first = stList[0];
          const classCount = 1;
          const assignedClasses: any[] = [{
            tempId: `temp_${first.levelCode}_1_${Date.now()}`,
            levelId: first.levelId,
            levelCode: first.levelCode,
            levelName: first.levelName,
            classIndex: 1,
            code: `IELTS_${first.levelCode}_${schoolCode}_01`,
            name: `IELTS ${first.levelName} - Lớp 01`,
            capacity: Math.max(30, stList.length + 5),
            students: stList,
          }];
          totalClasses += 1;
          totalAllocatedStudents += stList.length;
          levelPlans.push({
            levelId: first.levelId,
            levelCode: first.levelCode,
            levelName: first.levelName,
            studentCount: stList.length,
            classCount: 1,
            classes: assignedClasses,
          });
        }
        sugRes = {
          success: true,
          suggestion: {
            summary: {
              totalRows: res.validRows.length,
              totalValid: res.validRows.length,
              totalInvalid: res.invalidRows?.length || 0,
              totalLevels: levelPlans.length,
              totalClasses,
              totalAllocatedStudents,
            },
            levelPlans,
            invalidRows: res.invalidRows || [],
          },
        };
      }

      setAllocationSuggestion(sugRes.suggestion);
      setExcelStep("suggestion");
    } catch (err: any) {
      setExcelError("Không thể đọc tệp: " + (err.message || String(err)));
    } finally {
      setAnalyzingExcel(false);
    }
  };

  // Điều chỉnh số lớp của 1 trình độ & chia đều lại toàn bộ
  const handleConfirmAdjustClassCount = async () => {
    if (!adjustClassLevel || !allocationSuggestion) return;

    const count = Math.floor(newClassCountInput);
    if (count < 1) return;

    const school = schools.find((s) => s.id === selectedSchoolId);
    const schoolCode = school ? school.code.replace(/[^a-zA-Z0-9]/g, "") : "TD";

    const res = await rebalanceOnClassCountChangeAction(
      adjustClassLevel,
      count,
      schoolCode
    );

    if (!res.success || !res.updatedPlan) {
      alert(res.error || "Không thể điều chỉnh số lớp!");
      return;
    }

    const nextPlans = allocationSuggestion.levelPlans.map((p) =>
      p.levelId === res.updatedPlan!.levelId ? res.updatedPlan! : p
    );

    const newTotalClasses = nextPlans.reduce((acc, p) => acc + p.classes.length, 0);

    setAllocationSuggestion({
      ...allocationSuggestion,
      summary: {
        ...allocationSuggestion.summary,
        totalClasses: newTotalClasses,
      },
      levelPlans: nextPlans,
    });

    setActionNotification(res.message || "Đã điều chỉnh số lớp và phân bổ lại toàn bộ học sinh!");
    setAdjustClassLevel(null);
  };

  // Chuyển học sinh giữa các lớp cùng trình độ & chia đều lại
  const handleConfirmTransfer = async () => {
    if (!transferStudent || !targetClassTempId || !allocationSuggestion) return;
    setTransferError("");

    const currentPlan = allocationSuggestion.levelPlans.find(
      (p) => p.levelId === transferStudent.levelId
    );
    if (!currentPlan) {
      setTransferError("Không tìm thấy kế hoạch phân lớp cho trình độ này!");
      return;
    }

    const targetClass = currentPlan.classes.find((c) => c.tempId === targetClassTempId);
    if (!targetClass) {
      setTransferError("Chỉ được chuyển học sinh sang lớp cùng trình độ IELTS!");
      return;
    }

    const school = schools.find((s) => s.id === selectedSchoolId);
    const schoolCode = school ? school.code.replace(/[^a-zA-Z0-9]/g, "") : "TD";

    const res = await rebalanceOnStudentTransferAction(
      currentPlan,
      transferStudent.email,
      targetClassTempId,
      schoolCode
    );

    if (!res.success || !res.updatedPlan) {
      setTransferError(res.error || "Lỗi khi chuyển lớp!");
      return;
    }

    const nextPlans = allocationSuggestion.levelPlans.map((p) =>
      p.levelId === res.updatedPlan!.levelId ? res.updatedPlan! : p
    );

    setAllocationSuggestion({
      ...allocationSuggestion,
      levelPlans: nextPlans,
    });

    if (selectedClassDetail) {
      const updatedClass = res.updatedPlan.classes.find(
        (c) => c.classIndex === selectedClassDetail.classIndex
      );
      if (updatedClass) {
        setSelectedClassDetail(updatedClass);
      }
    }

    setActionNotification(res.message || "Đã chuyển học sinh và tự động cân bằng lại sĩ số các lớp trong trình độ!");
    setTransferStudent(null);
    setTargetClassTempId("");
  };

  // Xác nhận lưu phân lớp hàng loạt vào database
  const handleCommitAllocation = async () => {
    if (!allocationSuggestion || !selectedSchoolId) return;
    setCommittingExcel(true);
    try {
      const res = await commitBulkAllocationAction(
        allocationSuggestion.levelPlans,
        selectedSchoolId,
        excelFile?.name || "import_ielts.xlsx"
      );

      if (!res.success) {
        setExcelError(res.error || "Lỗi khi lưu dữ liệu phân lớp!");
        setConfirmCommitOpen(false);
      } else {
        setConfirmCommitOpen(false);
        onOpenChange(false);
        onCreatedSuccess({
          fullName: `Đã phân lớp và khởi tạo thành công ${allocationSuggestion.summary.totalAllocatedStudents} học viên vào ${allocationSuggestion.summary.totalClasses} lớp IELTS`,
          username: "HV...",
          email: "Đã gửi thông tin tài khoản qua email",
          role: "Học sinh",
          mailResult: { sent: true },
        });
      }
    } catch (err: any) {
      setExcelError("Lỗi hệ thống khi phân lớp: " + (err.message || String(err)));
      setConfirmCommitOpen(false);
    } finally {
      setCommittingExcel(false);
    }
  };

  // Submit form thêm thủ công
  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailValue.trim().toLowerCase())) {
      setErrorMsg("Email không đúng định dạng chuẩn có tên miền (VD: name@simpace.edu.vn)!");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);

    const schoolIds = managerSchools.filter(Boolean);
    const classIds =
      selectedRole === "STUDENT"
        ? studentClasses.filter(Boolean)
        : staffClasses.filter(Boolean);

    if (selectedRole === "SCHOOL_MANAGER" && schoolIds.length === 0) {
      setErrorMsg("Quản nhiệm bắt buộc phải được phân công ít nhất 1 trường học phụ trách!");
      return;
    }
    if (selectedRole === "TEACHER" && classIds.length === 0) {
      setErrorMsg("Giáo viên bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!");
      return;
    }
    if (selectedRole === "TEACHING_ASSISTANT" && classIds.length === 0) {
      setErrorMsg("Trợ giảng bắt buộc phải được phân công ít nhất 1 lớp học phụ trách!");
      return;
    }

    let parsedScore: number | undefined = undefined;
    let levelId: string | undefined = undefined;

    if (selectedRole === "STUDENT") {
      parsedScore = parseFloat(entryIeltsScoreInput);
      if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 9) {
        setErrorMsg("Học sinh bắt buộc phải có Điểm IELTS đầu vào hợp lệ từ 0.0 đến 9.0!");
        return;
      }
      if (!detectedManualLevel) {
        setErrorMsg("Không tìm thấy trình độ IELTS phù hợp với điểm này trong Cài đặt! Vui lòng cấu hình khoảng điểm trước.");
        return;
      }
      levelId = detectedManualLevel.id;
    }

    startTransition(async () => {
      const res = await createUserAction({
        fullName: formData.get("fullName")?.toString() || "",
        email: emailValue.trim().toLowerCase(),
        roleCode: selectedRole,
        phoneNumber: formData.get("phoneNumber")?.toString(),
        address: selectedRole === "STUDENT" ? undefined : formData.get("address")?.toString(),
        dateOfBirth: formData.get("dateOfBirth")?.toString() || undefined,
        gender: (formData.get("gender")?.toString() as any) || undefined,
        schoolIds: selectedRole === "SCHOOL_MANAGER" ? schoolIds : undefined,
        classIds:
          selectedRole === "TEACHER" ||
          selectedRole === "TEACHING_ASSISTANT" ||
          (selectedRole === "STUDENT" && classIds.length > 0)
            ? classIds
            : undefined,
        entryIeltsScore: parsedScore,
        ieltsLevelId: levelId,
      });

      if (!res.success || !res.user) {
        setErrorMsg(res.error || "Không thể tạo người dùng!");
        return;
      }

      form.reset();
      setEntryIeltsScoreInput("");
      onCreatedSuccess({
        fullName: res.user.profile?.fullName,
        username: res.user.username,
        email: res.user.email,
        role: res.user.role?.name,
        mailResult: res.mailResult,
      });
    });
  };

  const roleOptions: { code: RoleCode; label: string; desc: string; prefix: string }[] = [
    { code: "STUDENT", label: "Học sinh", desc: "Theo học các lớp đối tác", prefix: "HV" },
    { code: "TEACHER", label: "Giáo viên", desc: "Giảng dạy chuyên môn", prefix: "GV" },
    { code: "TEACHING_ASSISTANT", label: "Trợ giảng (TA)", desc: "Hỗ trợ học tập & lớp", prefix: "TG" },
    { code: "SCHOOL_MANAGER", label: "Quản nhiệm", desc: "Quản lý trường học đối tác", prefix: "QN" },
    { code: "ADMIN", label: "Quản trị viên", desc: "Toàn quyền hệ thống", prefix: "AD" },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`transition-all duration-200 ${
            modalMode === "excel" && excelStep === "suggestion" ? "max-w-5xl" : "max-w-2xl"
          } max-h-[92vh] overflow-y-auto`}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {modalMode === "excel" && excelStep === "suggestion"
                ? "Phương án đề xuất phân lớp học sinh IELTS"
                : "Thêm người dùng mới"}
            </DialogTitle>
            <DialogDescription>
              {modalMode === "excel" && excelStep === "suggestion"
                ? "Kiểm tra sĩ số, điều chỉnh số lớp, chuyển học sinh giữa các lớp cùng trình độ và xác nhận khởi tạo."
                : "Tạo tài khoản đơn lẻ theo vai trò hoặc tải danh sách học sinh hàng loạt để tự động phân lớp IELTS."}
            </DialogDescription>
          </DialogHeader>

          {/* BƯỚC 1: CHỌN VAI TRÒ NGƯỜI DÙNG (ROLE-FIRST) */}
          <div className="pt-1">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                1. Chọn Vai trò người dùng *
              </label>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-orange-50 text-[#EA580C] rounded-lg border border-orange-200">
                Mã dự kiến: <b className="font-mono">{previewCode}</b>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {roleOptions.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => {
                    setSelectedRole(r.code);
                    if (r.code !== "STUDENT") {
                      setModalMode("manual");
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    selectedRole === r.code
                      ? "border-[#EA580C] bg-[#FFF1EB] text-[#EA580C] shadow-sm ring-1 ring-[#EA580C]"
                      : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1]"
                  }`}
                >
                  <span className="font-bold text-xs">{r.label}</span>
                  <span className="text-[10px] text-[#64748B] mt-0.5 line-clamp-1">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CHỈ KHI CHỌN VAI TRÒ LÀ HỌC SINH MỚI HIỂN THỊ TAB NHẬP HÀNG LOẠT & PHÂN LỚP IELTS */}
          {selectedRole === "STUDENT" && (
            <div className="flex border-b border-[#E2E8F0] gap-4 text-sm font-semibold pt-1">
              <button
                type="button"
                onClick={() => {
                  setModalMode("manual");
                  setExcelStep("upload");
                }}
                className={`pb-2.5 transition border-b-2 ${
                  modalMode === "manual"
                    ? "border-[#EA580C] text-[#EA580C]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Thêm thủ công (Từng người)
              </button>
              <button
                type="button"
                onClick={() => setModalMode("excel")}
                className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
                  modalMode === "excel"
                    ? "border-[#EA580C] text-[#EA580C]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                <FileSpreadsheet className="size-4" /> Nhập hàng loạt & Phân lớp IELTS
              </button>
            </div>
          )}

          {/* ========================================================
              NỘI DUNG FORM: THỦ CÔNG HOẶC NHẬP HÀNG LOẠT (CHỈ HỌC SINH)
              ======================================================== */}
          {!(selectedRole === "STUDENT" && modalMode === "excel") ? (
            <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {errorMsg}
                </div>
              )}

              {/* BƯỚC 2: THÔNG TIN CÁ NHÂN CƠ BẢN */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                  2. Thông tin cá nhân cơ bản
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    name="fullName"
                    label="Họ và tên *"
                    placeholder="Nhập họ và tên đầy đủ"
                    required
                  />
                  <div>
                    <label className="text-sm font-semibold">
                      Địa chỉ Email *
                      <input
                        name="email"
                        type="email"
                        className="field mt-2"
                        placeholder="name@simpace.edu.vn"
                        value={emailValue}
                        onChange={(e) => validateEmail(e.target.value)}
                        required
                      />
                    </label>
                    {emailError && (
                      <span className="text-xs text-rose-500 mt-1 block font-medium">
                        {emailError}
                      </span>
                    )}
                  </div>
                  <Field
                    name="phoneNumber"
                    label="Số điện thoại"
                    placeholder="0987xxxxxx"
                  />

                  {/* Đối với Học sinh: BỎ trường Địa chỉ theo đặc tả; hiển thị Điểm IELTS đầu vào */}
                  {selectedRole === "STUDENT" ? (
                    <div>
                      <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                        Điểm IELTS đầu vào *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="9"
                        placeholder="Nhập điểm từ 0.0 - 9.0 (VD: 5.5)"
                        className="field"
                        value={entryIeltsScoreInput}
                        onChange={(e) => setEntryIeltsScoreInput(e.target.value)}
                        required
                      />
                    </div>
                  ) : (
                    <Field
                      name="address"
                      label="Địa chỉ thường trú"
                      placeholder="Số nhà, đường, quận/huyện..."
                    />
                  )}

                  <div>
                    <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                      Ngày sinh
                    </label>
                    <input
                      name="dateOfBirth"
                      type="date"
                      className="field"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                      Giới tính
                    </label>
                    <select name="gender" className="field" defaultValue="">
                      <option value="">-- Chọn giới tính --</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>

                  {/* Thẻ hiển thị Trình độ IELTS tự động suy ra cho Học sinh (Read-only) */}
                  {selectedRole === "STUDENT" && (
                    <div className="sm:col-span-2 rounded-xl border border-orange-200 bg-[#FFF7ED] p-3 text-xs">
                      <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="size-4 text-[#EA580C]" />
                        Trình độ IELTS tương ứng (Hệ thống tự động xác định - Read-only):
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        {detectedManualLevel ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs">
                            <Check className="size-3.5" />
                            {detectedManualLevel.name} ({detectedManualLevel.code}) — Thang điểm {Number(detectedManualLevel.minScore).toFixed(1)} - {Number(detectedManualLevel.maxScore).toFixed(1)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs">
                            {entryIeltsScoreInput
                              ? "Chưa có trình độ khớp khoảng điểm này trong Cài đặt"
                              : "Vui lòng nhập điểm IELTS để hệ thống tự xác định trình độ"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        * Theo quy tắc nghiệp vụ: Admin không được tự ý sửa trình độ do hệ thống xác định. Form thủ công không tự động đề xuất phân lớp.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* BƯỚC 3: CÁC TRƯỜNG ĐẶC THÙ & GÁN ĐA NHIỆM (+) THEO VAI TRÒ */}
              <div className="pt-2 border-t border-[#E2E8F0]">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
                  3. Phân công & Nhiệm vụ theo vị trí
                </label>

                {/* A. QUẢN NHIỆM */}
                {selectedRole === "SCHOOL_MANAGER" && (
                  <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          Trường học phụ trách (Quản lý đa trường) *
                        </h4>
                        <p className="text-xs text-[#64748B]">
                          Bắt buộc chọn ít nhất 1 trường đối tác quản lý.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setManagerSchools((prev) => [...prev, ""])}
                          className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                        >
                          <Plus className="size-3.5 mr-1" /> Thêm trường
                        </Button>
                        {onAddSchoolShortcut && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onAddSchoolShortcut}
                            title="Tạo nhanh trường mới"
                            className="text-xs h-7"
                          >
                            <CirclePlus className="size-3.5 mr-1 text-[#EA580C]" /> Tạo trường mới
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      {managerSchools.map((schId, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            className="field text-sm"
                            value={schId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManagerSchools((prev) => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                          >
                            <option value="">-- Chọn trường học phụ trách #{idx + 1} * --</option>
                            {schools.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.code})
                              </option>
                            ))}
                          </select>
                          {managerSchools.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setManagerSchools((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* B. GIÁO VIÊN */}
                {selectedRole === "TEACHER" && (
                  <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          Lớp học phụ trách giảng dạy *
                        </h4>
                        <p className="text-xs text-[#64748B]">
                          Bắt buộc chọn ít nhất 1 lớp học giảng dạy.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStaffClasses((prev) => [...prev, ""])}
                          className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                        >
                          <Plus className="size-3.5 mr-1" /> Thêm lớp
                        </Button>
                        {onAddClassShortcut && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onAddClassShortcut}
                            title="Tạo nhanh lớp mới"
                            className="text-xs h-7"
                          >
                            <CirclePlus className="size-3.5 mr-1 text-[#EA580C]" /> Tạo lớp mới
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      {staffClasses.map((cId, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            className="field text-sm"
                            value={cId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStaffClasses((prev) => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                          >
                            <option value="">-- Chọn lớp học #{idx + 1} * --</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code}) - {c.school?.name}
                              </option>
                            ))}
                          </select>
                          {staffClasses.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setStaffClasses((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* C. TRỢ GIẢNG */}
                {selectedRole === "TEACHING_ASSISTANT" && (
                  <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">
                          Lớp học phụ trách trợ giảng *
                        </h4>
                        <p className="text-xs text-[#64748B]">
                          Bắt buộc chọn ít nhất 1 lớp học trợ giảng.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStaffClasses((prev) => [...prev, ""])}
                          className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                        >
                          <Plus className="size-3.5 mr-1" /> Thêm lớp
                        </Button>
                        {onAddClassShortcut && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onAddClassShortcut}
                            title="Tạo nhanh lớp mới"
                            className="text-xs h-7"
                          >
                            <CirclePlus className="size-3.5 mr-1 text-[#EA580C]" /> Tạo lớp mới
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      {staffClasses.map((cId, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            className="field text-sm"
                            value={cId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStaffClasses((prev) => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                          >
                            <option value="">-- Chọn lớp trợ giảng #{idx + 1} * --</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code}) - {c.school?.name}
                              </option>
                            ))}
                          </select>
                          {staffClasses.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setStaffClasses((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* D. HỌC SINH (Gán lớp thủ công nếu muốn) */}
                {selectedRole === "STUDENT" && (
                  <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A]">Gán lớp học (Tùy chọn)</h4>
                        <p className="text-xs text-[#64748B]">
                          Nhập thủ công không tự động đề xuất phân lớp. Bạn có thể chọn lớp ngay hoặc gán sau.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStudentClasses((prev) => [...prev, ""])}
                          className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
                        >
                          <Plus className="size-3.5 mr-1" /> Thêm lớp
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      {studentClasses.map((cId, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <select
                            className="field text-sm"
                            value={cId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStudentClasses((prev) => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                          >
                            <option value="">-- Chọn lớp học #{idx + 1} (Không bắt buộc) --</option>
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.code}) - {c.school?.name}
                              </option>
                            ))}
                          </select>
                          {studentClasses.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setStudentClasses((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* E. QUẢN TRỊ VIÊN */}
                {selectedRole === "ADMIN" && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <b>Lưu ý:</b> Tài khoản Quản trị viên có toàn quyền kiểm soát toàn bộ hệ thống.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !!emailError}
                  className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white"
                >
                  {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null} Tạo tài khoản
                </Button>
              </div>
            </form>
          ) : (
            /* ========================================================
               CHẾ ĐỘ 2: NHẬP HÀNG LOẠT & ĐỀ XUẤT PHÂN LỚP IELTS
               ======================================================== */
            <div className="space-y-4 pt-2">
              {actionNotification && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 flex items-center justify-between">
                  <span>{actionNotification}</span>
                  <button
                    type="button"
                    onClick={() => setActionNotification("")}
                    className="text-emerald-600 hover:text-emerald-900 ml-2"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {excelError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200 flex items-center justify-between">
                  <span>{excelError}</span>
                  <button
                    type="button"
                    onClick={() => setExcelError("")}
                    className="text-red-500 hover:text-red-800 ml-2"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}

              {/* BƯỚC 1: UPLOAD & VALIDATE FILE */}
              {excelStep === "upload" && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-xs font-bold text-[#0F172A] block mb-1.5">
                        Trường học đối tác áp dụng *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={selectedSchoolId}
                          onChange={(e) => setSelectedSchoolId(e.target.value)}
                          className="field text-xs flex-1"
                        >
                          {schools.length === 0 && (
                            <option value="">-- Chưa có trường học nào --</option>
                          )}
                          {schools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                        {onAddSchoolShortcut && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onAddSchoolShortcut}
                            title="Tạo trường học mới (Điều hướng đến trang Quản lý trường học)"
                            className="h-9 px-2.5 text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 shrink-0 font-medium"
                          >
                            <Plus className="size-3.5 mr-1" /> Thêm trường
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Các lớp học IELTS được đề xuất sẽ thuộc về trường đối tác này.
                      </p>
                    </div>

                    <div className="flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A]">File mẫu Excel chuẩn SIMPACE</h4>
                        <p className="text-[11px] text-[#64748B]">
                          Gồm các cột: Họ và tên, Email, Điểm IELTS, SĐT, Ngày sinh, Giới tính (Không có Địa chỉ và Trình độ).
                        </p>
                      </div>
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadSample}
                          className="text-xs border-[#CBD5E1] text-[#0F172A] hover:border-[#EA580C] h-8 w-full sm:w-auto"
                        >
                          <Download className="size-3.5 mr-1.5 text-[#EA580C]" /> Tải file mẫu (.xlsx)
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Dropzone */}
                  <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#EA580C] rounded-2xl p-6 text-center transition bg-[#F8FAFC]">
                    <FileSpreadsheet className="size-10 mx-auto text-[#EA580C] mb-2" />
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {excelFile ? excelFile.name : "Kéo thả file Excel học viên vào đây hoặc duyệt file"}
                    </p>
                    <p className="text-xs text-[#94A3B8] mt-1">Hỗ trợ định dạng .xlsx, .xls hoặc .csv</p>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelChange}
                      className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#FFF1EB] file:text-[#EA580C] hover:file:bg-[#FFE5D6] cursor-pointer"
                    />
                  </div>

                  {analyzingExcel && (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-[#EA580C] font-medium">
                      <Loader2 className="size-5 animate-spin" /> Đang kiểm tra dữ liệu và tự động đề xuất phân lớp...
                    </div>
                  )}

                  {/* Bảng lỗi nếu có dòng lỗi trước khi phân lớp */}
                  {invalidRowsList.length > 0 && !allocationSuggestion && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-rose-700">
                          Phát hiện {invalidRowsList.length} dòng không hợp lệ:
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto text-xs text-rose-600 space-y-1">
                        {invalidRowsList.map((err, idx) => (
                          <div key={idx} className="border-b border-rose-100 pb-1">
                            • Dòng {err.rowNumber}: {err.fullName || "Chưa có tên"} ({err.email || "Không có email"}) — Điểm: {err.rawScore ?? "Trống"} — <i>{err.errorReason}</i>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BƯỚC 2: MÀN HÌNH SUGGESTION PHÂN LỚP TƯƠNG TÁC */}
              {excelStep === "suggestion" && allocationSuggestion && (
                <div className="space-y-4">
                  {/* Top bar điều hướng */}
                  <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="text-xs text-slate-600">
                      Đang xử lý tệp: <b className="text-slate-800">{excelFile?.name}</b> — Trường học:{" "}
                      <b className="text-slate-800">
                        {schools.find((s) => s.id === selectedSchoolId)?.name || "Chưa chọn"}
                      </b>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setExcelStep("upload");
                        setAllocationSuggestion(null);
                        setExcelFile(null);
                      }}
                      className="text-xs h-7 gap-1"
                    >
                      <RotateCcw className="size-3" /> Tải tệp khác
                    </Button>
                  </div>

                  {/* 1. KHU VỰC TỔNG QUAN (6 CHỈ SỐ THEO ĐẶC TẢ) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                    {/* Chỉ số 1: Tổng HS hợp lệ */}
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-emerald-700">1. HS hợp lệ</span>
                      <b className="text-xl text-emerald-800 mt-1">{allocationSuggestion.summary.totalValid}</b>
                    </div>

                    {/* Chỉ số 2: Tổng HS chưa hợp lệ */}
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col justify-between">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-medium text-rose-700">2. HS chưa hợp lệ</span>
                        {invalidRowsList.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowInvalidListModal(true)}
                            className="text-[10px] text-rose-600 underline hover:text-rose-800"
                            title="Xem chi tiết các dòng lỗi"
                          >
                            Xem lỗi
                          </button>
                        )}
                      </div>
                      <b className="text-xl text-rose-800 mt-1">{invalidRowsList.length}</b>
                    </div>

                    {/* Chỉ số 3: Số trình độ IELTS */}
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-indigo-700">3. Số trình độ</span>
                      <b className="text-xl text-indigo-800 mt-1">{allocationSuggestion.levelPlans.length}</b>
                    </div>

                    {/* Chỉ số 4: Tổng số lớp dự kiến */}
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-[#EA580C]">4. Tổng lớp dự kiến</span>
                      <b className="text-xl text-orange-800 mt-1">{allocationSuggestion.summary.totalClasses}</b>
                    </div>

                    {/* Chỉ số 5: Tổng HS đã phân lớp */}
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-sky-700">5. Đã phân lớp</span>
                      <b className="text-xl text-sky-800 mt-1">{allocationSuggestion.summary.totalAllocatedStudents}</b>
                    </div>

                    {/* Chỉ số 6: HS chưa phân lớp */}
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex flex-col justify-between">
                      <span className="text-[11px] font-medium text-slate-600">6. Chưa phân lớp</span>
                      <b className="text-xl text-slate-800 mt-1">
                        {Math.max(
                          0,
                          allocationSuggestion.summary.totalValid -
                            allocationSuggestion.summary.totalAllocatedStudents
                        )}
                      </b>
                    </div>
                  </div>

                  {/* 2. KHU VỰC DANH SÁCH LỚP (NHÓM THEO TRÌNH ĐỘ IELTS) */}
                  <div className="space-y-4 pt-1">
                    {allocationSuggestion.levelPlans.map((plan) => (
                      <div
                        key={plan.levelId}
                        className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white shadow-sm"
                      >
                        {/* Header trình độ: Tên trình độ, Sĩ số, Số lớp cấu hình, Nút điều chỉnh số lớp */}
                        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-3.5 flex flex-wrap justify-between items-center gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 bg-orange-100 text-[#EA580C] font-bold text-xs rounded-lg">
                              {plan.levelCode}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-[#0F172A]">
                                Trình độ: {plan.levelName}
                              </h3>
                              <p className="text-xs text-[#64748B]">
                                Tổng số học sinh: <b>{plan.studentCount}</b> — Số lớp hiện tại:{" "}
                                <b>{plan.classCount}</b> (Sĩ số trung bình ~
                                {Math.round(plan.studentCount / Math.max(1, plan.classCount))} HV/lớp)
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdjustClassLevel(plan);
                              setNewClassCountInput(plan.classCount);
                            }}
                            className="text-xs border-[#CBD5E1] text-[#0F172A] hover:border-[#EA580C] h-7 gap-1"
                          >
                            <Sliders className="size-3.5 text-[#EA580C]" /> Điều chỉnh số lớp
                          </Button>
                        </div>

                        {/* Danh sách các lớp được đề xuất trong trình độ này */}
                        <div className="p-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {plan.classes.map((c) => (
                            <div
                              key={c.tempId}
                              className="rounded-xl border border-slate-200 bg-[#FAFAFA] hover:bg-white hover:border-[#EA580C]/50 transition p-3 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex justify-between items-start gap-1">
                                  <h4 className="font-bold text-xs text-[#0F172A] line-clamp-1">{c.name}</h4>
                                  <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-200 text-slate-700">
                                    {c.students.length} HV
                                  </span>
                                </div>
                                <p className="text-[11px] font-mono text-[#64748B] mt-0.5">{c.code}</p>

                                {/* Preview 2 học sinh đầu tiên */}
                                <div className="mt-2 text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-1.5">
                                  {c.students.slice(0, 2).map((s, idx) => (
                                    <div key={idx} className="truncate">
                                      • {s.fullName} ({s.ieltsScore}đ)
                                    </div>
                                  ))}
                                  {c.students.length > 2 && (
                                    <div className="text-[10px] text-slate-400 italic">
                                      ... và {c.students.length - 2} học sinh khác
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedClassDetail(c)}
                                  className="text-xs text-[#EA580C] hover:bg-orange-50 h-7 px-2.5 gap-1 font-semibold"
                                >
                                  <Eye className="size-3.5" /> Chi tiết lớp
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Nút hành động cuối màn hình Suggestion */}
                  <div className="flex justify-between items-center pt-3 border-t border-[#E2E8F0]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setExcelStep("upload");
                      }}
                      className="text-xs"
                    >
                      <ChevronLeft className="size-3.5 mr-1" /> Quay lại Bước 1
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setConfirmCommitOpen(true)}
                      disabled={committingExcel || allocationSuggestion.summary.totalAllocatedStudents === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 gap-1.5 font-bold shadow-sm"
                    >
                      <Check className="size-4" /> Xác nhận phân lớp & Khởi tạo (
                      {allocationSuggestion.summary.totalAllocatedStudents} học viên)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================
          SUB-MODAL 1: CHI TIẾT LỚP HỌC (DANH SÁCH HỌC SINH & CHUYỂN LỚP)
          ======================================================== */}
      {selectedClassDetail && (
        <Dialog open={true} onOpenChange={() => setSelectedClassDetail(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center justify-between">
                <span>Chi tiết: {selectedClassDetail.name}</span>
                <span className="font-mono text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedClassDetail.code}
                </span>
              </DialogTitle>
              <DialogDescription>
                Trình độ: <b>{selectedClassDetail.levelName}</b> — Sĩ số dự kiến:{" "}
                <b>{selectedClassDetail.students.length} học sinh</b>
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mt-2">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2.5 font-bold text-slate-600">STT</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">Họ và tên</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">Email</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-center">Điểm IELTS</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600">SĐT</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-center">Giới tính</th>
                    <th className="px-3 py-2.5 font-bold text-slate-600 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedClassDetail.students.map((st, idx) => (
                    <tr key={st.email} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{st.fullName}</td>
                      <td className="px-3 py-2 text-slate-600">{st.email}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 bg-orange-100 text-[#EA580C] font-bold rounded font-mono">
                          {st.ieltsScore}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{st.phoneNumber || "—"}</td>
                      <td className="px-3 py-2 text-center text-slate-600">
                        {st.gender === "FEMALE" ? "Nữ" : st.gender === "MALE" ? "Nam" : "Khác"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTransferStudent(st);
                            setTargetClassTempId("");
                            setTransferError("");
                          }}
                          className="text-[11px] h-6 px-2 border-slate-200 text-[#EA580C] hover:bg-orange-50 gap-1"
                        >
                          <ArrowRightLeft className="size-3" /> Chuyển lớp
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={() => setSelectedClassDetail(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          SUB-MODAL 2: CHUYỂN HỌC SINH SANG LỚP KHÁC CÙNG TRÌNH ĐỘ
          ======================================================== */}
      {transferStudent && (
        <Dialog open={true} onOpenChange={() => setTransferStudent(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <ArrowRightLeft className="size-4 text-[#EA580C]" /> Chuyển lớp cho học sinh
              </DialogTitle>
              <DialogDescription>
                Chỉ cho phép chuyển học sinh sang lớp khác thuộc cùng trình độ IELTS ({transferStudent.levelName}).
              </DialogDescription>
            </DialogHeader>

            {transferError && (
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-200">
                {transferError}
              </div>
            )}

            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  Học sinh: <b className="text-slate-900">{transferStudent.fullName}</b> ({transferStudent.email})
                </div>
                <div>
                  Điểm IELTS: <b className="text-[#EA580C]">{transferStudent.ieltsScore}</b> — Trình độ:{" "}
                  <b className="text-slate-900">{transferStudent.levelName}</b>
                </div>
                <div>
                  Lớp hiện tại: <b className="text-slate-800">{selectedClassDetail?.name}</b>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chọn lớp đích (Cùng trình độ IELTS) *
                </label>
                {(() => {
                  const currentPlan = allocationSuggestion?.levelPlans.find(
                    (p) => p.levelId === transferStudent.levelId
                  );
                  const candidateClasses =
                    currentPlan?.classes.filter((c) => c.tempId !== selectedClassDetail?.tempId) || [];

                  if (candidateClasses.length === 0) {
                    return (
                      <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200">
                        Trình độ này hiện chỉ có 1 lớp duy nhất. Nếu muốn chia thêm lớp để chuyển học sinh, vui lòng
                        dùng tính năng &quot;Điều chỉnh số lớp&quot;.
                      </div>
                    );
                  }

                  return (
                    <select
                      className="field text-xs"
                      value={targetClassTempId}
                      onChange={(e) => setTargetClassTempId(e.target.value)}
                    >
                      <option value="">-- Chọn lớp tiếp nhận --</option>
                      {candidateClasses.map((cls) => (
                        <option key={cls.tempId} value={cls.tempId}>
                          {cls.name} ({cls.code}) — Hiện có {cls.students.length} HV
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-2.5 text-[11px] text-blue-800">
                <b>Quy tắc tự động chia lại:</b> Khi chuyển học sinh, hệ thống sẽ tự động tính toán và phân bổ lại toàn
                bộ học sinh thuộc trình độ này để đảm bảo sĩ số các lớp luôn cân bằng nhất.
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setTransferStudent(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                disabled={!targetClassTempId}
                onClick={handleConfirmTransfer}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white text-xs"
              >
                Xác nhận chuyển & Phân bổ lại
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          SUB-MODAL 3: ĐIỀU CHỈNH SỐ LỚP CỦA MỘT TRÌNH ĐỘ
          ======================================================== */}
      {adjustClassLevel && (
        <Dialog open={true} onOpenChange={() => setAdjustClassLevel(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Sliders className="size-4 text-[#EA580C]" /> Điều chỉnh số lớp: {adjustClassLevel.levelName}
              </DialogTitle>
              <DialogDescription>
                Thay đổi số lớp phân bổ cho trình độ này. Hệ thống sẽ tự động chia đều lại toàn bộ học sinh.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  Trình độ: <b className="text-slate-900">{adjustClassLevel.levelName}</b> ({adjustClassLevel.levelCode})
                </div>
                <div>
                  Tổng số học sinh thuộc trình độ: <b>{adjustClassLevel.studentCount}</b>
                </div>
                <div>
                  Số lớp hiện tại: <b>{adjustClassLevel.classCount}</b>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Số lớp mới mong muốn (Số nguyên dương &ge; 1) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  className="field text-sm"
                  value={newClassCountInput}
                  onChange={(e) => setNewClassCountInput(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
                <b>Cảnh báo:</b> Khi thay đổi số lớp, toàn bộ {adjustClassLevel.studentCount} học sinh của trình độ này
                sẽ được tự động chia đều lại vào {newClassCountInput} lớp mới (sĩ số ~
                {Math.floor(adjustClassLevel.studentCount / Math.max(1, newClassCountInput))} đến{" "}
                {Math.ceil(adjustClassLevel.studentCount / Math.max(1, newClassCountInput))} HV/lớp).
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setAdjustClassLevel(null)}>
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAdjustClassCount}
                className="bg-[#EA580C] hover:bg-[#EA580C]/90 text-white text-xs"
              >
                Lưu & Phân bổ lại toàn bộ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          SUB-MODAL 4: XEM DANH SÁCH DÒNG LỖI CỤ THỂ
          ======================================================== */}
      {showInvalidListModal && (
        <Dialog open={true} onOpenChange={() => setShowInvalidListModal(false)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="size-4" /> Danh sách học sinh chưa hợp lệ ({invalidRowsList.length})
              </DialogTitle>
              <DialogDescription>
                Các dòng dữ liệu bị từ chối do thiếu thông tin hoặc sai định dạng theo quy tắc hệ thống.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-x-auto rounded-xl border border-rose-200 mt-2">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-rose-50 border-b border-rose-200">
                    <th className="px-3 py-2 font-bold text-rose-700">Dòng</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Họ và tên</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Email</th>
                    <th className="px-3 py-2 font-bold text-rose-700 text-center">Điểm thô</th>
                    <th className="px-3 py-2 font-bold text-rose-700">Lý do từ chối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 bg-white">
                  {invalidRowsList.map((err, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/50">
                      <td className="px-3 py-2 font-mono text-slate-500">{err.rowNumber}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{err.fullName || "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{err.email || "—"}</td>
                      <td className="px-3 py-2 text-center font-mono">{String(err.rawScore ?? "—")}</td>
                      <td className="px-3 py-2 text-rose-600 font-medium">{err.errorReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="mt-3">
              <Button type="button" variant="outline" onClick={() => setShowInvalidListModal(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          SUB-MODAL 5: POPUP TỔNG KẾT & XÁC NHẬN PHÂN LỚP (COMMIT)
          ======================================================== */}
      {confirmCommitOpen && allocationSuggestion && (
        <Dialog open={true} onOpenChange={() => setConfirmCommitOpen(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Check className="size-5 text-emerald-600" /> Xác nhận phân lớp và khởi tạo
              </DialogTitle>
              <DialogDescription>
                Vui lòng kiểm tra lại phương án trước khi hệ thống ghi nhận vào cơ sở dữ liệu chính thức.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div>
                  Trường học tiếp nhận:{" "}
                  <b className="text-slate-900">
                    {schools.find((s) => s.id === selectedSchoolId)?.name || "Chưa chọn"}
                  </b>
                </div>
                <div>
                  Tổng số tài khoản học viên sẽ tạo:{" "}
                  <b className="text-emerald-700">{allocationSuggestion.summary.totalAllocatedStudents}</b>
                </div>
                <div>
                  Tổng số lớp học IELTS sẽ khởi tạo:{" "}
                  <b className="text-[#EA580C]">{allocationSuggestion.summary.totalClasses}</b>
                </div>
              </div>

              {/* Tóm tắt theo từng trình độ */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <b className="text-slate-800 block">Chi tiết phân bổ theo trình độ:</b>
                {allocationSuggestion.levelPlans.map((p) => (
                  <div key={p.levelId} className="flex justify-between items-center text-slate-600 border-b border-slate-100 pb-1">
                    <span>
                      Trình độ <b>{p.levelName}</b>:
                    </span>
                    <span>
                      <b>{p.classCount}</b> lớp ({p.studentCount} học viên)
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] text-emerald-800">
                <b>Bảo mật & Cấp tài khoản:</b> Mật khẩu khởi tạo chuẩn <code>Simpace@2026</code> sẽ được băm bảo mật và
                gửi tự động qua email cho từng học viên. Học viên sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={committingExcel}
                onClick={() => setConfirmCommitOpen(false)}
              >
                Quay lại kiểm tra
              </Button>
              <Button
                type="button"
                disabled={committingExcel}
                onClick={handleCommitAllocation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-bold"
              >
                {committingExcel ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Đồng ý khởi tạo & Phân lớp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

