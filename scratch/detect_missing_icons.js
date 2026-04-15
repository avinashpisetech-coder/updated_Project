const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
};

const findMissingImports = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('lucide-react')) return null;

  const importMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/);
  if (!importMatch) return null;

  const importedIcons = importMatch[1].split(',').map(i => i.split('as')[0].trim()).filter(Boolean);
  
  // Find all used components starting with uppercase
  // This is a naive heuristic: <IconName or IconName.something
  const componentRegex = /<([A-Z][a-zA-Z0-9]+)/g;
  let match;
  const usedIcons = new Set();
  while ((match = componentRegex.exec(content)) !== null) {
    usedIcons.add(match[1]);
  }

  // Common built-in or other imports to ignore
  const ignore = new Set(['Link', 'Button', 'Badge', 'Label', 'Input', 'Textarea', 'Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue', 'Tabs', 'TabsContent', 'TabsList', 'TabsTrigger', 'Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle', 'Table', 'TableBody', 'TableCell', 'TableHead', 'TableHeader', 'TableRow', 'DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuTrigger', 'Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle', 'DialogTrigger', 'NotificationBell', 'ThemeToggle', 'ThemeOrnaments', 'PageScene', 'Navbar', 'Sidebar', 'DashboardShell', 'NavigationProvider', 'UserManager', 'DepartmentManager', 'DesignationManager', 'ModuleHeader', 'SuccessOverlay', 'LoadingButton', 'MetricRow', 'TicketTable', 'ExecutiveFilters', 'DashboardV2', 'HomeDashboard', 'DashboardVersionSwitcher', 'MultiSelect', 'IntelligenceReports', 'AnalyticsHeader', 'ActivityFeed', 'BackButton', 'AssetSystemSidebar', 'SoftwareClient', 'ReturnClient', 'RequisitionApprovalClient', 'PurchaseDetailClient', 'GrnDetailClient', 'EditGrnClient', 'NewGrnClient', 'EditPurchaseClient', 'PurchasesClient', 'NewPurchaseClient', 'GrnSelectionClient', 'GrnClient', 'MyAssetsClient', 'MovementsClient', 'RelationshipMesh', 'AssetDetailPro', 'AssetGrid', 'InventoryClient', 'MaintenanceClient', 'DisposalClient', 'DeploymentClient', 'HandoverClient', 'AssetGovernanceClient', 'SoftwareSystemManager', 'ErpModuleManager', 'OrganizationManager', 'CategoryManager', 'AccessControlManager', 'AuthShell', 'LoginForm', 'RegisterForm', 'ChangePasswordForm', 'ProfileManager', 'TicketManager', 'TicketDetail', 'CreateTicketForm', 'CommentFeed', 'StatusBadge', 'PriorityBadge', 'AssetMasterClient', 'AuditLogsManager', 'FiscalPolicyManager', 'SystemConfigManager', 'ServiceAnalyticsClient', 'ReportsClient', 'IntelClient', 'ModuleAccessManager', 'PermissionMatrix', 'RoleManager', 'DesignSystem', 'Shell', 'Layout', 'Fragment', 'Provider', 'Head', 'Image', 'Script', 'Html', 'Body', 'Main', 'NextScript', 'Suspense', 'Portal', 'Slot', 'Primitive']);

  const missing = [];
  for (const icon of usedIcons) {
    if (!importedIcons.includes(icon) && !ignore.has(icon)) {
      // Check if it's imported from somewhere else
      const otherImport = new RegExp(`import\\s*.*${icon}.*\\s*from`).test(content);
      if (!otherImport) {
        // Also check for React.createElement(IconName
        missing.push(icon);
      }
    }
  }

  return missing.length > 0 ? { file: filePath, missing } : null;
};

const files = walk('src');
const allMissing = files.map(findMissingImports).filter(Boolean);

console.log(JSON.stringify(allMissing, null, 2));
