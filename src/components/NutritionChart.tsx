import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  consumed?: boolean;
}

interface NutritionChartProps {
  data: NutritionData;
  dailyTargets: NutritionData;
}

const LABELS: Partial<Record<keyof NutritionData, string>> = {
  calories: "Kalori",
  protein: "Protein",
  carbs: "Karbohidrat",
  fat: "Lemak",
  fiber: "Serat",
  sodium: "Natrium",
  sugar: "Gula",
};

const FORMATS: Partial<Record<keyof NutritionData, string>> = {
  calories: "kkal",
  protein: "g",
  carbs: "g",
  fat: "g",
  fiber: "g",
  sodium: "mg",
  sugar: "g",
};

const NutritionChart: React.FC<NutritionChartProps> = ({ data, dailyTargets }) => {
  const chartData = (Object.keys(LABELS) as Array<keyof typeof LABELS>).map((key) => {
    const value = typeof data[key] === 'number' ? data[key] as number : 0;
    const target = typeof dailyTargets[key] === 'number' ? dailyTargets[key] as number : 1;
    const percentage = Math.min((value / target) * 100, 100);
    
    // Determine color based on percentage to warn on high sodium/sugar/calories
    let color = "#40916C"; // Default emerald
    if (key === "sodium" || key === "sugar" || key === "fat") {
      if (percentage > 80) color = "#E67E22"; // Orange alert
      if (percentage >= 100) color = "#C0392B"; // Red danger
    } else if (key === "calories") {
      if (percentage > 50) color = "#3b82f6"; // Blue info
      if (percentage > 80) color = "#E67E22";
    }

    return {
      name: LABELS[key],
      value: percentage,
      actualAmount: value,
      unit: FORMATS[key],
      color,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none">
          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-2 tracking-tight">{label}</p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Kandungan: <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">{dataPoint.actualAmount}{dataPoint.unit}</span>
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Kecukupan: <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">{Math.round(dataPoint.value)}%</span> dari harian
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 lg:h-80 mt-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-sm transition-colors">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 px-1 flex items-center gap-2">
         Persentase Kecukupan Gizi Harian
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 30, left: 30, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EDF2F0" opacity={0.5} />
          <XAxis 
            type="number" 
            domain={[0, 100]} 
            hide
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "#525B58" }} 
            width={75}
          />
          <Tooltip cursor={{ fill: "transparent" }} content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || "#40916C"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NutritionChart;
