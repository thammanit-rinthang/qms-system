"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Props as LegendProps } from "recharts/types/component/DefaultLegendContent";

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------
export interface ChartDataItem {
  label: string;
  value: number;
  secondaryValue?: number;
  color?: string;
}

interface TooltipPayload {
  name?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface BarChartProps {
  data: ChartDataItem[];
  title: string;
  valueLabel?: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  isExportMode?: boolean;
}

interface DonutChartProps {
  data: ChartDataItem[];
  title: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  isExportMode?: boolean;
}

type BarShapeType = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  index?: number;
};

// ---------------------------------------------------------
// Color Palette (Design System)
// ---------------------------------------------------------
const COLORS = [
  "#0F1059",
  "#0284c7",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#8b5cf6",
  "#64748b",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

// ---------------------------------------------------------
// Shared Chart Card Wrapper
// ---------------------------------------------------------
function ChartCard({
  title,
  selected,
  onToggleSelect,
  isExportMode,
  children,
}: {
  title: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  isExportMode?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 ${
        selected ? "ring-2 ring-[#0F1059]/20" : ""
      } ${isExportMode && !selected ? "chart-unselected opacity-40" : ""}`}
    >
      {isExportMode && onToggleSelect && (
        <div className="absolute top-4 right-4 z-10 no-print">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-500 font-medium select-none">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="rounded text-[#0F1059] focus:ring-[#0F1059] border-slate-300 h-4 w-4"
            />
            เลือกพิมพ์
          </label>
        </div>
      )}

      <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------
// Donut / Pie Chart Component (Recharts)
// ---------------------------------------------------------
export function DonutChart({ data, title, selected = true, onToggleSelect, isExportMode }: DonutChartProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const chartData = data.map((item, idx) => ({
    name: item.label,
    value: item.value,
    color: item.color || COLORS[idx % COLORS.length],
  }));

  const CustomTooltipContent = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const entry = payload[0];
    const percent = total > 0 ? ((Number(entry.value) / total) * 100).toFixed(1) : "0.0";
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-slate-700">{entry.name}</p>
        <p className="text-sm font-bold text-slate-900">
          {entry.value} <span className="text-xs font-normal text-slate-500">({percent}%)</span>
        </p>
      </div>
    );
  };

  const renderLegend = (props: LegendProps) => {
    const { payload } = props;
    if (!payload) return null;
    const items = [...payload];
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {items.map((entry, idx) => {
          const item = chartData[idx];
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0";
          return (
            <div key={`legend-${idx}`} className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600 truncate max-w-[120px]">{entry.value}</span>
              <span className="font-semibold text-slate-800">{item.value} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ChartCard title={title} selected={selected} onToggleSelect={onToggleSelect} isExportMode={isExportMode}>
      {total === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center text-slate-400">
          <p className="text-xs">ไม่มีข้อมูลสำหรับแสดงผล</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                animationBegin={100}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltipContent />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

// ---------------------------------------------------------
// Custom Rounded Bar Shape
// ---------------------------------------------------------
function RoundedBar(props: BarShapeType) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  const barHeight = Math.max(height, 2);

  return (
    <rect
      x={x}
      y={y + (height - barHeight)}
      width={width}
      height={barHeight}
      fill={fill}
      rx={4}
      ry={4}
      className="transition-all duration-200"
      opacity={0.85}
    />
  );
}

// ---------------------------------------------------------
// Bar Chart Component (Recharts Horizontal)
// ---------------------------------------------------------
export function BarChart({ data, title, valueLabel = "จำนวน", selected = true, onToggleSelect, isExportMode }: BarChartProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
    fill: item.color || "#0F1059",
  }));

  const CustomTooltipContent = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const entry = payload[0];
    const pct = total > 0 ? ((Number(entry.value) / total) * 100).toFixed(1) : "0.0";
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-slate-700">{entry.name}</p>
        <p className="text-sm font-bold text-slate-900">
          {entry.value} {valueLabel}
        </p>
        <p className="text-[11px] text-slate-500">{pct}% ของทั้งหมด</p>
      </div>
    );
  };

  return (
    <ChartCard title={title} selected={selected} onToggleSelect={onToggleSelect} isExportMode={isExportMode}>
      {total === 0 ? (
        <div className="flex h-[220px] flex-col items-center justify-center text-slate-400">
          <p className="text-xs">ไม่มีข้อมูลสำหรับแสดงผล</p>
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
            <RechartsBarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 0, top: 4, bottom: 4 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#475569" }}
                width={120}
                tickFormatter={(val: string) => (val.length > 14 ? `${val.slice(0, 12)}..` : val)}
              />
              <Tooltip content={<CustomTooltipContent />} cursor={false} />
              <Bar
                dataKey="value"
                shape={RoundedBar}
                animationBegin={100}
                animationDuration={700}
                animationEasing="ease-out"
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

// ---------------------------------------------------------
// KPI Performance Chart (Recharts Grouped Bar)
// ---------------------------------------------------------
export function KpiPerformanceChart({
  data,
  title,
  selected = true,
  onToggleSelect,
  isExportMode,
}: {
  data: ChartDataItem[];
  title: string;
  selected?: boolean;
  onToggleSelect?: () => void;
  isExportMode?: boolean;
}) {
  const chartData = data.map((item) => ({
    name: item.label,
    Actual: item.value,
    Target: item.secondaryValue ?? 0,
  }));

  const hasData = data.some((d) => d.value > 0 || (d.secondaryValue ?? 0) > 0);

  const CustomTooltipContent = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const actualEntry = payload.find((p) => p.name === "Actual");
    const targetEntry = payload.find((p) => p.name === "Target");
    const label = payload[0]?.payload?.name as string | undefined;
    const actualVal = actualEntry?.value ?? 0;
    const targetVal = targetEntry?.value ?? 0;
    const pct = Number(targetVal) > 0 ? ((Number(actualVal) / Number(targetVal)) * 100).toFixed(1) : "N/A";

    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-md text-xs space-y-1">
        <p className="font-semibold text-slate-800">{label}</p>
        <p>
          <span className="text-slate-500">ผลจริง: </span>
          <span className="font-bold text-[#0F1059]">{actualVal}</span>
        </p>
        <p>
          <span className="text-slate-500">เป้าหมาย: </span>
          <span className="font-bold text-amber-600">{targetVal}</span>
        </p>
        <p>
          <span className="text-slate-500">อัตราสำเร็จ: </span>
          <span className="font-bold text-slate-800">{pct}{pct !== "N/A" ? "%" : ""}</span>
        </p>
      </div>
    );
  };

  const renderLegend = (props: LegendProps) => {
    const { payload } = props;
    if (!payload) return null;
    const items = [...payload];
    return (
      <div className="flex items-center justify-center gap-6 mt-2 text-xs">
        {items.map((entry, idx) => (
          <div key={`legend-${idx}`} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 font-medium">
              {entry.value === "Actual" ? "ผลการดำเนินงาน" : "เป้าหมาย"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ChartCard title={title} selected={selected} onToggleSelect={onToggleSelect} isExportMode={isExportMode}>
      {!hasData ? (
        <div className="flex h-[220px] flex-col items-center justify-center text-slate-400">
          <p className="text-xs">ไม่มีข้อมูลสำหรับแสดงผล</p>
        </div>
      ) : (
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <RechartsBarChart
              data={chartData}
              margin={{ left: 0, right: 0, top: 8, bottom: 8 }}
              barCategoryGap="30%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#475569" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <Tooltip content={<CustomTooltipContent />} cursor={{ fill: "#f8fafc" }} />
              <Legend content={renderLegend} />
              <Bar
                dataKey="Actual"
                fill="#0F1059"
                radius={[4, 4, 0, 0]}
                animationBegin={100}
                animationDuration={700}
                animationEasing="ease-out"
              />
              <Bar
                dataKey="Target"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                animationBegin={300}
                animationDuration={700}
                animationEasing="ease-out"
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
