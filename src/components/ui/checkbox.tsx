"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<
  React.ComponentProps<"input">,
  "type" | "onChange" | "checked"
> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
};

function Checkbox({
  className,
  checked = false,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "mt-0.5 size-4 shrink-0 cursor-pointer rounded border border-input accent-primary",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
