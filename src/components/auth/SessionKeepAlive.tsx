import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive';
import { useAuth } from '@/hooks/useAuth';

export function SessionKeepAlive() {
  const { user } = useAuth();
  
  // Solo activar si hay usuario logueado
  useSessionKeepAlive(!!user);
  
  return null; // No renderiza nada
}
