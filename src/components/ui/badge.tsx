import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        secondary: "bg-secondary text-primary",
        outline: "border border-border text-foreground",
        pill: "rounded-full bg-card border border-border text-muted-foreground px-3 py-1 font-medium",
        pending: "bg-status-pending-bg text-status-pending-text border border-status-pending-border",
        approved: "bg-status-approved-bg text-status-approved-text border border-status-approved-border",
        inUse: "bg-status-in-use-bg text-status-in-use-text border border-status-in-use-border",
        completed: "bg-status-completed-bg text-status-completed-text border border-status-completed-border",
        rejected: "bg-status-rejected-bg text-status-rejected-text border border-status-rejected-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const norm = status?.toUpperCase() || "";
  let variant: VariantProps<typeof badgeVariants>["variant"] = "secondary";
  let label = status;

  if (norm === "PENDING") {
    variant = "pending";
    label = "Pending approval";
  } else if (norm === "APPROVED") {
    variant = "approved";
    label = "Approved / Awaiting pickup";
  } else if (norm === "IN_USE") {
    variant = "inUse";
    label = "On the road";
  } else if (norm === "COMPLETED") {
    variant = "completed";
    label = "Completed";
  } else if (norm === "REJECTED" || norm === "CANCELLED") {
    variant = "rejected";
    label = norm === "REJECTED" ? "Rejected" : "Cancelled";
  }

  return (
    <Badge variant={variant} className={cn("text-[11px] font-semibold", className)}>
      {label}
    </Badge>
  );
}

export { Badge, badgeVariants };
