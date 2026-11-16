import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-[#1c358d] active:bg-[#1c358d] active:scale-[0.98] rounded-[10px]",
        secondary:
          "bg-[#f0f5ff] text-primary hover:bg-primary hover:text-white rounded-[8px] border border-[#e0e6f1] active:scale-[0.98]",
        outline:
          "border border-[#e0e6f1] bg-white hover:bg-[#f0f5ff] hover:text-primary rounded-[10px] active:scale-[0.98]",
        ghost:
          "hover:bg-[#f0f5ff] hover:text-primary rounded-[8px]",
        success:
          "bg-[#16a34a] text-white shadow-xs hover:bg-[#15803d] active:bg-[#15803d] active:scale-[0.98] rounded-[10px]",
        warning:
          "bg-[#f59e0b] text-[#25314c] font-bold shadow-xs hover:bg-[#d97706] active:bg-[#d97706] active:scale-[0.98] rounded-[10px]",
        destructive:
          "bg-[#a22f2f] text-white shadow-xs hover:bg-[#842323] active:bg-[#842323] active:scale-[0.98] rounded-[10px]",
        successOutline:
          "border border-[#86efac] bg-[#f0fdf4] text-[#15803d] hover:bg-[#dcfce7] active:scale-[0.98] rounded-[10px]",
        warningOutline:
          "border border-[#fde047] bg-[#fefce8] text-[#854d0e] hover:bg-[#fef9c3] active:scale-[0.98] rounded-[10px]",
        destructiveOutline:
          "border border-[#fecaca] bg-[#fce8e8] text-[#a22f2f] hover:bg-[#fad2d2] active:scale-[0.98] rounded-[10px]",
        pill:
          "rounded-full border border-[#e0e6f1] bg-white text-[#57657e] hover:border-primary hover:text-primary",
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
