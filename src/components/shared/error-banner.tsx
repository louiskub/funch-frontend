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
        "flex items-center justify-between rounded-[10px] border border-status-rejected-border bg-status-rejected-bg p-4 text-xs font-medium text-status-rejected-text",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <AlertCircleIcon size={16} className="flex-shrink-0 text-status-rejected-text" />
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
