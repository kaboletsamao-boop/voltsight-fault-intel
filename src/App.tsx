import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Transformer, Cable, Alert, GridConnection } from "@/types/grid";
import {
  mockTransformers,
  mockCables,
  mockAlerts,
  gridConnections,
  fluctuateValue,
  calculateDifferential,
  generateAcousticWaveform,
  generateId,
} from "@/utils/mockData";
import {
  getSyncState,
  setSyncMode,
  setServerUrl as setApiServerUrl,
  testConnection,
  pushTransformerData,
  pushCableData,
  resolveAlertOnServer,
  resolveAllAlertsOnServer,
  type SyncMode,
} from "@/utils/apiService";

const STORAGE_KEY = "voltsight-state";

interface AppState {
  transformers: Transformer[];
  cables: Cable[];
  alerts: Alert[];
  simulationRunning: boolean;
}

function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function App() {
  const [transformers, setTransformers] = useState<Transformer[]>(() => {
    const saved = loadState();
    return saved?.transformers ?? mockTransformers.map((t) => ({ ...t, last_checked: new Date().toISOString() }));
  });
  const [cables, setCables] = useState<Cable[]>(() => {
    const saved = loadState();
    return saved?.cables ?? mockCables.map((c) => ({ ...c, last_checked: new Date().toISOString() }));
  });
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const saved = loadState();
    return saved?.alerts ?? mockAlerts;
  });
  const [simulationRunning, setSimulationRunning] = useState(() => {
    const saved = loadState();
    return saved?.simulationRunning ?? false;
  });

  // ── Sync state ──
  const [syncMode, setSyncModeState] = useState<SyncMode>(() => getSyncState().mode);
  const [serverUrl, setServerUrlState] = useState(() => getSyncState().serverUrl);
  const [serverStatus, setServerStatus] = useState<"disconnected" | "connecting" | "connected" | "error">(
    getSyncState().status.connected ? "connected" : "disconnected"
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist state
  useEffect(() => {
    saveState({ transformers, cables, alerts, simulationRunning });
  }, [transformers, cables, alerts, simulationRunning]);

  const addAlert = useCallback((alert: Alert) => {
    setAlerts((prev) => {
      if (prev.some((a) => a.id === alert.id)) return prev;
      toast.error(alert.message, {
        description: `${alert.type} • ${alert.severity} severity`,
        duration: 5000,
      });
      return [alert, ...prev].slice(0, 50);
    });
  }, []);

  // Simulation tick
  useEffect(() => {
    if (!simulationRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTransformers((prev) =>
        prev.map((t) => {
          const newTemp = fluctuateValue(t.temperature, 3, 30, 85);
          const newVoltage = fluctuateValue(t.voltage, 2, 30, 140);
          const newCurrent = fluctuateValue(t.current, 15, 200, 600);
          const newSig = generateAcousticWaveform(t.acoustic_signature);
          const newHealth = Math.max(10, Math.min(100, t.health_score + (Math.random() - 0.5) * 2));
          const newStatus: Transformer["status"] =
            newTemp > 65 ? "alert" : newTemp > 50 ? "warning" : "normal";

          if (newStatus === "alert" && t.status !== "alert") {
            addAlert({
              id: generateId("a"),
              type: "Transformer",
              severity: "High",
              message: `Critical temperature on ${t.name} (${Math.round(newTemp)}°C)`,
              location: t.name,
              timestamp: new Date().toISOString(),
              resolved: false,
            });
          }

          return {
            ...t,
            temperature: newTemp,
            voltage: newVoltage,
            current: newCurrent,
            acoustic_signature: newSig,
            health_score: Math.round(newHealth),
            status: newStatus,
            last_checked: new Date().toISOString(),
          };
        })
      );

      setCables((prev) =>
        prev.map((c) => {
          const newVib = fluctuateValue(c.vibration, 0.05, 0, 0.8);
          const newTilt = fluctuateValue(c.tilt, 0.2, 0, 5);
          const newIn = fluctuateValue(c.current_in, 10, 100, 600);
          const newOut = fluctuateValue(c.current_out, 10, 100, 600);
          const diff = calculateDifferential({ ...c, current_in: newIn, current_out: newOut });
          const newStatus: Cable["status"] =
            diff > 50 ? "alert" : diff > 20 ? "warning" : "normal";

          if (newStatus === "alert" && c.status !== "alert") {
            addAlert({
              id: generateId("a"),
              type: "Cable",
              severity: "High",
              message: `Critical current differential on ${c.name} (${diff}A) — possible theft`,
              location: c.name,
              timestamp: new Date().toISOString(),
              resolved: false,
            });
          }

          return {
            ...c,
            vibration: newVib,
            tilt: newTilt,
            current_in: newIn,
            current_out: newOut,
            current_differential: diff,
            status: newStatus,
            last_checked: new Date().toISOString(),
          };
        })
      );
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [simulationRunning, addAlert]);

  const handleToggleSimulation = useCallback(() => {
    setSimulationRunning((prev) => {
      if (!prev) {
        toast.success("Live simulation started", { description: "Telemetry data will update every 3 seconds" });
      } else {
        toast.info("Simulation paused");
      }
      return !prev;
    });
  }, []);

  const handleTriggerFault = useCallback(
    (deviceId: string, deviceType: "Transformer" | "Cable", faultType: string) => {
      if (deviceType === "Transformer") {
        setTransformers((prev) =>
          prev.map((t) => {
            if (t.id !== deviceId) return t;
            const newTemp = faultType === "overheat" ? 75 : fluctuateValue(t.temperature, 5, 30, 85);
            return {
              ...t,
              temperature: newTemp,
              status: "alert" as const,
              health_score: Math.max(20, t.health_score - 30),
              last_checked: new Date().toISOString(),
            };
          })
        );
        const device = transformers.find((t) => t.id === deviceId);
        addAlert({
          id: generateId("a"),
          type: "Transformer",
          severity: "High",
          message: `Fault injected: ${faultType} on ${device?.name ?? deviceId}`,
          location: device?.name ?? deviceId,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
        toast.error("Fault injected", {
          description: `${faultType} on ${device?.name ?? deviceId}`,
          duration: 4000,
        });
      } else {
        setCables((prev) =>
          prev.map((c) => {
            if (c.id !== deviceId) return c;
            const diff = faultType === "theft" ? 85 : calculateDifferential(c);
            const vib = faultType === "tilt" ? 0.7 : fluctuateValue(c.vibration, 0.05, 0, 0.8);
            const tilt = faultType === "tilt" ? 4.5 : fluctuateValue(c.tilt, 0.2, 0, 5);
            return {
              ...c,
              current_differential: diff,
              vibration: vib,
              tilt: tilt,
              status: "alert" as const,
              last_checked: new Date().toISOString(),
            };
          })
        );
        const device = cables.find((c) => c.id === deviceId);
        addAlert({
          id: generateId("a"),
          type: "Cable",
          severity: "High",
          message: `Fault injected: ${faultType} on ${device?.name ?? deviceId}`,
          location: device?.name ?? deviceId,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
        toast.error("Fault injected", {
          description: `${faultType} on ${device?.name ?? deviceId}`,
          duration: 4000,
        });
      }
    },
    [transformers, cables, addAlert]
  );

  const handleResolveAlert = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
    );
  }, []);

  const handleResolveAllAlerts = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, resolved: true })));
    toast.success("All alerts resolved");
  }, []);

  // ── Sync handlers ──
  const handleSetSyncMode = useCallback((mode: SyncMode) => {
    setSyncModeState(mode);
    setSyncMode(mode);
    toast.info(`Sync mode switched to ${mode.toUpperCase()}`, {
      description: mode === "server" ? "Data will sync with remote server" : "Data stored locally",
    });
  }, []);

  const handleSetServerUrl = useCallback((url: string) => {
    setServerUrlState(url);
    setApiServerUrl(url);
  }, []);

  const handleTestConnection = useCallback(async () => {
    setServerStatus("connecting");
    try {
      const ok = await testConnection();
      setServerStatus(ok ? "connected" : "error");
      if (ok) {
        toast.success("Server connected", {
          description: `Latency: ${getSyncState().status.latency}ms`,
        });
      } else {
        toast.error("Connection failed", {
          description: "Check the server URL and ensure the Flask backend is running",
        });
      }
    } catch {
      setServerStatus("error");
      toast.error("Connection error", {
        description: "Request timed out or network error",
      });
    }
  }, []);

  const handleResetSimulation = useCallback(async () => {
    setTransformers(
      mockTransformers.map((t) => ({ ...t, last_checked: new Date().toISOString() }))
    );
    setCables(
      mockCables.map((c) => ({ ...c, last_checked: new Date().toISOString() }))
    );
    setAlerts(mockAlerts);
    setSimulationRunning(false);
    toast.success("Simulation reset to defaults");
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a0f]">
      <DashboardLayout
        transformers={transformers}
        cables={cables}
        alerts={alerts}
        connections={gridConnections}
        simulationRunning={simulationRunning}
        onToggleSimulation={handleToggleSimulation}
        onTriggerFault={handleTriggerFault}
        onResolveAlert={handleResolveAlert}
        onResolveAllAlerts={handleResolveAllAlerts}
        onResetSimulation={handleResetSimulation}
        syncMode={syncMode}
        serverUrl={serverUrl}
        serverStatus={serverStatus}
        onSetSyncMode={handleSetSyncMode}
        onSetServerUrl={handleSetServerUrl}
        onTestConnection={handleTestConnection}
      />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0d0d14",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
          },
        }}
      />
    </div>
  );
}

export default App;