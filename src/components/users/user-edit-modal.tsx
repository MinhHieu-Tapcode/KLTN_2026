"use client";

import React from "react";
import { Edit2, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/shared/common-widgets";

export function formatUserAssignmentText(u: any): string {
  if (u.role?.code === "ADMIN") {
    return "Toàn hệ thống";
  }
  if (u.role?.code === "SCHOOL_MANAGER" && u.managedSchools?.length > 0) {
    return u.managedSchools.map((s: any) => s.name).join(", ");
  }
  if (
    (u.role?.code === "TEACHER" || u.role?.code === "TEACHING_ASSISTANT") &&
    u.classAssignments?.length > 0
  ) {
    return u.classAssignments
      .map((a: any) => {
        const sch = a.class?.school?.name;
        const cls = a.class?.name || a.class?.code;
        return sch ? `${sch} - ${cls}` : cls;
      })
      .filter(Boolean)
      .join(", ");
  }
  if (u.role?.code === "STUDENT") {
    if (u.classEnrollments?.length > 0) {
      return u.classEnrollments
        .map((e: any) => {
          const sch = e.class?.school?.name;
          const cls = e.class?.name || e.class?.code;
          return sch ? `${sch} - ${cls}` : cls;
        })
        .filter(Boolean)
        .join(", ");
    }
    if (u.school?.name || u.profile?.school?.name) {
      return `${u.school?.name || u.profile?.school?.name} (Chờ xếp lớp)`;
    }
    return "Chưa xếp lớp";
  }
  if (u.classEnrollments?.length > 0) {
    return u.classEnrollments
      .map((e: any) => {
        const sch = e.class?.school?.name;
        const cls = e.class?.name || e.class?.code;
        return sch ? `${sch} - ${cls}` : cls;
      })
      .filter(Boolean)
      .join(", ");
  }
  return "Chưa phân công";
}

export function UserTableRow({
  user: u,
  currentUser,
  isSchoolManager,
  isSelected,
  onToggleSelect,
  onViewUser,
  onEditUser,
  onDeleteSingle,
}: {
  user: any;
  currentUser?: any;
  isSchoolManager: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onViewUser?: (u: any) => void;
  onEditUser: (u: any) => void;
  onDeleteSingle: (id: string, name?: string) => void;
}) {
  const isTargetAdmin = u.role?.code === "ADMIN";
  const isSelf = currentUser && u.id === currentUser.userId;
  const canEdit = !isSchoolManager || !isTargetAdmin;
  const canDelete = (!isSchoolManager || !isTargetAdmin) && !isSelf;
  const assignmentText = formatUserAssignmentText(u);

  return (
    <tr className="hover:bg-[#F8FAFC] transition">
      <td className="px-4 py-3.5">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(u.id)}
          className="rounded border-[#CBD5E1]"
        />
      </td>
      <td className="px-4 py-3.5 font-bold text-[#0F172A]">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-[#FFF1EB] text-[#EA580C] font-bold text-xs uppercase">
            {u.profile?.fullName ? u.profile.fullName.trim()[0] : u.username[0]}
          </span>
          <div>
            <span>{u.profile?.fullName || u.username}</span>
            <div className="flex items-center gap-2 mt-0.5">
              {u.profile?.phoneNumber && (
                <span className="text-xs font-normal text-[#94A3B8]">{u.profile.phoneNumber}</span>
              )}
              {u.role?.code === "STUDENT" &&
                u.profile?.entryIeltsScore !== null &&
                u.profile?.entryIeltsScore !== undefined && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-[#EA580C]">
                    Điểm đầu vào: {Number(u.profile.entryIeltsScore).toFixed(1)}
                  </span>
                )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-[#475569]">
        <div>
          <span>{u.email}</span>
          <code className="block text-[11px] font-mono text-[#94A3B8]">{u.username}</code>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Badge>{u.role?.name || u.role?.code}</Badge>
      </td>
      <td className="px-4 py-3.5 text-xs max-w-[280px]">
        {assignmentText === "Chưa phân công" || assignmentText === "Chưa xếp lớp" ? (
          <span className="text-amber-600 font-medium italic">{assignmentText}</span>
        ) : assignmentText === "Toàn hệ thống" ? (
          <span className="text-[#64748B] font-medium">Toàn hệ thống</span>
        ) : (
          <span className="text-[#0F172A] font-medium block truncate" title={assignmentText}>
            {assignmentText}
          </span>
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-[#64748B] hover:text-[#EA580C]"
            onClick={() => onViewUser?.(u)}
            title="Xem chi tiết tài khoản (Chỉ xem)"
          >
            <Eye className="size-4" />
          </Button>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[#64748B] hover:text-[#0F172A]"
              onClick={() => onEditUser(u)}
              title="Chỉnh sửa"
            >
              <Edit2 className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-[#64748B] hover:text-[#EF4444]"
              onClick={() => onDeleteSingle(u.id, u.profile?.fullName || u.username)}
              title="Xóa tài khoản"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
