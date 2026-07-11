import { Transformer, Cable, Alert, GridConnection } from "@/types/grid";

export const mockTransformers: Transformer[] = [
  {
    id: "t-001",
    name: "Substation A - Main",
    location: { lat: 51.5074, lng: -0.1278 },
    status: "normal",
    voltage: 132.0,
    current: 450,
    temperature: 42,
    acoustic_signature: [0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.2],
    last_checked: new Date().toISOString(),
    health_score: 92,
  },
  {
    id: "t-002",
    name: "Substation B - East",
    location: { lat: 51.5154, lng: -0.0858 },
    status: "normal",
    voltage: 66.0,
    current: 320,
    temperature: 38,
    acoustic_signature: [0.6, 0.7, 0.4, 0.5, 0.8, 0.3, 0.6, 0.5],
    last_checked: new Date().toISOString(),
    health_score: 88,
  },
  {
    id: "t-003",
    name: "Substation C - West",
    location: { lat: 51.4998, lng: -0.1657 },
    status: "warning",
    voltage: 33.0,
    current: 280,
    temperature: 58,
    acoustic_signature: [0.7, 0.9, 0.6, 0.8, 0.5, 0.7, 0.9, 0.6],
    last_checked: new Date().toISOString(),
    health_score: 65,
  },
  {
    id: "t-004",
    name: "Substation D - Industrial",
    location: { lat: 51.5238, lng: -0.1325 },
    status: "normal",
    voltage: 132.0,
    current: 510,
    temperature: 45,
    acoustic_signature: [0.4, 0.6, 0.5, 0.7, 0.6, 0.5, 0.4, 0.3],
    last_checked: new Date().toISOString(),
    health_score: 85,
  },
];

export const mockCables: Cable[] = [
  {
    id: "c-001",
    name: "Feeder Line A-B",
    location: { lat: 51.5114, lng: -0.1068 },
    status: "normal",
    vibration: 0.12,
    tilt: 0.5,
    current_in: 430,
    current_out: 428,
    current_differential: 2,
    last_checked: new Date().toISOString(),
  },
  {
    id: "c-002",
    name: "Feeder Line B-C",
    location: { lat: 51.5076, lng: -0.1258 },
    status: "normal",
    vibration: 0.08,
    tilt: 0.3,
    current_in: 300,
    current_out: 298,
    current_differential: 2,
    last_checked: new Date().toISOString(),
  },
  {
    id: "c-003",
    name: "Feeder Line A-D",
    location: { lat: 51.5156, lng: -0.1301 },
    status: "alert",
    vibration: 0.45,
    tilt: 2.8,
    current_in: 490,
    current_out: 412,
    current_differential: 78,
    last_checked: new Date().toISOString(),
  },
  {
    id: "c-004",
    name: "Feeder Line D-C",
    location: { lat: 51.5118, lng: -0.1491 },
    status: "normal",
    vibration: 0.09,
    tilt: 0.4,
    current_in: 260,
    current_out: 258,
    current_differential: 2,
    last_checked: new Date().toISOString(),
  },
  {
    id: "c-005",
    name: "Feeder Line A-C",
    location: { lat: 51.5036, lng: -0.1468 },
    status: "normal",
    vibration: 0.11,
    tilt: 0.6,
    current_in: 350,
    current_out: 347,
    current_differential: 3,
    last_checked: new Date().toISOString(),
  },
];

export const mockAlerts: Alert[] = [
  {
    id: "a-001",
    type: "Cable",
    severity: "High",
    message: "Current differential detected on Feeder Line A-D - possible theft",
    location: "Feeder Line A-D",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    resolved: false,
  },
  {
    id: "a-002",
    type: "Transformer",
    severity: "Medium",
    message: "Elevated temperature on Substation C - West (58°C)",
    location: "Substation C - West",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    resolved: false,
  },
  {
    id: "a-003",
    type: "Cable",
    severity: "Low",
    message: "Minor vibration anomaly on Feeder Line A-B",
    location: "Feeder Line A-B",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    resolved: true,
  },
];

export const gridConnections: GridConnection[] = [
  { from: "t-001", to: "t-002" },
  { from: "t-002", to: "t-003" },
  { from: "t-001", to: "t-004" },
  { from: "t-004", to: "t-003" },
  { from: "t-001", to: "t-003" },
];

export function fluctuateValue(value: number, maxDelta: number, min: number, max: number): number {
  const delta = (Math.random() - 0.5) * maxDelta * 2;
  return Math.round(Math.min(max, Math.max(min, value + delta)) * 100) / 100;
}

export function calculateDifferential(cable: Cable): number {
  return Math.round((cable.current_in - cable.current_out) * 100) / 100;
}

export function generateAcousticWaveform(base: number[]): number[] {
  return base.map((v) => Math.round((v + (Math.random() - 0.5) * 0.3) * 100) / 100);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}