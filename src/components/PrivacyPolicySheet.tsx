import { ExternalLink, ShieldCheck, EyeOff, Globe2 } from "lucide-react";
import BottomSheet from "./BottomSheet";
import { useTranslation } from "../hooks/useTranslation";

interface PrivacyPolicySheetProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet privacy policy. Renders the same key facts as
 * `PRIVACY.md` but in a mobile-friendly format that doesn't pull the
 * user out of the app. Linked from `PrivacySection` and the consent
 * banner's "Customize" path.
 *
 * The text is intentionally short — the long version lives in the
 * repo so it can be reviewed via PR. We list only what most people
 * actually need to decide whether to flip the toggles.
 */
export default function PrivacyPolicySheet({
  open,
  onClose,
}: PrivacyPolicySheetProps) {
  const { t, tArray } = useTranslation();

  return (
    <BottomSheet open={open} onClose={onClose} title={t("privacy.policyTitle")}>
      <div className="space-y-5 pb-2 text-sm text-slate-200">
        <p className="text-[13px] leading-relaxed text-slate-300">
          {t("privacy.policyIntro")}
        </p>

        <Section
          icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}
          title={t("privacy.policyCollectTitle")}
        >
          <List items={tArray("privacy.policyCollect")} />
        </Section>

        <Section
          icon={<EyeOff className="h-4 w-4 text-rose-300" />}
          title={t("privacy.policyNeverTitle")}
        >
          <List items={tArray("privacy.policyNever")} />
        </Section>

        <Section
          icon={<Globe2 className="h-4 w-4 text-yellow-300" />}
          title={t("privacy.policyVendorsTitle")}
        >
          <p className="text-[12.5px] leading-relaxed text-slate-300">
            {t("privacy.policyVendors")}
          </p>
        </Section>

        <div className="rounded-xl border border-white/10 bg-[#1a0a2e] p-3">
          <p className="text-[11.5px] font-bold uppercase tracking-widest text-yellow-300">
            {t("privacy.policyOptOutTitle")}
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-300">
            {t("privacy.policyOptOut")}
          </p>
        </div>

        <a
          href="https://github.com/your-org/brawl-stars-tracker/blob/main/PRIVACY.md"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-yellow-300"
        >
          {t("privacy.policyFullText")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </BottomSheet>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-1.5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
        {icon}
        {title}
      </p>
      {children}
    </section>
  );
}

function List({ items }: { items: readonly string[] }) {
  if (!items.length) return null;

  return (
    <ul className="space-y-1 text-[12.5px] leading-relaxed text-slate-300">
      {items.map((line, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-yellow-300" />
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}
