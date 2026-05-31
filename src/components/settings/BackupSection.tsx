import { useEffect, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Check,
  DownloadCloud,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useBackup, type BackupPreview } from "../../hooks/useBackup";
import ImportPreviewSheet from "./ImportPreviewSheet";

/**
 * Settings card that exposes export / import / reset for the user's
 * local data. Designed mobile-first to slot under the existing PWA
 * card in `SettingsScreen`.
 */
export default function BackupSection() {
  const { t } = useTranslation();
  const {
    isExporting,
    isImporting,
    exportBackup,
    previewBackup,
    applyPreview,
    resetAllData,
  } = useBackup();

  const [encrypt, setEncrypt] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);
  const [needsPasswordFor, setNeedsPasswordFor] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState("");
  const [importPasswordError, setImportPasswordError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const passwordTooShort = encrypt && password.length < 6;
  const canExport = !isExporting && (!encrypt || !passwordTooShort);

  const handleFile = async (file: File, pwd?: string) => {
    setPendingFile(file);
    setPendingPassword(pwd ?? null);
    const result = await previewBackup(file, pwd);
    if (!result) {
      // Could be wrong password or other reason. parseBackupFile only
      // emits "password_required" silently; explicit wrong_password
      // shows toast inside the hook.
      const text = await file.text().catch(() => "");
      const looksEncrypted = text.includes("brawl.backup.v1.enc");
      if (looksEncrypted && !pwd) {
        setNeedsPasswordFor(file);
        setImportPasswordError(null);
      } else if (looksEncrypted) {
        setImportPasswordError("wrong");
      }
      return;
    }
    setNeedsPasswordFor(null);
    setImportPassword("");
    setPreview(result);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    // Reset value so picking the same file twice re-fires onChange.
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handlePasswordSubmit = async () => {
    if (!needsPasswordFor || importPassword.length === 0) return;
    setImportPasswordError(null);
    await handleFile(needsPasswordFor, importPassword);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#2a1a4a] p-4">
      <header className="mb-3 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#facc15]/15 text-[#facc15]">
          <ShieldCheck className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-black uppercase tracking-widest text-white">
            {t("backup.sectionTitle")}
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-slate-400">
            {t("backup.sectionHint")}
          </p>
        </div>
      </header>

      {/* Export */}
      <SubCard
        title={t("backup.export.title")}
        body={t("backup.export.body")}
        icon={<DownloadCloud className="h-3.5 w-3.5" />}
      >
        <ToggleRow
          label={t("backup.export.encrypt")}
          icon={<Lock className="h-3.5 w-3.5" />}
          checked={encrypt}
          onChange={setEncrypt}
        />

        <AnimatePresence initial={false}>
          {encrypt && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1">
                <label className="block">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {t("backup.export.passwordLabel")}
                  </span>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={t("backup.export.passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-[#1a0a2e] px-3 py-2.5 pr-10 text-[12px] text-white outline-none focus:border-[#facc15]/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide" : "Show"}
                      className="absolute inset-y-0 right-2 flex items-center text-slate-500 active:opacity-70"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                <p className="text-[10.5px] text-slate-500">
                  {t("backup.export.passwordHint")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          disabled={!canExport}
          onClick={() =>
            exportBackup({ password: encrypt ? password : undefined })
          }
          className="mt-3 flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#facc15] text-[12px] font-black uppercase tracking-wider text-[#1a0a2e] shadow-[0_0_16px_rgba(250,204,21,0.3)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("backup.export.pending")}
            </>
          ) : (
            <>
              <DownloadCloud className="h-4 w-4" />
              {t("backup.export.cta")}
            </>
          )}
        </button>
      </SubCard>

      {/* Import */}
      <SubCard
        title={t("backup.import.title")}
        body={t("backup.import.body")}
        icon={<Upload className="h-3.5 w-3.5" />}
      >
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-5 text-center transition-colors ${
            dragOver
              ? "border-[#facc15]/60 bg-[#facc15]/10"
              : "border-white/15 bg-white/[0.02] active:bg-white/[0.05]"
          }`}
        >
          <Upload className="h-5 w-5 text-slate-400" />
          <span className="text-[11.5px] font-black uppercase tracking-wider text-slate-300">
            {t("backup.import.cta")}
          </span>
          <span className="text-[10px] text-slate-500">
            {t("backup.import.dropHere")}
          </span>
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileInput}
            aria-label={t("backup.import.cta")}
          />
        </label>

        {/* Password prompt when an encrypted file is dropped without a password */}
        <AnimatePresence>
          {needsPasswordFor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-3">
                <p className="text-[11px] text-fuchsia-100">
                  {t("backup.import.passwordPrompt")}
                </p>
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    autoFocus
                    value={importPassword}
                    onChange={(e) => {
                      setImportPassword(e.target.value);
                      setImportPasswordError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handlePasswordSubmit();
                    }}
                    placeholder="••••••"
                    className={`flex-1 rounded-lg border bg-[#1a0a2e] px-3 py-2 text-[12px] text-white outline-none ${
                      importPasswordError
                        ? "border-rose-500/60"
                        : "border-white/15 focus:border-fuchsia-400/60"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handlePasswordSubmit}
                    disabled={importPassword.length === 0}
                    className="rounded-lg bg-fuchsia-400 px-3 text-[11px] font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95 disabled:opacity-50"
                  >
                    OK
                  </button>
                </div>
                {importPasswordError && (
                  <p className="mt-1 text-[10.5px] text-rose-300">
                    {t("backup.reason.wrongPassword")}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isImporting && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("backup.import.pending")}
          </p>
        )}
      </SubCard>

      {/* Danger zone */}
      <SubCard
        title={t("backup.reset.title")}
        body={t("backup.reset.body")}
        icon={<RotateCcw className="h-3.5 w-3.5" />}
        danger
      >
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-[12px] font-black uppercase tracking-wider text-rose-200 active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
          {t("backup.reset.cta")}
        </button>
      </SubCard>

      {/* Preview sheet */}
      <ImportPreviewSheet
        open={!!preview}
        preview={preview}
        onClose={() => {
          setPreview(null);
          setPendingFile(null);
          setPendingPassword(null);
        }}
        onConfirm={async (opts) => {
          if (!preview) return;
          await applyPreview(preview, opts);
        }}
      />

      <ResetConfirmDialog
        open={showResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={async () => {
          setShowResetConfirm(false);
          await resetAllData();
        }}
      />

      {/* Pending file is captured purely so re-imports after wrong-password
          retry preserve the same blob; nothing visible needed. */}
      {pendingFile && pendingPassword !== undefined ? null : null}
    </section>
  );
}

interface SubCardProps {
  title: string;
  body: string;
  icon: ReactNode;
  danger?: boolean;
  children: ReactNode;
}

function SubCard({ title, body, icon, danger, children }: SubCardProps) {
  return (
    <div
      className={`mt-3 rounded-xl border p-3 ${
        danger ? "border-rose-500/20 bg-rose-500/[0.04]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <p
        className={`flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-widest ${
          danger ? "text-rose-300" : "text-slate-400"
        }`}
      >
        {icon}
        {title}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">{body}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRow({ label, icon, checked, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-2 rounded-lg py-1.5 text-left text-[11.5px] font-black uppercase tracking-wider text-slate-200 active:opacity-70"
    >
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[#facc15]" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-[#1a0a2e] transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

interface ResetConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ResetConfirmDialog({ open, onConfirm, onCancel }: ResetConfirmDialogProps) {
  const { t } = useTranslation();

  // ESC dismissal mirrors the rest of our modal surfaces.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-[56] w-[88vw] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-rose-500/30 bg-[#2a1a4a] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
                <AlertTriangle className="h-4.5 w-4.5" />
              </span>
              <h2 className="text-[14px] font-black uppercase tracking-tight text-white">
                {t("backup.reset.confirmTitle")}
              </h2>
            </div>
            <p className="mt-3 text-[12px] leading-snug text-slate-300">
              {t("backup.reset.confirmBody")}
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 text-[12px] font-black uppercase tracking-wider text-rose-200 active:scale-95"
              >
                <Check className="h-4 w-4" />
                {t("backup.reset.confirmYes")}
              </button>
              <button
                type="button"
                onClick={onCancel}
                autoFocus
                className="flex w-full min-h-[44px] items-center justify-center rounded-xl bg-[#facc15] text-[12px] font-black uppercase tracking-wider text-[#1a0a2e] active:scale-95"
              >
                {t("backup.reset.confirmNo")}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
