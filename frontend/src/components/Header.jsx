import React from 'react';
import {
  History,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

export default function Header({
  diagnostics,
  recentRunsCount,
  onOpenHistory,
  meetingData,
  onReset
}) {
  return (
    <header className="app-header">
      {/* Brand logo & title */}
      <div className="header-brand" onClick={onReset} title="Return to Home">
        <div className="brand-badge-box">
          RAG
        </div>
        <div className="brand-titles">
          <span className="brand-main-title">Video &amp; Meeting Assistant</span>
          <span className="brand-sub-title"> LLaMA 3.2 &amp; Redis VL</span>
        </div>
      </div>

      {/* System Status Indicators & Actions */}
      <div className="header-actions">
        {/* Real-time Diagnostics Cluster */}
        <div className="system-status-cluster" title="System services connectivity">
          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', marginRight: '4px' }}>
            System
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className={`status-indicator-dot ${diagnostics.ollama ? 'online' : 'offline'}`} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>Ollama</span>
          </div>
          <span style={{ color: 'var(--border-subtle)', margin: '0 2px' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className={`status-indicator-dot ${diagnostics.redis ? 'online' : 'offline'}`} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>Redis VL</span>
          </div>
          <span style={{ color: 'var(--border-subtle)', margin: '0 2px' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className={`status-indicator-dot ${diagnostics.inngest ? 'online' : 'offline'}`} />
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>Inngest</span>
          </div>
        </div>

        {/* Inngest Dev Server Link */}
        <a
          href="http://localhost:8288/runs"
          target="_blank"
          rel="noopener noreferrer"
          className="badge-pill badge-muted"
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          title="Open Inngest Dev Dashboard (Port 8288)"
        >
          <ExternalLink size={12} />
          Inngest:8288
        </a>

        {/* Recent Runs Drawer Toggle */}
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          onClick={onOpenHistory}
        >
          <History size={14} />
          History ({recentRunsCount})
        </button>

        {/* Reset / New Meeting */}
        {meetingData && (
          <button
            type="button"
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            onClick={onReset}
          >
            <RotateCcw size={14} />
            New Meeting
          </button>
        )}
      </div>
    </header>
  );
}
