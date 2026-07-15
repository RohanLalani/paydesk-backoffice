import {
  Activity,
  Boxes,
  ClipboardList,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";

export type LogsNavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const logsNavigation: LogsNavigationItem[] = [
  {
    id: "item-logs",
    label: "Item Logs",
    href: "/logs/item-logs",
    icon: ClipboardList,
    description: "Review item-level catalog and product change history.",
  },
  {
    id: "inventory-logs",
    label: "Inventory Logs",
    href: "/logs/inventory",
    icon: Boxes,
    description: "Review inventory events, stock changes, and receiving activity.",
  },
  {
    id: "activity-logs",
    label: "Activity Logs",
    href: "/logs/activity",
    icon: Activity,
    description: "Review back-office user activity and operational events.",
  },
  {
    id: "transaction-logs",
    label: "Transaction Logs",
    href: "/logs/transactions",
    icon: ReceiptText,
    description: "Review transaction sync and register event history.",
  },
];
