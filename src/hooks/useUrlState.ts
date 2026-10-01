import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";

interface UseUrlStateOptions<T> {
  key: string;
  defaultValue: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

/**
 * Hook para sincronizar estado con URL query params y sessionStorage
 * Persiste el estado en la URL para compartir/refrescar y en sessionStorage como fallback
 */
export function useUrlState<T>({
  key,
  defaultValue,
  serialize = JSON.stringify,
  deserialize = JSON.parse,
}: UseUrlStateOptions<T>): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  // Clave única para sessionStorage basada en la ruta
  const storageKey = `url_state_${location.pathname}_${key}`;
  
  // Obtener valor actual
  const currentValue = useMemo((): T => {
    const urlValue = searchParams.get(key);
    
    if (urlValue !== null) {
      try {
        return deserialize(urlValue);
      } catch {
        return defaultValue;
      }
    }
    
    // Fallback a sessionStorage
    const storedValue = sessionStorage.getItem(storageKey);
    if (storedValue !== null) {
      try {
        return deserialize(storedValue);
      } catch {
        return defaultValue;
      }
    }
    
    return defaultValue;
  }, [searchParams, key, storageKey, defaultValue, deserialize]);
  
  // Actualizar valor
  const setValue = useCallback((value: T) => {
    const serialized = serialize(value);
    
    // Guardar en sessionStorage
    sessionStorage.setItem(storageKey, serialized);
    
    // Actualizar URL sin recargar
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value === defaultValue || value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, serialized);
      }
      return newParams;
    }, { replace: true });
  }, [key, storageKey, serialize, setSearchParams, defaultValue]);
  
  return [currentValue, setValue];
}

/**
 * Hook para manejar pestañas sincronizadas con la URL
 */
export function useUrlTab(defaultTab: string): [string, (tab: string) => void] {
  return useUrlState<string>({
    key: "tab",
    defaultValue: defaultTab,
    serialize: (v) => v,
    deserialize: (v) => v,
  });
}

/**
 * Hook para manejar filtros de fecha/obra sincronizados con URL
 */
export interface UrlFilterState {
  fechaDesde?: string;
  fechaHasta?: string;
  mes?: string;
  year?: number;
  obraId?: string;
  estado?: string;
  maquinariaId?: string;
}

export function useUrlFilters(defaultFilters: UrlFilterState = {}): [UrlFilterState, (filters: Partial<UrlFilterState>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  const storageKey = `url_filters_${location.pathname}`;
  
  const currentFilters = useMemo((): UrlFilterState => {
    // Primero intentar desde URL
    const urlFilters: UrlFilterState = {};
    
    const fechaDesde = searchParams.get("desde");
    const fechaHasta = searchParams.get("hasta");
    const mes = searchParams.get("mes");
    const year = searchParams.get("year");
    const obraId = searchParams.get("obra");
    const estado = searchParams.get("estado");
    const maquinariaId = searchParams.get("maquinaria");
    
    if (fechaDesde) urlFilters.fechaDesde = fechaDesde;
    if (fechaHasta) urlFilters.fechaHasta = fechaHasta;
    if (mes) urlFilters.mes = mes;
    if (year) urlFilters.year = parseInt(year);
    if (obraId) urlFilters.obraId = obraId;
    if (estado) urlFilters.estado = estado;
    if (maquinariaId) urlFilters.maquinariaId = maquinariaId;
    
    // Si hay algo en URL, usar eso
    if (Object.keys(urlFilters).length > 0) {
      return { ...defaultFilters, ...urlFilters };
    }
    
    // Fallback a sessionStorage
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        return { ...defaultFilters, ...JSON.parse(stored) };
      } catch {
        return defaultFilters;
      }
    }
    
    return defaultFilters;
  }, [searchParams, storageKey, defaultFilters]);
  
  const setFilters = useCallback((filters: Partial<UrlFilterState>) => {
    const newFilters = { ...currentFilters, ...filters };
    
    // Guardar en sessionStorage
    sessionStorage.setItem(storageKey, JSON.stringify(newFilters));
    
    // Actualizar URL
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      
      // Limpiar filtros anteriores
      newParams.delete("desde");
      newParams.delete("hasta");
      newParams.delete("mes");
      newParams.delete("year");
      newParams.delete("obra");
      newParams.delete("estado");
      newParams.delete("maquinaria");
      
      // Agregar nuevos
      if (newFilters.fechaDesde) newParams.set("desde", newFilters.fechaDesde);
      if (newFilters.fechaHasta) newParams.set("hasta", newFilters.fechaHasta);
      if (newFilters.mes) newParams.set("mes", newFilters.mes);
      if (newFilters.year) newParams.set("year", newFilters.year.toString());
      if (newFilters.obraId) newParams.set("obra", newFilters.obraId);
      if (newFilters.estado) newParams.set("estado", newFilters.estado);
      if (newFilters.maquinariaId) newParams.set("maquinaria", newFilters.maquinariaId);
      
      return newParams;
    }, { replace: true });
  }, [currentFilters, storageKey, setSearchParams]);
  
  return [currentFilters, setFilters];
}

/**
 * Hook simple para guardar/restaurar búsqueda
 */
export function useUrlSearch(defaultValue: string = ""): [string, (value: string) => void] {
  return useUrlState<string>({
    key: "q",
    defaultValue,
    serialize: (v) => v,
    deserialize: (v) => v,
  });
}
