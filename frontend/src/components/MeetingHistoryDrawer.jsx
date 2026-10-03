import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, FileText, ArrowRight, Hash } from 'lucide-react';

export default function MeetingHistoryDrawer({
  isOpen,
  onClose,
  recentRuns,
  onLoadRun,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="drawer-overlay" onClick={onClose}>
          <motion.div
            className="drawer-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          >
            {/* Drawer Header */}
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Meeting History</h3>
                <span className="badge-pill badge-yellow" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
                  {recentRuns.length}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-black)',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="drawer-body">
              {recentRuns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                  <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No previous meetings saved yet.</p>
                </div>
              ) : (
                recentRuns.map((run) => (
                  <div
                    key={run.meeting_id}
                    className="history-run-card"
                    onClick={() => {
                      onLoadRun(run.meeting_id);
                      onClose();
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="badge-pill badge-yellow" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                        {run.language || 'English'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        <Hash size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        {run.meeting_id?.slice(0, 8)}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text-main)' }}>
                      {run.title || 'Untitled Meeting'}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {run.word_count ? `${run.word_count.toLocaleString()} words` : ''}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Load <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
