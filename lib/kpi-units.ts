export const KPI_UNITS = [
  { value: 'percent', labelKey: 'kpi.unit.percent' },
  { value: 'times',   labelKey: 'kpi.unit.times'   },
  { value: 'count',   labelKey: 'kpi.unit.count'   },
  { value: 'days',    labelKey: 'kpi.unit.days'     },
  { value: 'hours',   labelKey: 'kpi.unit.hours'    },
  { value: 'other',   labelKey: 'kpi.unit.other'    },
] as const;

export const KPI_PRESET_VALUES = KPI_UNITS.map(u => u.value) as readonly string[];

/** unit stored in DB can be a preset code OR an arbitrary custom string */
export const KPI_UNIT_VALUES = KPI_PRESET_VALUES;

export type KpiPresetUnit = (typeof KPI_UNITS)[number]['value'];

export function isPresetUnit(unit: string | null | undefined): boolean {
  return !!unit && KPI_PRESET_VALUES.includes(unit);
}

export function getUnitLabelKey(unit: string | null | undefined): string {
  if (!unit) return '';
  const found = KPI_UNITS.find(u => u.value === unit);
  return found?.labelKey ?? '';
}
