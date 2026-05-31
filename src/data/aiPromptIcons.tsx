import {
  BookOpen,
  Brain,
  Calendar,
  Compass,
  Crosshair,
  HelpCircle,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Маппінг назв іконок (з `aiPrompts.ts`) на реальні `lucide-react` компоненти.
 * Виносимо у tsx-файл, щоб дані-пресети залишались чистими (можна
 * імпортувати і на сервері).
 */
const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Zap,
  Compass,
  Crosshair,
  Users,
  Brain,
  Trophy,
  Sparkles,
  Calendar,
  BookOpen,
};

export function getPresetIcon(name: string | undefined | null): LucideIcon {
  if (!name) return HelpCircle;
  return ICON_MAP[name] ?? HelpCircle;
}
