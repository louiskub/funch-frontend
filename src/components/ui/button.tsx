import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-normal transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover hover:shadow-md hover:shadow-primary/20 hover:-translate-y-[1px] active:bg-primary-hover active:scale-[0.98] active:translate-y-0 rounded-[10px]",
        secondary:
          "bg-secondary text-primary hover:bg-primary hover:text-white hover:shadow-xs hover:-translate-y-[0.5px] rounded-[8px] border border-border active:scale-[0.98] active:translate-y-0",
        outline:
          "border border-border bg-card hover:bg-secondary hover:text-primary hover:border-primary/40 hover:shadow-xs hover:-translate-y-[0.5px] rounded-[10px] active:scale-[0.98] active:translate-y-0",
        ghost:
          "hover:bg-secondary hover:text-primary rounded-[8px] active:scale-[0.98]",
        success:
          "bg-success text-white shadow-xs hover:bg-success-hover hover:shadow-md hover:shadow-success/20 hover:-translate-y-[1px] active:bg-success-hover active:scale-[0.98] active:translate-y-0 rounded-[10px]",
        warning:
          "bg-warning text-foreground font-bold shadow-xs hover:bg-warning-hover hover:shadow-md hover:shadow-warning/20 hover:-translate-y-[1px] active:bg-warning-hover active:scale-[0.98] active:translate-y-0 rounded-[10px]",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive-hover hover:shadow-md hover:shadow-destructive/20 hover:-translate-y-[1px] active:bg-destructive-hover active:scale-[0.98] active:translate-y-0 rounded-[10px]",
        successOutline:
          "border border-status-approved-border bg-status-approved-bg text-status-approved-text hover:bg-status-approved-bg/80 hover:shadow-xs hover:-translate-y-[0.5px] active:scale-[0.98] active:translate-y-0 rounded-[10px]",
        warningOutline:
          "border border-status-pending-border bg-status-pending-bg text-status-pending-text hover:bg-status-pending-bg/80 hover:shadow-xs hover:-translate-y-[0.5px] active:scale-[0.98] active:translate-y-0 rounded-[10px]",
        destructiveOutline:
          "border border-status-rejected-border bg-status-rejected-bg text-status-rejected-text hover:bg-status-rejected-bg/80 hover:shadow-xs hover:-translate-y-[0.5px] active:scale-[0.98] active:translate-y-0 rounded-[10px]",
        pill:
          "rounded-full border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary hover:shadow-xs hover:-translate-y-[0.5px] active:scale-[0.98] active:translate-y-0",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-7 text-base font-medium",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
