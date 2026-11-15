"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClockIcon,
  CheckIcon,
} from "./icons";

interface DateTimeRangePickerProps {
  pickupDateTime: string; // ISO format "YYYY-MM-DDTHH:mm"
  returnDateTime: string; // ISO format "YYYY-MM-DDTHH:mm"
  onPickupChange: (value: string) => void;
  onReturnChange: (value: string) => void;
  className?: string;
}

const emptySubscribe = () => () => {};

function useTodayString() {
  return useSyncExternalStore(
    emptySubscribe,
    () => getTodayString(),
    () => ""
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Generate 24-hour slots with 15-minute intervals: "00:00", "00:15", "00:30", "00:45", "01:00", ...
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  const hh = String(h).padStart(2, "0");
  for (const mm of ["00", "15", "30", "45"]) {
    TIME_SLOTS.push(`${hh}:${mm}`);
  }
}

function parseISO(isoString: string) {
  if (!isoString) return { date: "", time: "10:00" };
  const parts = isoString.split("T");
  const date = parts[0] || "";
  const time = parts[1] ? parts[1].slice(0, 5) : "10:00";
  return { date, time };
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "Select date";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMinutesToTime(
  timeStr: string,
  minutesToAdd: number = 60
): { time: string; overflowDays: number } {
  const [h, m] = (timeStr || "10:00").split(":").map(Number);
  const totalMinutes = (h || 0) * 60 + (m || 0) + minutesToAdd;
  const overflowDays = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const newH = Math.floor(remainingMinutes / 60);
  const newM = remainingMinutes % 60;
  // Snap to nearest 15 minutes
  const snappedM = (Math.ceil(newM / 15) * 15) % 60;
  return {
    time: `${String(newH).padStart(2, "0")}:${String(snappedM).padStart(2, "0")}`,
    overflowDays,
  };
}

/**
 * Modern 24-Hour Time Picker with 15-minute intervals (00:00, 00:15, 00:30, ...)
 */
function CustomTimePicker({
  value,
  onChange,
  minTime,
  label,
}: {
  value: string; // "HH:mm"
  onChange: (time: string) => void;
  minTime?: string; // If set, times <= minTime are disabled
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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

  // Scroll to selected time item when opening
  useEffect(() => {
    if (isOpen && selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button: Clean 24-hour display (e.g. 10:00) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-[#e0e6f1] bg-[#f8faff] px-2.5 py-1 text-xs font-semibold text-[#25314c] transition-all hover:border-primary hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        title={`Change ${label}`}
      >
        <ClockIcon size={13} className="text-primary" />
        <span className="font-mono">{value || "10:00"}</span>
        <ChevronDownIcon
          size={12}
          className={`text-[#57657e] transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Floating Dropdown: Clean list of 15-min intervals */}
      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[60] w-44 max-h-64 overflow-y-auto rounded-xl border border-[#e0e6f1] bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#57657e] border-b border-[#f0f4fa] mb-1">
            {label} (24h)
          </div>

          <div className="space-y-0.5">
            {TIME_SLOTS.map((slot) => {
              const isSelected = slot === value;
              const isDisabled = minTime !== undefined ? slot <= minTime : false;

              return (
                <button
                  key={slot}
                  ref={isSelected ? selectedItemRef : undefined}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) {
                      onChange(slot);
                      setIsOpen(false);
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 font-mono text-xs transition-colors ${
                    isSelected
                      ? "bg-primary text-white font-bold shadow-xs"
                      : isDisabled
                      ? "cursor-not-allowed opacity-30 bg-gray-50 text-[#8a98ad] line-through"
                      : "text-[#25314c] hover:bg-[#f0f5ff]"
                  }`}
                >
                  <span>{slot}</span>
                  {isSelected && <CheckIcon size={13} className="text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function DateTimeRangePicker({
  pickupDateTime,
  returnDateTime,
  onPickupChange,
  onReturnChange,
  className = "",
}: DateTimeRangePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { date: pickupDate, time: pickupTime } = useMemo(
    () => parseISO(pickupDateTime),
    [pickupDateTime]
  );
  const { date: returnDate, time: returnTime } = useMemo(
    () => parseISO(returnDateTime),
    [returnDateTime]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<"pickup" | "return">("pickup");
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [navOffset, setNavOffset] = useState<number>(0);

  const todayStr = useTodayString();

  // Viewing month for calendar (left panel)
  const { viewYear, viewMonth } = useMemo(() => {
    let baseYear = 2026;
    let baseMonth = 10;
    if (pickupDate) {
      const [y, m] = pickupDate.split("-").map(Number);
      if (y && m) {
        baseYear = y;
        baseMonth = m - 1;
      }
    } else if (todayStr) {
      const [y, m] = todayStr.split("-").map(Number);
      if (y && m) {
        baseYear = y;
        baseMonth = m - 1;
      }
    }
    const totalMonths = baseYear * 12 + baseMonth + navOffset;
    return {
      viewYear: Math.floor(totalMonths / 12),
      viewMonth: ((totalMonths % 12) + 12) % 12,
    };
  }, [pickupDate, todayStr, navOffset]);

  // Click outside listener for the calendar popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHoverDate(null);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Month navigation
  const handlePrevMonth = () => {
    setNavOffset((prev) => prev - 1);
  };

  const handleNextMonth = () => {
    setNavOffset((prev) => prev + 1);
  };

  const isPrevDisabled = useMemo(() => {
    if (!todayStr) return false;
    const [ty, tm] = todayStr.split("-").map(Number);
    const thisMonthDate = new Date(ty, tm - 1, 1);
    const currentMonthDate = new Date(viewYear, viewMonth, 1);
    return currentMonthDate <= thisMonthDate;
  }, [viewYear, viewMonth, todayStr]);

  // Build calendar month days (Monday-based)
  function getDaysForMonth(year: number, month: number) {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const startDayOffset = (firstDayIndex + 6) % 7; // 0 is Monday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDayOffset; i++) {
      days.push({ dateStr: "", dayNum: 0, isCurrentMonth: false });
    }

    for (let d = 1; d <= totalDays; d++) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      days.push({
        dateStr: `${year}-${mm}-${dd}`,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    return days;
  }

  const leftDays = useMemo(
    () => getDaysForMonth(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const rightDays = useMemo(
    () => getDaysForMonth(rightYear, rightMonth),
    [rightYear, rightMonth]
  );

  // Date click handler
  const handleDayClick = (dateStr: string) => {
    if (!dateStr || (todayStr && dateStr < todayStr)) return;

    if (activeStep === "pickup") {
      onPickupChange(`${dateStr}T${pickupTime || "10:00"}`);

      // If existing return date is before new pickup date, advance return date
      if (!returnDate || returnDate < dateStr) {
        const [y, m, d] = dateStr.split("-").map(Number);
        const nextDay = new Date(y, m - 1, d + 2); // 2 days default
        const nextY = nextDay.getFullYear();
        const nextM = String(nextDay.getMonth() + 1).padStart(2, "0");
        const nextD = String(nextDay.getDate()).padStart(2, "0");
        onReturnChange(`${nextY}-${nextM}-${nextD}T${returnTime || "10:00"}`);
      } else if (returnDate === dateStr) {
        // Same date: strictly enforce pickupTime < returnTime
        if (returnTime <= pickupTime) {
          const { time: autoReturnTime, overflowDays } = addMinutesToTime(
            pickupTime,
            60
          );
          if (overflowDays > 0) {
            const [y, m, d] = dateStr.split("-").map(Number);
            const nextDay = new Date(y, m - 1, d + 1);
            const nextY = nextDay.getFullYear();
            const nextM = String(nextDay.getMonth() + 1).padStart(2, "0");
            const nextD = String(nextDay.getDate()).padStart(2, "0");
            onReturnChange(`${nextY}-${nextM}-${nextD}T10:00`);
          } else {
            onReturnChange(`${dateStr}T${autoReturnTime}`);
          }
        }
      }

      setActiveStep("return");
    } else {
      // In 'return' mode
      if (dateStr < pickupDate) {
        // Clicked date is earlier than pickup date -> smartly treat it as new pickup date
        onPickupChange(`${dateStr}T${pickupTime || "10:00"}`);
        setActiveStep("return");
      } else if (dateStr === pickupDate) {
        // Same date selected: strictly ensure pickupTime < returnTime
        if (returnTime <= pickupTime) {
          const { time: autoReturnTime, overflowDays } = addMinutesToTime(
            pickupTime,
            60
          );
          if (overflowDays > 0) {
            const [y, m, d] = dateStr.split("-").map(Number);
            const nextDay = new Date(y, m - 1, d + 1);
            const nextY = nextDay.getFullYear();
            const nextM = String(nextDay.getMonth() + 1).padStart(2, "0");
            const nextD = String(nextDay.getDate()).padStart(2, "0");
            onReturnChange(`${nextY}-${nextM}-${nextD}T10:00`);
          } else {
            onReturnChange(`${dateStr}T${autoReturnTime}`);
          }
        } else {
          onReturnChange(`${dateStr}T${returnTime}`);
        }
        setIsOpen(false);
        setHoverDate(null);
      } else {
        // Return date is strictly after pickup date
        onReturnChange(`${dateStr}T${returnTime || "10:00"}`);
        setIsOpen(false);
        setHoverDate(null);
      }
    }
  };

  // Time change handlers: STRICTLY ENFORCE pickupTime < returnTime on same day
  const handlePickupTimeChange = (newPickupTime: string) => {
    onPickupChange(`${pickupDate || todayStr}T${newPickupTime}`);

    // If same day, returnTime MUST be strictly greater than pickupTime
    if (pickupDate === returnDate) {
      if (returnTime <= newPickupTime) {
        const { time: autoReturnTime, overflowDays } = addMinutesToTime(
          newPickupTime,
          60
        );
        if (overflowDays > 0) {
          // Pickup is very late (e.g. 23:45) -> advance return date to next day
          const [y, m, d] = (pickupDate || todayStr).split("-").map(Number);
          const nextDay = new Date(y, m - 1, d + 1);
          const nextY = nextDay.getFullYear();
          const nextM = String(nextDay.getMonth() + 1).padStart(2, "0");
          const nextD = String(nextDay.getDate()).padStart(2, "0");
          onReturnChange(`${nextY}-${nextM}-${nextD}T10:00`);
        } else {
          onReturnChange(`${returnDate}T${autoReturnTime}`);
        }
      }
    }
  };

  const handleReturnTimeChange = (newReturnTime: string) => {
    // If same day, verify returnTime > pickupTime
    if (pickupDate === returnDate && newReturnTime <= pickupTime) {
      return; // Do not allow
    }
    onReturnChange(`${returnDate || pickupDate || todayStr}T${newReturnTime}`);
  };

  // Rental duration calculation
  const durationText = useMemo(() => {
    if (!pickupDate || !returnDate) return "";
    const [py, pm, pd] = pickupDate.split("-").map(Number);
    const [ry, rm, rd] = returnDate.split("-").map(Number);
    if (!py || !pm || !pd || !ry || !rm || !rd) return "";

    const [ph, pmin] = (pickupTime || "00:00").split(":").map(Number);
    const [rh, rmin] = (returnTime || "00:00").split(":").map(Number);

    const startMs = Date.UTC(py, pm - 1, pd, ph, pmin);
    const endMs = Date.UTC(ry, rm - 1, rd, rh, rmin);

    if (endMs <= startMs) return "";
    const diffHours = (endMs - startMs) / (1000 * 60 * 60);

    if (diffHours < 24) {
      const wholeHours = Math.round(diffHours * 10) / 10;
      return `${wholeHours} hours rental`;
    }
    const days = Math.ceil(diffHours / 24);
    return `${days} ${days === 1 ? "day" : "days"} rental`;
  }, [pickupDate, returnDate, pickupTime, returnTime]);

  // Day styling logic for the calendar grid
  const getDayStyle = (dateStr: string) => {
    if (!dateStr) return { disabled: true, classes: "invisible" };

    const isPast = Boolean(todayStr && dateStr < todayStr);
    const isStart = dateStr === pickupDate;
    const isEnd = dateStr === returnDate;

    const effectiveEnd =
      activeStep === "return" && hoverDate && hoverDate >= pickupDate
        ? hoverDate
        : returnDate;

    const isInRange =
      pickupDate &&
      effectiveEnd &&
      dateStr > pickupDate &&
      dateStr < effectiveEnd;

    const isHoveredEnd =
      activeStep === "return" &&
      hoverDate &&
      dateStr === hoverDate &&
      hoverDate > pickupDate;

    return {
      isPast,
      isStart,
      isEnd: isEnd || isHoveredEnd,
      isInRange,
    };
  };

  return (
    <div ref={containerRef} className={`relative sm:col-span-2 ${className}`}>
      {/* Top 2 Input Cards: Pickup & Return */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Pickup Field */}
        <div
          className={`flex flex-col rounded-[10px] border bg-white p-2.5 transition-all ${
            isOpen && activeStep === "pickup"
              ? "border-primary ring-2 ring-primary/20"
              : "border-[#e0e6f1] hover:border-[#b8c6e0]"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#57657e]">
            <CalendarIcon size={14} className="text-primary" />
            Pickup date and time
          </span>

          <div className="mt-1 flex items-center justify-between gap-2">
            {/* Date Button */}
            <button
              type="button"
              onClick={() => {
                setActiveStep("pickup");
                setIsOpen(true);
              }}
              className="flex-1 flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-semibold text-[#25314c] hover:bg-[#f0f5ff] transition-colors"
            >
              <span className="truncate">{formatDateDisplay(pickupDate)}</span>
            </button>

            <span className="text-[#e0e6f1]">|</span>

            {/* Custom Modern Time Picker */}
            <CustomTimePicker
              label="Pickup Time"
              value={pickupTime}
              onChange={handlePickupTimeChange}
            />
          </div>
        </div>

        {/* Return Field */}
        <div
          className={`flex flex-col rounded-[10px] border bg-white p-2.5 transition-all ${
            isOpen && activeStep === "return"
              ? "border-primary ring-2 ring-primary/20"
              : "border-[#e0e6f1] hover:border-[#b8c6e0]"
          }`}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#57657e]">
            <CalendarIcon size={14} className="text-primary" />
            Return date and time
          </span>

          <div className="mt-1 flex items-center justify-between gap-2">
            {/* Date Button */}
            <button
              type="button"
              onClick={() => {
                setActiveStep("return");
                setIsOpen(true);
              }}
              className="flex-1 flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-semibold text-[#25314c] hover:bg-[#f0f5ff] transition-colors"
            >
              <span className="truncate">{formatDateDisplay(returnDate)}</span>
            </button>

            <span className="text-[#e0e6f1]">|</span>

            {/* Custom Modern Time Picker with minTime enforcement when on the same day */}
            <CustomTimePicker
              label="Return Time"
              value={returnTime}
              onChange={handleReturnTimeChange}
              minTime={pickupDate === returnDate ? pickupTime : undefined}
            />
          </div>
        </div>
      </div>

      {/* Floating Dual-Month Range Calendar Popover */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-full max-w-[700px] rounded-2xl border border-[#e0e6f1] bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-[#eef2f8]">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPrevDisabled}
              className="rounded-lg p-1.5 text-[#57657e] hover:bg-[#f0f5ff] hover:text-[#25314c] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous month"
            >
              <ChevronLeftIcon size={18} />
            </button>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#57657e]">
              <span>
                Selecting:{" "}
                <span className="font-bold text-primary uppercase tracking-wide">
                  {activeStep === "pickup" ? "Pickup Date" : "Return Date"}
                </span>
              </span>
              {durationText && (
                <span className="rounded-full bg-[#e3f3eb] px-2.5 py-0.5 text-[11px] font-bold text-[#17604a]">
                  {durationText}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-[#57657e] hover:bg-[#f0f5ff] hover:text-[#25314c] transition-colors"
              title="Next month"
            >
              <ChevronRightIcon size={18} />
            </button>
          </div>

          {/* Calendar Months: 2 columns on md+, 1 column on mobile */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Month */}
            <div>
              <div className="text-center font-bold text-[#25314c] text-sm mb-3">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-wider text-[#57657e] mb-1">
                {WEEKDAYS.map((w) => (
                  <div key={`left-${w}`} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {leftDays.map((d, index) => {
                  if (!d.isCurrentMonth) {
                    return <div key={`empty-left-${index}`} className="h-9 w-9" />;
                  }

                  const { isPast, isStart, isEnd, isInRange } = getDayStyle(
                    d.dateStr
                  );

                  return (
                    <div
                      key={`d-left-${d.dateStr}`}
                      className={`relative flex items-center justify-center h-9 ${
                        isInRange
                          ? "bg-[#e3f3eb]"
                          : isStart && returnDate && returnDate !== pickupDate
                          ? "rounded-l-full bg-[#e3f3eb]"
                          : isEnd && pickupDate && returnDate !== pickupDate
                          ? "rounded-r-full bg-[#e3f3eb]"
                          : ""
                      }`}
                      onMouseEnter={() => {
                        if (activeStep === "return") {
                          setHoverDate(d.dateStr);
                        }
                      }}
                    >
                      <button
                        type="button"
                        disabled={isPast}
                        onClick={() => handleDayClick(d.dateStr)}
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                          isStart || isEnd
                            ? "bg-[#16a34a] text-white font-bold shadow-md scale-105 z-10"
                            : isPast
                            ? "text-[#b0bac9] cursor-not-allowed"
                            : isInRange
                            ? "text-[#166534] hover:bg-[#bbf7d0]"
                            : "text-[#25314c] hover:bg-[#f0f5ff]"
                        }`}
                      >
                        {d.dayNum}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Month */}
            <div>
              <div className="text-center font-bold text-[#25314c] text-sm mb-3">
                {MONTH_NAMES[rightMonth]} {rightYear}
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-wider text-[#57657e] mb-1">
                {WEEKDAYS.map((w) => (
                  <div key={`right-${w}`} className="py-1">
                    {w}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {rightDays.map((d, index) => {
                  if (!d.isCurrentMonth) {
                    return <div key={`empty-right-${index}`} className="h-9 w-9" />;
                  }

                  const { isPast, isStart, isEnd, isInRange } = getDayStyle(
                    d.dateStr
                  );

                  return (
                    <div
                      key={`d-right-${d.dateStr}`}
                      className={`relative flex items-center justify-center h-9 ${
                        isInRange
                          ? "bg-[#e3f3eb]"
                          : isStart && returnDate && returnDate !== pickupDate
                          ? "rounded-l-full bg-[#e3f3eb]"
                          : isEnd && pickupDate && returnDate !== pickupDate
                          ? "rounded-r-full bg-[#e3f3eb]"
                          : ""
                      }`}
                      onMouseEnter={() => {
                        if (activeStep === "return") {
                          setHoverDate(d.dateStr);
                        }
                      }}
                    >
                      <button
                        type="button"
                        disabled={isPast}
                        onClick={() => handleDayClick(d.dateStr)}
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                          isStart || isEnd
                            ? "bg-[#16a34a] text-white font-bold shadow-md scale-105 z-10"
                            : isPast
                            ? "text-[#b0bac9] cursor-not-allowed"
                            : isInRange
                            ? "text-[#166534] hover:bg-[#bbf7d0]"
                            : "text-[#25314c] hover:bg-[#f0f5ff]"
                        }`}
                      >
                        {d.dayNum}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Popover Footer */}
          <div className="mt-5 pt-3 border-t border-[#eef2f8] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#57657e]">
              <span className="inline-block h-3 w-3 rounded-full bg-[#16a34a]" />
              <span>Selected Dates</span>
              <span className="inline-block h-3 w-3 rounded bg-[#e3f3eb] ml-2" />
              <span>Rental Range</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setHoverDate(null);
              }}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
