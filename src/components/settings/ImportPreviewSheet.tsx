import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import BottomSheet from "../BottomSheet";
import { useTranslation } from "../../hooks/useTranslation";
import { useI18n } from "../../context/I18nContext";
import {
  ALL_CATEGORIES,
  type BackupCategory,
  type ImportSelection,
  type ImportStrategy,
} from "../../types/backup";
import type { BackupPreview } from "../../hooks/useBackup";

interface ImportPreviewSheetProps {
  open: boolean;
  preview: BackupPreview | null;
  onClose: () => void;
  onConfirm: (opts: {
    strategy: ImportStrategy;
    selection?: ImportSelection;
  }) => Promise<void>;
}

const STRATEGIES: ImportStrategy[] = ["replace", "merge", "selective"];

/**
 * Bottom-sheet preview of a parsed backup. Lets the user pick a
 * merge/replace strategy and (when selective) which categories to
 * import. Confirmation gates a destructive `replace` behind a visible
 * warning band.
 */
export default function ImportPreviewSheet({
  open,
  preview,
  onClose,
  onConfirm,
}: ImportPreviewSheetProps) {
  const { t } = useTranslation();
  const { formatDate, formatRelativeTime } = useI18n();
  const [strategy, setStrategy] = useState<ImportStrategy>("merge");
  const [selection, setSelection] = useState<ImportSelection>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset state when a new preview opens.
  useEffect(() => {
    if (open && preview) {
      setStrategy("merge");
      const initial: ImportSelection = {};
      for (const cat of preview.summary.present) initial[cat] = true;
      setSelection(initial);
    } else if (!open) {
      setSubmitting(false);
    }
  }, [open, preview]);

  const exportedDate = useMemo(
    () => (preview ? formatDate(new Date(preview.summary.exportedAt)) : ""),
    [preview, formatDate]
  );
  const exportedRelative = useMemo(
    () =>
      preview ? formatRelativeTime(new Date(preview.summary.exportedAt)) : "",
    [preview, formatRelativeTime]
  );

  if (!preview) {
    return <BottomSheet open={open} onClose={onClose} title="">{null}</BottomSheet>;
  }

  const { summary } = preview;
  const isReplace = strategy === "replace";
  const isSelective = strategy === "selective";

  const toggleCategory = (cat: BackupCategory) => {
    setSelection((cur) => ({ ...cur, [cat]: !cur[cat] }));
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    await onConfirm({
      strategy,
      selection: isSelective ? selection : undefined,
    });
    // onConfirm triggers a reload; UI may unmount before we get here.
    setSubmitting(false);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("backup.import.previewTitle")}>
      <div className="space-y-4">
        {/* Meta */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] text-slate-300">
            {t("backup.import.previewMeta", {
              date: `${exportedDate} (${exportedRelative})`,
              version: summary.version,
            })}
          </p>
          {summary.deviceInfo?.platform && (
            <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
              {t("backup.import.previewDevice", {
                device: summary.deviceInfo.platform,
              })}
            </p>
          )}
        </div>

        {/* Categories */}
        <section>
          <ul role="list" className="space-y-1">
            {ALL_CATEGORIES.map((cat) => {
              const present = summary.present.includes(cat);
              const count = summary.counts[cat] ?? 0;
              const checked = isSelective
                ? !!selection[cat]
                : present;
              const disabled = !present || !isSelective;

              return (
                <li
                  key={cat}
                  className={`flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 ${
                    present ? "bg-white/[0.02]" : "bg-white/[0.01] opacity-60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-black uppercase tracking-wide text-slate-200">
                      {(t as (k: string) => string)(
                        `backup.import.categories.${cat}`
                      )}
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-slate-500">
                      {present ? `${count}` : "—"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleCategory(cat)}
                    className="h-4 w-4 shrink-0 accent-[#facc15] disabled:opacity-50"
                    aria-label={cat}
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {/* Strategy selector */}
        <section>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t("backup.import.strategy.title")}
          </p>
          <div className="space-y-1.5">
            {STRATEGIES.map((s) => {
              const selected = strategy === s;
              const titleKey = `backup.import.strategy.${s}`;
              const hintKey = `backup.import.strategy.${s}Hint`;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStrategy(s)}
                  aria-pressed={selected}
                  className={`flex w-full items-start gap-3 rounded-xl border p-2.5 text-left active:scale-[0.99] ${
                    selected
                      ? s === "replace"
                        ? "border-rose-500/40 bg-rose-500/5"
                        : "border-[#facc15]/40 bg-[#facc15]/5"
                      : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected
                        ? s === "replace"
                          ? "border-rose-400 bg-rose-400"
                          : "border-[#facc15] bg-[#facc15]"
                        : "border-white/30"
                    }`}
                  >
                    {selected && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1a0a2e]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <p
                      className={`text-[12px] font-black uppercase tracking-wide ${
                        s === "replace" && selected
                          ? "text-rose-200"
                          : "text-white"
                      }`}
                    >
                      {(t as (k: string) => string)(titleKey)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {(t as (k: string) => string)(hintKey)}
                    </p>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Replace warning */}
        {isReplace && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <p className="text-[11.5px] leading-snug text-rose-100">
              {t("backup.import.replaceWarning")}
            </p>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl text-[12px] font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95 disabled:opacity-50 ${
              isReplace
                ? "bg-rose-400 shadow-[0_0_22px_rgba(244,63,94,0.35)]"
                : "bg-[#facc15] shadow-[0_0_22px_rgba(250,204,21,0.35)]"
            }`}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t("backup.import.confirm")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 text-[11.5px] font-black uppercase tracking-wider text-slate-300 active:opacity-70"
          >
            {t("backup.import.cancel")}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
