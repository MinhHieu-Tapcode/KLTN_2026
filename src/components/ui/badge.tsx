import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "border-transparent bg-[#FFF1EB] text-[#EA580C]",
        variant === "secondary" && "border-transparent bg-slate-100 text-slate-900",
        variant === "destructive" && "border-transparent bg-rose-50 text-rose-700",
        variant === "outline" && "text-slate-700 border-slate-200",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
