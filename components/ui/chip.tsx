import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  removable?: boolean;
}

export function Chip({
  className,
  selected = false,
  removable = false,
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition",
        selected
          ? "bg-violet-600 text-white"
          : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
        className
      )}
      {...props}
    >
      {children}
      {removable ? <span aria-hidden="true">×</span> : null}
    </button>
  );
}
