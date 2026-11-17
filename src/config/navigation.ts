export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

export const customerNavItems: NavItem[] = [
  { label: "Find a car", href: "/" },
  { label: "My bookings", href: "/bookings", requiresAuth: true },
];

export const adminNavItems: NavItem[] = [
  { label: "Bookings", href: "/admin/bookings", requiresAdmin: true },
  { label: "Timeline", href: "/admin/timeline", requiresAdmin: true },
  { label: "Fleet", href: "/admin/fleet", requiresAdmin: true },
  { label: "Options", href: "/admin/options", requiresAdmin: true },
  { label: "Members", href: "/admin/members", requiresAdmin: true },
  { label: "Reports", href: "/admin/reports", requiresAdmin: true },
];
