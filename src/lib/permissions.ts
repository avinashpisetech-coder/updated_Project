export interface Permission {
  resource: string;
  action: string;
}

/**
 * Lightweight helper to evaluate if a permission exists in a list.
 */
export function hasPermission(
  permissions: Permission[],
  resource: string,
  action: string = "read"
): boolean {
  if (!permissions || !Array.isArray(permissions)) return false;
  
  const resourcesToCheck = resource.startsWith("module_") 
    ? [resource, resource.replace("module_", "")]
    : [resource, `module_${resource}`];

  return permissions.some(
    (p) => 
      resourcesToCheck.includes(p.resource) && 
      (p.action === action || p.action === "manage" || p.action === "*")
  );
}

/**
 * Resource Identifiers for consistent usage
 */
export const RESOURCES = {
  DASHBOARD: "dashboard",
  TICKETS: "module_help_desk",
  ASSETS: "module_assets",
  INTEL: "intelligence_hub",
  REPORTS: "reports",
  MAIL: "mail",
  THEMES: "themes",
  USERS: "users_master",
  ERP: "module_erp_masters",
  HELP_DESK_MASTER: "help_desk_master",
  ORGS: "organizations",
  ACCESS: "access_control",
  SUPPORT_QUEUE: "support-queue",
};
