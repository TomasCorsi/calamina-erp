import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

interface GridSelectCellProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  focus?: boolean;
}

export function GridSelectCell({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  focus,
}: GridSelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options - show all when input is empty or matches selected label
  const filteredOptions = useMemo(() => {
    const searchTerm = inputValue.toLowerCase().trim();
    // If input is empty or matches selected option, show all options
    if (!searchTerm || searchTerm === selectedOption?.label.toLowerCase()) {
      return options;
    }
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm)
    );
  }, [options, inputValue, selectedOption]);

  // Auto-focus when cell enters edit mode
  useEffect(() => {
    if (focus) {
      inputRef.current?.focus();
      inputRef.current?.select();
      setIsOpen(true);
    }
  }, [focus]);

  // Sync input value with selected option when not editing
  useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedOption?.label || "");
    }
  }, [selectedOption, isOpen]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 200; // approximate height
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      setDropdownPosition({
        top: openUpward ? rect.top - dropdownHeight : rect.bottom,
        left: rect.left,
        width: Math.max(rect.width, 256),
        openUpward,
      });
    }
  }, [isOpen]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle click outside - check both container and portal dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdownEl = document.getElementById("grid-select-dropdown");
      
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = !dropdownEl || !dropdownEl.contains(target);
      
      if (isOutsideContainer && isOutsideDropdown) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setInputValue(selectedOption?.label || "");
    setHighlightedIndex(0);
  }, [selectedOption]);

  const handleSelect = useCallback((optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setHighlightedIndex(0);
    const selected = options.find((opt) => opt.value === optValue);
    setInputValue(selected?.label || "");
  }, [onChange, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    // Select all text on focus for easy replacement
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        handleSelect(filteredOptions[highlightedIndex]?.value || filteredOptions[0].value);
      }
    } else if (e.key === "Tab") {
      // Select highlighted option on Tab
      if (isOpen && filteredOptions.length > 0) {
        handleSelect(filteredOptions[highlightedIndex]?.value || filteredOptions[0].value);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <div className="w-full h-full flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-full px-2 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <ChevronDown 
          className="w-3 h-3 text-muted-foreground shrink-0 mr-1 pointer-events-none" 
        />
      </div>

      {isOpen && createPortal(
        <div 
          id="grid-select-dropdown"
          className="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg overflow-hidden"
          style={{ 
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            minWidth: dropdownPosition.width,
            maxWidth: 320,
          }}
        >
          <div ref={listRef} className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Sin resultados
              </div>
            ) : (
              filteredOptions.map((opt, index) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left ${
                    index === highlightedIndex
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent"
                  }`}
                >
                  <Check
                    className={`w-4 h-4 shrink-0 ${
                      opt.value === value ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span className="truncate">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
