"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Save } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";

interface FooterConfig {
  moduleKey: string;
  prefix: string;
  label: string;
}



export default function FooterConfigClient() {
  const t = useT();
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<FooterConfig[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<FooterConfig[]>([]);

  const { data, isLoading, error } = useQuery<{ data: FooterConfig[] }>({
    queryKey: ["qms-footer-config"],
    queryFn: async () => {
      const res = await fetch("/api/qms/footer-config");
      if (!res.ok) throw new Error("Failed to load footer configuration");
      return res.json();
    },
  });

  useEffect(() => {
    if (data?.data) {
      setConfigs(data.data);
      setSavedConfigs(data.data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (config: FooterConfig) => {
      const res = await fetch("/api/qms/footer-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configs: [config] }),
      });
      if (!res.ok) throw new Error("Failed to save configuration");
      return config;
    },
    onSuccess: (config) => {
      setSavedConfigs((prev) =>
        prev.map((item) => (item.moduleKey === config.moduleKey ? config : item)),
      );
      queryClient.invalidateQueries({ queryKey: ["qms-footer-config"] });
      toast.success(t("FooterConfig.saveSuccess", { module: config.moduleKey }));
    },
    onError: (err: Error) => {
      toast.error(err.message || t("FooterConfig.saveError"));
    },
  });

  const isSavingModule = (moduleKey: string) =>
    saveMutation.isPending && saveMutation.variables?.moduleKey === moduleKey;

  const isDirtyModule = (moduleKey: string) => {
    const current = configs.find((item) => item.moduleKey === moduleKey);
    const saved = savedConfigs.find((item) => item.moduleKey === moduleKey);
    if (!current || !saved) return false;
    return current.prefix !== saved.prefix || current.label !== saved.label;
  };

  const handleInputChange = (moduleKey: string, field: "prefix" | "label", value: string) => {
    setConfigs((prev) =>
      prev.map((config) => (config.moduleKey === moduleKey ? { ...config, [field]: value } : config)),
    );
  };

  const handleSaveModule = (moduleKey: string) => {
    const config = configs.find((item) => item.moduleKey === moduleKey);
    if (!config) return;
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
        {error instanceof Error ? error.message : t("FooterConfig.loadError")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("FooterConfig.pageTitle")}
        subtitle={t("FooterConfig.pageSubtitle")}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {configs.map((config) => {
          // Fallback to literal if missing in dictionary
          let meta = {
            title: config.moduleKey,
            prefixPlaceholder: "e.g. FM-QMS-01",
            labelPlaceholder: "e.g. Document Form",
          };
          try {
            const titleKey = `FooterConfig.modules.${config.moduleKey}.title`;
            const prefixKey = `FooterConfig.modules.${config.moduleKey}.prefixPlaceholder`;
            const labelKey = `FooterConfig.modules.${config.moduleKey}.labelPlaceholder`;
            meta = {
              title: t(titleKey) === titleKey ? config.moduleKey : t(titleKey),
              prefixPlaceholder: t(prefixKey) === prefixKey ? "e.g. FM-QMS-01" : t(prefixKey),
              labelPlaceholder: t(labelKey) === labelKey ? "e.g. Document Form" : t(labelKey),
            };
          } catch {}
          const dirty = isDirtyModule(config.moduleKey);
          const isSaving = isSavingModule(config.moduleKey);

          return (
            <Card key={config.moduleKey} className="rounded-2xl border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#0F1059]" />
                    <CardTitle className="text-base font-semibold text-slate-900">{meta.title}</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSaveModule(config.moduleKey)}
                    disabled={!dirty || isSaving}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? t("FooterConfig.saving") : t("FooterConfig.save")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor={`${config.moduleKey}-prefix`}>{t("FooterConfig.prefixLabel")}</Label>
                  <Input
                    id={`${config.moduleKey}-prefix`}
                    value={config.prefix}
                    onChange={(e) => handleInputChange(config.moduleKey, "prefix", e.target.value)}
                    placeholder={meta.prefixPlaceholder}
                    className="font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    {t("FooterConfig.preview")}: <span className="font-mono text-slate-700">{config.prefix || meta.prefixPlaceholder}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`${config.moduleKey}-label`}>{t("FooterConfig.labelLabel")}</Label>
                  <Input
                    id={`${config.moduleKey}-label`}
                    value={config.label}
                    onChange={(e) => handleInputChange(config.moduleKey, "label", e.target.value)}
                    placeholder={meta.labelPlaceholder}
                  />
                  <p className="text-xs text-slate-500">
                    {t("FooterConfig.preview")}: <span className="font-medium text-slate-700">{config.label || meta.labelPlaceholder}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
