/**
 * VoltSight API Service
 * Dual-mode client-server bridge: Local (localStorage) or Server (Flask REST API).
 */

import { Transformer, Cable, Alert } from "@/types/grid";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncMode = "local" | "server";

export interface ServerStatus {
  connected: boolean;
  lastPing: number | null;
  latency: number | null;
}

export interface SyncState {
  mode: SyncMode;
  serverUrl: string;
  status: ServerStatus;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const STORAGE_KEY = "voltsight-sync-config";

let _state: SyncState = loadSyncConfig();

function loadSyncConfig(): SyncState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    mode: "local",
    serverUrl: "http://localhost:5000",
    status: { connected: false, lastPing: null, latency: null },
  };
}

function persistSyncConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch {
    // ignore
  }
}

export function getSyncState(): SyncState {
  return { ..._state };
}

export function setSyncMode(mode: SyncMode) {
  _state.mode = mode;
  persistSyncConfig();
}

export function setServerUrl(url: string) {
  _state.serverUrl = url.replace(/\/+$/, "");
  persistSyncConfig();
}

// ---------------------------------------------------------------------------
// Connection health
// ---------------------------------------------------------------------------

export async function testConnection(): Promise<boolean> {
  const url = `${_state.serverUrl}/api/health`;
  const start = performance.now();
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      _state.status = {
        connected: true,
        lastPing: Date.now(),
        latency: Math.round(performance.now() - start),
      };
      persistSyncConfig();
      return true;
    }
  } catch {
    // connection failed
  }
  _state.status = { connected: false, lastPing: null, latency: null };
  persistSyncConfig();
  return false;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchFromServer<T>(endpoint: string): Promise<T[]> {
  const res = await fetch(`${_state.serverUrl}${endpoint}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return (json.data ?? json) as T[];
}

async function postToServer<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${_state.serverUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchTransformers(): Promise<Transformer[]> {
  if (_state.mode === "server") {
    return fetchFromServer<Transformer>("/api/transformers");
  }
  // Local mode: read from localStorage (handled by App state)
  return [];
}

export async function fetchCables(): Promise<Cable[]> {
  if (_state.mode === "server") {
    return fetchFromServer<Cable>("/api/cables");
  }
  return [];
}

export async function fetchAlerts(): Promise<Alert[]> {
  if (_state.mode === "server") {
    return fetchFromServer<Alert>("/api/alerts");
  }
  return [];
}

export async function pushTransformerData(
  transformer: Transformer
): Promise<{ status: string; transformer: Transformer; new_alerts: number }> {
  if (_state.mode === "server") {
    try {
      const result = await postToServer<{
        status: string;
        transformer: Transformer;
        new_alerts: number;
      }>("/api/transformer/data", {
        id: transformer.id,
        temperature: transformer.temperature,
        voltage: transformer.voltage,
        current: transformer.current,
        health_score: transformer.health_score,
        acoustic_signature: transformer.acoustic_signature,
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to push transformer data";
      toast.error(`Server sync error: ${msg}`);
      throw err;
    }
  }
  return { status: "local", transformer, new_alerts: 0 };
}

export async function pushCableData(
  cable: Cable
): Promise<{ status: string; cable: Cable; new_alerts: number }> {
  if (_state.mode === "server") {
    try {
      const result = await postToServer<{
        status: string;
        cable: Cable;
        new_alerts: number;
      }>("/api/cable/data", {
        id: cable.id,
        vibration: cable.vibration,
        tilt: cable.tilt,
        current_in: cable.current_in,
        current_out: cable.current_out,
        current_differential: cable.current_differential,
      });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to push cable data";
      toast.error(`Server sync error: ${msg}`);
      throw err;
    }
  }
  return { status: "local", cable, new_alerts: 0 };
}

export async function resolveAlertOnServer(
  alertId: string
): Promise<{ status: string; alert?: Alert; resolved?: number }> {
  if (_state.mode === "server") {
    try {
      return await postToServer("/api/alerts/resolve", { id: alertId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resolve alert";
      toast.error(`Server error: ${msg}`);
      throw err;
    }
  }
  return { status: "local" };
}

export async function resolveAllAlertsOnServer(): Promise<{
  status: string;
  resolved: number;
}> {
  if (_state.mode === "server") {
    try {
      return await postToServer("/api/alerts/resolve", { all: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to resolve alerts";
      toast.error(`Server error: ${msg}`);
      throw err;
    }
  }
  return { status: "local", resolved: 0 };
}