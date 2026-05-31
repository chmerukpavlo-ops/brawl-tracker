import { useEffect, useRef, useState, type RefObject } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { motion } from "motion/react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../hooks/useTranslation";
import { useUrlState } from "../hooks/useUrlState";
import { updateUrl } from "../navigation/urlState";
import { trackAchievementEvent } from "../hooks/useAchievements";
import { haptic } from "../hooks/useHaptic";
import { testPreset } from "../utils/notificationPresets";

const TYPE_KEYS = ["streakReminder", "goalProgress", "favoritesUpdate", "weeklyDigest", "achievements"] as const;
type TypeKey = (typeof TYPE_KEYS)[number];

const TYPE_LABEL_KEY: Record<TypeKey, string> = {
  streakReminder: "notifications.typeStreak",
  goalProgress: "notifications.typeGoal",
  favoritesUpdate: "notifications.typeFavorites",
  weeklyDigest: "notifications.typeWeekly",
  achievements: "notifications.typeAchievements",
};

export default function NotificationsSettingsSection() {
  const { notifications } = usePlayer();
  const { t } = useTranslation();
  const { showSuccess, showInfo } = useToast();
  const urlState = useUrlState();
  const sectionRef = useRef<HTMLElement | null>(null);

  // Auto-scroll into view when deep-linked via ?settings_notifications=open.
  useEffect(() => {
    if (urlState.settings_section !== "notifications") return;
    const node = sectionRef.current;
    if (!node) return;
    const id = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => window.clearTimeout(id);
  }, [urlState.settings_section]);

  const [showHowToBlocked, setShowHowToBlocked] = useState(false);

  const {
    permission,
    isSupported,
    isStandalone,
    isIos,
    settings,
    requestPermission,
    showNotification,
    updateSettings,
    updateTypeSetting,
  } = notifications;

  const requiresIosInstall = isIos && !isStandalone;

  const handleRequest = async () => {
    haptic.medium();
    const result = await requestPermission();
    if (result === "granted") {
      haptic.success();
      trackAchievementEvent("notifications_enabled");
      showSuccess(t("notifications.toastEnabled"));
    } else if (result === "denied") {
      showInfo(t("notifications.blocked"));
    }
  };

  const handleTest = () => {
    haptic.light();
    const n = showNotification(testPreset());
    if (n) {
      trackAchievementEvent("notifications_test");
      showSuccess(t("notifications.testSent"));
    } else {
      showInfo(t("notifications.rateLimited"));
    }
  };

  const renderStatusBadge = () => {
    const map: Record<NotificationPermission, { label: string; cls: string }> = {
      granted: {
        label: t("notifications.statusGranted"),
        cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
      },
      denied: {
        label: t("notifications.statusDenied"),
        cls: "border-rose-500/40 bg-rose-500/10 text-rose-200",
      },
      default: {
        label: t("notifications.statusDefault"),
        cls: "border-white/15 bg-white/5 text-slate-300",
      },
    };
    const it = map[permission];
    return (
      <span
        className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${it.cls}`}
      >
        {it.label}
      </span>
    );
  };

  return (
    <motion.section
      layout
      ref={sectionRef as RefObject<HTMLElement>}
      className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4"
      id="notifications"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
          {permission === "granted" && settings.enabled ? (
            <Bell className="h-3.5 w-3.5 text-[#facc15]" />
          ) : (
            <BellOff className="h-3.5 w-3.5" />
          )}
          {t("notifications.title")}
        </p>
        {renderStatusBadge()}
      </div>

      <p className="mb-3 text-[11px] leading-snug text-slate-400">
        {t("notifications.description")}
      </p>

      {!isSupported && (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-slate-400">
          {t("notifications.notSupported")}
        </p>
      )}

      {isSupported && requiresIosInstall && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-100">
          {t("notifications.iosNotInstalled")}
        </p>
      )}

      {isSupported && !requiresIosInstall && permission === "default" && (
        <button
          type="button"
          onClick={handleRequest}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#facc15] text-xs font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_20px_rgba(250,204,21,0.3)] active:scale-95"
        >
          <Bell className="h-4 w-4" />
          {t("notifications.requestButton")}
        </button>
      )}

      {isSupported && permission === "denied" && (
        <div className="space-y-2">
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[11px] text-rose-100">
            {t("notifications.blocked")}
          </p>
          <button
            type="button"
            onClick={() => setShowHowToBlocked((v) => !v)}
            aria-expanded={showHowToBlocked}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-[11px] text-slate-300 active:scale-[0.99]"
          >
            {showHowToBlocked ? "—" : "+"} {t("notifications.blockedHowTo").split("\n")[0]}
          </button>
          {showHowToBlocked && (
            <pre className="whitespace-pre-line rounded-xl border border-white/10 bg-[#1a0a2e] p-3 text-[11px] text-slate-300">
              {t("notifications.blockedHowTo")}
            </pre>
          )}
        </div>
      )}

      {isSupported && permission === "granted" && (
        <div className="space-y-4">
          <ToggleRow
            label={t("notifications.enabledMaster")}
            checked={settings.enabled}
            onChange={(v) => updateSettings({ enabled: v })}
          />

          {settings.enabled && (
            <>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t("notifications.typesTitle")}
                </p>
                {TYPE_KEYS.map((typeKey) => {
                  const label = t(TYPE_LABEL_KEY[typeKey] as Parameters<typeof t>[0]);
                  return (
                    <div key={typeKey}>
                      <ToggleRow
                        label={label}
                        checked={Boolean(settings.types[typeKey])}
                        onChange={(v) => updateTypeSetting(typeKey, v)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 rounded-xl border border-white/10 bg-[#1a0a2e]/40 p-3">
                <ToggleRow
                  label={t("notifications.quietHoursTitle")}
                  checked={settings.quietHours.enabled}
                  onChange={(v) =>
                    updateSettings({ quietHours: { ...settings.quietHours, enabled: v } })
                  }
                />
                {settings.quietHours.enabled && (
                  <>
                    <p className="text-[10px] text-slate-500">
                      {t("notifications.quietHoursDescription")}
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="flex flex-1 flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {t("notifications.quietFrom")}
                        </span>
                        <input
                          type="time"
                          value={settings.quietHours.from}
                          onChange={(e) =>
                            updateSettings({
                              quietHours: { ...settings.quietHours, from: e.target.value },
                            })
                          }
                          className="rounded-lg border border-white/10 bg-[#1a0a2e] px-2 py-1.5 text-sm text-white outline-none focus:border-[#facc15]/40"
                        />
                      </label>
                      <label className="flex flex-1 flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          {t("notifications.quietTo")}
                        </span>
                        <input
                          type="time"
                          value={settings.quietHours.to}
                          onChange={(e) =>
                            updateSettings({
                              quietHours: { ...settings.quietHours, to: e.target.value },
                            })
                          }
                          className="rounded-lg border border-white/10 bg-[#1a0a2e] px-2 py-1.5 text-sm text-white outline-none focus:border-[#facc15]/40"
                        />
                      </label>
                    </div>
                    <ToggleRow
                      compact
                      label={t("notifications.quietAllowStreak")}
                      checked={settings.quietHours.allowStreakReminder}
                      onChange={(v) =>
                        updateSettings({
                          quietHours: {
                            ...settings.quietHours,
                            allowStreakReminder: v,
                          },
                        })
                      }
                    />
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleTest}
                className="flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-[11px] font-black uppercase tracking-wider text-slate-200 active:scale-95"
              >
                <Send className="h-3.5 w-3.5" />
                {t("notifications.test")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Allow user to clear deep-link param after the section is in view. */}
      {urlState.settings_section === "notifications" && (
        <ClearSettingsAnchor />
      )}
    </motion.section>
  );
}

function ClearSettingsAnchor() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      updateUrl({ settings_section: undefined }, { replace: true });
    }, 800);
    return () => window.clearTimeout(id);
  }, []);
  return null;
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  compact?: boolean;
}

function ToggleRow({ label, checked, onChange, compact = false }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        haptic.light();
        onChange(!checked);
      }}
      className={`flex w-full items-center justify-between rounded-xl border px-3 ${
        compact ? "py-1.5" : "py-2.5"
      } ${
        checked
          ? "border-[#facc15]/30 bg-[#facc15]/5"
          : "border-white/10 bg-white/[0.03]"
      } active:scale-[0.99]`}
    >
      <span
        className={`text-left text-[12px] font-bold ${
          checked ? "text-white" : "text-slate-300"
        }`}
      >
        {label}
      </span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-[#facc15]" : "bg-white/10"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
