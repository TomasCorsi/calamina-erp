import { format, parse, isValid } from "date-fns";

// Helper to format date for display (dd/mm/yyyy)
export function formatDateForDisplay(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    if (!isValid(date)) return isoDate;
    return format(date, "dd/MM/yyyy");
  } catch {
    return isoDate;
  }
}

// Helper to parse user input back to ISO format
export function parseDateToISO(displayDate: string): string {
  if (!displayDate) return "";
  
  // If already in ISO format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
    return displayDate;
  }
  
  // Try to parse dd/mm/yyyy format
  try {
    const parsed = parse(displayDate, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch {
    // Fall through
  }
  
  // Try to parse d/m/yyyy format (flexible)
  try {
    const parsed = parse(displayDate, "d/M/yyyy", new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch {
    // Fall through
  }
  
  return displayDate;
}

// Custom date column definition for react-datasheet-grid
export const dateColumn = {
  component: ({ 
    rowData, 
    setRowData, 
    focus,
    active,
    stopEditing,
  }: { 
    rowData: string; 
    setRowData: (v: string) => void; 
    focus: boolean;
    active: boolean;
    stopEditing: (opts?: { nextRow?: boolean }) => void;
  }) => {
    const displayValue = formatDateForDisplay(rowData);
    
    return (
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          const isoValue = parseDateToISO(e.target.value);
          setRowData(isoValue);
        }}
        onBlur={(e) => {
          // On blur, ensure value is properly formatted
          const isoValue = parseDateToISO(e.target.value);
          if (isoValue !== rowData) {
            setRowData(isoValue);
          }
        }}
        onKeyDown={(e) => {
          // Allow Tab and Enter to move to next cell
          if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            stopEditing({ nextRow: e.key === 'Enter' });
          }
          // Escape to cancel
          if (e.key === 'Escape') {
            stopEditing();
          }
        }}
        placeholder="dd/mm/aaaa"
        autoFocus={focus}
        style={{ 
          width: '100%', 
          height: '100%', 
          padding: '4px 8px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'inherit',
          fontSize: 'inherit',
          fontFamily: 'inherit',
        }}
      />
    );
  },
  deleteValue: () => "",
  copyValue: ({ rowData }: { rowData: string }) => formatDateForDisplay(rowData),
  pasteValue: ({ value }: { value: string }) => parseDateToISO(value),
  disableKeys: true,
  keepFocus: true,
};
