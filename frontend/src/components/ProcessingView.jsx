import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  ExternalLink, 
  Clock 
} from 'lucide-react';

export default function ProcessingView({ workflowEngine }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const steps = [
    { title: "Audio Ingestion & Segmentation", desc: "Chunking audio stream into 16kHz WAV segments and normalizing levels" },
    { title: "Speech Recognition Transcription", desc: "Dual-engine transcription via local Whisper STT or Sarvam AI" },
    { title: "Deterministic Hash & Title", desc: "Generating unique meeting ID and executive meeting title" },
    { title: "Executive Summarization", desc: "Distilling core discussions and context via local LLaMA 3.2" },
    { title: "Deliverables & Decision Extraction", desc: "Isolating structured action items, assignees, deadlines, and key consensus" },
    { title: "Knowledge Indexing & Cache Sync", desc: "Embedding transcript into ChromaDB vector store and synchronizing Redis Semantic Cache" },
  ];

  // Estimate progress step based on elapsed time
  const currentStepIndex = Math.min(
    Math.floor(elapsed / 12),
    steps.length - 1
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="stepper-container"
    >
      {/* Editorial Header */}
      <div>
        <div style={{ display: 'inline-flex', gap: '8px', marginBottom: '12px' }}>
          <span className="badge-pill badge-yellow">
            STEP 0{currentStepIndex + 1} / 0{steps.length}
          </span>
          <span className="badge-pill badge-black">
            {workflowEngine === 'inngest' ? 'INNGEST WORKFLOW' : 'DIRECT PIPELINE'}
          </span>
        </div>

        <h2 style={{ fontSize: '2rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', margin: '4px 0 10px 0' }}>
          PROCESSING MEETING PIPELINE
        </h2>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.94rem', margin: 0, maxWidth: '600px', marginInline: 'auto' }}>
          {workflowEngine === 'inngest' 
            ? 'Orchestrating durable multi-step functions with event tracking on Inngest Dev Server' 
            : 'Executing local inference pipeline with Whisper, LLaMA 3.2, ChromaDB, and Redis VL'}
        </p>
      </div>

      {/* Elapsed Time Pill */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-black)',
        padding: '8px 18px',
        borderRadius: 'var(--radius-pill)',
        margin: '0 auto',
        fontSize: '0.9rem',
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        boxShadow: 'var(--shadow-crisp)'
      }}>
        <Clock size={16} />
        ELAPSED TIME: {formatSeconds(elapsed)}
      </div>

      {/* Inngest dev server link banner if running in Inngest */}
      {workflowEngine === 'inngest' && (
        <div style={{
          background: 'var(--accent-yellow-dim)',
          border: '1px solid var(--border-black)',
          borderRadius: '8px',
          padding: '16px',
          textAlign: 'left',
          boxShadow: 'var(--shadow-crisp)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              INNGEST RUN ACTIVE // PORT 8288
            </span>
            <span className="badge-pill badge-yellow" style={{ fontSize: '0.62rem' }}>
              EVENT DISPATCHED
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', margin: '6px 0 12px 0' }}>
            Function <code>process-meeting</code> is executing resiliently. You can view the live execution graph in real-time.
          </p>
          <a
            href="http://localhost:8288/runs"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-black"
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            Open Inngest Dev Dashboard
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Progress Steps List */}
      <div className="step-progress-list">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;

          return (
            <div 
              key={idx}
              className={`progress-step-item ${isDone ? 'completed' : isActive ? 'active' : ''}`}
            >
              <div>
                {isDone ? (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#15803D',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-black)'
                  }}>
                    <Check size={14} />
                  </div>
                ) : isActive ? (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent-yellow)',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-black)',
                    fontWeight: 800,
                    fontSize: '0.75rem'
                  }}>
                    <span className="spinner" style={{ width: '12px', height: '12px' }} />
                  </div>
                ) : (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--bg-canvas-alt)',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem'
                  }}>
                    {idx + 1}
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', color: isDone ? '#15803D' : isActive ? 'var(--text-main)' : 'var(--text-dim)' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
