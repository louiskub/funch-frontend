import { AlertCircleIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({ message, onRetry, className }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-between rounded-[10px] border border-[#fecaca] bg-[#fce8e8] p-4 text-xs font-medium text-[#a22f2f]",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircleIcon size={16} className="flex-shrink-0 text-[#a22f2f]" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-3 font-bold underline hover:opacity-80 transition-opacity"
        >
          Retry
        </button>
      )}
    </div>
  );
}
