import {
  BadgePercent,
  PackagePlus,
  type LucideIcon,
} from "lucide-react";

export type SendToPosNavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  placeholder: string;
};

export const sendToPosNavigation: SendToPosNavigationItem[] = [
  {
    id: "multi-pack-review",
    label: "Multi Pack Review",
    href: "/send-to-pos/multi-pack-review",
    icon: PackagePlus,
    description: "Review pending multi-pack pricing changes before publishing them to store registers.",
    placeholder: "This workspace will display multi-pack pricing changes waiting to be sent to the POS.",
  },
  {
    id: "promotions-review",
    label: "Promotions Review",
    href: "/send-to-pos/promotions-review",
    icon: BadgePercent,
    description: "Review pending promotion changes before publishing them to store registers.",
    placeholder: "This workspace will display promotion changes waiting to be sent to the POS.",
  },
];
