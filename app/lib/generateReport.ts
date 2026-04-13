import type { Alert, TamperEvent, Child } from "./types";

export interface ReportConfig {
  reportTypeId: string;
  reportTypeName: string;
  homeName: string;
  homeAddress: string;
  staffName: string;
  dateFrom: string;
  dateTo: string;
  selectedChild: string;
  includeTamper: boolean;
  notes: string;
  alerts: Alert[];
  tamperEvents: TamperEvent[];
  children: Child[];
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function severityBadge(sev: string): string {
  const map: Record<string, string> = {
    critical: "background:#fee2e2;color:#dc2626;",
    high:     "background:#ffedd5;color:#ea580c;",
    medium:   "background:#fef9c3;color:#ca8a04;",
    low:      "background:#dcfce7;color:#16a34a;",
  };
  const style = map[sev] ?? "background:#f1f5f9;color:#475569;";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;text-transform:capitalize;${style}">${esc(sev)}</span>`;
}

function section(title: string, body: string): string {
  return `
    <div style="margin-bottom:28px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#94a3b8;padding-bottom:8px;border-bottom:1px solid #f1f5f9;margin-bottom:14px;">${esc(title)}</div>
      ${body}
    </div>`;
}

function alertTable(rows: Alert[]): string {
  if (rows.length === 0)
    return `<p style="color:#94a3b8;font-style:italic;font-size:12px;">No alerts for this period.</p>`;
  const header = `<tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Date &amp; Time</th>
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Child</th>
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Type</th>
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Severity</th>
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#64748b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Description</th>
  </tr>`;
  const bodyRows = rows.map((a, i) => `
    <tr style="border-bottom:1px solid #f1f5f9;background:${i % 2 === 0 ? "#fff" : "#f8fafc"};">
      <td style="padding:7px 10px;color:#475569;white-space:nowrap;">${esc(fmtDate(a.timestamp))}</td>
      <td style="padding:7px 10px;font-weight:600;color:#1e293b;">${esc(a.childInitials)}</td>
      <td style="padding:7px 10px;color:#334155;">${esc(a.alertType)}</td>
      <td style="padding:7px 10px;">${severityBadge(a.severity)}</td>
      <td style="padding:7px 10px;color:#475569;">${esc(a.description)}</td>
    </tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead>${header}</thead><tbody>${bodyRows}</tbody></table>`;
}

function tamperTable(rows: TamperEvent[]): string {
  if (rows.length === 0)
    return `<p style="color:#94a3b8;font-style:italic;font-size:12px;">No tamper events for this period.</p>`;
  const header = `<tr style="background:#fff1f2;border-bottom:1px solid #fecaca;">
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#991b1b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Date &amp; Time</th>
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#991b1b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Child</th>
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#991b1b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Device</th>
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#991b1b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Event</th>
    <th style="padding:7px 10px;text-align:left;font-weight:700;color:#991b1b;text-transform:uppercase;font-size:10px;letter-spacing:0.7px;">Last Known Location</th>
  </tr>`;
  const bodyRows = rows.map((t, i) => `
    <tr style="border-bottom:1px solid #fef2f2;background:${i % 2 === 0 ? "#fff" : "#fff9f9"};">
      <td style="padding:7px 10px;color:#475569;white-space:nowrap;">${esc(fmtDate(t.timestamp))}</td>
      <td style="padding:7px 10px;font-weight:600;color:#1e293b;">${esc(t.childInitials)}</td>
      <td style="padding:7px 10px;color:#334155;">${esc(t.device)}</td>
      <td style="padding:7px 10px;font-weight:600;color:#dc2626;">${esc(t.eventType)}</td>
      <td style="padding:7px 10px;color:#475569;">${esc(t.location.area)}</td>
    </tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;"><thead>${header}</thead><tbody>${bodyRows}</tbody></table>`;
}

function statGrid(items: Array<[string, number | string, string]>): string {
  const cells = items.map(([label, value, color]) => `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;">
      <div style="font-size:24px;font-weight:700;color:${color};">${value}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">${esc(String(label))}</div>
    </div>`).join("");
  return `<div style="display:grid;grid-template-columns:repeat(${items.length},1fr);gap:12px;margin-bottom:20px;">${cells}</div>`;
}

function buildContent(cfg: ReportConfig): string {
  const fa = cfg.selectedChild === "all"
    ? cfg.alerts
    : cfg.alerts.filter(a => a.childName === cfg.selectedChild);
  const ft = cfg.includeTamper
    ? (cfg.selectedChild === "all" ? cfg.tamperEvents : cfg.tamperEvents.filter(t => t.childName === cfg.selectedChild))
    : [];

  const notesSection = cfg.notes
    ? section("Staff Notes", `<p style="font-size:13px;color:#334155;white-space:pre-wrap;line-height:1.7;">${esc(cfg.notes)}</p>`)
    : "";

  switch (cfg.reportTypeId) {
    case "safeguarding-summary":
      return [
        section("Summary Statistics", statGrid([
          ["Total Alerts", fa.length, "#3b82f6"],
          ["Critical", fa.filter(a => a.severity === "critical").length, "#dc2626"],
          ["High", fa.filter(a => a.severity === "high").length, "#ea580c"],
          ["Tamper Events", ft.length, "#7c3aed"],
        ])),
        section("All Alerts", alertTable(fa)),
        ft.length > 0 ? section("Tamper & Security Events", tamperTable(ft)) : "",
        notesSection,
      ].join("");

    case "critical-incident":
      return [
        section("Critical & High Severity Incidents", alertTable(fa.filter(a => a.severity === "critical" || a.severity === "high"))),
        ft.length > 0 ? section("Tamper & Security Events", tamperTable(ft)) : "",
        notesSection,
      ].join("");

    case "individual-child": {
      const child = cfg.children.find(c => c.name === cfg.selectedChild);
      const childInfo = child ? section("Child Details", `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            ${[["Initials", child.initials], ["Age", String(child.age)], ["Room", child.room], ["Key Worker", child.keyWorker ?? "—"], ["Device", child.deviceId ?? "—"]].map(([label, val]) => `
              <div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#94a3b8;">${esc(label)}</div><div style="font-size:13px;font-weight:600;color:#1e293b;margin-top:2px;">${esc(val)}</div></div>
            `).join("")}
          </div>
        </div>`) : "";
      return [childInfo, section("Alerts", alertTable(fa)), ft.length > 0 ? section("Tamper Events", tamperTable(ft)) : "", notesSection].join("");
    }

    case "tamper-security":
      return [
        section("Summary", `<p style="font-size:13px;color:#334155;line-height:1.7;">${cfg.tamperEvents.length} tamper event${cfg.tamperEvents.length !== 1 ? "s" : ""} recorded during this period. All events are classified as <strong>Critical</strong> severity and require immediate review by a senior staff member.</p>`),
        section("All Tamper & Security Events", tamperTable(cfg.tamperEvents)),
        notesSection,
      ].join("");

    case "monthly-overview":
      return [
        section("Monthly Summary", statGrid([
          ["Total Alerts", fa.length, "#3b82f6"],
          ["Critical Alerts", fa.filter(a => a.severity === "critical").length, "#dc2626"],
          ["Children Monitored", cfg.children.length, "#7c3aed"],
          ["Tamper Events", ft.length, "#ea580c"],
        ])),
        section("All Alerts This Month", alertTable(fa)),
        ft.length > 0 ? section("Tamper & Security Events", tamperTable(ft)) : "",
        notesSection,
      ].join("");

    case "ofsted-evidence":
      return [
        section("Executive Summary", `<p style="font-size:13px;color:#334155;line-height:1.7;">This evidence pack covers safeguarding activity, device controls used, incidents logged and actions taken at ${esc(cfg.homeName)} for the period ${esc(cfg.dateFrom)} to ${esc(cfg.dateTo)}.</p>`),
        section("Summary Statistics", statGrid([
          ["Total Alerts", fa.length, "#3b82f6"],
          ["Critical", fa.filter(a => a.severity === "critical").length, "#dc2626"],
          ["High", fa.filter(a => a.severity === "high").length, "#ea580c"],
          ["Tamper Events", cfg.tamperEvents.length, "#7c3aed"],
        ])),
        section("All Safeguarding Alerts", alertTable(fa)),
        cfg.tamperEvents.length > 0 ? section("Device Tamper Events", tamperTable(cfg.tamperEvents)) : "",
        section("Children Monitored", `<p style="font-size:13px;color:#334155;">${cfg.children.length} children placed at ${esc(cfg.homeName)} during this period.</p>`),
        notesSection,
      ].join("");

    default:
      return [
        section("Alerts", alertTable(fa)),
        ft.length > 0 ? section("Tamper & Security Events", tamperTable(ft)) : "",
        notesSection,
      ].join("");
  }
}

export function buildReportHtml(config: ReportConfig): string {
  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const dateRangeStr = config.dateFrom && config.dateTo
    ? `${config.dateFrom} – ${config.dateTo}`
    : "All dates";

  const content = buildContent(config);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${esc(config.reportTypeName)} — ${esc(config.homeName)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; }
  .page { max-width: 780px; margin: 0 auto; padding: 48px 48px 40px; }
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 2px solid #e2e8f0; margin-bottom: 28px; }
  .logo { display: flex; align-items: center; gap: 14px; }
  .logo-icon { width: 46px; height: 46px; background: #3D3F8A; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo-icon svg { width: 28px; height: 28px; }
  .logo-name { font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: -0.4px; line-height: 1; }
  .logo-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .header-right { text-align: right; }
  .doc-type { font-size: 14px; font-weight: 700; color: #3D3F8A; }
  .doc-meta { font-size: 11px; color: #94a3b8; margin-top: 5px; line-height: 1.6; }
  .title-block { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9; }
  .report-title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 10px; }
  .meta-row { display: flex; flex-wrap: wrap; gap: 6px 20px; }
  .meta-item { font-size: 11px; color: #64748b; }
  .meta-item strong { color: #334155; font-weight: 600; }
  .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; }
  .footer p { font-size: 10px; color: #94a3b8; line-height: 1.5; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 28px 36px; }
  }
  @page { margin: 1cm; }
  @page { @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 10px; color: #94a3b8; } }
</style>
</head>
<body>
<div class="page">

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
        <div class="logo-sub">${esc(config.homeName)}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-type">Safeguarding Report</div>
      <div class="doc-meta">
        CONFIDENTIAL<br/>
        Generated: ${generatedAt}
      </div>
    </div>
  </div>

  <div class="title-block">
    <div class="report-title">${esc(config.reportTypeName)}</div>
    <div class="meta-row">
      <span class="meta-item"><strong>Date Range:</strong> ${esc(dateRangeStr)}</span>
      <span class="meta-item"><strong>Children:</strong> ${esc(config.selectedChild === "all" ? "All children" : config.selectedChild)}</span>
      <span class="meta-item"><strong>Home:</strong> ${esc(config.homeName)}</span>
      <span class="meta-item"><strong>Generated by:</strong> ${esc(config.staffName)}</span>
    </div>
  </div>

  ${content}

  <div class="footer">
    <p style="max-width:65%;">This document contains sensitive safeguarding information. Handle in accordance with your data protection policy. Not for public disclosure.</p>
    <p>ScreenAlert · ${esc(config.homeName)}<br/>${generatedAt}</p>
  </div>

</div>
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  return html;
}
