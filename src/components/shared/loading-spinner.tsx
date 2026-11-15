import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
  message = "Loading…",
  className,
  size = "md",
}: LoadingSpinnerProps) {
  const spinnerSizes = {
    sm: "h-4 w-4 border-2",
    md: "h-7 w-7 border-3",
    lg: "h-10 w-10 border-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center p-8 gap-3", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-primary border-t-transparent",
          spinnerSizes[size]
        )}
      />
      {message && <p className="text-xs font-medium text-[#57657e]">{message}</p>}
    </div>
  );
}
