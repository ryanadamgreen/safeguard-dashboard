/**
 * Shared UI types used across client components and modals.
 * These are the shapes that AlertReportModal, TamperReportModal,
 * SeverityBadge and other shared components expect.
 */

export type Severity = "critical" | "high" | "medium" | "low";
export type AlertStatus = "unread" | "reviewed" | "resolved";
export type DeviceStatus = "online" | "offline" | "restricted";

export interface Alert {
  id: number;
  homeId: number;
  childInitials: string;
  childName: string;
  childAge: number;
  device: string;
  alertType: string;
  severity: Severity;
  timestamp: string;
  status: AlertStatus;
  description: string;
  /** The specific URL, keyword, search term, or content that triggered the alert */
  triggerContent: string;
  /** Last known location of the device at time of alert */
  location: string;
  /** App where the flagged content was detected (e.g. WhatsApp, Snapchat) */
  app?: string;
  /** Whether a screenshot was automatically captured at time of alert */
  hasScreenshot?: boolean;
}

/** Minimal child shape used by report generators */
export interface Child {
  id: number;
  homeId: number;
  initials: string;
  name: string;
  age: number;
  room: string;
  keyWorker?: string;
  deviceId?: string;
}

export type TamperEventType =
  | "App Uninstalled"
  | "VPN Disabled"
  | "Accessibility Revoked"
  | "Usage Stats Revoked"
  | "Location Revoked"
  | "Device Offline"
  | "App Force Stopped"
  | "Device Tamper";

export interface TamperEvent {
  id: number;
  homeId: number;
  childInitials: string;
  childName: string;
  device: string;
  eventType: TamperEventType;
  timestamp: string;
  location: { lat: number; lng: number; area: string };
  severity: "critical";
}
