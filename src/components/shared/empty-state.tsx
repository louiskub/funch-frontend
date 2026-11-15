import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[18px] border border-dashed border-[#e0e6f1] bg-white p-12 text-center",
        className
      )}
    >
      {icon && <div className="mb-4 text-[#57657e]">{icon}</div>}
      <h3 className="text-base font-bold text-[#25314c]">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs text-[#57657e] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
