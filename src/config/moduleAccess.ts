export type ModuleAccessContext = {
  roles: readonly string[];
  permissions: ReadonlySet<string>;
};

const USER_MANAGEMENT_PERMISSIONS = ["users.view", "users.invite", "users.manage_roles"];

export function canAccessModule(path: string, context: ModuleAccessContext): boolean {
  if (context.roles.includes("admin")) return true;
  if (path === "/obras") return context.permissions.has("obras.view");
  if (path === "/personal") return context.permissions.has("personal.view");
  if (path === "/parte-diario") return context.permissions.has("parte_diario.view");
  if (path === "/remitos") return context.permissions.has("remitos.view");
  if (path === "/maquinarias") return context.permissions.has("maquinarias.view");
  if (path === "/gastos") return context.permissions.has("gastos.view") || context.permissions.has("combustible.view");
  if (path === "/mantenimiento") return context.permissions.has("mantenimiento.view");
  if (path === "/stock") return context.permissions.has("stock.view");
  if (path === "/presentismo") return context.permissions.has("presentismo.view");
  if (path === "/clientes") return context.permissions.has("clientes.view");
  if (path === "/proveedores") return context.permissions.has("proveedores.view") || context.permissions.has("compras.view");
  if (path === "/cotizaciones") return context.permissions.has("cotizaciones.view");
  if (path === "/certificados") return context.permissions.has("certificados.view");
  if (path === "/configuracion" || path === "/usuarios") {
    return USER_MANAGEMENT_PERMISSIONS.some((permission) => context.permissions.has(permission));
  }
  return false;
}
