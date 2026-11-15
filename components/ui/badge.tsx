import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-white",
        secondary: "bg-[#f0f5ff] text-primary",
        outline: "border border-[#e0e6f1] text-[#25314c]",
        pill: "rounded-full bg-white border border-[#e0e6f1] text-[#57657e] px-3 py-1 font-medium",
        pending: "bg-[#fff0ce] text-[#815110]",
        approved: "bg-[#e3f3eb] text-[#17604a]",
        inUse: "bg-[#e9f0fc] text-[#28569c]",
        completed: "bg-[#edf0ef] text-[#56615e]",
        rejected: "bg-[#fce8e8] text-[#a22f2f]",
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
