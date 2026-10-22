import { Inbox, Users, KanbanSquare, FileText, Menu, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Bottom tab bar on mobile, in this order. */
export const TABS: NavItem[] = [
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/contacts", label: "Contacts", icon: Users },
  { to: "/app/pipeline", label: "Pipeline", icon: KanbanSquare },
  { to: "/app/quotes", label: "Quotes", icon: FileText },
  { to: "/app/more", label: "More", icon: Menu },
];

/** Desktop sidebar shows "More" items directly. */
export const SIDEBAR: NavItem[] = [
  ...TABS.filter((t) => t.to !== "/app/more"),
  { to: "/app/settings", label: "Settings", icon: Settings },
];
