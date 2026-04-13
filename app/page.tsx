"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const Shield = ({ w = 32, h = 32, bodyFill = "white", bodyOpacity = 0.9, tealFill = "#1DB894", innerFill = "#252760" }: {
  w?: number; h?: number; bodyFill?: string; bodyOpacity?: number; tealFill?: string; innerFill?: string;
}) => (
  <svg viewBox="0 0 56 56" width={w} height={h}>
    <path d="M28,8 L46,14 L46,32 Q46,46 28,50 Q10,46 10,32 L10,14 Z" fill={bodyFill} opacity={bodyOpacity} />
    <circle cx="38" cy="17" r="6" fill={tealFill} />
    <circle cx="38" cy="17" r="3" fill={innerFill} />
  </svg>
);

export default function HomePage() {
  const fnameRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Scroll-triggered fade-up animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("sa-visible");
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".sa-fade").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function handleSubmit() {
    const btn = submitRef.current;
    const name = fnameRef.current?.value?.trim();
    if (!btn) return;
    if (name) {
      btn.textContent = "✓ Message sent — we'll be in touch soon";
      btn.style.background = "#1DB894";
      btn.disabled = true;
    } else {
      btn.textContent = "Please fill in your name first";
      btn.style.background = "#ef4444";
      setTimeout(() => {
        if (btn) { btn.textContent = "Send message"; btn.style.background = ""; btn.disabled = false; }
      }, 2000);
    }
  }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --slate:#3D3F8A;--slate-dark:#252760;--slate-light:#9A9DD4;--slate-xlight:#E8E9F5;
          --teal:#1DB894;--teal-light:#A8EBD9;--near-black:#14141E;--mid-gray:#6B6B7A;
          --border:#E2E2EA;--white:#FFFFFF;
          --font-head:'Syne',system-ui,sans-serif;--font-body:'DM Sans',system-ui,sans-serif;
        }
        html{scroll-behavior:smooth}
        .sa-page{font-family:var(--font-body);color:var(--near-black);background:var(--white);line-height:1.6;-webkit-font-smoothing:antialiased}
        .sa-page a{text-decoration:none}
        .sa-container{max-width:1160px;margin:0 auto;padding:0 32px}
        /* NAV */
        .sa-nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(37,39,96,0.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid rgba(154,157,212,0.15)}
        .sa-nav-inner{display:flex;align-items:center;justify-content:space-between;height:64px}
        .sa-nav-logo{display:flex;align-items:center;gap:10px}
        .sa-wordmark{font-family:var(--font-head);font-size:20px;font-weight:300;color:rgba(255,255,255,0.82);letter-spacing:-0.02em;line-height:1}
        .sa-wordmark strong{font-weight:700;color:#fff}
        .sa-nav-links{display:flex;align-items:center;gap:2px;list-style:none}
        .sa-nav-links a{font-size:14px;font-weight:500;color:rgba(255,255,255,0.65);padding:8px 14px;border-radius:8px;transition:color .2s,background .2s}
        .sa-nav-links a:hover{color:#fff;background:rgba(255,255,255,0.08)}
        .sa-btn-login{display:inline-flex;align-items:center;gap:7px;background:var(--teal);color:#fff !important;font-size:14px !important;font-weight:600 !important;padding:9px 20px !important;border-radius:8px !important;transition:background .2s,transform .15s !important;letter-spacing:-0.01em}
        .sa-btn-login:hover{background:#17a381 !important;transform:translateY(-1px)}
        /* HERO */
        .sa-hero{background:linear-gradient(160deg,var(--slate-dark) 0%,#1e2056 50%,#2a1d5e 100%);min-height:100vh;display:flex;flex-direction:column;justify-content:center;position:relative;overflow:hidden;padding-top:64px}
        .sa-hero-bg{position:absolute;right:-60px;top:50%;transform:translateY(-50%);opacity:0.04;pointer-events:none}
        .sa-hero-inner{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;padding:80px 0 100px}
        .sa-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(29,184,148,0.12);border:1px solid rgba(29,184,148,0.3);color:var(--teal-light);font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:28px}
        .sa-badge-dot{width:6px;height:6px;background:var(--teal);border-radius:50%;animation:sa-pulse 2s ease-in-out infinite}
        @keyframes sa-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.8)}}
        .sa-h1{font-family:var(--font-head);font-size:clamp(40px,5vw,64px);font-weight:700;color:#fff;letter-spacing:-0.04em;line-height:1.05;margin-bottom:24px}
        .sa-h1 .accent{color:var(--teal)}
        .sa-hero-sub{font-size:17px;color:rgba(255,255,255,0.6);line-height:1.7;max-width:480px;margin-bottom:40px;font-weight:300}
        .sa-actions{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
        .sa-btn-primary{display:inline-flex;align-items:center;gap:8px;background:var(--teal);color:#fff;font-family:var(--font-body);font-size:15px;font-weight:600;padding:13px 28px;border-radius:10px;transition:background .2s,transform .15s;letter-spacing:-0.01em}
        .sa-btn-primary:hover{background:#17a381;transform:translateY(-1px)}
        .sa-btn-secondary{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.15);font-family:var(--font-body);font-size:15px;font-weight:500;padding:13px 28px;border-radius:10px;transition:background .2s,color .2s}
        .sa-btn-secondary:hover{background:rgba(255,255,255,0.13);color:#fff}
        .sa-trust{display:flex;align-items:center;gap:20px;margin-top:44px;padding-top:28px;border-top:1px solid rgba(255,255,255,0.1);flex-wrap:wrap}
        .sa-trust-item{display:flex;align-items:center;gap:7px;font-size:13px;color:rgba(255,255,255,0.45);font-weight:400}
        .sa-trust-item svg{color:var(--teal);flex-shrink:0}
        /* BROWSER MOCKUP */
        .sa-browser{border-radius:14px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06)}
        .sa-browser-bar{background:#141428;padding:12px 16px;display:flex;align-items:center;gap:12px}
        .sa-dots{display:flex;gap:6px}
        .sa-dot{width:10px;height:10px;border-radius:50%}
        .sa-url{flex:1;background:#1e1f3a;border-radius:6px;padding:5px 12px;font-size:11px;color:rgba(255,255,255,.35);font-family:var(--font-body);display:flex;align-items:center;gap:6px}
        .sa-mini-dash{display:flex;height:340px;overflow:hidden;background:#1a1c3a}
        .sa-mini-sidebar{width:52px;background:#0f1020;display:flex;flex-direction:column;align-items:center;padding:14px 0;gap:10px}
        .sa-mini-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center}
        .sa-mini-main{flex:1;background:#f0f0f5;display:flex;flex-direction:column;overflow:hidden}
        .sa-mini-topbar{background:#fff;border-bottom:1px solid #e2e2ea;padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
        .sa-mini-content{flex:1;padding:10px;overflow:hidden;display:flex;flex-direction:column;gap:7px}
        .sa-mini-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
        .sa-mini-stat{background:#fff;border-radius:8px;border:1px solid #e2e2ea;padding:8px;display:flex;align-items:center;gap:6px}
        .sa-mini-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:6px;flex:1;min-height:0}
        .sa-mini-panel{background:#fff;border-radius:8px;border:1px solid #e2e2ea;overflow:hidden}
        .sa-mini-ph{padding:7px 10px;border-bottom:1px solid #f0f0f5;display:flex;justify-content:space-between;align-items:center}
        .sa-mini-row{display:flex;align-items:center;gap:6px;padding:5px 10px;border-bottom:1px solid #f8f8fb}
        .sa-mini-av{width:18px;height:18px;border-radius:50%;background:#e8e9f5;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:var(--slate);font-family:var(--font-body);flex-shrink:0}
        .sa-mbadge{font-size:7px;font-weight:600;padding:2px 5px;border-radius:4px;font-family:var(--font-body);flex-shrink:0}
        .sa-bc{background:#fee2e2;color:#b91c1c}.sa-bh{background:#ffedd5;color:#c2410c}.sa-bm{background:#fef3c7;color:#92400e}.sa-bl{background:#ecfdf5;color:#065f46}
        .sa-ddot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        /* SECTIONS */
        .sa-section{padding:100px 0}
        .sa-label{font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:var(--teal);margin-bottom:12px;display:block}
        .sa-h2{font-family:var(--font-head);font-size:clamp(30px,4vw,46px);font-weight:700;color:var(--near-black);letter-spacing:-0.035em;line-height:1.1;margin-bottom:16px}
        .sa-sub{font-size:16px;color:var(--mid-gray);line-height:1.7;max-width:560px;font-weight:300}
        /* FEATURES */
        .sa-features-header{text-align:center;margin-bottom:72px}
        .sa-features-header .sa-sub{margin:0 auto}
        .sa-features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden}
        .sa-feature-card{background:#fff;padding:40px 36px;transition:background .2s}
        .sa-feature-card:hover{background:#fafafa}
        .sa-feature-icon{width:48px;height:48px;border-radius:12px;background:var(--slate-xlight);display:flex;align-items:center;justify-content:center;margin-bottom:20px;color:var(--slate);transition:background .2s,color .2s}
        .sa-feature-card:hover .sa-feature-icon{background:linear-gradient(135deg,var(--slate),var(--teal));color:#fff}
        .sa-feature-title{font-family:var(--font-head);font-size:17px;font-weight:700;color:var(--near-black);margin-bottom:10px;letter-spacing:-0.02em}
        .sa-feature-desc{font-size:14px;color:var(--mid-gray);line-height:1.7;font-weight:300}
        /* HOW IT WORKS */
        .sa-how-bg{background:var(--slate-xlight)}
        .sa-how-layout{display:grid;grid-template-columns:1fr 1fr;gap:100px;align-items:center}
        .sa-steps{display:flex;flex-direction:column;gap:0}
        .sa-step{display:flex;gap:20px;padding-bottom:36px;position:relative}
        .sa-step:not(:last-child)::after{content:'';position:absolute;left:19px;top:44px;bottom:0;width:2px;background:var(--border)}
        .sa-step-num{width:40px;height:40px;border-radius:50%;background:#fff;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:var(--font-head);font-size:14px;font-weight:800;color:var(--slate);flex-shrink:0;z-index:1;transition:background .2s,border-color .2s,color .2s}
        .sa-step.sa-active .sa-step-num{background:var(--slate);border-color:var(--slate);color:#fff}
        .sa-step-body{padding-top:6px}
        .sa-step-title{font-family:var(--font-head);font-size:16px;font-weight:700;color:var(--near-black);margin-bottom:6px;letter-spacing:-0.02em}
        .sa-step-desc{font-size:14px;color:var(--mid-gray);line-height:1.65;font-weight:300}
        /* MONITORING MOCKUP */
        .sa-mon-mockup{background:#fff;border-radius:16px;border:1px solid var(--border);overflow:hidden;box-shadow:0 20px 60px rgba(61,63,138,.1)}
        .sa-mon-header{background:var(--slate-dark);padding:14px 20px;display:flex;align-items:center;justify-content:space-between}
        .sa-mon-title{font-size:13px;font-weight:600;color:#fff;font-family:var(--font-body)}
        .sa-mon-sub{font-size:10px;color:var(--slate-light);font-family:var(--font-body)}
        .sa-online-pill{font-size:10px;font-weight:600;padding:3px 10px;border-radius:100px;background:rgba(29,184,148,.15);color:var(--teal);font-family:var(--font-body)}
        .sa-mon-section{padding:16px 20px;border-bottom:1px solid var(--border)}
        .sa-mon-slabel{font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--mid-gray);margin-bottom:12px;font-family:var(--font-body)}
        .sa-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0}
        .sa-toggle-label{font-size:13px;font-weight:500;color:var(--near-black);font-family:var(--font-body)}
        .sa-tg{display:flex;background:#f0f0f5;border-radius:8px;padding:2px;gap:2px}
        .sa-tb{font-size:10px;font-weight:600;padding:4px 9px;border-radius:6px;font-family:var(--font-body);border:none;cursor:pointer;background:transparent;color:var(--mid-gray)}
        .sa-tb.sa-off.sa-act{background:#fff;color:var(--near-black);box-shadow:0 1px 3px rgba(0,0,0,.1)}
        .sa-tb.sa-mon.sa-act{background:#1DB894;color:#fff}
        .sa-tb.sa-blk.sa-act{background:#ef4444;color:#fff}
        .sa-alert-card{background:#fff5f5;border:1px solid #fecdd3;border-radius:10px;padding:12px 14px;margin:12px 20px}
        .sa-alert-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
        .sa-alert-type{font-size:11px;font-weight:700;color:#b91c1c;font-family:var(--font-body)}
        .sa-alert-time{font-size:10px;color:#f87171;margin-left:auto;font-family:var(--font-body)}
        .sa-alert-desc{font-size:11px;color:#7f1d1d;line-height:1.5;font-family:var(--font-body)}
        .sa-kw{background:#fef08a;color:#713f12;padding:0 3px;border-radius:3px;font-weight:600}
        .sa-toggle-ios{width:36px;height:20px;border-radius:10px;position:relative;cursor:pointer;display:inline-block}
        .sa-toggle-thumb{width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:2px;transition:left .2s}
        /* DASHBOARD SECTION */
        .sa-dash-bg{background:var(--slate-dark)}
        .sa-dash-header{text-align:center;margin-bottom:64px}
        .sa-full-browser{border-radius:16px;overflow:hidden;box-shadow:0 50px 100px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06)}
        .sa-full-bar{background:#1a1a2e;padding:12px 20px;display:flex;align-items:center;gap:14px}
        .sa-full-url{flex:1;background:rgba(255,255,255,.06);border-radius:7px;padding:6px 14px;font-size:12px;color:rgba(255,255,255,.35);font-family:var(--font-body);display:flex;align-items:center;gap:6px}
        .sa-full-dash{display:flex;height:520px;background:#f0f0f5}
        .sa-full-sidebar{width:220px;background:#0f1122;display:flex;flex-direction:column;flex-shrink:0}
        .sa-full-logo-area{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px}
        .sa-sidebar-icon-wrap{width:32px;height:32px;background:var(--slate);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .sa-full-nav{padding:16px 12px;flex:1}
        .sa-nav-group-label{font-size:9px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.25);padding:0 10px;margin-bottom:8px;font-family:var(--font-body)}
        .sa-nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;margin-bottom:2px}
        .sa-nav-item-label{font-size:12px;font-weight:500;font-family:var(--font-body)}
        .sa-nav-badge{width:16px;height:16px;background:#ef4444;color:#fff;border-radius:50%;font-size:8px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-left:auto;font-family:var(--font-body)}
        .sa-user-row{padding:12px 16px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:8px}
        .sa-user-av{width:28px;height:28px;border-radius:50%;background:rgba(61,63,138,.5);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--slate-light);font-family:var(--font-body);flex-shrink:0}
        .sa-full-main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .sa-full-topbar{background:#fff;border-bottom:1px solid var(--border);padding:12px 22px;display:flex;align-items:center;justify-content:space-between}
        .sa-full-content{flex:1;padding:18px;overflow:hidden;display:flex;flex-direction:column;gap:14px}
        .sa-stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .sa-stat-card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px}
        .sa-stat-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .sa-main-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:12px;flex:1;min-height:0}
        .sa-panel{background:#fff;border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}
        .sa-panel-header{padding:12px 16px;border-bottom:1px solid #f0f0f5;display:flex;align-items:center;justify-content:space-between}
        .sa-alert-item{display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid #f8f8fb}
        .sa-alert-av{width:28px;height:28px;border-radius:50%;background:#e8e9f5;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--slate);font-family:var(--font-body);flex-shrink:0}
        .sa-sbadge{font-size:9px;font-weight:600;padding:2px 6px;border-radius:4px;font-family:var(--font-body);display:block}
        .sa-device-counts{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #f0f0f5}
        .sa-device-count-cell{text-align:center;padding:8px 4px}
        .sa-device-row{display:flex;align-items:center;gap:8px;padding:7px 16px;border-bottom:1px solid #f8f8fb}
        .sa-ddot2{width:7px;height:7px;border-radius:50%;flex-shrink:0}
        /* PRICING */
        .sa-pricing-header{text-align:center;margin-bottom:64px}
        .sa-pricing-header .sa-sub{margin:0 auto}
        .sa-pricing-layout{display:grid;grid-template-columns:1fr 2fr;gap:48px;align-items:start}
        .sa-price-card{padding:40px 36px;background:var(--slate-dark);border-radius:20px;position:sticky;top:100px}
        .sa-price{font-family:var(--font-head);font-size:52px;font-weight:800;color:#fff;letter-spacing:-0.04em;line-height:1;margin-bottom:6px}
        .sa-price-period{font-size:16px;color:var(--slate-light);font-weight:400}
        .sa-price-sub{font-size:13px;color:rgba(255,255,255,.35);margin-bottom:24px;margin-top:8px;font-weight:300}
        .sa-price-cta{display:block;text-align:center;background:var(--teal);color:#fff;font-family:var(--font-body);font-size:15px;font-weight:600;padding:14px;border-radius:10px;transition:background .2s;margin-bottom:20px}
        .sa-price-cta:hover{background:#17a381}
        .sa-price-note{font-size:12px;color:rgba(255,255,255,.35);text-align:center;line-height:1.5}
        .sa-feature-group{border-bottom:1px solid var(--border);padding:28px 0}
        .sa-feature-group:first-child{padding-top:0}
        .sa-feature-group:last-child{border-bottom:none;padding-bottom:0}
        .sa-fg-title{font-family:var(--font-head);font-size:14px;font-weight:700;color:var(--near-black);margin-bottom:16px;letter-spacing:-0.01em}
        .sa-flist{display:grid;grid-template-columns:1fr 1fr;gap:10px;list-style:none}
        .sa-fitem{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--mid-gray);line-height:1.5;font-weight:300}
        .sa-tick{width:18px;height:18px;border-radius:50%;background:var(--slate-xlight);color:var(--slate);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        /* CONTACT */
        .sa-contact-bg{background:var(--slate-xlight)}
        .sa-contact-layout{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start}
        .sa-contact-item{display:flex;align-items:flex-start;gap:14px;padding:20px 0;border-bottom:1px solid var(--border)}
        .sa-contact-icon{width:40px;height:40px;border-radius:10px;background:#fff;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--slate);flex-shrink:0}
        .sa-contact-lbl{font-size:12px;font-weight:600;color:var(--mid-gray);letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}
        .sa-contact-val{font-size:15px;color:var(--near-black);font-weight:400}
        .sa-form-wrap{background:#fff;border-radius:16px;border:1px solid var(--border);padding:40px 36px}
        .sa-form-title{font-family:var(--font-head);font-size:22px;font-weight:700;color:var(--near-black);letter-spacing:-0.025em;margin-bottom:6px}
        .sa-form-sub{font-size:14px;color:var(--mid-gray);margin-bottom:28px;font-weight:300}
        .sa-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .sa-form-group{margin-bottom:16px}
        .sa-form-label{display:block;font-size:12px;font-weight:600;color:var(--near-black);margin-bottom:6px;letter-spacing:.03em}
        .sa-input,.sa-select,.sa-textarea{width:100%;padding:10px 14px;font-size:14px;color:var(--near-black);background:#fff;border:1.5px solid var(--border);border-radius:8px;font-family:var(--font-body);transition:border-color .2s;outline:none;font-weight:400;-webkit-appearance:none;appearance:none}
        .sa-select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B6B7A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;background-size:16px;padding-right:36px;cursor:pointer}
        .sa-textarea{resize:vertical;min-height:90px}
        .sa-input:focus,.sa-select:focus,.sa-textarea:focus{border-color:var(--slate);box-shadow:0 0 0 3px rgba(61,63,138,.08)}
        .sa-submit{width:100%;padding:13px;background:var(--slate);color:#fff;border:none;border-radius:10px;font-family:var(--font-body);font-size:15px;font-weight:600;cursor:pointer;transition:background .2s;letter-spacing:-0.01em}
        .sa-submit:hover{background:var(--slate-dark)}
        /* FOOTER */
        .sa-footer{background:var(--near-black);padding:60px 0 40px}
        .sa-footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:60px;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:32px}
        .sa-footer-desc{font-size:13px;color:rgba(255,255,255,.35);line-height:1.7;margin-top:16px;max-width:260px;font-weight:300}
        .sa-footer-col-title{font-family:var(--font-head);font-size:13px;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:16px;letter-spacing:-0.01em}
        .sa-footer-links{list-style:none;display:flex;flex-direction:column;gap:10px}
        .sa-footer-links a{font-size:13px;color:rgba(255,255,255,.35);transition:color .2s;font-weight:300}
        .sa-footer-links a:hover{color:rgba(255,255,255,.7)}
        .sa-footer-bottom{display:flex;align-items:center;justify-content:space-between}
        .sa-footer-copy{font-size:12px;color:rgba(255,255,255,.2);font-weight:300}
        .sa-footer-legal{display:flex;gap:24px}
        .sa-footer-legal a{font-size:12px;color:rgba(255,255,255,.2);transition:color .2s;font-weight:300}
        .sa-footer-legal a:hover{color:rgba(255,255,255,.5)}
        /* ANIMATIONS */
        .sa-fade{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease}
        .sa-fade.sa-visible{opacity:1;transform:translateY(0)}
        /* RESPONSIVE */
        @media(max-width:900px){.sa-hero-inner,.sa-how-layout,.sa-contact-layout,.sa-pricing-layout{grid-template-columns:1fr;gap:48px}.sa-hero-mockup{display:none}.sa-features-grid{grid-template-columns:1fr 1fr}.sa-footer-top{grid-template-columns:1fr 1fr;gap:32px}.sa-price-card{position:static}}
        @media(max-width:640px){.sa-container{padding:0 20px}.sa-features-grid{grid-template-columns:1fr}.sa-nav-links{display:none}.sa-section{padding:64px 0}.sa-form-row{grid-template-columns:1fr}.sa-flist{grid-template-columns:1fr}}
      `}</style>

      <div className="sa-page">
        {/* NAV */}
        <nav className="sa-nav">
          <div className="sa-container sa-nav-inner">
            <a href="#home" className="sa-nav-logo">
              <Shield w={32} h={32} bodyFill="white" innerFill="#252760" />
              <span className="sa-wordmark">Screen<strong>Alert</strong></span>
            </a>
            <ul className="sa-nav-links">
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How it Works</a></li>
              <li><a href="#dashboard">Dashboard</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
            <Link href="/login" className="sa-btn-login">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Log in
            </Link>
          </div>
        </nav>

        {/* HERO */}
        <section className="sa-hero" id="home">
          <div className="sa-hero-bg">
            <svg viewBox="0 0 56 56" width="600" height="600">
              <path d="M28,8 L46,14 L46,32 Q46,46 28,50 Q10,46 10,32 L10,14 Z" fill="white" />
            </svg>
          </div>
          <div className="sa-container">
            <div className="sa-hero-inner">
              <div>
                <div className="sa-badge">
                  <span className="sa-badge-dot" />
                  Child Safeguarding Platform
                </div>
                <h1 className="sa-h1">
                  Monitor first.<br />
                  <span className="accent">Act second.</span><br />
                  Protect always.
                </h1>
                <p className="sa-hero-sub">
                  ScreenAlert gives residential care home staff real-time visibility over children&apos;s device activity — with intelligent alerts, content monitoring, and instant reporting — before any decision is made to intervene.
                </p>
                <div className="sa-actions">
                  <a href="#contact" className="sa-btn-primary">
                    Get Started
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                  <a href="#how-it-works" className="sa-btn-secondary">See how it works</a>
                </div>
                <div className="sa-trust">
                  {[
                    { text: "Built for residential care", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
                    { text: "Real-time alerts", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                    { text: "Safeguarding reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                  ].map((t) => (
                    <div key={t.text} className="sa-trust-item">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                      </svg>
                      {t.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero mockup */}
              <div className="sa-hero-mockup">
                <div className="sa-browser">
                  <div className="sa-browser-bar">
                    <div className="sa-dots">
                      <div className="sa-dot" style={{ background: "#ff5f56" }} />
                      <div className="sa-dot" style={{ background: "#ffbd2e" }} />
                      <div className="sa-dot" style={{ background: "#27c93f" }} />
                    </div>
                    <div className="sa-url">
                      <span style={{ color: "#1DB894" }}>
                        <svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      screenalert.co.uk/dashboard
                    </div>
                  </div>
                  <div className="sa-mini-dash">
                    <div className="sa-mini-sidebar">
                      <div className="sa-mini-icon" style={{ background: "rgba(61,63,138,0.9)" }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <div className="sa-mini-icon" style={{ background: "rgba(255,255,255,0.04)", position: "relative" }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span style={{ position: "absolute", top: 3, right: 3, width: 7, height: 7, background: "#ef4444", borderRadius: "50%" }} />
                      </div>
                      {[
                        "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                        "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                      ].map((d, i) => (
                        <div key={i} className="sa-mini-icon" style={{ background: "rgba(255,255,255,0.04)" }}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
                          </svg>
                        </div>
                      ))}
                    </div>
                    <div className="sa-mini-main">
                      <div className="sa-mini-topbar">
                        <div>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--near-black)" }}>Dashboard</div>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--mid-gray)", marginTop: 1 }}>Monday 13 April 2026 — Ashton House</div>
                        </div>
                        <div style={{ width: 28, height: 28, borderRadius: 7, background: "#f8f8fb", border: "1px solid #e2e2ea", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#6B6B7A" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <span style={{ position: "absolute", top: 5, right: 5, width: 5, height: 5, background: "#ef4444", borderRadius: "50%" }} />
                        </div>
                      </div>
                      <div className="sa-mini-content">
                        <div className="sa-mini-stats">
                          {[
                            { num: "8", lbl: "Children", bg: "#dbeafe", fill: "#2563eb", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                            { num: "6", lbl: "Active", bg: "#d1fae5", fill: "#059669", icon: "M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
                            { num: "3", lbl: "Alerts", bg: "#ffedd5", fill: "#ea580c", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
                          ].map((s) => (
                            <div key={s.lbl} className="sa-mini-stat">
                              <div style={{ width: 22, height: 22, borderRadius: 5, background: s.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="12" height="12" fill={s.fill} viewBox="0 0 24 24"><path d={s.icon} /></svg>
                              </div>
                              <div>
                                <div style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 700, color: "var(--near-black)", lineHeight: 1 }}>{s.num}</div>
                                <div style={{ fontFamily: "var(--font-body)", fontSize: 8, color: "var(--mid-gray)" }}>{s.lbl}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="sa-mini-grid">
                          <div className="sa-mini-panel">
                            <div className="sa-mini-ph">
                              <span style={{ fontFamily: "var(--font-body)", fontSize: 9, fontWeight: 600, color: "var(--near-black)" }}>Recent Alerts</span>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: 8, color: "#3b82f6" }}>View all →</span>
                            </div>
                            {[
                              { av: "JC", name: "J.C. — Device 03", desc: "Keyword Flagged", cls: "sa-bc" },
                              { av: "TM", name: "T.M. — Device 01", desc: "Website Visited", cls: "sa-bh" },
                              { av: "SK", name: "S.K. — Device 05", desc: "App Blocked", cls: "sa-bm" },
                            ].map((r) => (
                              <div key={r.av} className="sa-mini-row">
                                <div className="sa-mini-av">{r.av}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontFamily: "var(--font-body)", fontSize: 8, fontWeight: 600, color: "var(--near-black)" }}>{r.name}</div>
                                  <div style={{ fontFamily: "var(--font-body)", fontSize: 7.5, color: "var(--mid-gray)" }}>{r.desc}</div>
                                </div>
                                <span className={`sa-mbadge ${r.cls}`}>{r.cls === "sa-bc" ? "Critical" : r.cls === "sa-bh" ? "High" : "Medium"}</span>
                              </div>
                            ))}
                          </div>
                          <div className="sa-mini-panel">
                            <div className="sa-mini-ph">
                              <span style={{ fontFamily: "var(--font-body)", fontSize: 9, fontWeight: 600, color: "var(--near-black)" }}>Devices</span>
                            </div>
                            {[
                              { col: "#10b981", name: "Device 01", time: "Just now" },
                              { col: "#10b981", name: "Device 02", time: "2 mins" },
                              { col: "#d1d5db", name: "Device 03", time: "1 hr ago" },
                              { col: "#f97316", name: "Device 04", time: "Paused" },
                            ].map((d) => (
                              <div key={d.name} className="sa-mini-row">
                                <span className="sa-ddot" style={{ background: d.col }} />
                                <span style={{ fontFamily: "var(--font-body)", fontSize: 9, fontWeight: 500, color: "var(--near-black)", flex: 1 }}>{d.name}</span>
                                <span style={{ fontFamily: "var(--font-body)", fontSize: 8, color: "var(--mid-gray)" }}>{d.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="sa-section" id="features">
          <div className="sa-container">
            <div className="sa-features-header sa-fade">
              <span className="sa-label">Platform Features</span>
              <h2 className="sa-h2">Everything your team needs<br />to keep children safe online</h2>
              <p className="sa-sub">ScreenAlert combines device monitoring, content analysis, and safeguarding tools into a single, easy-to-use platform — designed specifically for residential care homes.</p>
            </div>
            <div className="sa-features-grid sa-fade">
              {[
                { title: "Real-Time Alerts", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", desc: "Instant notifications when keywords, websites, or apps trigger a safeguarding concern. Staff see exactly what happened — with screenshots when needed — before deciding how to respond." },
                { title: "Content Monitoring", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", desc: "Three-state controls per content category — Off, Monitor, or Block. Screen activity is analysed in real time using accessibility and screen capture technology, with zero manual polling." },
                { title: "App & Web Blocking", icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z", desc: "Block specific apps and website categories using industry-leading blocklists covering 166k+ adult, 95k+ gambling, and 26k+ drugs-related domains, enforced via on-device VPN." },
                { title: "Device Management", icon: "M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z", desc: "Monitor battery levels, online status, and device health. Pause internet access with a single tap. Re-pair devices quickly and securely with a 6-digit time-limited pairing code." },
                { title: "Safeguarding Reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", desc: "Generate detailed incident reports for any alert in seconds. Every report includes alert type, severity, timeline, device information, and optional screenshot evidence — ready for your records." },
                { title: "Staff & Role Management", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", desc: "Separate staff and admin roles with granular access controls. Multi-home support lets managers oversee multiple properties. Read-only access for oversight without the ability to change settings." },
              ].map((f) => (
                <div key={f.title} className="sa-feature-card">
                  <div className="sa-feature-icon">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="sa-feature-title">{f.title}</h3>
                  <p className="sa-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="sa-section sa-how-bg" id="how-it-works">
          <div className="sa-container">
            <div className="sa-how-layout">
              <div className="sa-fade">
                <span className="sa-label">How it works</span>
                <h2 className="sa-h2">Up and running in minutes</h2>
                <p className="sa-sub" style={{ marginBottom: 48 }}>ScreenAlert installs on Android devices used by children in your care home. Once paired, monitoring begins immediately.</p>
                <div className="sa-steps">
                  {[
                    { n: "1", title: "Install the agent app", desc: "The ScreenAlert agent app is installed on each child's Android device. A simple 4-step setup grants the required screen monitoring permissions.", active: true },
                    { n: "2", title: "Pair with the dashboard", desc: "Each device is paired to a child's profile in the dashboard using a secure 6-digit pairing code. The connection is established over the home's Wi-Fi — no SIM required." },
                    { n: "3", title: "Configure monitoring settings", desc: "Staff set monitoring and blocking rules per content category — adult content, gambling, self-harm, drugs, and more. Each category can be Off, Monitor only, or Block." },
                    { n: "4", title: "Review alerts and act", desc: "When a concern is detected, staff receive an alert with full context — including a screenshot where relevant. They can review the situation before deciding whether to intervene." },
                  ].map((s) => (
                    <div key={s.n} className={`sa-step${s.active ? " sa-active" : ""}`}>
                      <div className="sa-step-num">{s.n}</div>
                      <div className="sa-step-body">
                        <h3 className="sa-step-title">{s.title}</h3>
                        <p className="sa-step-desc">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monitoring mockup */}
              <div className="sa-fade" style={{ transitionDelay: "0.15s" }}>
                <div className="sa-mon-mockup">
                  <div className="sa-mon-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Shield w={28} h={28} bodyFill="white" innerFill="#252760" />
                      <div>
                        <div className="sa-mon-title">Device 03 — Monitoring</div>
                        <div className="sa-mon-sub">J.C. · Ashton House</div>
                      </div>
                    </div>
                    <span className="sa-online-pill">● Online</span>
                  </div>
                  <div className="sa-mon-section">
                    <div className="sa-mon-slabel">Content monitoring</div>
                    {[
                      { lbl: "Adult content", state: "blk" },
                      { lbl: "Gambling", state: "mon" },
                      { lbl: "Self-harm", state: "blk" },
                      { lbl: "Drugs", state: "mon" },
                    ].map((r) => (
                      <div key={r.lbl} className="sa-toggle-row">
                        <span className="sa-toggle-label">{r.lbl}</span>
                        <div className="sa-tg">
                          <button className="sa-tb sa-off">Off</button>
                          <button className={`sa-tb sa-mon${r.state === "mon" ? " sa-act" : ""}`}>Monitor</button>
                          <button className={`sa-tb sa-blk${r.state === "blk" ? " sa-act" : ""}`}>Block</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="sa-alert-card">
                    <div className="sa-alert-head">
                      <svg width="12" height="12" fill="#ef4444" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="sa-alert-type">Keyword Flagged</span>
                      <span className="sa-alert-time">2 min ago</span>
                    </div>
                    <div className="sa-alert-desc">
                      Device screen contained flagged keyword: <span className="sa-kw">suicide methods</span> — detected via accessibility monitoring on Chrome browser.
                    </div>
                  </div>
                  <div className="sa-mon-section" style={{ borderBottom: "none" }}>
                    <div className="sa-mon-slabel">App blocking</div>
                    {[
                      { lbl: "TikTok", blocked: true },
                      { lbl: "Snapchat", blocked: false },
                    ].map((app) => (
                      <div key={app.lbl} className="sa-toggle-row">
                        <span className="sa-toggle-label">{app.lbl}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 20, background: app.blocked ? "#ef4444" : "#d1d5db", borderRadius: 10, position: "relative", cursor: "pointer" }}>
                            <div style={{ width: 16, height: 16, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, [app.blocked ? "right" : "left"]: 2 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: app.blocked ? "#ef4444" : "#9ca3af", fontFamily: "var(--font-body)" }}>
                            {app.blocked ? "Blocked" : "Off"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DASHBOARD */}
        <section className="sa-section sa-dash-bg" id="dashboard">
          <div className="sa-container">
            <div className="sa-dash-header sa-fade">
              <span className="sa-label">The Dashboard</span>
              <h2 className="sa-h2" style={{ color: "#fff" }}>Clarity for the people<br />who need it most</h2>
              <p className="sa-sub" style={{ color: "rgba(255,255,255,0.5)", margin: "0 auto" }}>A single view showing every child, every device, and every alert — designed so care staff can act quickly and confidently.</p>
            </div>
            <div className="sa-full-browser sa-fade" style={{ transitionDelay: "0.1s" }}>
              <div className="sa-full-bar">
                <div className="sa-dots">
                  <div className="sa-dot" style={{ background: "#ff5f56" }} /><div className="sa-dot" style={{ background: "#ffbd2e" }} /><div className="sa-dot" style={{ background: "#27c93f" }} />
                </div>
                <div className="sa-full-url">
                  <span style={{ color: "#1DB894" }}>
                    <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  screenalert.co.uk/dashboard
                </div>
              </div>
              <div className="sa-full-dash">
                {/* Full sidebar */}
                <div className="sa-full-sidebar">
                  <div className="sa-full-logo-area">
                    <div className="sa-sidebar-icon-wrap">
                      <Shield w={20} h={20} bodyFill="white" innerFill="#3D3F8A" />
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700, color: "#fff" }}>Screen<span style={{ color: "#1DB894" }}>Alert</span></div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Ashton House</div>
                    </div>
                  </div>
                  <div className="sa-full-nav">
                    <div className="sa-nav-group-label">Navigation</div>
                    {[
                      { lbl: "Dashboard", active: true, badge: 0, icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
                      { lbl: "Alerts", active: false, badge: 3, icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
                      { lbl: "Children", active: false, badge: 0, icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                      { lbl: "Reports", active: false, badge: 0, icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
                      { lbl: "Settings", active: false, badge: 0, icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
                    ].map((item) => (
                      <div key={item.lbl} className="sa-nav-item" style={{ background: item.active ? "#3D3F8A" : "transparent" }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={item.active ? "white" : "rgba(255,255,255,0.35)"} strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                        </svg>
                        <span className="sa-nav-item-label" style={{ color: item.active ? "#fff" : "rgba(255,255,255,0.35)", flex: 1 }}>{item.lbl}</span>
                        {item.badge > 0 && <span className="sa-nav-badge">{item.badge}</span>}
                      </div>
                    ))}
                  </div>
                  <div className="sa-user-row">
                    <div className="sa-user-av">SM</div>
                    <div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Sarah Mitchell</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "rgba(255,255,255,0.3)" }}>Senior Care Manager</div>
                    </div>
                  </div>
                </div>

                {/* Main */}
                <div className="sa-full-main">
                  <div className="sa-full-topbar">
                    <div>
                      <div style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: "var(--near-black)" }}>Dashboard</div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--mid-gray)", marginTop: 1 }}>Monday 13 April 2026 — Ashton House</div>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f8f8fb", border: "1px solid #e2e2ea", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6B6B7A" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <span style={{ position: "absolute", top: 5, right: 5, width: 5, height: 5, background: "#ef4444", borderRadius: "50%" }} />
                    </div>
                  </div>
                  <div className="sa-full-content">
                    <div className="sa-stat-row">
                      {[
                        { val: "8", lbl: "Total Children", sub: "in this home", bg: "#dbeafe", fill: "#2563eb", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                        { val: "6", lbl: "Active Devices", sub: "2 offline", bg: "#d1fae5", fill: "#059669", icon: "M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" },
                        { val: "3", lbl: "Alerts Today", sub: "alerts logged today", bg: "#ffedd5", fill: "#ea580c", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
                      ].map((s) => (
                        <div key={s.lbl} className="sa-stat-card">
                          <div className="sa-stat-icon" style={{ background: s.bg }}>
                            <svg width="18" height="18" fill={s.fill} viewBox="0 0 24 24"><path d={s.icon} /></svg>
                          </div>
                          <div>
                            <div style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 700, color: "var(--near-black)", lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--near-black)", marginTop: 2 }}>{s.lbl}</div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--mid-gray)" }}>{s.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="sa-main-grid">
                      <div className="sa-panel">
                        <div className="sa-panel-header">
                          <div>
                            <div style={{ fontFamily: "var(--font-head)", fontSize: 12, fontWeight: 700, color: "var(--near-black)" }}>Recent Alerts</div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--mid-gray)", marginTop: 1 }}>Latest safeguarding notifications</div>
                          </div>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#3b82f6" }}>View all →</span>
                        </div>
                        {[
                          { av: "JC", who: "J.C. · Device 03", what: "Keyword Flagged", cls: "sa-bc", sev: "Critical", ts: "Today 14:32" },
                          { av: "TM", who: "T.M. · Device 01", what: "Website Visited", cls: "sa-bh", sev: "High", ts: "Today 12:15" },
                          { av: "SK", who: "S.K. · Device 05", what: "App Blocked", cls: "sa-bm", sev: "Medium", ts: "Yesterday 21:07" },
                          { av: "LB", who: "L.B. · Device 02", what: "Website Blocked", cls: "sa-bl", sev: "Low", ts: "Yesterday 18:45" },
                        ].map((a) => (
                          <div key={a.av} className="sa-alert-item">
                            <div className="sa-alert-av">{a.av}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "var(--near-black)" }}>{a.who}</div>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--mid-gray)", marginTop: 1 }}>{a.what}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span className={`sa-sbadge ${a.cls}`}>{a.sev}</span>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--mid-gray)", marginTop: 2 }}>{a.ts}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="sa-panel">
                        <div className="sa-panel-header">
                          <div>
                            <div style={{ fontFamily: "var(--font-head)", fontSize: 12, fontWeight: 700, color: "var(--near-black)" }}>Device Status</div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--mid-gray)", marginTop: 1 }}>Live monitoring overview</div>
                          </div>
                        </div>
                        <div className="sa-device-counts">
                          {[{ n: "6", lbl: "Online", col: "#10b981" }, { n: "1", lbl: "Offline", col: "#9ca3af" }, { n: "1", lbl: "Restricted", col: "#f97316" }].map((c) => (
                            <div key={c.lbl} className="sa-device-count-cell">
                              <div style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, color: c.col, lineHeight: 1 }}>{c.n}</div>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--mid-gray)", marginTop: 2 }}>{c.lbl}</div>
                            </div>
                          ))}
                        </div>
                        {[
                          { col: "#10b981", name: "Device 01", child: "T.M.", time: "Just now" },
                          { col: "#10b981", name: "Device 02", child: "L.B.", time: "2 mins ago" },
                          { col: "#10b981", name: "Device 03", child: "J.C.", time: "5 mins ago" },
                          { col: "#f97316", name: "Device 04", child: "R.P.", time: "Paused" },
                          { col: "#d1d5db", name: "Device 05", child: "S.K.", time: "1 hr ago" },
                        ].map((d) => (
                          <div key={d.name} className="sa-device-row">
                            <span className="sa-ddot2" style={{ background: d.col }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "var(--near-black)" }}>{d.name}</div>
                              <div style={{ fontFamily: "var(--font-body)", fontSize: 9.5, color: "var(--mid-gray)" }}>{d.child}</div>
                            </div>
                            <span style={{ fontFamily: "var(--font-body)", fontSize: 9.5, color: "var(--mid-gray)" }}>{d.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="sa-section" id="pricing">
          <div className="sa-container">
            <div className="sa-pricing-header sa-fade">
              <span className="sa-label">Pricing</span>
              <h2 className="sa-h2">Simple, transparent pricing</h2>
              <p className="sa-sub">One plan. Everything included. No per-device fees, no hidden extras.</p>
            </div>
            <div className="sa-pricing-layout">
              <div className="sa-price-card sa-fade">
                <div className="sa-label">Per residential home</div>
                <div className="sa-price">£150</div>
                <div className="sa-price-period">per month <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>+ VAT</span></div>
                <div className="sa-price-sub">Billed monthly. Cancel anytime.</div>
                <a href="#contact" className="sa-price-cta">Contact us to get started</a>
                <p className="sa-price-note">Free trial available for new care homes. Get in touch to discuss your requirements.</p>
              </div>
              <div className="sa-fade" style={{ transitionDelay: "0.1s" }}>
                {[
                  {
                    title: "Monitoring & Alerts",
                    items: ["Real-time content monitoring", "Keyword detection with screenshots", "Website category monitoring", "App usage tracking", "Battery & offline alerts", "Device tamper detection"],
                  },
                  {
                    title: "Content Blocking",
                    items: ["166k+ adult domains blocked", "95k+ gambling sites blocked", "26k+ drug-related domains", "Per-app blocking controls", "DNS-over-HTTPS bypass protection", "Internet pause controls"],
                  },
                  {
                    title: "Dashboard & Reporting",
                    items: ["Web-based staff dashboard", "Downloadable incident reports", "Unlimited staff accounts", "Admin & read-only roles", "Multi-home management", "Unlimited devices per home"],
                  },
                ].map((group) => (
                  <div key={group.title} className="sa-feature-group">
                    <h4 className="sa-fg-title">{group.title}</h4>
                    <ul className="sa-flist">
                      {group.items.map((item) => (
                        <li key={item} className="sa-fitem">
                          <span className="sa-tick">
                            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section className="sa-section sa-contact-bg" id="contact">
          <div className="sa-container">
            <div className="sa-contact-layout">
              <div className="sa-fade">
                <span className="sa-label">Get in touch</span>
                <h2 className="sa-h2">Ready to protect<br />the children in your care?</h2>
                <p className="sa-sub" style={{ marginBottom: 40 }}>Whether you&apos;re ready to get started or just have questions, we&apos;d love to hear from you. Fill in the form and we&apos;ll be in touch within one working day.</p>
                {[
                  { label: "Email", val: "hello@screenalert.co.uk", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
                  { label: "Phone", val: "07542 609 859", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z", last: true },
                ].map((c) => (
                  <div key={c.label} className="sa-contact-item" style={c.last ? { borderBottom: "none" } : {}}>
                    <div className="sa-contact-icon">
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                        <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                      </svg>
                    </div>
                    <div>
                      <div className="sa-contact-lbl">{c.label}</div>
                      <div className="sa-contact-val">{c.val}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sa-form-wrap sa-fade" style={{ transitionDelay: "0.15s" }}>
                <h3 className="sa-form-title">Send us a message</h3>
                <p className="sa-form-sub">We&apos;ll get back to you within one working day.</p>
                <div className="sa-form-row">
                  <div className="sa-form-group">
                    <label className="sa-form-label" htmlFor="fname">First name</label>
                    <input ref={fnameRef} type="text" id="fname" className="sa-input" placeholder="Sarah" />
                  </div>
                  <div className="sa-form-group">
                    <label className="sa-form-label" htmlFor="lname">Last name</label>
                    <input type="text" id="lname" className="sa-input" placeholder="Mitchell" />
                  </div>
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="email">Work email</label>
                  <input type="email" id="email" className="sa-input" placeholder="sarah@ashtonhouse.co.uk" />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="home">Care home name</label>
                  <input type="text" id="home" className="sa-input" placeholder="Ashton House Residential Care" />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="size">Number of children in your home</label>
                  <select id="size" className="sa-select" defaultValue="">
                    <option value="" disabled>Select a range</option>
                    <option>1–4 children</option>
                    <option>5–8 children</option>
                    <option>9–12 children</option>
                    <option>12+ children</option>
                  </select>
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="message">Message</label>
                  <textarea id="message" className="sa-textarea" placeholder="Tell us a bit about your requirements, or ask us anything about ScreenAlert..." />
                </div>
                <button ref={submitRef} className="sa-submit" type="button" onClick={handleSubmit}>
                  Send message
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="sa-footer">
          <div className="sa-container">
            <div className="sa-footer-top">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <Shield w={28} h={28} bodyFill="white" bodyOpacity={0.9} innerFill="#14141E" />
                  <span style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 300, color: "rgba(255,255,255,0.75)" }}>
                    Screen<strong style={{ fontWeight: 700, color: "#fff" }}>Alert</strong>
                  </span>
                </div>
                <p className="sa-footer-desc">A child safeguarding platform for residential care homes. Protecting children through intelligent monitoring, real-time alerts, and clear staff tools.</p>
              </div>
              <div>
                <div className="sa-footer-col-title">Platform</div>
                <ul className="sa-footer-links">
                  {["Features", "How it works", "Dashboard", "Pricing"].map((l) => (
                    <li key={l}><a href={`#${l.toLowerCase().replace(/ /g, "-")}`}>{l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="sa-footer-col-title">Account</div>
                <ul className="sa-footer-links">
                  <li><Link href="/login">Log in</Link></li>
                  <li><a href="#contact">Request access</a></li>
                  <li><a href="#contact">Support</a></li>
                </ul>
              </div>
              <div>
                <div className="sa-footer-col-title">Company</div>
                <ul className="sa-footer-links">
                  <li><a href="#contact">Contact</a></li>
                  <li><Link href="/privacy">Privacy Policy</Link></li>
                  <li><Link href="/terms">Terms of Use</Link></li>
                </ul>
              </div>
            </div>
            <div className="sa-footer-bottom">
              <span className="sa-footer-copy">© 2026 ScreenAlert. All rights reserved.</span>
              <div className="sa-footer-legal">
                <Link href="/privacy">Privacy</Link>
                <Link href="/terms">Terms</Link>
                <Link href="/cookies">Cookies</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
