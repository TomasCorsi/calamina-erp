/**
 * Realtime remains disabled in the reproducible local toolchain. Dashboard data
 * hooks already provide bounded polling, so this compatibility hook deliberately
 * avoids opening a websocket while preserving the legacy UI contract.
 */
export function useTableroRealtime(_enabled = true) {
  return { conectado: false, ultimoCambio: null as number | null };
}
