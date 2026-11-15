import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-[#1c358d] active:bg-[#1c358d] rounded-[10px]",
        secondary:
          "bg-[#f0f5ff] text-primary hover:bg-primary hover:text-white rounded-[8px] border border-[#e0e6f1]",
        outline:
          "border border-[#e0e6f1] bg-white hover:bg-[#f0f5ff] hover:text-primary rounded-[10px]",
        ghost:
          "hover:bg-[#f0f5ff] hover:text-primary rounded-[8px]",
        destructive:
          "bg-[#a22f2f] text-white hover:bg-[#842323] rounded-[10px]",
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
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
