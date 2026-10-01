import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export interface ColumnFilterConfig {
  column: string;
  title: string;
  getValue?: (row: any) => string;
}

interface GridFilterToolbarProps {
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  columnFilters: Record<string, Set<string>>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
  data: any[];
  filterConfigs: ColumnFilterConfig[];
  children?: React.ReactNode;
}

export function GridFilterToolbar({
  globalSearch,
  setGlobalSearch,
  columnFilters,
  setColumnFilters,
  data,
  filterConfigs,
  children,
}: GridFilterToolbarProps) {
  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(set => set.size > 0).length;
  }, [columnFilters]);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setGlobalSearch("");
  }, [setColumnFilters, setGlobalSearch]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 max-w-xs min-w-[150px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="h-8 pl-7 pr-7 text-sm bg-card border-border"
        />
        {globalSearch && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            onClick={() => setGlobalSearch("")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      
      {activeFilterCount > 0 && (
        <Badge variant="secondary" className="h-6 gap-1">
          {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''}
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 ml-1"
            onClick={clearAllFilters}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      
      {children}
    </div>
  );
}

// Hook for managing grid filters
export function useGridFilters<T extends Record<string, any>>(
  data: T[],
  filterConfigs: ColumnFilterConfig[],
  searchFields: (keyof T)[]
) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});

  const getUniqueValues = useCallback((column: string) => {
    const config = filterConfigs.find(c => c.column === column);
    const values = new Set<string>();
    
    data.forEach((row) => {
      let value: string;
      if (config?.getValue) {
        value = config.getValue(row);
      } else {
        value = String(row[column] || "");
      }
      if (value) {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  }, [data, filterConfigs]);

  const toggleColumnFilter = useCallback((column: string, value: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[column]) {
        newFilters[column] = new Set();
      } else {
        newFilters[column] = new Set(newFilters[column]);
      }
      
      if (newFilters[column].has(value)) {
        newFilters[column].delete(value);
      } else {
        newFilters[column].add(value);
      }
      
      return newFilters;
    });
  }, []);

  const clearColumnFilter = useCallback((column: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setGlobalSearch("");
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Global search
      if (globalSearch) {
        const searchLower = globalSearch.toLowerCase();
        const matchesSearch = searchFields.some(field => {
          const value = row[field];
          return value && String(value).toLowerCase().includes(searchLower);
        });
        if (!matchesSearch) return false;
      }
      
      // Column filters
      for (const [column, allowedValues] of Object.entries(columnFilters)) {
        if (allowedValues.size === 0) continue;
        
        const config = filterConfigs.find(c => c.column === column);
        let displayValue: string;
        
        if (config?.getValue) {
          displayValue = config.getValue(row);
        } else {
          displayValue = String(row[column] || "");
        }
        
        if (!allowedValues.has(displayValue)) return false;
      }
      
      return true;
    });
  }, [data, globalSearch, columnFilters, searchFields, filterConfigs]);

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(set => set.size > 0).length;
  }, [columnFilters]);

  return {
    globalSearch,
    setGlobalSearch,
    columnFilters,
    setColumnFilters,
    filteredData,
    activeFilterCount,
    getUniqueValues,
    toggleColumnFilter,
    clearColumnFilter,
    clearAllFilters,
  };
}

// Column header with filter icon
interface ColumnFilterHeaderProps {
  column: string;
  title: string;
  getUniqueValues: (column: string) => string[];
  columnFilters: Record<string, Set<string>>;
  toggleColumnFilter: (column: string, value: string) => void;
  clearColumnFilter: (column: string) => void;
  setColumnFilters?: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
}

export function ColumnFilterHeader({ 
  column, 
  title, 
  getUniqueValues, 
  columnFilters, 
  toggleColumnFilter, 
  clearColumnFilter,
  setColumnFilters 
}: ColumnFilterHeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  
  const uniqueValues = getUniqueValues(column);
  const activeFilter = columnFilters[column];
  const hasFilter = activeFilter && activeFilter.size > 0;
  
  // Filter values based on search term
  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues;
    const searchLower = searchTerm.toLowerCase();
    return uniqueValues.filter(value => 
      value.toLowerCase().includes(searchLower)
    );
  }, [uniqueValues, searchTerm]);

  // Check if all filtered values are selected
  const allFilteredSelected = useMemo(() => {
    if (filteredValues.length === 0) return false;
    return filteredValues.every(value => activeFilter?.has(value));
  }, [filteredValues, activeFilter]);

  // Check if some (but not all) filtered values are selected
  const someFilteredSelected = useMemo(() => {
    if (filteredValues.length === 0) return false;
    const selectedCount = filteredValues.filter(value => activeFilter?.has(value)).length;
    return selectedCount > 0 && selectedCount < filteredValues.length;
  }, [filteredValues, activeFilter]);

  // Toggle all filtered values
  const handleToggleAll = useCallback(() => {
    if (!setColumnFilters) return;
    
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[column]) {
        newFilters[column] = new Set();
      } else {
        newFilters[column] = new Set(newFilters[column]);
      }

      if (allFilteredSelected) {
        // Deselect all filtered values
        filteredValues.forEach(value => {
          newFilters[column].delete(value);
        });
      } else {
        // Select all filtered values
        filteredValues.forEach(value => {
          newFilters[column].add(value);
        });
      }

      return newFilters;
    });
  }, [column, filteredValues, allFilteredSelected, setColumnFilters]);

  // Clear search when popover closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm("");
    }
  };

  // Count of selected items
  const selectedCount = activeFilter?.size || 0;
  
  return (
    <div className="flex items-center gap-1">
      <span>{title}</span>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-5 w-5 p-0 relative ${hasFilter ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Filter className="h-3 w-3" />
            {hasFilter && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] rounded-full h-3.5 min-w-[14px] flex items-center justify-center px-0.5 font-medium">
                {selectedCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3 bg-popover border-border z-50" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filtrar por {title}</span>
              {hasFilter && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => clearColumnFilter(column)}
                >
                  Limpiar
                </Button>
              )}
            </div>
            
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-sm bg-background border-border"
              />
            </div>

            {/* Select All option */}
            {filteredValues.length > 0 && setColumnFilters && (
              <div 
                className="flex items-center space-x-2 py-1.5 px-2 rounded-md bg-muted/50 border border-border cursor-pointer hover:bg-muted transition-colors"
                onClick={handleToggleAll}
              >
                <Checkbox
                  id={`${column}-select-all`}
                  checked={allFilteredSelected}
                  className={someFilteredSelected ? "data-[state=unchecked]:bg-red-600/30" : ""}
                  onCheckedChange={handleToggleAll}
                  onClick={(e) => e.stopPropagation()}
                />
                <label
                  htmlFor={`${column}-select-all`}
                  className="text-sm font-medium cursor-pointer flex-1"
                  onClick={(e) => e.preventDefault()}
                >
                  {searchTerm ? `Seleccionar todos (${filteredValues.length})` : "Seleccionar todos"}
                </label>
              </div>
            )}

            {/* Divider */}
            {filteredValues.length > 0 && (
              <div className="border-t border-border" />
            )}

            {/* Values list */}
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {filteredValues.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">
                  {searchTerm ? "Sin resultados" : "Sin valores"}
                </p>
              ) : (
              filteredValues.map((value) => {
                  const isSelected = activeFilter?.has(value) || false;
                  return (
                    <div 
                      key={value} 
                      className={`flex items-center space-x-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-red-600/10 border border-red-600/30' 
                          : 'hover:bg-muted border border-transparent'
                      }`}
                      onClick={() => toggleColumnFilter(column, value)}
                    >
                      <Checkbox
                        id={`${column}-${value}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleColumnFilter(column, value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label
                        htmlFor={`${column}-${value}`}
                        className={`text-sm cursor-pointer flex-1 truncate ${
                          isSelected ? 'font-medium text-foreground' : 'text-muted-foreground'
                        }`}
                        onClick={(e) => e.preventDefault()}
                      >
                        {value || "(vacío)"}
                      </label>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with count */}
            {hasFilter && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {selectedCount} de {uniqueValues.length} seleccionados
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
