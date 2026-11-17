"use client";

import { useTranslations } from "next-intl";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { SearchIcon, ChevronDownIcon, CheckIcon, XIcon } from "./icons";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface SearchableSelectProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  allowEmptyOption?: boolean;
}

export function SearchableSelect({
  label,
  icon,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  disabled = false,
  className,
  allowEmptyOption = false,
}: SearchableSelectProps) {
  const t = useTranslations("common");
  const translatedPlaceholder = placeholder ?? t("select");
  const translatedSearchPlaceholder = searchPlaceholder ?? t("typeToSearch");
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );
  const visibleOptions = useMemo(
    () => (allowEmptyOption && !options.some((option) => option.value === "")
      ? [{ value: "", label: translatedPlaceholder }, ...options]
      : options),
    [allowEmptyOption, options, translatedPlaceholder],
  );

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return visibleOptions;
    const query = search.toLowerCase();
    return visibleOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(query)) ||
        (opt.badge && opt.badge.toLowerCase().includes(query))
    );
  }, [visibleOptions, search]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter" && filteredOptions.length > 0) {
      e.preventDefault();
      onChange(filteredOptions[0].value);
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-col justify-center", className)}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!isOpen) setSearch("");
          setIsOpen(!isOpen);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          "w-full text-left rounded-[12px] border px-3.5 py-2.5 transition-all outline-none select-none cursor-pointer",
          disabled
            ? "border-border bg-surface-subtle opacity-50 cursor-not-allowed"
            : isOpen
              ? "border-primary bg-card ring-2 ring-primary/10 shadow-xs"
              : "border-border bg-surface-subtle hover:bg-card hover:border-border"
        )}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          {icon}
          {label}
        </span>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              selectedOption ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {selectedOption ? selectedOption.label : translatedPlaceholder}
          </span>
          <ChevronDownIcon
            size={16}
            className={cn(
              "text-muted-foreground transition-transform duration-200 shrink-0",
              isOpen && "rotate-180 text-primary"
            )}
          />
        </div>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 rounded-[14px] border border-border bg-card shadow-[0_16px_36px_-6px_color-mix(in_srgb,rgb(var(--shadow-color)) 14%, transparent),0_2px_8px_color-mix(in_srgb,rgb(var(--shadow-color)) 4%, transparent)] overflow-hidden animate-slide-down">
          {/* Search Box Header */}
          <div className="p-2 border-b border-border bg-surface-subtle flex items-center gap-2">
            <SearchIcon size={14} className="text-muted-foreground shrink-0 ml-1.5" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={translatedSearchPlaceholder}
              className="w-full bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none py-1"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer mr-1"
                aria-label="Clear search"
              >
                <XIcon size={13} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            role="listbox"
            className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No matching results found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-2.5 rounded-[9px] px-3 py-2 text-left text-xs transition-colors cursor-pointer",
                      isSelected
                        ? "bg-secondary text-primary font-bold"
                        : "text-foreground hover:bg-surface-subtle hover:text-primary font-medium"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span className="shrink-0 rounded bg-accent px-1.5 py-0.2 text-[10px] font-mono font-bold text-primary">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <span className="block text-[11px] text-muted-foreground truncate font-normal mt-0.5">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <CheckIcon size={14} className="text-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
