"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CarFormModal from "./CarFormModal";
import type { FooterConfig } from "@/services/qmsConfigService";

interface Props {
  issuerName?: string | null;
  defaultIssuerPosition?: string | null;
  footerConfig?: FooterConfig;
}

export default function CarFormModalTrigger({ issuerName, defaultIssuerPosition, footerConfig }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-1.5" />
        {t("car.form.btnCreate")}
      </Button>
      <CarFormModal open={open} onClose={() => setOpen(false)} issuerName={issuerName} defaultIssuerPosition={defaultIssuerPosition} footerConfig={footerConfig} />
    </>
  );
}
