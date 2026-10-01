import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  value: string;
  label: string;
  searchValue?: string; // Optional custom search string
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  allowCustom?: boolean;
  customLabel?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron resultados.",
  className,
  allowCustom = false,
  customLabel = "Agregar",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedOption = options.find((option) => option.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (value || placeholder);

  const showAddOption = allowCustom && search.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === search.trim().toLowerCase() || o.value.toLowerCase() === search.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-muted border-border font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value ? displayLabel : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border z-50 max-h-[80vh]" align="start">
        <Command className="bg-popover" shouldFilter={!allowCustom}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[260px] overflow-y-auto overscroll-contain touch-pan-y">
            <CommandEmpty>
              {showAddOption ? null : emptyText}
            </CommandEmpty>
            <CommandGroup>
              {showAddOption && (
                <CommandItem
                  value={`__add__${search.trim()}`}
                  onSelect={() => {
                    onValueChange(search.trim());
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer text-primary font-medium"
                >
                  + {customLabel} "{search.trim()}"
                </CommandItem>
              )}
              {(allowCustom
                ? options.filter((o) => {
                    const s = search.toLowerCase();
                    return !s || (o.searchValue || o.label).toLowerCase().includes(s);
                  })
                : options
              ).map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.searchValue || option.label}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="cursor-pointer"
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
