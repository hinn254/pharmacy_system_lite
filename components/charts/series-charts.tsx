"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatKes(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "KES 0";
  return `KES ${n.toFixed(0)}`;
}

function formatInt(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "0";
  return `${Math.round(n)}`;
}

export function RevenueLineChart({
  data,
  height = 260,
}: {
  data: { label: string; revenue: number }[];
  height?: number;
}) {
  const showDots = data.length <= 1;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 12, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
          <XAxis dataKey="label" tickMargin={10} minTickGap={24} />
          <YAxis tickFormatter={formatKes} width={84} />
          <Tooltip formatter={(v) => formatKes(v)} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2.2}
            dot={showDots ? { r: 4, strokeWidth: 2 } : false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TransactionsBarChart({
  data,
  height = 260,
}: {
  data: { label: string; transactions: number }[];
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 12, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
          <XAxis dataKey="label" tickMargin={10} minTickGap={24} />
          <YAxis tickFormatter={formatInt} width={44} />
          <Tooltip formatter={(v) => formatInt(v)} />
          <Bar dataKey="transactions" fill="var(--muted-foreground)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProfitLineChart({
  data,
  height = 260,
}: {
  data: { label: string; grossProfit: number; revenue: number; cogs: number }[];
  height?: number;
}) {
  const showDots = data.length <= 1;
  const loneDot = showDots ? { r: 4, strokeWidth: 2 } : false;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 12, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
          <XAxis dataKey="label" tickMargin={10} minTickGap={24} />
          <YAxis tickFormatter={formatKes} width={84} />
          <Tooltip formatter={(v) => formatKes(v)} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2.1}
            dot={loneDot}
          />
          <Line
            type="monotone"
            dataKey="cogs"
            stroke="var(--destructive)"
            strokeWidth={1.9}
            dot={loneDot}
          />
          <Line
            type="monotone"
            dataKey="grossProfit"
            stroke="var(--chart-2)"
            strokeWidth={2.2}
            dot={loneDot}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SmallBarsChart({
  data,
  height = 160,
  color = "var(--primary)",
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="label" tickMargin={10} minTickGap={12} />
          <YAxis tickFormatter={formatInt} width={44} />
          <Tooltip formatter={(v) => formatInt(v)} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

