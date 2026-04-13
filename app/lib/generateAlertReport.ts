import type { Alert } from "./types";

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "#dc2626";
    case "high":     return "#ea580c";
    case "medium":   return "#ca8a04";
    case "low":      return "#16a34a";
    default:         return "#64748b";
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateAlertReport(
  alert: Alert,
  staffName: string,
  homeName: string,
  notes: string
): void {
  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const alertTime = new Date(alert.timestamp).toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const sColor = severityColor(alert.severity);
  const severityLabel = alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>ScreenAlert Report — #${alert.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; }
  .page { max-width: 780px; margin: 0 auto; padding: 48px 48px 40px; }

  /* ── Header ── */
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; margin-bottom: 32px; }
  .logo { display: flex; align-items: center; gap: 14px; }
  .logo-icon { width: 46px; height: 46px; background: #3D3F8A; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo-icon svg { width: 28px; height: 28px; }
  .logo-name { font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: -0.4px; line-height: 1; }
  .logo-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .header-right { text-align: right; }
  .doc-type { font-size: 14px; font-weight: 700; color: #475569; }
  .doc-meta { font-size: 11px; color: #94a3b8; margin-top: 5px; line-height: 1.6; }

  /* ── Alert banner ── */
  .alert-banner { display: flex; align-items: flex-start; gap: 16px; padding: 18px 20px; border-radius: 10px; border-left: 5px solid ${sColor}; background: #f8fafc; margin-bottom: 32px; }
  .sev-dot { width: 14px; height: 14px; border-radius: 50%; background: ${sColor}; flex-shrink: 0; margin-top: 4px; }
  .banner-title { font-size: 20px; font-weight: 700; color: #0f172a; }
  .banner-sub { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.9px; color: ${sColor}; margin-top: 5px; }

  /* ── Sections ── */
  .section { margin-bottom: 28px; }
  .section-heading { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
  .field label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; display: block; margin-bottom: 3px; }
  .field .val { font-size: 13px; font-weight: 500; color: #1e293b; }
  .field .val.sev { color: ${sColor}; font-weight: 700; }

  /* ── Trigger box ── */
  .trigger-box { background: #fff8f1; border: 1px solid #fed7aa; border-radius: 8px; padding: 14px 16px; }
  .trigger-box .tb-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #92400e; margin-bottom: 8px; }
  .trigger-box .tb-content { font-size: 12px; font-family: 'Courier New', monospace; color: #7c2d12; word-break: break-all; line-height: 1.5; }

  /* ── Notes box ── */
  .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; min-height: 90px; }
  .notes-placeholder { font-size: 12px; color: #cbd5e1; font-style: italic; }
  .notes-content { font-size: 13px; color: #334155; white-space: pre-wrap; line-height: 1.6; }

  /* ── Signature ── */
  .sig-section { margin-top: 36px; padding-top: 28px; border-top: 2px solid #e2e8f0; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px; }
  .sig-field label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; display: block; margin-bottom: 28px; }
  .sig-line { border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
  .sig-name { font-size: 13px; color: #475569; font-weight: 500; }
  .sig-blank { min-height: 26px; }

  /* ── Footer ── */
  .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 10px; color: #94a3b8; }

  /* ── Screenshot page ── */
  .screenshot-page { page-break-before: always; padding-top: 48px; }
  .ss-page-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 28px; }
  .ss-title { font-size: 18px; font-weight: 700; color: #0f172a; }
  .ss-meta { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .ss-placeholder { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; min-height: 420px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; margin-bottom: 20px; }
  .ss-placeholder-icon { width: 56px; height: 56px; opacity: 0.3; }
  .ss-placeholder-text { font-size: 13px; color: #94a3b8; font-style: italic; }
  .ss-note { font-size: 11px; color: #78350f; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; line-height: 1.5; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 28px 36px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 56 56" width="32" height="32">
          <path d="M28,8 L46,14 L46,32 Q46,46 28,50 Q10,46 10,32 L10,14 Z" fill="white"/>
          <circle cx="38" cy="17" r="6" fill="#1DB894"/>
          <circle cx="38" cy="17" r="3" fill="#3D3F8A"/>
        </svg>
      </div>
      <div>
        <div class="logo-name">ScreenAlert</div>
        <div class="logo-sub">${esc(homeName)}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-type">Safeguarding Alert Report</div>
      <div class="doc-meta">
        Alert #${alert.id} &nbsp;·&nbsp; CONFIDENTIAL<br/>
        Generated: ${generatedAt}
      </div>
    </div>
  </div>

  <!-- Alert banner -->
  <div class="alert-banner">
    <div class="sev-dot"></div>
    <div>
      <div class="banner-title">${esc(alert.alertType)}</div>
      <div class="banner-sub">${severityLabel} severity &nbsp;·&nbsp; Alert #${alert.id}</div>
    </div>
  </div>

  <!-- Alert details -->
  <div class="section">
    <div class="section-heading">Alert Details</div>
    <div class="grid2">
      <div class="field"><label>Alert Type</label><div class="val">${esc(alert.alertType)}</div></div>
      <div class="field"><label>Severity</label><div class="val sev">${severityLabel}</div></div>
      <div class="field"><label>Date &amp; Time</label><div class="val">${alertTime}</div></div>
      <div class="field"><label>Alert ID</label><div class="val">#${alert.id}</div></div>
    </div>
  </div>

  <!-- Child information -->
  <div class="section">
    <div class="section-heading">Child Information</div>
    <div class="grid2">
      <div class="field"><label>Child Initials</label><div class="val">${esc(alert.childInitials)}</div></div>
      <div class="field"><label>Age</label><div class="val">${alert.childAge} years old</div></div>
    </div>
  </div>

  <!-- Device information -->
  <div class="section">
    <div class="section-heading">Device Information</div>
    <div class="grid2">
      <div class="field"><label>Device ID</label><div class="val">${esc(alert.device)}</div></div>
      <div class="field"><label>Last Known Location</label><div class="val">${esc(alert.location)}</div></div>
    </div>
  </div>

  <!-- Trigger content -->
  <div class="section">
    <div class="section-heading">Trigger Content</div>
    <div class="trigger-box">
      <div class="tb-label">Content / context that triggered this alert</div>
      <div class="tb-content">${esc(alert.triggerContent)}</div>
    </div>
  </div>

  <!-- Alert description -->
  <div class="section">
    <div class="section-heading">Alert Description</div>
    <div class="notes-box">
      <div class="notes-content">${esc(alert.description)}</div>
    </div>
  </div>

  <!-- Staff notes -->
  <div class="section">
    <div class="section-heading">Staff Notes</div>
    <div class="notes-box">
      ${notes
        ? `<div class="notes-content">${esc(notes)}</div>`
        : `<div class="notes-placeholder">No additional notes recorded.</div>`
      }
    </div>
  </div>

  <!-- Signature -->
  <div class="sig-section">
    <div class="section-heading">Staff Signature</div>
    <div class="sig-grid">
      <div class="sig-field">
        <label>Reporting Staff Member</label>
        <div class="sig-line"><div class="sig-name">${esc(staffName || "—")}</div></div>
      </div>
      <div class="sig-field">
        <label>Signature &amp; Date</label>
        <div class="sig-line sig-blank"></div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>ScreenAlert Residential Monitoring &nbsp;·&nbsp; Confidential safeguarding document &nbsp;·&nbsp; Not for public disclosure</p>
    <p>Alert #${alert.id} &nbsp;·&nbsp; ${generatedAt}</p>
  </div>

</div>

${alert.hasScreenshot ? `<div class="page screenshot-page">
  <div class="ss-page-header">
    <div>
      <div class="ss-title">Captured Screenshot</div>
      <div class="ss-meta">Alert #${alert.id} &nbsp;·&nbsp; ${esc(alert.alertType)} &nbsp;·&nbsp; Captured: ${alertTime}</div>
    </div>
    <div class="header-right">
      <div class="doc-type" style="font-size:12px;">CONFIDENTIAL</div>
      <div class="doc-meta">${esc(alert.childInitials)} &nbsp;·&nbsp; Age ${alert.childAge}</div>
    </div>
  </div>

  <div class="ss-placeholder">
    <svg class="ss-placeholder-icon" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    <div class="ss-placeholder-text">Screenshot captured at time of detection</div>
    <div class="ss-placeholder-text" style="font-size:11px;">${alert.app ? `App: ${esc(alert.app)} &nbsp;·&nbsp; ` : ""}Device: ${esc(alert.device)}</div>
  </div>

  <div class="ss-note">
    This screenshot was captured automatically by ScreenAlert when the flagged content was detected on ${alertTime}.
    ${alert.app ? `Content was detected in <strong>${esc(alert.app)}</strong>.` : ""}
    This image is retained as part of the safeguarding record and is subject to data protection legislation.
    Handle and store in accordance with your organisation's safeguarding and information governance policies.
  </div>
</div>` : ""}
<script>window.onload = function () { window.print(); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=950,height=750");
  if (!win) {
    // eslint-disable-next-line no-alert
    window.alert("Please allow pop-ups in your browser to generate the report PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
