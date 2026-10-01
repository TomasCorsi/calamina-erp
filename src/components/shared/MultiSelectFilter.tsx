import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** Label shown when nothing is selected, e.g. "Todas las obras" */
  allLabel: string;
  /** Plural noun for the summary, e.g. "obras" */
  itemsLabel?: string;
  placeholder?: string;
  className?: string;
  /** Cantidad de resultados por opción según el resto de filtros activos */
  counts?: Record<string, number>;
}

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  allLabel,
  itemsLabel = "seleccionados",
  placeholder = "Buscar...",
  className,
  counts,
}: MultiSelectFilterProps) {

  const [open, setOpen] = useState(false);

  const summary = useMemo(() => {
    if (selected.length === 0) return allLabel;
    if (selected.length === 1) {
      const opt = options.find((o) => o.value === selected[0]);
      return opt?.label || selected[0];
    }
    return `${selected.length} ${itemsLabel}`;
  }, [selected, options, allLabel, itemsLabel]);

  // Seleccionados primero para no perderlos de vista en listas largas
  const ordered = useMemo(() => {
    const sel = options.filter((o) => selected.includes(o.value));
    const rest = options.filter((o) => !selected.includes(o.value));
    return [...sel, ...rest];
  }, [options, selected]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 justify-between font-normal bg-card",
            selected.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{summary}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-popover z-50" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <div className="flex items-center justify-between border-b px-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange(options.map((o) => o.value))}
            >
              Seleccionar todo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onChange([])}
            >
              Limpiar
            </Button>
          </div>
          <CommandList className="max-h-64">
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {ordered.map((opt) => {
                const isSelected = selected.includes(opt.value);
                const count = counts ? counts[opt.value] ?? 0 : undefined;
                const sinResultados = counts != null && !isSelected && count === 0;
                return (
                  <CommandItem
                    key={opt.value}
                    value={`${opt.label} ${opt.value}`}
                    onSelect={() => toggle(opt.value)}
                    className={cn("gap-2", sinResultados && "opacity-40")}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <span className="flex-1 truncate">{opt.label}</span>
                    {count !== undefined && (
                      <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                    )}
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                );
              })}

            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
