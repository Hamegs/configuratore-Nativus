import React from 'react';
import { Navbar } from './Navbar';

interface AppShellProps {
  children: React.ReactNode;
  /** Optional page-level title for the hero band */
  heroTitle?: string;
  /** Optional page-level subtitle */
  heroSubtitle?: string;
  /** Set false to suppress the hero band (e.g. wizard sub-pages) */
  showHero?: boolean;
}

export function AppShell({
  children,
  heroTitle,
  heroSubtitle,
  showHero = false,
}: AppShellProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#f2f2f0',
      }}
    >
      <Navbar />

      {showHero && (
        <HeroBand title={heroTitle} subtitle={heroSubtitle} />
      )}

      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}

/* ── Hero band ─────────────────────────────────────────────────────────────── */

interface HeroBandProps {
  title?: string;
  subtitle?: string;
}

function HeroBand({ title, subtitle }: HeroBandProps) {
  return (
    <div
      style={{
        position: 'relative',
        height: 180,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1219 0%, #171e29 45%, #1f2c3a 75%, #151c27 100%)',
      }}
    >
      {/* Subtle texture overlay — grid-dot pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Warm vignette from bottom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.25) 100%)',
        }}
      />

      {/* Content */}
      {(title || subtitle) && (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 32px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingBottom: 28,
          }}
        >
          {subtitle && (
            <p
              style={{
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 8,
              }}
            >
              {subtitle}
            </p>
          )}
          {title && (
            <h1
              style={{
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: '0.05em',
                color: '#ffffff',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h1>
          )}
        </div>
      )}
    </div>
  );
}
