import React from "react";

export function SimpaceLogo({
  className = "h-10 w-auto",
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <img
      src="/logo.png"
      alt="SIMPACE"
      onClick={onClick}
      className={`object-contain select-none ${onClick ? "cursor-pointer transition hover:opacity-90" : ""} ${className}`}
    />
  );
}
