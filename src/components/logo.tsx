import React from "react";

export function SimpaceLogo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <img
        src="/logo.png"
        alt="SIMPACE"
        className={`object-contain ${className}`}
        style={{ maxHeight: "36px", width: "auto" }}
      />
    </div>
  );
}
