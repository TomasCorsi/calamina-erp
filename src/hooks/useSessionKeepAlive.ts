export function useSessionKeepAlive(_isAuthenticated: boolean) {
  // Supabase Auth already manages foreground recovery and token renewal through
  // autoRefreshToken. Manual focus/visibility refreshes caused an unnecessary
  // TOKEN_REFRESHED event and a full access reload on every tab return.
}
