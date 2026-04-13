import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — ScreenAlert",
  description: "Terms and conditions governing use of the ScreenAlert platform.",
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

export default function TermsPage() {
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
          <h1 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: 40, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 16 }}>Terms of Use</h1>
          <p style={{ fontSize: 14, color: "#6B6B7A" }}>Last updated: 13 April 2026</p>
        </div>

        <div style={{ lineHeight: 1.75, fontSize: 15, color: "#3a3a4a" }}>
          <Section title="1. Acceptance of terms">
            <p>By accessing or using the ScreenAlert platform (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Use. If you do not agree, you must not use the Service. These terms apply to all staff, administrators, and other users of the platform.</p>
          </Section>

          <Section title="2. The Service">
            <p>ScreenAlert provides a child safeguarding platform for residential care homes. The Service includes a web-based dashboard, an Android monitoring agent application, real-time alerting, and safeguarding report generation tools.</p>
            <p>The Service is made available to your organisation under a subscription agreement. Your right to access the Service is conditional on your organisation maintaining an active subscription.</p>
          </Section>

          <Section title="3. Permitted use">
            <p>You may use the Service only for lawful purposes connected to the safeguarding of children in your care. You must not:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column" as const, gap: 8 }}>
              <li>Use the Service for any purpose other than child safeguarding within your organisation.</li>
              <li>Share your login credentials with any person who is not an authorised member of your organisation.</li>
              <li>Attempt to access data belonging to another care home or organisation.</li>
              <li>Interfere with, disrupt, or reverse-engineer any part of the platform.</li>
              <li>Use the Service in any way that violates applicable law or regulation, including data protection law.</li>
            </ul>
          </Section>

          <Section title="4. Safeguarding responsibilities">
            <p>ScreenAlert is a tool to assist safeguarding professionals. It does not replace the professional judgment, statutory duties, or safeguarding responsibilities of your organisation, its staff, or its designated safeguarding leads.</p>
            <p>Your organisation remains responsible for responding appropriately to alerts, maintaining safeguarding records, and fulfilling all statutory obligations under applicable children&apos;s care legislation and Ofsted requirements.</p>
          </Section>

          <Section title="5. Data and confidentiality">
            <p>All data generated through the Service — including safeguarding alerts, screenshots, and reports — is confidential and must be handled in accordance with your organisation&apos;s safeguarding and data protection policies.</p>
            <p>You must not share safeguarding data with unauthorised third parties. Where disclosure is required by law (e.g. to police or local authority children&apos;s services), your organisation should follow its own disclosure procedures.</p>
          </Section>

          <Section title="6. Accounts and security">
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at <a href="mailto:hello@screenalert.co.uk" style={{ color: "#3D3F8A" }}>hello@screenalert.co.uk</a> if you suspect any unauthorised use of your account.</p>
          </Section>

          <Section title="7. Availability and modifications">
            <p>We aim to maintain the Service at a high level of availability but do not guarantee uninterrupted access. We may modify, suspend, or discontinue any aspect of the Service with reasonable notice. We will not be liable for any disruption resulting from scheduled or emergency maintenance.</p>
          </Section>

          <Section title="8. Intellectual property">
            <p>All intellectual property rights in the ScreenAlert platform, including software, design, content, and branding, are owned by ScreenAlert Ltd or our licensors. Nothing in these Terms grants you any rights in our intellectual property other than the limited right to use the Service as described.</p>
          </Section>

          <Section title="9. Limitation of liability">
            <p>To the maximum extent permitted by law, ScreenAlert Ltd is not liable for any indirect, consequential, or incidental loss arising from your use of the Service. Our total liability shall not exceed the subscription fees paid by your organisation in the 3 months preceding the claim.</p>
            <p>Nothing in these Terms excludes or limits liability for death or personal injury caused by our negligence, fraud, or any other liability that cannot be excluded by law.</p>
          </Section>

          <Section title="10. Governing law">
            <p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </Section>

          <Section title="11. Changes to these terms" last>
            <p>We may update these Terms from time to time. We will notify you of material changes by email or via the platform. Continued use of the Service after updated Terms take effect constitutes your acceptance. If you have questions, contact <a href="mailto:hello@screenalert.co.uk" style={{ color: "#3D3F8A" }}>hello@screenalert.co.uk</a>.</p>
          </Section>
        </div>
      </div>

      <PageFooter />
    </div>
  );
}
