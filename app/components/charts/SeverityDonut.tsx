"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  data: Array<{ name: string; value: number }>;
}

const COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444"];

export function SeverityDonut({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
