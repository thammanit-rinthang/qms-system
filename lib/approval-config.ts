export type ApprovalConfigRole = "MR" | "QMS";

export type ApprovalConfigModuleKey =
  | "DAR"
  | "CAR"
  | "KPI"
  | "KPI_MONTHLY"
  | "AUDIT_APPOINTMENT"
  | "AUDIT";

export type ApprovalConfigModuleMeta = {
  key: ApprovalConfigModuleKey;
  label: string;
  description: string;
};

export const APPROVAL_CONFIG_MODULES: ApprovalConfigModuleMeta[] = [
  {
    key: "DAR",
    label: "DAR",
    description: "Document Action Request",
  },
  {
    key: "CAR",
    label: "CAR",
    description: "Corrective Action Request",
  },
  {
    key: "KPI",
    label: "KPI",
    description: "KPI annual approval",
  },
  {
    key: "KPI_MONTHLY",
    label: "KPI-Monthly",
    description: "KPI monthly report approval",
  },
  {
    key: "AUDIT_APPOINTMENT",
    label: "Auditor(Appointment)",
    description: "Audit appointment approval",
  },
  {
    key: "AUDIT",
    label: "Audit",
    description: "Audit plan approval",
  },
];

type ApprovalConfigField = "AUTH_USER_ID" | "EMAIL";

export function isApprovalConfigModuleKey(value: string): value is ApprovalConfigModuleKey {
  return APPROVAL_CONFIG_MODULES.some((module) => module.key === value);
}

export function getApprovalConfigKey(
  moduleKey: ApprovalConfigModuleKey,
  role: ApprovalConfigRole,
  field: ApprovalConfigField,
) {
  return `${moduleKey}_${role}_${field}`;
}

export function getLegacyGlobalConfigKey(
  role: ApprovalConfigRole,
  field: ApprovalConfigField,
) {
  return `CURRENT_${role}_${field}`;
}

export function getApprovalConfigLookupKeys(
  moduleKey: ApprovalConfigModuleKey,
  role: ApprovalConfigRole,
  field: ApprovalConfigField,
) {
  return [
    getApprovalConfigKey(moduleKey, role, field),
    getLegacyGlobalConfigKey(role, field),
  ];
}
