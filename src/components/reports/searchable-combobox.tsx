"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  code?: string;
}

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  prefix?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  searchPlaceholder = "Nhập tìm kiếm...",
  prefix,
  icon,
  disabled = false,
  className = "",
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchCode = opt.code ? opt.code.toLowerCase().includes(q) : false;
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
      return matchLabel || matchCode || matchSub;
    });
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (next) {
          setTimeout(() => inputRef.current?.focus(), 50);
        } else {
          setSearch("");
        }
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-placeholder={!selectedOption ? "true" : undefined}
          className={`inline-flex items-center justify-between gap-2 h-[34px] px-3 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all ${className}`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {icon && <span className="text-slate-400 group-hover:text-slate-600">{icon}</span>}
            {prefix && <span className="font-semibold text-slate-500">{prefix}</span>}
            <span className="truncate font-semibold text-slate-800">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.75} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="rp-pop z-50 w-80 max-w-[90vw] p-2"
        >
          <div className="relative mb-2 flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-[var(--rp-text-muted)]" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-[var(--rp-radius-md)] border border-[var(--rp-border)] bg-[var(--rp-surface-muted)] py-1.5 pl-8 pr-7 text-xs font-medium text-[var(--rp-text)] placeholder-[var(--rp-text-muted)] focus:border-[var(--rp-brand)] focus:bg-[var(--rp-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--rp-ring)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 text-[var(--rp-text-muted)] hover:text-[var(--rp-text-dim)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--rp-text-muted)]">
                Không tìm thấy kết quả phù hợp
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    aria-selected={isSelected}
                    className="rp-option"
                  >
                    <div className="truncate">
                      <div className="truncate">{opt.label}</div>
                      {opt.subLabel && (
                        <div className="text-[10.5px] font-normal text-[var(--rp-text-muted)] truncate">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--rp-brand)]" />}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
