import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, 
  UploadCloud, 
  Mic, 
  Square, 
  Zap, 
  ArrowRight, 
  FolderOpen, 
  RotateCcw 
} from 'lucide-react';

export default function WelcomeView({ 
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
  inngestOnline, 
  latestRun, 
  onLoadRun,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Live Microphone Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);

        // Create file object and attach to uploadedFile
        const file = new File(
          [audioBlob], 
          `meeting_recording_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`, 
          { type: 'audio/webm' }
        );
        setUploadedFile(file);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert(`Microphone access failed: ${err.message}. Please check browser microphone permissions.`);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const handleDiscardRecording = () => {
    setRecordedAudioUrl(null);
    setUploadedFile(null);
    setRecordingSeconds(0);
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const canProcess = sourceType === 'youtube' 
    ? Boolean(youtubeUrl.trim()) 
    : Boolean(uploadedFile);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Editorial Swiss Hero Section */}
      <div className="hero-container">
        <div className="hero-kicker-strip">
          <span className="badge-pill badge-yellow">
            100% LOCAL INFERENCE
          </span>
          <span className="badge-pill badge-black">
            SWISS MINIMALIST RAG
          </span>
          <span className="badge-pill badge-muted">
            REDIS SEMANTIC CACHING
          </span>
        </div>

        <h1 className="hero-title">
          TRANSFORM ANY VIDEO OR RECORDING INTO <mark>ACTIONABLE INTELLIGENCE</mark>
        </h1>

        <p className="hero-sub">
          Enterprise meeting intelligence powered by local <b>LLaMA 3.2</b>, dual-engine <b>Whisper &amp; Sarvam STT</b>, 
          <b>ChromaDB vector retrieval</b>, and sub-millisecond <b>Redis Semantic Caching</b> with resilient <b>Inngest workflows</b>.
        </p>
      </div>

      {/* Primary Studio Input & Recording Module */}
      <div className="studio-input-box">
        <div className="studio-header-strip">
          <div>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              INPUT STUDIO // SELECT MODE
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 0 0' }}>
              Meeting Source &amp; Configuration
            </h3>
          </div>

          {/* Mode Selector */}
          <div className="segmented-control">
            <button
              type="button"
              className={`segmented-btn ${sourceType === 'youtube' ? 'active' : ''}`}
              onClick={() => {
                setSourceType('youtube');
                handleDiscardRecording();
              }}
            >
              <Video size={14} />
              YouTube Video
            </button>
            <button
              type="button"
              className={`segmented-btn ${sourceType === 'file' && !isRecording && !recordedAudioUrl ? 'active' : ''}`}
              onClick={() => {
                setSourceType('file');
                handleDiscardRecording();
              }}
            >
              <UploadCloud size={14} />
              Upload Audio/Video
            </button>
            <button
              type="button"
              className={`segmented-btn ${sourceType === 'record' || isRecording || recordedAudioUrl ? 'active' : ''}`}
              onClick={() => {
                setSourceType('record');
              }}
            >
              <Mic size={14} />
              Record Live Meeting
            </button>
          </div>
        </div>

        {/* Dynamic Input Area */}
        <div style={{ marginBottom: '24px' }}>
          {sourceType === 'youtube' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                YouTube Video URL
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="text-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  disabled={isProcessing}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap', padding: '0 18px' }}
                  onClick={() => setYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}
                  title="Load sample video URL"
                >
                  Load Sample
                </button>
              </div>
            </div>
          )}

          {sourceType === 'file' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Upload Local Recording (Audio or Video)
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
                className={`dropzone ${isDragging ? 'active' : ''}`}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <UploadCloud size={32} color="#111" />
                {uploadedFile ? (
                  <div className="dropzone-file-name">
                    ✓ {uploadedFile.name} ({(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </div>
                ) : (
                  <>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                      Click to choose or drag &amp; drop file here
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      Supported: MP3, WAV, M4A, MP4, WEBM (Max 200MB)
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {(sourceType === 'record' || isRecording || recordedAudioUrl) && (
            <div className="record-box">
              {!isRecording && !recordedAudioUrl && (
                <div>
                  <button
                    type="button"
                    className="record-btn-pulsing"
                    onClick={handleStartRecording}
                    title="Click to start recording microphone"
                  >
                    <Mic size={28} />
                  </button>
                  <p style={{ marginTop: '14px', fontWeight: 700, fontSize: '0.95rem' }}>
                    Click microphone to start recording meeting audio
                  </p>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                    High-quality browser audio capture via Web MediaRecorder API
                  </span>
                </div>
              )}

              {isRecording && (
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 800, fontSize: '1.2rem', marginBottom: '14px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#DC2626', animation: 'pulse 1s infinite' }} />
                    RECORDING LIVE AUDIO // {formatSeconds(recordingSeconds)}
                  </div>
                  <br />
                  <button
                    type="button"
                    className="btn-black"
                    onClick={handleStopRecording}
                  >
                    <Square size={14} fill="#FFF" />
                    Stop &amp; Save Recording
                  </button>
                </div>
              )}

              {recordedAudioUrl && !isRecording && (
                <div style={{ width: '100%', maxWidth: '480px' }}>
                  <span className="badge-pill badge-yellow" style={{ marginBottom: '10px' }}>
                    ✓ RECORDING READY ({formatSeconds(recordingSeconds)})
                  </span>
                  <audio 
                    src={recordedAudioUrl} 
                    controls 
                    style={{ width: '100%', marginTop: '8px', borderRadius: '8px', border: '1px solid var(--border-black)' }} 
                  />
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                      onClick={handleDiscardRecording}
                    >
                      <RotateCcw size={12} />
                      Discard &amp; Record Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Engine and Language Configuration Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', padding: '18px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
          {/* Spoken Language */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: '6px' }}>
              Spoken Language &amp; STT Engine
            </label>
            <select
              className="select-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isProcessing}
            >
              <option value="english">English (Local Whisper STT)</option>
              <option value="hinglish">Hinglish (Sarvam AI STT &amp; Translation)</option>
            </select>
          </div>

          {/* Workflow Engine */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-dim)', marginBottom: '6px' }}>
              Orchestration Engine
            </label>
            <div className="segmented-control" style={{ width: '100%' }}>
              <button
                type="button"
                className={`segmented-btn ${workflowEngine === 'direct' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setWorkflowEngine('direct')}
              >
                Direct Local Pipeline
              </button>
              <button
                type="button"
                className={`segmented-btn ${workflowEngine === 'inngest' ? 'active' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setWorkflowEngine('inngest')}
              >
                Inngest Workflow
              </button>
            </div>
          </div>
        </div>

        {/* Submit Action Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', maxWidth: '420px', padding: '16px 28px', fontSize: '1.05rem' }}
            onClick={onProcess}
            disabled={!canProcess || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="spinner" />
                Processing Meeting Pipeline...
              </>
            ) : (
              <>
                <Zap size={18} />
                PROCESS MEETING PIPELINE →
              </>
            )}
          </button>
          {!canProcess && !isProcessing && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              Paste a YouTube URL, select an audio/video file, or record live audio above.
            </span>
          )}

          {/* Inngest dev server offline alert */}
          {workflowEngine === 'inngest' && !inngestOnline && !isProcessing && (
            <div style={{
              background: 'var(--accent-yellow-dim)',
              border: '1px solid var(--border-black)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '0.8rem',
              color: 'var(--text-main)',
              textAlign: 'center',
              marginTop: '6px',
              boxShadow: '1px 1px 0px var(--border-black)'
            }}>
              <span>Inngest dev server (port 8288) is in standby mode. </span>
              <button
                type="button"
                onClick={() => setWorkflowEngine('direct')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#000',
                  textDecoration: 'underline',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
              >
                Switch to Direct Local Pipeline →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Previous Run Ready Banner */}
      {latestRun && latestRun.title && (
        <div className="swiss-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--accent-yellow-dim)', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'var(--accent-yellow)', border: '1px solid var(--border-black)', padding: '10px', borderRadius: '8px', boxShadow: '1px 1px 0px var(--border-black)' }}>
              <FolderOpen size={22} color="#000" />
            </div>
            <div>
              <span className="badge-pill badge-black" style={{ fontSize: '0.66rem', marginBottom: '4px' }}>
                PREVIOUS RUN READY
              </span>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-main)' }}>
                {latestRun.title}
              </h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0', fontFamily: 'var(--font-mono)' }}>
                {latestRun.word_count?.toLocaleString()} words · Language: {latestRun.language}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-black"
            onClick={() => onLoadRun(latestRun.meeting_id || 'latest')}
          >
            Load Recent Run
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Swiss Editorial Feature Grid */}
      <div className="feature-grid">
        <div className="feature-card">
          <span className="feature-num">[ 01 // SPEECH ]</span>
          <span className="badge-pill badge-yellow">DUAL-ENGINE STT</span>
          <h3 className="feature-card-title">Whisper &amp; Sarvam</h3>
          <p className="feature-card-desc">
            Local Whisper transcription for clean English speech combined with Sarvam AI for accurate Hinglish audio parsing and translation.
          </p>
        </div>

        <div className="feature-card">
          <span className="feature-num">[ 02 // VECTOR ]</span>
          <span className="badge-pill badge-black">CHROMADB</span>
          <h3 className="feature-card-title">Grounded Vector Store</h3>
          <p className="feature-card-desc">
            Semantic chunking with local sentence-transformers embeddings indexed in ChromaDB for high-precision context retrieval.
          </p>
        </div>

        <div className="feature-card">
          <span className="feature-num">[ 03 // CACHE ]</span>
          <span className="badge-pill badge-yellow">REDIS VL</span>
          <h3 className="feature-card-title">Semantic Cache</h3>
          <p className="feature-card-desc">
            Sub-millisecond query responses for repeated or semantically related questions using Redis VL vector indexing.
          </p>
        </div>

        <div className="feature-card">
          <span className="feature-num">[ 04 // PIPELINE ]</span>
          <span className="badge-pill badge-muted">INNGEST</span>
          <h3 className="feature-card-title">Durable Orchestration</h3>
          <p className="feature-card-desc">
            8-step resilient event-driven execution with automatic retries and live DAG observability on port 8288.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
