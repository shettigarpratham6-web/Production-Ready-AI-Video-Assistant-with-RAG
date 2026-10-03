import React, { useRef } from 'react';
import { 
  Video, 
  UploadCloud, 
  FileAudio, 
  Zap, 
  Activity, 
  RotateCcw, 
  History 
} from 'lucide-react';

export default function Sidebar({
  sourceType,
  setSourceType,
  youtubeUrl,
  setYoutubeUrl,
  uploadedFile,
  setUploadedFile,
  language,
  setLanguage,
  workflowEngine,
  setWorkflowEngine,
  onProcess,
  isProcessing,
  diagnostics,
  meetingData,
  onReset,
  recentRuns,
  onLoadRun,
}) {
  const fileInputRef = useRef(null);

  const canProcess = sourceType === 'youtube' 
    ? Boolean(youtubeUrl?.trim()) 
    : Boolean(uploadedFile);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  return (
    <aside 
      style={{
        width: '320px',
        minWidth: '320px',
        background: 'var(--bg-canvas)',
        borderRight: '1px solid var(--border-black)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-black)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="brand-badge-box">
            RAG
          </div>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0 }}>
              Input Studio
            </h2>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              LOCAL LLAMA 3.2 · REDIS VL
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        {/* Source Mode Toggle */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: '6px' }}>
            Meeting Source
          </label>
          <div className="segmented-control" style={{ width: '100%' }}>
            <button
              type="button"
              className={`segmented-btn ${sourceType === 'youtube' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setSourceType('youtube')}
            >
              <Video size={13} />
              YouTube
            </button>
            <button
              type="button"
              className={`segmented-btn ${sourceType === 'file' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setSourceType('file')}
            >
              <UploadCloud size={13} />
              File
            </button>
          </div>
        </div>

        {/* Source Input */}
        {sourceType === 'youtube' ? (
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: '6px' }}>
              Video URL
            </label>
            <input
              type="text"
              className="text-input"
              style={{ fontSize: '0.86rem', padding: '10px 14px' }}
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl || ''}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={isProcessing}
            />
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: '6px' }}>
              Audio / Video File
            </label>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".mp3,.wav,.m4a,.mp4,.webm,.aac"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            <div 
              className="dropzone"
              style={{ padding: '20px 14px' }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <FileAudio size={22} color="#111" />
              {uploadedFile ? (
                <div className="dropzone-file-name" style={{ fontSize: '0.78rem' }}>
                  {uploadedFile.name.slice(0, 20)}... ({(uploadedFile.size / (1024 * 1024)).toFixed(1)}MB)
                </div>
              ) : (
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Click to select file</span>
              )}
            </div>
          </div>
        )}

        {/* Language Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: '6px' }}>
            Language
          </label>
          <select 
            className="select-input"
            style={{ fontSize: '0.86rem', padding: '10px 14px' }}
            value={language || 'english'}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isProcessing}
          >
            <option value="english">English (Local Whisper)</option>
            <option value="hinglish">Hinglish (Sarvam AI STT)</option>
          </select>
        </div>

        {/* Engine Toggle */}
        <div>
          <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: '6px' }}>
            Workflow Engine
          </label>
          <div className="segmented-control" style={{ width: '100%' }}>
            <button
              type="button"
              className={`segmented-btn ${workflowEngine === 'direct' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem', padding: '6px 8px' }}
              onClick={() => setWorkflowEngine('direct')}
            >
              Direct Pipeline
            </button>
            <button
              type="button"
              className={`segmented-btn ${workflowEngine === 'inngest' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem', padding: '6px 8px' }}
              onClick={() => setWorkflowEngine('inngest')}
            >
              Inngest Workflow
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', padding: '12px' }}
            onClick={onProcess}
            disabled={!canProcess || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="spinner" />
                Processing...
              </>
            ) : (
              <>
                <Zap size={16} />
                Process Meeting
              </>
            )}
          </button>
        </div>

        {/* Reset button if meeting is loaded */}
        {meetingData && (
          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%' }}
            onClick={onReset}
          >
            <RotateCcw size={14} />
            New Meeting / Reset
          </button>
        )}

        {/* System Diagnostics */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-black)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)' }}>
              SYSTEM STATUS
            </span>
            <Activity size={12} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-black)', borderRadius: '6px', padding: '8px', fontSize: '0.72rem' }}>
              <div style={{ color: 'var(--text-dim)' }}>LLM</div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span className={`status-indicator-dot ${diagnostics.ollama ? 'online' : 'offline'}`} />
                Ollama 3.2
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-black)', borderRadius: '6px', padding: '8px', fontSize: '0.72rem' }}>
              <div style={{ color: 'var(--text-dim)' }}>CACHE</div>
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span className={`status-indicator-dot ${diagnostics.redis ? 'online' : 'offline'}`} />
                Redis VL
              </div>
            </div>
          </div>
        </div>

        {/* Recent Runs list */}
        {recentRuns && recentRuns.length > 0 && (
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <History size={12} />
              Recent Meetings ({recentRuns.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
              {recentRuns.slice(0, 5).map((run) => (
                <button
                  key={run.meeting_id}
                  type="button"
                  onClick={() => onLoadRun(run.meeting_id)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-black)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-yellow-dim)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                >
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {run.title}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {run.word_count?.toLocaleString()} words · {run.language}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
