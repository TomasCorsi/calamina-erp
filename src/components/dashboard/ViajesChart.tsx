import { Route } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ViajesPorDia {
  dia: string;
  viajes: number;
  volumen: number;
}

interface ViajesChartProps {
  data: ViajesPorDia[];
  loading?: boolean;
}

export function ViajesChart({ data, loading }: ViajesChartProps) {
  const totalViajes = data.reduce((sum, d) => sum + d.viajes, 0);
  const totalVolumen = data.reduce((sum, d) => sum + d.volumen, 0);

  if (loading) {
    return (
      <div className="card-industrial p-5">
        <div className="flex items-center gap-2 mb-4">
          <Route className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Viajes de la Semana</h3>
        </div>
        <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="card-industrial p-5">
      <div className="flex items-center gap-2 mb-4">
        <Route className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Viajes de la Semana</h3>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViajes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B00020" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#B00020" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
            <XAxis
              dataKey="dia"
              stroke="hsl(0 0% 50%)"
              tick={{ fill: "hsl(0 0% 65%)", fontSize: 12 }}
            />
            <YAxis
              stroke="hsl(0 0% 50%)"
              tick={{ fill: "hsl(0 0% 65%)", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0 0% 10%)",
                border: "1px solid hsl(0 0% 20%)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
              }}
              labelStyle={{ color: "hsl(0 0% 98%)" }}
              itemStyle={{ color: "#B00020" }}
              formatter={(value: number, name: string) => {
                if (name === "viajes") return [`${value} viajes`, "Cantidad"];
                return [`${value} m³`, "Volumen"];
              }}
            />
            <Area
              type="monotone"
              dataKey="viajes"
              stroke="#B00020"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorViajes)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground font-mono-numbers">{totalViajes}</p>
          <p className="text-xs text-muted-foreground">Viajes esta semana</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground font-mono-numbers">{totalVolumen.toLocaleString()} m³</p>
          <p className="text-xs text-muted-foreground">Volumen transportado</p>
        </div>
      </div>
    </div>
  );
}
