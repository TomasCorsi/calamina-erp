import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useConfigPersonal, useUpsertConfigPersonal, type LiquidacionModalidad } from "@/hooks/useLiquidaciones";
import { Save, Search } from "lucide-react";

export function ConfigPersonalTab() {
  const upsert = useUpsertConfigPersonal();
  const { data: configs = [] } = useConfigPersonal();
  const [search, setSearch] = useState("");

  const { data: personal = [] } = useQuery({
    queryKey: ["personal-activo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal")
        .select("id, nombre, apellido, legajo, dni, banco, numero_cuenta, sueldo, sueldo_negro, modalidad_pago")
        .eq("activo", true)
        .order("apellido");
      if (error) throw error;
      return data || [];
    },
  });

  const configMap = useMemo(() => {
    const m: Record<string, any> = {};
    configs.forEach((c) => { m[c.personal_id] = c; });
    return m;
  }, [configs]);

  const [drafts, setDrafts] = useState<Record<string, any>>({});

  const getField = (pid: string, key: string, fallback: any) => {
    if (drafts[pid] && key in drafts[pid]) return drafts[pid][key];
    if (configMap[pid] && configMap[pid][key] !== undefined && configMap[pid][key] !== null) return configMap[pid][key];
    return fallback;
  };

  const setField = (pid: string, key: string, val: any) => {
    setDrafts((d) => ({ ...d, [pid]: { ...(d[pid] || {}), [key]: val } }));
  };

  const guardar = async (pid: string, p: any) => {
    const payload = {
      personal_id: pid,
      modalidad: getField(pid, "modalidad", "mensual") as LiquidacionModalidad,
      sueldo_blanco: Number(getField(pid, "sueldo_blanco", p.sueldo || 0)),
      sueldo_negro: Number(getField(pid, "sueldo_negro", p.sueldo_negro || 0)),
      monto_banco_fijo: Number(getField(pid, "monto_banco_fijo", 0)),
      resto_efectivo: !!getField(pid, "resto_efectivo", true),
      presentismo_monto: Number(getField(pid, "presentismo_monto", 0)),
      presentismo_porcentaje: Number(getField(pid, "presentismo_porcentaje", 0)),
      embargo: !!getField(pid, "embargo", false),
      embargo_nota: getField(pid, "embargo_nota", null) || null,
      cbu: getField(pid, "cbu", null) || null,
      banco: getField(pid, "banco", p.banco || null) || null,
      numero_cuenta: getField(pid, "numero_cuenta", p.numero_cuenta || null) || null,
    };
    await upsert.mutateAsync(payload);
    setDrafts((d) => { const { [pid]: _, ...rest } = d; return rest; });
  };

  const filtered = personal.filter((p) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return `${p.nombre} ${p.apellido} ${p.legajo || ""} ${p.dni || ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar empleado…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm h-9"
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} empleados — configurá modalidad y split banco/efectivo
        </span>
      </div>

      <div className="overflow-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Empleado</TableHead>
              <TableHead className="w-[120px]">Modalidad</TableHead>
              <TableHead className="text-right">Sueldo Blanco</TableHead>
              <TableHead className="text-right">Sueldo Negro</TableHead>
              <TableHead className="text-right">Banco Fijo</TableHead>
              <TableHead className="text-right">Presentismo $</TableHead>
              <TableHead className="text-right w-[80px]">Pres. %</TableHead>
              <TableHead className="text-center w-[70px]">Embargo</TableHead>
              <TableHead>Banco / CBU</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const dirty = !!drafts[p.id];
              return (
                <TableRow key={p.id} className={dirty ? "bg-yellow-500/10" : ""}>
                  <TableCell>
                    <div className="font-medium text-xs">{p.apellido}, {p.nombre}</div>
                    <div className="text-[10px] text-muted-foreground">Leg. {p.legajo || "—"}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={getField(p.id, "modalidad", "mensual")}
                      onValueChange={(v) => setField(p.id, "modalidad", v)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                        <SelectItem value="ambas">Ambas</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right text-xs"
                      value={getField(p.id, "sueldo_blanco", p.sueldo || 0)}
                      onChange={(e) => setField(p.id, "sueldo_blanco", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right text-xs"
                      value={getField(p.id, "sueldo_negro", p.sueldo_negro || 0)}
                      onChange={(e) => setField(p.id, "sueldo_negro", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right text-xs"
                      value={getField(p.id, "monto_banco_fijo", 0)}
                      onChange={(e) => setField(p.id, "monto_banco_fijo", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right text-xs"
                      value={getField(p.id, "presentismo_monto", 0)}
                      onChange={(e) => setField(p.id, "presentismo_monto", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input type="number" className="h-8 text-right text-xs"
                      value={getField(p.id, "presentismo_porcentaje", 0)}
                      onChange={(e) => setField(p.id, "presentismo_porcentaje", e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={!!getField(p.id, "embargo", false)}
                      onCheckedChange={(v) => setField(p.id, "embargo", v)}
                    />
                  </TableCell>
                  <TableCell className="space-y-1">
                    <Input className="h-7 text-xs" placeholder="Banco"
                      value={getField(p.id, "banco", p.banco || "")}
                      onChange={(e) => setField(p.id, "banco", e.target.value)}
                    />
                    <Input className="h-7 text-xs" placeholder="CBU / Cuenta"
                      value={getField(p.id, "cbu", p.numero_cuenta || "")}
                      onChange={(e) => setField(p.id, "cbu", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant={dirty ? "default" : "outline"}
                      onClick={() => guardar(p.id, p)}
                      className="h-8 gap-1"
                    >
                      <Save className="w-3 h-3" /> Guardar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
