import { Resend } from "resend";
import type { Alert, TamperEvent } from "./types";

const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_ADDRESS = "SafeGuard <onboarding@resend.dev>";

// ── Helpers ────────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function severityHex(severity: string): string {
  switch (severity) {
    case "critical": return "#dc2626";
    case "high":     return "#ea580c";
    case "medium":   return "#d97706";
    case "low":      return "#16a34a";
    default:         return "#64748b";
  }
}

function severityBg(severity: string): string {
  switch (severity) {
    case "critical": return "#fef2f2";
    case "high":     return "#fff7ed";
    case "medium":   return "#fffbeb";
    case "low":      return "#f0fdf4";
    default:         return "#f8fafc";
  }
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Alert HTML template ────────────────────────────────────────────────────────

function buildAlertHtml(alert: Alert, homeName: string, appUrl: string): string {
  const sColor    = severityHex(alert.severity);
  const sBg       = severityBg(alert.severity);
  const sevLabel  = alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1);
  const alertTime = fmt(alert.timestamp);

  const detailRows: [string, string][] = [
    ["Child",     `${esc(alert.childInitials)} — Age ${alert.childAge}`],
    ["Device",    esc(alert.device)],
    ["Timestamp", alertTime],
    ["Location",  esc(alert.location)],
  ];
  if (alert.app) detailRows.push(["App", esc(alert.app)]);

  const detailHtml = detailRows.map(([label, value]) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;width:38%;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;">
        ${label}
      </td>
      <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;font-size:13px;font-weight:600;color:#1e293b;">
        ${value}
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SafeGuard Alert — ${esc(alert.alertType)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:36px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

  <!-- Header -->
  <tr>
    <td style="background:#0f172a;padding:22px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="display:inline-block;background:#3b82f6;border-radius:8px;width:34px;height:34px;text-align:center;line-height:34px;font-size:13px;font-weight:800;color:#ffffff;vertical-align:middle;margin-right:10px;">SG</div>
            <span style="vertical-align:middle;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">SafeGuard</span>
            <div style="font-size:11px;color:#64748b;margin-top:3px;margin-left:44px;">${esc(homeName)}</div>
          </td>
          <td align="right" style="vertical-align:top;">
            <span style="background:${sColor};color:#ffffff;padding:5px 13px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${sevLabel}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Severity banner -->
  <tr>
    <td style="background:${sBg};border-left:5px solid ${sColor};padding:20px 32px;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;line-height:1.2;">${esc(alert.alertType)}</p>
      <p style="margin:6px 0 0;font-size:12px;font-weight:700;color:${sColor};text-transform:uppercase;letter-spacing:0.7px;">${sevLabel} Severity Alert</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:28px 32px;">

      <!-- Detail table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        ${detailHtml}
      </table>

      <!-- Description -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;margin-bottom:28px;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Description</p>
        <p style="margin:0;font-size:13px;color:#334155;line-height:1.6;">${esc(alert.description)}</p>
      </div>

      <!-- CTA button -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:4px 0 8px;">
            <a href="${appUrl}/alerts" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:-0.2px;">
              View in Dashboard →
            </a>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;">
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;line-height:1.5;">
        You are receiving this because you have <strong>${sevLabel}</strong> alerts set to email in your notification preferences.
      </p>
      <p style="margin:0;font-size:11px;color:#94a3b8;font-style:italic;">
        &#9888; This email contains sensitive safeguarding information. Do not forward.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Tamper / Security HTML template ───────────────────────────────────────────

function buildTamperHtml(event: TamperEvent, homeName: string, appUrl: string): string {
  const eventTime = fmt(event.timestamp);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SafeGuard Security Alert — ${esc(event.eventType)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:36px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

  <!-- Red header -->
  <tr>
    <td style="background:#991b1b;padding:22px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="display:inline-block;background:#dc2626;border:2px solid #fca5a5;border-radius:8px;width:34px;height:34px;text-align:center;line-height:30px;font-size:13px;font-weight:800;color:#ffffff;vertical-align:middle;margin-right:10px;">SG</div>
            <span style="vertical-align:middle;font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">SafeGuard</span>
            <div style="font-size:11px;color:#fca5a5;margin-top:3px;margin-left:44px;">${esc(homeName)}</div>
          </td>
          <td align="right" style="vertical-align:top;">
            <span style="background:#dc2626;border:1px solid #fca5a5;color:#ffffff;padding:5px 13px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;">SECURITY ALERT</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Urgent banner -->
  <tr>
    <td style="background:#fef2f2;border-left:5px solid #dc2626;padding:20px 32px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.8px;">[URGENT] Device Tamper Event</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;line-height:1.2;">${esc(event.eventType)}</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:28px 32px;">

      <!-- Location highlight -->
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.8px;">Last Known Location</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#7c2d12;">${esc(event.location.area)}</p>
        <p style="margin:3px 0 0;font-size:11px;color:#92400e;font-family:monospace;">
          ${event.location.lat.toFixed(4)}&deg;N, ${Math.abs(event.location.lng).toFixed(4)}&deg;W
        </p>
      </div>

      <!-- Details table -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;width:38%;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;">Child</td>
          <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#1e293b;">${esc(event.childInitials)}</td>
        </tr>
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;">Device</td>
          <td style="padding:9px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#1e293b;">${esc(event.device)}</td>
        </tr>
        <tr>
          <td style="padding:9px 0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.7px;">Timestamp</td>
          <td style="padding:9px 0;font-size:13px;font-weight:600;color:#1e293b;">${eventTime}</td>
        </tr>
      </table>

      <!-- CTA button -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:4px 0 8px;">
            <a href="${appUrl}/alerts" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:-0.2px;">
              View in Dashboard →
            </a>
          </td>
        </tr>
      </table>

    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;">
      <p style="margin:0 0 6px;font-size:11px;color:#64748b;line-height:1.5;">
        Security alerts are sent to all staff for this home regardless of notification preferences.
      </p>
      <p style="margin:0;font-size:11px;color:#94a3b8;font-style:italic;">
        &#9888; This email contains sensitive safeguarding information. Do not forward.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Send functions ─────────────────────────────────────────────────────────────

export async function sendAlertEmail(
  to: string | string[],
  alert: Alert,
  homeName: string,
) {
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const sevLabel  = alert.severity.toUpperCase();
  const subject   = `[${sevLabel}] SafeGuard Alert - ${alert.alertType} - ${homeName}`;

  const { data, error } = await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      Array.isArray(to) ? to : [to],
    subject,
    html:    buildAlertHtml(alert, homeName, appUrl),
  });

  if (error) {
    console.error("[sendAlertEmail] Resend error:", JSON.stringify(error));
    throw new Error(error.message);
  }
  return data;
}

export async function sendTamperEmail(
  to: string | string[],
  event: TamperEvent,
  homeName: string,
) {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const subject = `[URGENT] SafeGuard Security Alert - ${event.eventType} - ${event.childInitials}`;

  const { data, error } = await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      Array.isArray(to) ? to : [to],
    subject,
    html:    buildTamperHtml(event, homeName, appUrl),
  });

  if (error) {
    console.error("[sendTamperEmail] Resend error:", JSON.stringify(error));
    throw new Error(error.message);
  }
  return data;
}

export async function sendTestEmail(to: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const testAlert: Alert = {
    id: 0,
    homeId: 1,
    childInitials: "J.S.",
    childName: "Jamie S.",
    childAge: 14,
    device: "iPad-001",
    alertType: "Grooming Language Detected",
    severity: "critical",
    timestamp: new Date().toISOString(),
    status: "unread",
    description:
      "This is a test notification to confirm your email alert settings are working correctly. No action is required.",
    triggerContent: "Test notification — no action required",
    location: "Oakwood House — Room A1",
    app: "WhatsApp",
    hasScreenshot: false,
  };

  const { data, error } = await resend.emails.send({
    from:    FROM_ADDRESS,
    to:      [to],
    subject: "[TEST] SafeGuard Alert Notification — Email Delivery Test",
    html:    buildAlertHtml(testAlert, "Oakwood House", appUrl),
  });

  if (error) {
    console.error("[sendTestEmail] Resend error:", JSON.stringify(error));
    throw new Error(error.message);
  }
  return data;
}
