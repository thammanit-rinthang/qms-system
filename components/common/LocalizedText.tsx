"use client";

import { useT, type TranslationKey } from "@/lib/i18n";

type Props = {
  textKey: TranslationKey;
  params?: Record<string, string | number>;
};

export default function LocalizedText({ textKey, params }: Props) {
  const t = useT();
  return <>{t(textKey, params)}</>;
}
