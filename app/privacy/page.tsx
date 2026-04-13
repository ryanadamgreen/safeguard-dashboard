import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ScreenAlert",
  description: "How ScreenAlert collects, uses, and protects your personal data.",
};

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ marginBottom: last ? 0 : 40, paddingBottom: last ? 0 : 40, borderBottom: last ? "none" : "1px solid #E8E9F5" }}>
      <h2 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 14, color: "#14141E" }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
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

export default function PrivacyPage() {
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
          <h1 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 40, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 16 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: "#6B6B7A" }}>Last updated: 13 April 2026</p>
        </div>

        <div style={{ lineHeight: 1.75, fontSize: 15, color: "#3a3a4a" }}>
          <Section title="1. Who we are">
            <p>ScreenAlert is a child safeguarding platform. We provide residential care homes with real-time device monitoring, content analysis, and safeguarding reporting tools.</p>
            <p>Questions about this policy? Contact us at <a href="mailto:hello@screenalert.co.uk" style={{ color: "#3D3F8A" }}>hello@screenalert.co.uk</a> or <a href="tel:07542609859" style={{ color: "#3D3F8A" }}>07542 609 859</a>.</p>
          </Section>

          <Section title="2. What data we collect">
            <p>We collect and process the following categories of personal data:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 8 }}>
              <li><strong>Staff account data:</strong> name, email address, job title, and role within your organisation.</li>
              <li><strong>Device and usage data:</strong> device identifiers, online/offline status, battery levels, app usage events, and screen activity captured through the monitoring agent app.</li>
              <li><strong>Safeguarding alert data:</strong> alert type, severity, timestamp, and content that triggered the alert, which may include screenshots of device screens.</li>
              <li><strong>Child data:</strong> initials and age only. We do not collect full names, addresses, or other identifying information about children in care.</li>
              <li><strong>Communication data:</strong> any correspondence you send to us via email or our contact form.</li>
            </ul>
          </Section>

          <Section title="3. How we use your data">
            <p>We use personal data to provide and maintain the ScreenAlert platform, generate safeguarding alerts and reports, authenticate users, send service notifications, and meet legal obligations including safeguarding and data protection requirements.</p>
          </Section>

          <Section title="4. Legal basis for processing">
            <p>We process data under the following lawful bases: <strong>contract</strong> (to deliver the subscribed service); <strong>legal obligation</strong> (to comply with safeguarding legislation); and <strong>legitimate interests</strong> (platform security and fraud prevention, balanced against your rights).</p>
          </Section>

          <Section title="5. Data sharing">
            <p>We do not sell your personal data. We share data only with our infrastructure providers — Supabase (database and authentication) and Vercel (hosting) — both subject to data processing agreements. We also disclose data to regulatory authorities where legally required in connection with a safeguarding concern.</p>
          </Section>

          <Section title="6. Data retention">
            <p>We retain data for as long as your organisation holds an active subscription, plus up to 7 years to meet safeguarding record-keeping requirements. When a subscription ends, personal data is deleted or anonymised within 90 days, except where retention is legally required.</p>
          </Section>

          <Section title="7. Security">
            <p>We use 256-bit TLS encryption in transit, encrypted storage at rest, role-based access controls, and regular security reviews. No system is entirely secure and we cannot guarantee absolute security.</p>
          </Section>

          <Section title="8. Your rights">
            <p>Under UK GDPR you have the right to access, correct, erase, or restrict processing of your personal data, to data portability, and to withdraw consent at any time. To exercise any of these rights, email <a href="mailto:hello@screenalert.co.uk" style={{ color: "#3D3F8A" }}>hello@screenalert.co.uk</a>. We will respond within 30 days.</p>
          </Section>

          <Section title="9. Complaints">
            <p>You may lodge a complaint with the Information Commissioner&apos;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: "#3D3F8A" }}>ico.org.uk</a> or 0303 123 1113.</p>
          </Section>

          <Section title="10. Changes to this policy" last>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or via the platform. Continued use of ScreenAlert after changes take effect constitutes acceptance of the updated policy.</p>
          </Section>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}
