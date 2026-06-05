import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { NutritionData } from "./NutritionChart";

interface WeeklySummaryChartProps {
  data: {
    date: string; // MM-DD
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
}

export default function WeeklySummaryChart({ data }: WeeklySummaryChartProps) {
  return (
    <div className="w-full h-80 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            yAxisId="left"
            orientation="left"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            label={{ value: "Kalori (kkal)", angle: -90, position: "insideLeft", style: { textAnchor: 'middle' }, offset: 10, dy: -20, fontSize: 12, fill: "#888" }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            label={{ value: "Makro (g)", angle: 90, position: "insideRight", style: { textAnchor: 'middle' }, offset: 10, dy: -20, fontSize: 12, fill: "#888" }}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
          />
          <Legend align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: "20px" }} />
          <Bar yAxisId="left" dataKey="calories" name="Kalori" fill="#FFB703" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar yAxisId="right" dataKey="protein" name="Protein" fill="#8ECAE6" radius={[4, 4, 0, 0]} barSize={12} />
          <Bar yAxisId="right" dataKey="carbs" name="Karbo" fill="#219EBC" radius={[4, 4, 0, 0]} barSize={12} />
          <Bar yAxisId="right" dataKey="fat" name="Lemak" fill="#023047" radius={[4, 4, 0, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
