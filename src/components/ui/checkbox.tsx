import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Base (unchecked)
      "peer h-4 w-4 shrink-0 rounded-xl border border-input bg-background text-foreground ring-offset-background transition-colors",
      // Focus/disabled
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Checked/indeterminate = brand red via semantic tokens
      // NOTE: use ! to reliably override base bg/border utilities in Tailwind output order
      "data-[state=checked]:!bg-destructive data-[state=checked]:!border-destructive data-[state=checked]:!text-destructive-foreground",
      "data-[state=indeterminate]:!bg-destructive data-[state=indeterminate]:!border-destructive data-[state=indeterminate]:!text-destructive-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-3.5 w-3.5 stroke-[3]" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
export { Checkbox };