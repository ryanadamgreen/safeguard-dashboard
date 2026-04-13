import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — ScreenAlert",
  description: "How ScreenAlert uses cookies and similar technologies.",
};

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 40, paddingBottom: last ? 0 : 40, borderBottom: last ? "none" : "1px solid #E8E9F5" }}>
      <h2 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 14, color: "#14141E" }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  );
}

function CookieRow({ name, purpose, type, duration }: { name: string; purpose: string; type: string; duration: string }) {
  return (
    <tr style={{ borderBottom: "1px solid #E8E9F5" }}>
      <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "monospace", color: "#3D3F8A" }}>{name}</td>
      <td style={{ padding: "10px 12px", fontSize: 13 }}>{purpose}</td>
      <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B6B7A" }}>{type}</td>
      <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B6B7A" }}>{duration}</td>
    </tr>
  );
}

function PageFooter() {
  return (
    <footer style={{ background: "#14141E", padding: "40px 0" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg viewBox="0 0 56 56" width="24" height="24">
            <path d="M28,8 L46,14 L46,32 Q46,46 28,50 Q10,46 10,32 L10,14 Z" fill="white" opacity="0.9"/>
            <circle cx="38" cy="17" r="6" fill="#1DB894"/>
            <circle cx="38" cy="17" r="3" fill="#14141E"/>
          </svg>
          <span style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 15, fontWeight: 300, color: "rgba(255,255,255,0.7)" }}>
            Screen<strong style={{ fontWeight: 700, color: "#fff" }}>Alert</strong>
          </span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {[{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Cookies", href: "/cookies" }].map((l) => (
            <Link key={l.label} href={l.href} style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textDecoration: "none" }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function CookiesPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: "#14141E", background: "#fff", minHeight: "100vh" }}>
      <nav style={{ background: "rgba(37,39,96,0.97)", borderBottom: "1px solid rgba(154,157,212,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <svg viewBox="0 0 56 56" width="30" height="30">
              <path d="M28,8 L46,14 L46,32 Q46,46 28,50 Q10,46 10,32 L10,14 Z" fill="white" opacity="0.9"/>
              <circle cx="38" cy="17" r="6" fill="#1DB894"/>
              <circle cx="38" cy="17" r="3" fill="#252760"/>
            </svg>
            <span style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 18, fontWeight: 300, color: "rgba(255,255,255,0.82)", letterSpacing: "-0.02em" }}>
              Screen<strong style={{ fontWeight: 700, color: "#fff" }}>Alert</strong>
            </span>
          </Link>
          <Link href="/" style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>← Back to home</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "72px 32px 100px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#1DB894", marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 40, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 16 }}>Cookie Policy</h1>
          <p style={{ fontSize: 14, color: "#6B6B7A" }}>Last updated: 13 April 2026</p>
        </div>

        <div style={{ lineHeight: 1.75, fontSize: 15, color: "#3a3a4a" }}>
          <Section title="1. What are cookies?">
            <p>Cookies are small text files placed on your device when you visit a website or use a web application. They allow the site to remember information about your visit, such as your login session, to make your next visit easier and the service more useful.</p>
          </Section>

          <Section title="2. How ScreenAlert uses cookies">
            <p>ScreenAlert uses a minimal set of cookies, all of which are strictly necessary for the platform to function. We do not use advertising cookies, tracking cookies, or third-party analytics cookies.</p>
            <p>The cookies we use fall into two categories:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 8 }}>
              <li><strong>Essential cookies:</strong> required for authentication and maintaining your session. Without these, you cannot log in to the platform.</li>
              <li><strong>Functional cookies:</strong> used to remember your preferences within the platform, such as your selected care home when managing multiple homes.</li>
            </ul>
          </Section>

          <Section title="3. Cookies we set">
            <p>The following cookies are set by ScreenAlert when you use the platform:</p>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#E8E9F5" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#3D3F8A" }}>Name</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#3D3F8A" }}>Purpose</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#3D3F8A" }}>Type</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#3D3F8A" }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <CookieRow name="sb-access-token" purpose="Supabase authentication — keeps you logged in to the dashboard" type="Essential" duration="1 hour" />
                  <CookieRow name="sb-refresh-token" purpose="Supabase authentication — renews your session without re-login" type="Essential" duration="60 days" />
                  <CookieRow name="safeguard_selected_home_id" purpose="Remembers your selected care home when you manage multiple homes" type="Functional" duration="Session" />
                  <CookieRow name="safeguard_alerts_last_visit" purpose="Tracks when you last viewed alerts so the sidebar badge shows new alerts only" type="Functional" duration="Persistent" />
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="4. Third-party cookies">
            <p>We do not use any third-party advertising, marketing, or analytics cookies. Our infrastructure providers (Supabase and Vercel) may set technical cookies as part of delivering the service, but these do not track you across other websites.</p>
          </Section>

          <Section title="5. Managing cookies">
            <p>Because all cookies used by ScreenAlert are strictly necessary for the platform to work, they cannot be disabled without preventing you from logging in or using the service.</p>
            <p>You can manage or delete cookies through your browser settings. Note that clearing cookies will log you out of the platform. Guidance on managing cookies in common browsers:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 6 }}>
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" style={{ color: "#3D3F8A" }}>Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" style={{ color: "#3D3F8A" }}>Mozilla Firefox</a></li>
              <li><a href="https://support.microsoft.com/en-gb/microsoft-edge/delete-cookies-in-microsoft-edge" target="_blank" rel="noopener noreferrer" style={{ color: "#3D3F8A" }}>Microsoft Edge</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" style={{ color: "#3D3F8A" }}>Safari</a></li>
            </ul>
          </Section>

          <Section title="6. Changes to this policy" last>
            <p>We may update this Cookie Policy from time to time. We will notify you of material changes via the platform or by email. If you have questions, contact us at <a href="mailto:hello@screenalert.co.uk" style={{ color: "#3D3F8A" }}>hello@screenalert.co.uk</a>.</p>
          </Section>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}
