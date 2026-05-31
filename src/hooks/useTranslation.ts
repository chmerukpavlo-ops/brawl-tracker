import { useI18n } from "../context/I18nContext";

/** Convenient alias hook returning the most-used i18n primitives. */
export function useTranslation() {
  const { t, tArray, locale } = useI18n();
  return { t, tArray, locale };
}
