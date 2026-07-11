import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Cable,
  TriangleAlert,
  CircleAlert,
  Activity,
  Thermometer,
  Gauge,
  Play,
  Pause,
  RefreshCw,
  Bell,
  Waves,
  Map,
  List,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  Plus,
  Minus,
  SlidersHorizontal,
  Wifi,
  Battery,
  ArrowUp,
  ArrowDown,
  Info,
  Circle,
  Dot,
  RotateCw,
  HeartPulse,
  Siren,
  Scan,
  Eye,
  EyeOff,
  LayoutDashboard,
  Network,
  TrendingUp,
  TrendingDown,
  Power,
  Server,
  Flashlight,
  Signal,
  Globe,
  Link,
  Cloud,
  Database,
  PlugZap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Transformer,
  Cable as CableType,
  Alert,
  GridConnection,
  GridStatus,
} from "@/types/grid";
import {
  generateAcousticWaveform,
  generateId,
} from "@/utils/mockData";
import { SyncMode, ServerStatus } from "@/utils/apiService";

const statusColor: Record<GridStatus, string> = {
  normal: "text-emerald-400",
  warning: "text-amber-400",
  alert: "text-red-400",
};

const statusBg: Record<GridStatus, string> = {
  normal: "bg-emerald-500/20 border-emerald-500/40",
  warning: "bg-amber-500/20 border-amber-500/40",
  alert: "bg-red-500/20 border-red-500/40",
};

const statusGlow: Record<GridStatus, string> = {
  normal: "shadow-[0_0_12px_rgba(52,211,153,0.3)]",
  warning: "shadow-[0_0_12px_rgba(251,191,36,0.3)]",
  alert: "shadow-[0_0_12px_rgba(248,113,113,0.3)]",
};

const severityBadge: Record<string, string> = {
  Low: "bg-slate-500/30 text-slate-300 border-slate-500/40",
  Medium: "bg-amber-500/30 text-amber-300 border-amber-500/40",
  High: "bg-red-500/30 text-red-300 border-red-500/40",
};

function mapToSvg(lat: number, lng: number, centerLat: number, centerLng: number): { x: number; y: number } {
  const scale = 600;
  return {
    x: (lng - centerLng) * scale + 300,
    y: (centerLat - lat) * scale + 300,
  };
}

function AcousticWaveform({ signature, color }: { signature: number[]; color: string }) {
  const width = 160;
  const height = 40;
  const points = signature.map((v, i) => {
    const x = (i / (signature.length - 1)) * width;
    const y = height - (v * height);
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="w-full h-full">
      <motion.path
        d={`M0,${height/2} ${points.map((p, i) => i === 0 ? `L${p}` : `${p}`).join(" ")}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
      />
    </svg>
  );
}

function RadialProgress({ value, size = 60, strokeWidth = 4 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "#34d399" : value >= 60 ? "#fbbf24" : "#f87171";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="oklch(0.269 0 0)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

interface DashboardLayoutProps {
  transformers: Transformer[];
  cables: CableType[];
  alerts: Alert[];
  connections: GridConnection[];
  simulationRunning: boolean;
  onToggleSimulation: () => void;
  onTriggerFault: (deviceId: string, deviceType: "Transformer" | "Cable", faultType: string) => void;
  onResolveAlert: (alertId: string) => void;
  onResolveAllAlerts: () => void;
  onResetSimulation: () => void;
  syncMode: SyncMode;
  serverUrl: string;
  serverStatus: ServerStatus;
  onSetSyncMode: (mode: SyncMode) => void;
  onSetServerUrl: (url: string) => void;
  onTestConnection: () => void;
}

export default function DashboardLayout({
  transformers,
  cables,
  alerts,
  connections,
  simulationRunning,
  onToggleSimulation,
  onTriggerFault,
  onResolveAlert,
  onResolveAllAlerts,
  onResetSimulation,
  syncMode,
  serverUrl,
  serverStatus,
  onSetSyncMode,
  onSetServerUrl,
  onTestConnection,
}: DashboardLayoutProps) {
  const [selectedDevice, setSelectedDevice] = useState<{ type: "Transformer" | "Cable"; id: string } | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [faultDevice, setFaultDevice] = useState("");
  const [faultType, setFaultType] = useState("");

  const centerLat = useMemo(() => {
    const all = [...transformers, ...cables.map(c => ({ location: c.location }))];
    return all.reduce((s, t) => s + t.location.lat, 0) / all.length;
  }, [transformers, cables]);

  const centerLng = useMemo(() => {
    const all = [...transformers, ...cables.map(c => ({ location: c.location }))];
    return all.reduce((s, t) => s + t.location.lng, 0) / all.length;
  }, [transformers, cables]);

  const selectedTransformer = selectedDevice?.type === "Transformer"
    ? transformers.find((t) => t.id === selectedDevice.id)
    : null;

  const selectedCable = selectedDevice?.type === "Cable"
    ? cables.find((c) => c.id === selectedDevice.id)
    : null;

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);

  const handleSelectDevice = (type: "Transformer" | "Cable", id: string) => {
    setSelectedDevice((prev) => (prev?.id === id && prev?.type === type) ? null : { type, id });
  };

  const handleTriggerFault = () => {
    if (!faultDevice || !faultType) return;
    onTriggerFault(faultDevice, faultDevice.startsWith("t-") ? "Transformer" : "Cable", faultType);
  };

  const getDeviceOptions = () => {
    const options: { value: string; label: string }[] = [];
    transformers.forEach((t) => options.push({ value: t.id, label: `${t.name} (Transformer)` }));
    cables.forEach((c) => options.push({ value: c.id, label: `${c.name} (Cable)` }));
    return options;
  };

  const faultTypes = [
    { value: "overheat", label: "Overheat / High Temp" },
    { value: "theft", label: "Theft / Current Differential" },
    { value: "tilt", label: "Tilt / Vibration Spike" },
    { value: "acoustic", label: "Acoustic Anomaly" },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d0d14]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            <h1 className="text-sm font-semibold tracking-tight">VoltSight</h1>
          </div>
          <div className="hidden md:flex items-center gap-1.5 ml-4">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-white/10 text-white/40 font-mono">
              v1.0.0
            </Badge>
            <div className="flex items-center gap-1 text-[10px] text-white/30 font-mono">
              <Signal className="w-3 h-3" />
              <span>LIVE</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2 py-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("w-7 h-7", viewMode === "map" && "bg-white/10")}
              onClick={() => setViewMode("map")}
            >
              <Map className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("w-7 h-7", viewMode === "list" && "bg-white/10")}
              onClick={() => setViewMode("list")}
            >
              <List className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 text-xs border-white/10",
              simulationRunning ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "text-white/50"
            )}
            onClick={onToggleSimulation}
          >
            {simulationRunning ? (
              <><Pause className="w-3 h-3 mr-1" /> Running</>
            ) : (
              <><Play className="w-3 h-3 mr-1" /> Simulate</>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-white/30 hover:text-white/60"
            onClick={onResetSimulation}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>

          {/* ── Server Sync Cockpit ── */}
          <div className="flex items-center gap-2 pl-3 ml-2 border-l border-white/10">
            {/* Status LED */}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  serverStatus === "connected" && "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]",
                  serverStatus === "connecting" && "bg-amber-400 animate-pulse",
                  serverStatus === "error" && "bg-rose-400",
                  serverStatus === "disconnected" && "bg-white/20"
                )}
              />
              <span className="text-[10px] font-mono text-white/40 hidden sm:inline">
                {serverStatus === "connected" ? "CONNECTED" :
                 serverStatus === "connecting" ? "SYNCING" :
                 serverStatus === "error" ? "ERROR" : "OFFLINE"}
              </span>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center bg-white/5 rounded-md p-0.5">
              <button
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors",
                  syncMode === "local"
                    ? "bg-white/10 text-white/70"
                    : "text-white/30 hover:text-white/50"
                )}
                onClick={() => onSetSyncMode("local")}
              >
                LOCAL
              </button>
              <button
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors",
                  syncMode === "server"
                    ? "bg-white/10 text-white/70"
                    : "text-white/30 hover:text-white/50"
                )}
                onClick={() => onSetSyncMode("server")}
              >
                <Globe className="w-2.5 h-2.5 inline mr-0.5" />
                SRV
              </button>
            </div>

            {/* Server URL input (only visible in server mode) */}
            {syncMode === "server" && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => onSetServerUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  className="w-36 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-white/60 placeholder-white/20 outline-none focus:border-emerald-500/40 transition-colors"
                />
                <button
                  onClick={onTestConnection}
                  disabled={serverStatus === "connecting"}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/70 transition-colors disabled:opacity-40"
                >
                  <PlugZap className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Central Grid View */}
          <div className="flex-1 relative overflow-hidden bg-[#08080e]">
            {viewMode === "map" ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <svg viewBox="0 0 600 600" className="w-full h-full max-w-[600px]">
                  {/* Grid background */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                    </pattern>
                    {connections.map((conn) => {
                      const from = transformers.find((t) => t.id === conn.from);
                      const to = transformers.find((t) => t.id === conn.to);
                      if (!from || !to) return null;
                      const p1 = mapToSvg(from.location.lat, from.location.lng, centerLat, centerLng);
                      const p2 = mapToSvg(to.location.lat, to.location.lng, centerLat, centerLng);
                      const cableKey = [from.id, to.id].sort().join("-");
                      const cable = cables.find((c) => {
                        const ids = [from.id, to.id].sort().join("-");
                        const connIds = [conn.from, conn.to].sort().join("-");
                        return ids === connIds;
                      });
                      const isSelected = selectedCable?.id === cable?.id;
                      const cableStatus = cable?.status || "normal";
                      const strokeColor = cableStatus === "alert" ? "#f87171" : cableStatus === "warning" ? "#fbbf24" : "#34d399";
                      return (
                        <g key={cableKey}>
                          <line
                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                            stroke={strokeColor}
                            strokeWidth={isSelected ? 3 : 1.5}
                            strokeOpacity={isSelected ? 0.8 : 0.3}
                            className="cursor-pointer"
                            onClick={() => cable && handleSelectDevice("Cable", cable.id)}
                          />
                          {cable?.status === "alert" && (
                            <motion.circle
                              cx={(p1.x + p2.x) / 2}
                              cy={(p1.y + p2.y) / 2}
                              r={4}
                              fill="#f87171"
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          )}
                        </g>
                      );
                    })}
                    {transformers.map((t) => {
                      const pos = mapToSvg(t.location.lat, t.location.lng, centerLat, centerLng);
                      const isSelected = selectedTransformer?.id === t.id;
                      const color = t.status === "alert" ? "#f87171" : t.status === "warning" ? "#fbbf24" : "#34d399";
                      return (
                        <g key={t.id}>
                          <motion.circle
                            cx={pos.x} cy={pos.y}
                            r={isSelected ? 18 : 14}
                            fill={color}
                            fillOpacity={0.15}
                            stroke={color}
                            strokeWidth={isSelected ? 3 : 2}
                            className="cursor-pointer"
                            onClick={() => handleSelectDevice("Transformer", t.id)}
                            animate={t.status === "alert" ? { r: [14, 18, 14] } : {}}
                            transition={t.status === "alert" ? { duration: 1.5, repeat: Infinity } : {}}
                          />
                          <circle
                            cx={pos.x} cy={pos.y}
                            r={4}
                            fill={color}
                          />
                          {t.status === "alert" && (
                            <motion.circle
                              cx={pos.x} cy={pos.y}
                              r={22}
                              fill="none"
                              stroke={color}
                              strokeWidth={1}
                              strokeOpacity={0.3}
                              animate={{ r: [22, 30], opacity: [0.3, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                          )}
                          <text
                            x={pos.x} y={pos.y + 28}
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.6)"
                            fontSize={8}
                            className="font-mono"
                          >
                            {t.name.length > 14 ? t.name.substring(0, 14) + "..." : t.name}
                          </text>
                        </g>
                      );
                    })}
                  </defs>
                  <rect width="600" height="600" fill="url(#grid)" />
                  {/* Re-render elements on top of grid */}
                  {connections.map((conn) => {
                    const from = transformers.find((t) => t.id === conn.from);
                    const to = transformers.find((t) => t.id === conn.to);
                    if (!from || !to) return null;
                    const p1 = mapToSvg(from.location.lat, from.location.lng, centerLat, centerLng);
                    const p2 = mapToSvg(to.location.lat, to.location.lng, centerLat, centerLng);
                    const cableKey = [from.id, to.id].sort().join("-");
                    const cable = cables.find((c) => {
                      const ids = [from.id, to.id].sort().join("-");
                      const connIds = [conn.from, conn.to].sort().join("-");
                      return ids === connIds;
                    });
                    const isSelected = selectedCable?.id === cable?.id;
                    const cableStatus = cable?.status || "normal";
                    const strokeColor = cableStatus === "alert" ? "#f87171" : cableStatus === "warning" ? "#fbbf24" : "#34d399";
                    return (
                      <g key={cableKey}>
                        <line
                          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 3 : 1.5}
                          strokeOpacity={isSelected ? 0.8 : 0.3}
                          className="cursor-pointer"
                          onClick={() => cable && handleSelectDevice("Cable", cable.id)}
                        />
                        {cable?.status === "alert" && (
                          <motion.circle
                            cx={(p1.x + p2.x) / 2}
                            cy={(p1.y + p2.y) / 2}
                            r={4}
                            fill="#f87171"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                      </g>
                    );
                  })}
                  {transformers.map((t) => {
                    const pos = mapToSvg(t.location.lat, t.location.lng, centerLat, centerLng);
                    const isSelected = selectedTransformer?.id === t.id;
                    const color = t.status === "alert" ? "#f87171" : t.status === "warning" ? "#fbbf24" : "#34d399";
                    return (
                      <g key={t.id}>
                        <motion.circle
                          cx={pos.x} cy={pos.y}
                          r={isSelected ? 18 : 14}
                          fill={color}
                          fillOpacity={0.15}
                          stroke={color}
                          strokeWidth={isSelected ? 3 : 2}
                          className="cursor-pointer"
                          onClick={() => handleSelectDevice("Transformer", t.id)}
                          animate={t.status === "alert" ? { r: [14, 18, 14] } : {}}
                          transition={t.status === "alert" ? { duration: 1.5, repeat: Infinity } : {}}
                        />
                        <circle
                          cx={pos.x} cy={pos.y}
                          r={4}
                          fill={color}
                        />
                        {t.status === "alert" && (
                          <motion.circle
                            cx={pos.x} cy={pos.y}
                            r={22}
                            fill="none"
                            stroke={color}
                            strokeWidth={1}
                            strokeOpacity={0.3}
                            animate={{ r: [22, 30], opacity: [0.3, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                        <text
                          x={pos.x} y={pos.y + 28}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.6)"
                          fontSize={8}
                          className="font-mono"
                        >
                          {t.name.length > 14 ? t.name.substring(0, 14) + "..." : t.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="p-4 space-y-2 overflow-y-auto h-full">
                <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider mb-3">Transformers</div>
                {transformers.map((t) => (
                  <motion.div
                    key={t.id}
                    layoutId={`device-${t.id}`}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      selectedDevice?.id === t.id ? "border-white/20 bg-white/5" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                    )}
                    onClick={() => handleSelectDevice("Transformer", t.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className={cn("w-3.5 h-3.5", statusColor[t.status])} />
                      <div>
                        <div className="text-xs font-medium">{t.name}</div>
                        <div className="text-[10px] text-white/30 font-mono">{t.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-mono", statusColor[t.status])}>{t.health_score}%</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-mono", statusBg[t.status])}>
                        {t.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
                <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider mt-4 mb-3">Cables</div>
                {cables.map((c) => (
                  <motion.div
                    key={c.id}
                    layoutId={`device-${c.id}`}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      selectedDevice?.id === c.id ? "border-white/20 bg-white/5" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                    )}
                    onClick={() => handleSelectDevice("Cable", c.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Cable className={cn("w-3.5 h-3.5", statusColor[c.status])} />
                      <div>
                        <div className="text-xs font-medium">{c.name}</div>
                        <div className="text-[10px] text-white/30 font-mono">{c.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-mono", statusColor[c.status])}>{c.current_differential}A</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-mono", statusBg[c.status])}>
                        {c.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Simulator Controls */}
          <div className="border-t border-white/5 bg-[#0d0d14] p-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-white/30" />
                <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">Fault Simulator</span>
              </div>
              <Select value={faultDevice} onValueChange={setFaultDevice}>
                <SelectTrigger className="w-[200px] h-7 text-xs border-white/10 bg-white/5">
                  <SelectValue placeholder="Select device..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d14] border-white/10">
                  {getDeviceOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs text-white/70">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={faultType} onValueChange={setFaultType}>
                <SelectTrigger className="w-[200px] h-7 text-xs border-white/10 bg-white/5">
                  <SelectValue placeholder="Fault type..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d14] border-white/10">
                  {faultTypes.map((ft) => (
                    <SelectItem key={ft.value} value={ft.value} className="text-xs text-white/70">
                      {ft.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                disabled={!faultDevice || !faultType}
                onClick={handleTriggerFault}
              >
                <TriangleAlert className="w-3 h-3 mr-1" />
                Trigger Fault
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-white/30 hover:text-white"
                onClick={onResetSimulation}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Inspector Panel */}
        <div className="w-[340px] border-l border-white/5 bg-[#0d0d14] flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-4">
              {/* Device Inspector */}
              <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
                <Scan className="w-3 h-3" />
                Inspector
              </div>

              {!selectedDevice && (
                <div className="text-center py-8 text-white/20 text-xs">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Select a device on the map or list</p>
                </div>
              )}

              {selectedTransformer && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className={cn("w-4 h-4", statusColor[selectedTransformer.status])} />
                    <div>
                      <div className="text-sm font-medium">{selectedTransformer.name}</div>
                      <div className="text-[10px] text-white/30 font-mono">{selectedTransformer.id}</div>
                    </div>
                    <Badge variant="outline" className={cn("ml-auto text-[9px] px-1.5 py-0 h-4 font-mono", statusBg[selectedTransformer.status])}>
                      {selectedTransformer.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                      <div className="text-[9px] text-white/30 font-mono mb-1">Health Score</div>
                      <div className="flex items-center gap-2">
                        <RadialProgress value={selectedTransformer.health_score} size={44} strokeWidth={3} />
                        <span className={cn("text-lg font-mono font-bold", statusColor[selectedTransformer.status])}>
                          {selectedTransformer.health_score}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                      <div className="text-[9px] text-white/30 font-mono mb-1">Temperature</div>
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="w-4 h-4 text-red-400" />
                        <span className={cn("text-lg font-mono font-bold", selectedTransformer.temperature > 55 ? "text-red-400" : "text-white")}>
                          {selectedTransformer.temperature}°
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                      <div className="text-[9px] text-white/30 font-mono mb-1">Voltage</div>
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span className="text-lg font-mono font-bold">{selectedTransformer.voltage} kV</span>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                      <div className="text-[9px] text-white/30 font-mono mb-1">Current</div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <span className="text-lg font-mono font-bold">{selectedTransformer.current} A</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                    <div className="text-[9px] text-white/30 font-mono mb-2">Acoustic Signature</div>
                    <div className="h-10">
                      <AcousticWaveform
                        signature={selectedTransformer.acoustic_signature}
                        color={statusColor[selectedTransformer.status].replace("text-", "#")}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-white/20 font-mono">
                    Last checked: {new Date(selectedTransformer.last_checked).toLocaleTimeString()}
                  </div>
                </motion.div>
              )}

              {selectedCable && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Cable className={cn("w-4 h-4", statusColor[selectedCable.status])} />
                    <div>
                      <div className="text-sm font-medium">{selectedCable.name}</div>
                      <div className="text-[10px] text-white/30 font-mono">{selectedCable.id}</div>
                    </div>
                    <Badge variant="outline" className={cn("ml-auto text-[9px] px-1.5 py-0 h-4 font-mono", statusBg[selectedCable.status])}>
                      {selectedCable.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                      <div className="text-[9px] text-white/30 font-mono mb-1">Vibration</div>
                      <div className="flex items-center gap-1.5">
                        <Waves className="w-4 h-4 text-amber-400" />
                        <span className={cn("text-lg font-mono font-bold", selectedCable.vibration > 0.3 ? "text-red-400" : "text-white")}>
                          {selectedCable.vibration.toFixed(2)}g
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5">
                      <div className="text-[9px] text-white/30 font-mono mb-1">Tilt</div>
                      <div className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                        <span className={cn("text-lg font-mono font-bold", selectedCable.tilt > 2 ? "text-red-400" : "text-white")}>
                          {selectedCable.tilt}°
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/5 col-span-2">
                      <div className="text-[9px] text-white/30 font-mono mb-1">Current Differential</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (selectedCable.current_differential / 100) * 100)}%`,
                              background: selectedCable.current_differential > 20
                                ? "linear-gradient(90deg, #fbbf24, #f87171)"
                                : "linear-gradient(90deg, #34d399, #fbbf24)",
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (selectedCable.current_differential / 100) * 100)}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className={cn("text-lg font-mono font-bold", selectedCable.current_differential > 20 ? "text-red-400" : "text-white")}>
                          {selectedCable.current_differential}A
                        </span>
                      </div>
                      <div className="flex justify-between text-[9px] text-white/20 font-mono mt-1">
                        <span>In: {selectedCable.current_in}A</span>
                        <span>Out: {selectedCable.current_out}A</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-white/20 font-mono">
                    Last checked: {new Date(selectedCable.last_checked).toLocaleTimeString()}
                  </div>
                </motion.div>
              )}
            </div>

            <Separator className="bg-white/5" />

            {/* Alert Feed */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-white/30 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-3 h-3" />
                  Alerts
                  {unresolvedAlerts.length > 0 && (
                    <span className="bg-red-500/20 text-red-400 text-[8px] px-1.5 py-0.5 rounded-full font-mono">
                      {unresolvedAlerts.length}
                    </span>
                  )}
                </div>
                {unresolvedAlerts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 text-[9px] text-white/30 hover:text-white"
                    onClick={onResolveAllAlerts}
                  >
                    <Check className="w-2.5 h-2.5 mr-1" />
                    Resolve All
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <AnimatePresence>
                  {unresolvedAlerts.length === 0 && resolvedAlerts.length === 0 && (
                    <div className="text-center py-6 text-white/20 text-xs">
                      <Circle className="w-6 h-6 mx-auto mb-1 opacity-30" />
                      <p>No alerts</p>
                    </div>
                  )}
                  {unresolvedAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0, marginBottom: 0 }}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg border",
                        alert.severity === "High" ? "border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/[0.02]"
                      )}
                    >
                      <CircleAlert className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", alert.severity === "High" ? "text-red-400" : "text-amber-400")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={cn("text-[8px] px-1 py-0 h-3.5 font-mono", severityBadge[alert.severity])}>
                            {alert.severity}
                          </Badge>
                          <span className="text-[9px] text-white/20 font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/60 mt-1 line-clamp-2">{alert.message}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[8px] text-white/20 font-mono">{alert.location}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 shrink-0 text-white/20 hover:text-white/60"
                        onClick={() => onResolveAlert(alert.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {resolvedAlerts.length > 0 && (
                  <>
                    <div className="text-[9px] text-white/15 font-mono uppercase tracking-wider mt-3 mb-1">
                      Resolved ({resolvedAlerts.length})
                    </div>
                    {resolvedAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-2 p-2 rounded-lg border border-white/5 bg-white/[0.01] opacity-50"
                      >
                        <Check className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 font-mono bg-white/5 text-white/30 border-white/10">
                              {alert.severity}
                            </Badge>
                            <span className="text-[9px] text-white/15 font-mono">
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-white/40 mt-1 line-clamp-2">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Summary Footer */}
          <div className="border-t border-white/5 p-3 bg-[#0a0a0f]">
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <div className="text-[9px] text-white/20 font-mono">Transformers</div>
                <div className="text-sm font-mono font-bold text-white/80">{transformers.length}</div>
              </div>
              <div>
                <div className="text-[9px] text-white/20 font-mono">Cables</div>
                <div className="text-sm font-mono font-bold text-white/80">{cables.length}</div>
              </div>
              <div>
                <div className="text-[9px] text-white/20 font-mono">Alerts</div>
                <div className={cn("text-sm font-mono font-bold", unresolvedAlerts.length > 0 ? "text-red-400" : "text-emerald-400")}>
                  {unresolvedAlerts.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}