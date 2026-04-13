import type { TamperEvent } from "./types";

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generateTamperReport(
  event: TamperEvent,
  staffName: string,
  homeName: string,
  notes: string
): void {
  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const eventTime = new Date(event.timestamp).toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const coords = `${event.location.lat}°N, ${Math.abs(event.location.lng)}°${event.location.lng < 0 ? "W" : "E"}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>ScreenAlert Security Report — ${esc(event.eventType)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; }
  .page { max-width: 780px; margin: 0 auto; padding: 48px 48px 40px; }

  /* ── Header ── */
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; margin-bottom: 32px; }
  .logo { display: flex; align-items: center; gap: 14px; }
  .logo-icon { width: 46px; height: 46px; background: #dc2626; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo-icon svg { width: 28px; height: 28px; }
  .logo-name { font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: -0.4px; line-height: 1; }
  .logo-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .header-right { text-align: right; }
  .doc-type { font-size: 14px; font-weight: 700; color: #dc2626; }
  .doc-meta { font-size: 11px; color: #94a3b8; margin-top: 5px; line-height: 1.6; }

  /* ── Alert banner ── */
  .alert-banner { display: flex; align-items: flex-start; gap: 16px; padding: 18px 20px; border-radius: 10px; border-left: 5px solid #dc2626; background: #fff1f2; margin-bottom: 32px; }
  .sev-dot { width: 14px; height: 14px; border-radius: 50%; background: #dc2626; flex-shrink: 0; margin-top: 4px; }
  .banner-title { font-size: 20px; font-weight: 700; color: #0f172a; }
  .banner-sub { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.9px; color: #dc2626; margin-top: 5px; }

  /* ── Sections ── */
  .section { margin-bottom: 28px; }
  .section-heading { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #94a3b8; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 14px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; }
  .field label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; display: block; margin-bottom: 3px; }
  .field .val { font-size: 13px; font-weight: 500; color: #1e293b; }
  .field .val.danger { color: #dc2626; font-weight: 700; }

  /* ── Location box ── */
  .location-box { background: #fff1f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 16px; }
  .location-box .lb-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #991b1b; margin-bottom: 8px; }
  .location-box .lb-area { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
  .location-box .lb-coords { font-size: 11px; font-family: 'Courier New', monospace; color: #7f1d1d; }

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
        <svg fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div>
        <div class="logo-name">ScreenAlert</div>
        <div class="logo-sub">${esc(homeName)}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-type">Security Tamper Alert Report</div>
      <div class="doc-meta">
        CONFIDENTIAL &nbsp;·&nbsp; CRITICAL PRIORITY<br/>
        Generated: ${generatedAt}
      </div>
    </div>
  </div>

  <!-- Alert banner -->
  <div class="alert-banner">
    <div class="sev-dot"></div>
    <div>
      <div class="banner-title">${esc(event.eventType)}</div>
      <div class="banner-sub">Tamper Event &nbsp;·&nbsp; Critical &nbsp;·&nbsp; Device: ${esc(event.device)}</div>
    </div>
  </div>

  <!-- Event details -->
  <div class="section">
    <div class="section-heading">Event Details</div>
    <div class="grid2">
      <div class="field"><label>Event Type</label><div class="val danger">${esc(event.eventType)}</div></div>
      <div class="field"><label>Severity</label><div class="val danger">Critical — Tamper</div></div>
      <div class="field"><label>Date &amp; Time</label><div class="val">${eventTime}</div></div>
      <div class="field"><label>Child Initials</label><div class="val">${esc(event.childInitials)}</div></div>
    </div>
  </div>

  <!-- Device information -->
  <div class="section">
    <div class="section-heading">Device Information</div>
    <div class="grid2">
      <div class="field"><label>Device ID</label><div class="val">${esc(event.device)}</div></div>
      <div class="field"><label>Child</label><div class="val">${esc(event.childName)}</div></div>
    </div>
  </div>

  <!-- Last known location -->
  <div class="section">
    <div class="section-heading">Last Known Location</div>
    <div class="location-box">
      <div class="lb-label">Location at time of tamper event</div>
      <div class="lb-area">${esc(event.location.area)}</div>
      <div class="lb-coords">${esc(coords)}</div>
    </div>
  </div>

  <!-- Staff notes -->
  <div class="section">
    <div class="section-heading">Staff Observations</div>
    <div class="notes-box">
      ${notes
        ? `<div class="notes-content">${esc(notes)}</div>`
        : `<div class="notes-placeholder">No additional observations recorded.</div>`
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
    <p>Security Tamper Report &nbsp;·&nbsp; ${generatedAt}</p>
  </div>

</div>
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
