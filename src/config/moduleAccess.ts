export type ModuleAccessContext = {
  roles: readonly string[];
  permissions: ReadonlySet<string>;
};

const USER_MANAGEMENT_PERMISSIONS = ["users.view", "users.invite", "users.manage_roles"];

export function canAccessModule(path: string, context: ModuleAccessContext): boolean {
  if (context.roles.includes("admin")) return true;
  if (path === "/obras") return context.permissions.has("obras.view");
  if (path === "/personal") return context.permissions.has("personal.view");
  if (path === "/configuracion" || path === "/usuarios") {
    return USER_MANAGEMENT_PERMISSIONS.some((permission) => context.permissions.has(permission));
  }
  return false;
}
