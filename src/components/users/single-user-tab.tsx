"use client";

import React, { useState, useTransition } from "react";
import { Check, CirclePlus, Loader2, Plus, Sparkles, X } from "lucide-react";
import { RoleCode } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/common-widgets";
import { createUserAction } from "@/actions/users";

export interface SingleUserTabProps {
  selectedRole: RoleCode;
  schools: any[];
  classes: any[];
  ieltsLevels?: any[];
  onAddClassShortcut: () => void;
  onAddSchoolShortcut?: () => void;
  onCancel: () => void;
  onCreatedSuccess: (acc: any) => void;
}

export function SingleUserTab({
  selectedRole,
  schools,
  classes,
  ieltsLevels = [],
  onAddClassShortcut,
  onAddSchoolShortcut,
  onCancel,
  onCreatedSuccess,
}: SingleUserTabProps) {
  const [emailValue, setEmailValue] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");
  const [entryIeltsScoreInput, setEntryIeltsScoreInput] = useState<string>("");

  const [managerSchools, setManagerSchools] = useState<string[]>([""]);
  const [staffClasses, setStaffClasses] = useState<string[]>([""]);
  const [studentClasses, setStudentClasses] = useState<string[]>([""]);

  const parsedManualScore = parseFloat(entryIeltsScoreInput);
  const detectedManualLevel =
    !isNaN(parsedManualScore) && parsedManualScore >= 0 && parsedManualScore <= 9
      ? (ieltsLevels || []).find(
          (l: any) => l.isActive && parsedManualScore >= l.minScore && parsedManualScore <= l.maxScore
        )
      : null;

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
      selectedRole === "STUDENT" ? studentClasses.filter(Boolean) : staffClasses.filter(Boolean);

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
        setErrorMsg("Học sinh bắt buộc phải có Điểm đầu vào hợp lệ từ 0.0 đến 9.0!");
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

  const renderDynamicSelectList = (
    title: string,
    subtitle: string,
    items: string[],
    setItems: React.Dispatch<React.SetStateAction<string[]>>,
    options: { id: string; label: string }[],
    placeholderPrefix: string,
    addBtnLabel: string,
    shortcutBtn?: { label: string; title: string; onClick: () => void }
  ) => (
    <div className="space-y-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold text-[#0F172A]">{title}</h4>
          <p className="text-xs text-[#64748B]">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((prev) => [...prev, ""])}
            className="text-xs border-[#EA580C] text-[#EA580C] hover:bg-orange-50 h-7"
          >
            <Plus className="size-3.5 mr-1" /> {addBtnLabel}
          </Button>
          {shortcutBtn && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={shortcutBtn.onClick}
              title={shortcutBtn.title}
              className="text-xs h-7"
            >
              <CirclePlus className="size-3.5 mr-1 text-[#EA580C]" /> {shortcutBtn.label}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2 mt-2">
        {items.map((valId, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <select
              className="field text-sm"
              value={valId}
              onChange={(e) => {
                const val = e.target.value;
                setItems((prev) => {
                  const next = [...prev];
                  next[idx] = val;
                  return next;
                });
              }}
            >
              <option value="">{placeholderPrefix.replace("{idx}", String(idx + 1))}</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                className="size-9 text-slate-400 hover:text-rose-500 shrink-0"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const schoolOptions = schools.map((s) => ({ id: s.id, label: `${s.name} (${s.code})` }));
  const classOptions = classes.map((c) => ({
    id: c.id,
    label: `${c.name} (${c.code}) - ${c.school?.name}`,
  }));

  return (
    <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
          2. Thông tin cá nhân cơ bản
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="fullName" label="Họ và tên *" placeholder="Nhập họ và tên đầy đủ" required />
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
              <span className="text-xs text-rose-500 mt-1 block font-medium">{emailError}</span>
            )}
          </div>
          <Field name="phoneNumber" label="Số điện thoại" placeholder="0987xxxxxx" />

          {selectedRole === "STUDENT" ? (
            <div>
              <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">
                Điểm đầu vào *
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
            <Field name="address" label="Địa chỉ thường trú" placeholder="Số nhà, đường, quận/huyện..." />
          )}

          <div>
            <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">Ngày sinh</label>
            <input name="dateOfBirth" type="date" className="field" />
          </div>
          <div>
            <label className="text-sm font-semibold text-[#0F172A] block mb-1.5">Giới tính</label>
            <select name="gender" className="field" defaultValue="">
              <option value="">-- Chọn giới tính --</option>
              <option value="MALE">Nam</option>
              <option value="FEMALE">Nữ</option>
              <option value="OTHER">Khác</option>
            </select>
          </div>

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
                    {detectedManualLevel.name} ({detectedManualLevel.code}) — Thang điểm{" "}
                    {Number(detectedManualLevel.minScore).toFixed(1)} -{" "}
                    {Number(detectedManualLevel.maxScore).toFixed(1)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs">
                    {entryIeltsScoreInput
                      ? "Chưa có trình độ khớp khoảng điểm này trong Cài đặt"
                      : "Vui lòng nhập điểm đầu vào để hệ thống tự xác định trình độ"}
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

      <div className="pt-2 border-t border-[#E2E8F0]">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#475569] mb-2">
          3. Phân công & Nhiệm vụ theo vị trí
        </label>

        {selectedRole === "SCHOOL_MANAGER" &&
          renderDynamicSelectList(
            "Trường học phụ trách (Quản lý đa trường) *",
            "Bắt buộc chọn ít nhất 1 trường đối tác quản lý.",
            managerSchools,
            setManagerSchools,
            schoolOptions,
            "-- Chọn trường học phụ trách #{idx} * --",
            "Thêm trường",
            onAddSchoolShortcut
              ? { label: "Tạo trường mới", title: "Tạo nhanh trường mới", onClick: onAddSchoolShortcut }
              : undefined
          )}

        {selectedRole === "TEACHER" &&
          renderDynamicSelectList(
            "Lớp học phụ trách giảng dạy *",
            "Bắt buộc chọn ít nhất 1 lớp học giảng dạy.",
            staffClasses,
            setStaffClasses,
            classOptions,
            "-- Chọn lớp học #{idx} * --",
            "Thêm lớp",
            onAddClassShortcut
              ? { label: "Tạo lớp mới", title: "Tạo nhanh lớp mới", onClick: onAddClassShortcut }
              : undefined
          )}

        {selectedRole === "TEACHING_ASSISTANT" &&
          renderDynamicSelectList(
            "Lớp học phụ trách trợ giảng *",
            "Bắt buộc chọn ít nhất 1 lớp học trợ giảng.",
            staffClasses,
            setStaffClasses,
            classOptions,
            "-- Chọn lớp trợ giảng #{idx} * --",
            "Thêm lớp",
            onAddClassShortcut
              ? { label: "Tạo lớp mới", title: "Tạo nhanh lớp mới", onClick: onAddClassShortcut }
              : undefined
          )}

        {selectedRole === "STUDENT" &&
          renderDynamicSelectList(
            "Gán lớp học (Tùy chọn)",
            "Nhập thủ công không tự động đề xuất phân lớp. Bạn có thể chọn lớp ngay hoặc gán sau.",
            studentClasses,
            setStudentClasses,
            classOptions,
            "-- Chọn lớp học #{idx} (Không bắt buộc) --",
            "Thêm lớp"
          )}

        {selectedRole === "ADMIN" && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <b>Lưu ý:</b> Tài khoản Quản trị viên có toàn quyền kiểm soát toàn bộ hệ thống.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
        <Button type="button" variant="outline" onClick={onCancel}>
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
  );
}
