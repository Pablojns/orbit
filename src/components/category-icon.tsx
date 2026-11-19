import {
  Briefcase,
  Bus,
  Circle,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-basket": ShoppingBasket,
  bus: Bus,
  home: House,
  receipt: Receipt,
  "gamepad-2": Gamepad2,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "shopping-bag": ShoppingBag,
  repeat: Repeat,
  briefcase: Briefcase,
  sparkles: Sparkles,
  circle: Circle,
};

export function CategoryIcon({ name, size = 18 }: { name?: string | null; size?: number }) {
  const Icon = (name && ICONS[name]) || Circle;
  return <Icon size={size} aria-hidden />;
}
