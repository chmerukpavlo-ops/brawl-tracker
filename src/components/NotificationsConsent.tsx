import { useEffect, useMemo } from "react";
import { Bell, Sparkles, Trophy, Target, Flame } from "lucide-react";
import BottomSheet from "./BottomSheet";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../hooks/useTranslation";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { haptic } from "../hooks/useHaptic";

export type ConsentTrigger = "first_pinned" | "first_goal" | "streak_milestone" | "manual";

interface NotificationsConsentProps {
  open: boolean;
  trigger: ConsentTrigger;
  onClose: () => void;
}

export default function NotificationsConsent({
  open,
  trigger,
  onClose,
}: NotificationsConsentProps) {
  const { notifications, setActiveTab } = usePlayer();
  const { showSuccess, showInfo } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (open) notifications.recordPromptShown();
  }, [open, notifications]);

  const subtitle = useMemo(() => {
    switch (trigger) {
      case "first_pinned":
        return t("notifications.consent.subtitleFirstPin");
      case "first_goal":
        return t("notifications.consent.subtitleFirstGoal");
      case "streak_milestone":
        return t("notifications.consent.subtitleStreak");
      case "manual":
      default:
        return t("notifications.consent.subtitleGeneric");
    }
  }, [trigger, t]);

  const handleAllow = async () => {
    haptic.medium();
    const result = await notifications.requestPermission();
    if (result === "granted") {
      haptic.success();
      trackAchievementEvent("notifications_enabled");
      showSuccess(t("notifications.toastEnabled"));
    } else if (result === "denied") {
      showInfo(t("notifications.toastDenied"));
    }
    onClose();
  };

  const handleDecline = () => {
    notifications.recordPromptDismissed();
    onClose();
  };

  const handleSettings = () => {
    notifications.recordPromptDismissed();
    onClose();
    setActiveTab("settings");
  };

  if (!notifications.isSupported) return null;

  const showsIosHint = notifications.isIos && !notifications.isStandalone;

  return (
    <BottomSheet open={open} onClose={handleDecline} title={t("notifications.consent.title")}>
      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3 rounded-2xl border border-[#facc15]/20 bg-[#facc15]/5 p-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#facc15]/15 text-[#facc15] shadow-[0_0_18px_rgba(250,204,21,0.35)]">
            <Bell className="h-6 w-6" />
          </span>
          <p className="text-[12px] leading-snug text-slate-200">{subtitle}</p>
        </div>

        <ul className="space-y-2 text-[12px] text-slate-300">
          <li className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#f97316]" />
            {t("notifications.consent.bulletStreak")}
          </li>
          <li className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#22c55e]" />
            {t("notifications.consent.bulletGoal")}
          </li>
          <li className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#facc15]" />
            {t("notifications.consent.bulletFavorites")}
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#a78bfa]" />
            {t("notifications.consent.bulletAchievements")}
          </li>
        </ul>

        {showsIosHint && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-snug text-amber-100">
            {t("notifications.consent.iosHint")}
          </p>
        )}

        <p className="text-[10px] text-slate-500">
          {t("notifications.consent.backgroundHint")}
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleAllow}
            disabled={showsIosHint}
            className="min-h-[48px] w-full rounded-xl bg-[#facc15] text-xs font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95 disabled:opacity-40"
          >
            {t("notifications.consent.allow")}
          </button>
          <button
            type="button"
            onClick={handleSettings}
            className="min-h-[40px] w-full rounded-xl border border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-200 active:scale-95"
          >
            {t("notifications.consent.configure")}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            className="min-h-[36px] w-full text-[10px] font-black uppercase tracking-wider text-slate-500 active:scale-95"
          >
            {t("notifications.consent.notNow")}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
