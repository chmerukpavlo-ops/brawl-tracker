import { Share, Plus, ArrowDownToLine } from "lucide-react";
import BottomSheet from "./BottomSheet";
import { useTranslation } from "../hooks/useTranslation";

interface IosInstallInstructionsProps {
  open: boolean;
  onClose: () => void;
}

/**
 * iOS Safari has no `beforeinstallprompt` — the only install path is
 * Share → Add to Home Screen. This sheet walks the user through it.
 */
export default function IosInstallInstructions({ open, onClose }: IosInstallInstructionsProps) {
  const { t } = useTranslation();
  return (
    <BottomSheet open={open} onClose={onClose} title={t("pwa.iosInstall.title")}>
      <ol className="mt-1 space-y-3 text-[12.5px] leading-snug text-slate-200">
        <li className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
            <Share className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">1.</p>
            <p>{t("pwa.iosInstall.step1")}</p>
          </div>
        </li>

        <li className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">2.</p>
            <p>{t("pwa.iosInstall.step2")}</p>
          </div>
        </li>

        <li className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#facc15]/15 text-[#facc15]">
            <ArrowDownToLine className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">3.</p>
            <p>{t("pwa.iosInstall.step3")}</p>
          </div>
        </li>
      </ol>

      <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-snug text-amber-100">
        {t("pwa.iosInstall.tip")}
      </p>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 min-h-[44px] w-full rounded-xl bg-[#facc15] text-[12px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_18px_rgba(250,204,21,0.3)] active:scale-95"
      >
        {t("pwa.iosInstall.gotIt")}
      </button>
    </BottomSheet>
  );
}
