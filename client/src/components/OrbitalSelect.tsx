import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

export interface OrbitalOption {
  value: string;
  label: string;
  disabled?: boolean;
}
interface Props {
  value: string;
  onValueChange: (value: string) => void;
  options: OrbitalOption[];
  ariaLabel: string;
  className?: string;
}
const ALL_VALUE = "__flowtrace_all__";

export default function OrbitalSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = "",
}: Props) {
  return (
    <SelectPrimitive.Root
      value={value || ALL_VALUE}
      onValueChange={next => onValueChange(next === ALL_VALUE ? "" : next)}
    >
      <SelectPrimitive.Trigger
        className={`orbital-select-trigger ${className}`}
        aria-label={ariaLabel}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={14} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="orbital-select-menu"
          position="popper"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          <SelectPrimitive.Viewport className="orbital-select-viewport">
            {options.map(option => (
              <SelectPrimitive.Item
                key={option.value || ALL_VALUE}
                value={option.value || ALL_VALUE}
                disabled={option.disabled}
                className="orbital-select-option"
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="orbital-select-indicator">
                  <Check size={14} />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
