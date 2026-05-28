// src/app/(auth)/login/page.tsx
"use client";

import { useState, useId } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const uid = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Username atau password salah.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

        .login-root {
          min-height: 100svh;
          display: flex;
          background: var(--background);
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }

        /* ── Left panel ─────────────────────────────────────────── */
        .login-panel {
          display: none;
          width: 420px;
          flex-shrink: 0;
          background: #0f1c2e;
          padding: 3rem;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 900px) { .login-panel { display: flex; } }

        .panel-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(59,130,246,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.07) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .panel-glow {
          position: absolute;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%);
          top: -60px;
          right: -80px;
          pointer-events: none;
        }
        .panel-glow-2 {
          position: absolute;
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%);
          bottom: 80px;
          left: -60px;
          pointer-events: none;
        }

        .panel-brand {
          position: relative;
          z-index: 1;
        }
        .panel-logo {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2.5rem;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
        }
        .panel-tagline {
          font-size: 22px;
          font-weight: 600;
          color: #f1f5f9;
          line-height: 1.3;
          letter-spacing: -0.3px;
          margin-bottom: 0.75rem;
        }
        .panel-sub {
          font-size: 14px;
          color: #64748b;
          line-height: 1.6;
        }

        .panel-stats {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stat-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-text p { margin: 0; }
        .stat-label { font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-value { font-size: 15px; font-weight: 600; color: #cbd5e1; margin-top: 2px !important; }

        .panel-footer {
          position: relative;
          z-index: 1;
          font-size: 12px;
          color: #334155;
        }

        /* ── Right form area ────────────────────────────────────── */
        .login-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          animation: fadeUp 0.35s ease both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-head {
          margin-bottom: 2rem;
        }
        .login-logo-mobile {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 1.75rem;
        }
        @media (min-width: 900px) { .login-logo-mobile { display: none; } }
        .logo-badge {
          width: 36px;
          height: 36px;
          background: #2563eb;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--foreground);
        }

        .login-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--foreground);
          letter-spacing: -0.4px;
          margin: 0 0 6px;
        }
        .login-desc {
          font-size: 14px;
          color: var(--muted);
          margin: 0;
        }

        /* ── Form ───────────────────────────────────────────────── */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .shake { animation: shake 0.45s ease; }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }

        .error-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(220,38,38,0.06);
          border: 1px solid rgba(220,38,38,0.2);
          border-radius: 10px;
          font-size: 13.5px;
          color: #dc2626;
          animation: fadeIn 0.2s ease;
        }
        .dark .error-box { background: rgba(220,38,38,0.1); border-color: rgba(220,38,38,0.25); color: #f87171; }
        @keyframes fadeIn { from { opacity:0; transform: translateY(-4px); } to { opacity:1; transform:none; } }

        .field { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .input-wrap { position: relative; }
        .input-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-tertiary);
          pointer-events: none;
          display: flex;
        }
        .login-input {
          width: 100%;
          height: 44px;
          padding: 0 42px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          box-sizing: border-box;
        }
        .login-input::placeholder { color: var(--text-tertiary); }
        .login-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
          background: var(--surface);
        }
        .login-input:hover:not(:focus) { border-color: var(--text-tertiary); }

        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-tertiary);
          display: flex;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;
        }
        .eye-btn:hover { color: var(--muted); }

        .submit-btn {
          height: 44px;
          width: 100%;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 1px 3px rgba(37,99,235,0.3), 0 4px 12px rgba(37,99,235,0.15);
          margin-top: 4px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #1d4ed8;
          box-shadow: 0 1px 3px rgba(37,99,235,0.4), 0 6px 16px rgba(37,99,235,0.2);
          transform: translateY(-1px);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { background: #93c5fd; box-shadow: none; cursor: not-allowed; }
        .dark .submit-btn:disabled { background: #1e3a5f; color: #475569; }

        .spin {
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footer {
          margin-top: 4px;
          padding-top: 18px;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 12.5px;
          color: var(--text-tertiary);
        }
        .form-footer a {
          color: var(--muted);
          text-decoration: none;
        }

        .version-tag {
          display: block;
          text-align: center;
          margin-top: 1.5rem;
          font-size: 11.5px;
          color: var(--text-tertiary);
          letter-spacing: 0.2px;
        }
      `}</style>

      <div className="login-root">
        {/* ── Left decorative panel ────────────────────── */}
        <div className="login-panel">
          <div className="panel-grid" />
          <div className="panel-glow" />
          <div className="panel-glow-2" />

          <div className="panel-brand">
            <div className="panel-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
            </div>
            <p className="panel-tagline">Cash Reconciliation<br/>Management System</p>
            <p className="panel-sub">Verifikasi dan rekonsiliasi laporan kas shift secara digital, cepat, dan akurat.</p>
          </div>

          <div className="panel-stats">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(37,99,235,0.15)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="stat-text">
                <p className="stat-label">Alur kerja</p>
                <p className="stat-value">Kasir → HC → Finance</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(16,185,129,0.12)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.55 1.23"/>
                </svg>
              </div>
              <div className="stat-text">
                <p className="stat-label">Keamanan</p>
                <p className="stat-value">Akses berbasis role</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: "rgba(245,158,11,0.12)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
                </svg>
              </div>
              <div className="stat-text">
                <p className="stat-label">Laporan</p>
                <p className="stat-value">PDF otomatis per shift</p>
              </div>
            </div>
          </div>

          <p className="panel-footer">© 2026 Cash Reconciliation v1.0</p>
        </div>

        {/* ── Right: form ─────────────────────────────── */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-head">
              {/* Logo — hanya di mobile */}
              <div className="login-logo-mobile">
                <div className="logo-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                  </svg>
                </div>
                <span className="logo-name">Cash Reconciliation</span>
              </div>

              <h1 className="login-title">Masuk ke akun</h1>
              <p className="login-desc">Masukkan kredensial yang diberikan oleh Finance.</p>
            </div>

            <form onSubmit={handleSubmit} className={`login-form${shake ? " shake" : ""}`} noValidate>
              {error && (
                <div className="error-box" role="alert">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="field">
                <label className="field-label" htmlFor={`${uid}-username`}>Username</label>
                <div className="input-wrap">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    id={`${uid}-username`}
                    className="login-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username kamu"
                    autoComplete="username"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor={`${uid}-password`}>Password</label>
                <div className="input-wrap">
                  <span className="input-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </span>
                  <input
                    id={`${uid}-password`}
                    className="login-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password kamu"
                    autoComplete="current-password"
                    required
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    Masuk
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>

              <div className="form-footer">
                Lupa password? Hubungi <strong>Finance</strong> untuk reset.
              </div>
            </form>

            <span className="version-tag">Cash Reconciliation Management System v1.0</span>
          </div>
        </div>
      </div>
    </>
  );
}