export type GridStatus = "normal" | "warning" | "alert";

export type Severity = "Low" | "Medium" | "High";

export type DeviceType = "Transformer" | "Cable";

export interface Location {
  lat: number;
  lng: number;
}

export interface Transformer {
  id: string;
  name: string;
  location: Location;
  status: GridStatus;
  voltage: number;
  current: number;
  temperature: number;
  acoustic_signature: number[];
  last_checked: string;
  health_score: number;
}

export interface Cable {
  id: string;
  name: string;
  location: Location;
  status: GridStatus;
  vibration: number;
  tilt: number;
  current_in: number;
  current_out: number;
  current_differential: number;
  last_checked: string;
}

export interface Alert {
  id: string;
  type: DeviceType;
  severity: Severity;
  message: string;
  location: string;
  timestamp: string;
  resolved: boolean;
}

export interface GridConnection {
  from: string;
  to: string;
}