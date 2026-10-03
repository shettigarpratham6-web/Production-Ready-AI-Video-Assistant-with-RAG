import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  CheckSquare, 
  HelpCircle, 
  MessageSquare, 
  ScrollText, 
  GitBranch, 
  Download, 
  Copy, 
  Check, 
  Send, 
  Search, 
  ExternalLink,
  Zap,
  Database,
  ArrowDownToLine,
  Video
} from 'lucide-react';

export default function MeetingDashboard({ 
  data, 
  chatHistory, 
  onSendMessage, 
  isChatLoading,
  onExportPdf
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const [chatInput, setChatInput] = useState('');
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [copiedField, setCopiedField] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const chatBottomRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab, isChatLoading]);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendChat = (prompt) => {
    const textToSend = prompt || chatInput;
    if (!textToSend.trim() || isChatLoading) return;
    onSendMessage(textToSend);
    setChatInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  const toggleCheckItem = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper to extract YouTube video ID if source is YouTube
  const getYouTubeEmbedUrl = (source) => {
    if (!source || typeof source !== 'string') return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = source.match(regExp);
    return (match && match[2].length === 11) 
      ? `https://www.youtube.com/embed/${match[2]}` 
      : null;
  };

  const youtubeEmbedUrl = getYouTubeEmbedUrl(data.source);

  // Parse action items into individual actionable items
  const parseActionItems = (rawText) => {
    if (!rawText) return [];
    return rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)))
      .map((line, idx) => ({
        id: `item-${idx}`,
        text: line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '')
      }));
  };

  const parsedActionItems = parseActionItems(data.action_items);

  // Transcript filtering & match count
  const transcriptText = data.transcript || '';
  const searchMatches = transcriptSearch.trim()
    ? (transcriptText.toLowerCase().split(transcriptSearch.toLowerCase()).length - 1)
    : 0;

  // Inngest 8-step pipeline details
  const inngestSteps = [
    { num: 'STEP 01', name: 'process-audio', desc: 'Audio segmentation into 16kHz WAV chunks', status: 'COMPLETED' },
    { num: 'STEP 02', name: 'transcribe-meeting', desc: 'Dual-engine STT (Whisper / Sarvam)', status: 'COMPLETED' },
    { num: 'STEP 03', name: 'generate-title', desc: 'Deterministic ID & LLaMA 3.2 Title', status: 'COMPLETED' },
    { num: 'STEP 04', name: 'generate-summary', desc: 'Executive structured brief', status: 'COMPLETED' },
    { num: 'STEP 05', name: 'extract-action-items', desc: 'Task extraction, assignees, deadlines', status: 'COMPLETED' },
    { num: 'STEP 06', name: 'extract-decisions', desc: 'Consensus items & agreements', status: 'COMPLETED' },
    { num: 'STEP 07', name: 'extract-questions', desc: 'Open issues and follow-ups', status: 'COMPLETED' },
    { num: 'STEP 08', name: 'build-vector-store', desc: 'ChromaDB embedding & Redis cache sync', status: 'COMPLETED' },
  ];

  // Markdown export content
  const getMarkdownContent = () => {
    return `# ${data.title || 'Meeting Report'}

**Meeting ID:** \`${data.meeting_id}\`  
**Language:** ${data.language || 'English'}  
**Word Count:** ${data.word_count || 0}  
**Date:** ${new Date().toLocaleString()}  

---

## Executive Summary
${data.summary || 'No summary available.'}

---

## Action Items
${data.action_items || 'No action items recorded.'}

---

## Key Decisions
${data.key_decisions || 'No key decisions recorded.'}

---

## Open Questions & Follow-ups
${data.open_questions || 'No open questions recorded.'}

---

## Full Transcript
${data.transcript || ''}
`;
  };

  const downloadFile = (content, fileName, contentType) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Meeting Header Banner */}
      <div className="hero-container" style={{ padding: '24px 0 20px 0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge-pill badge-yellow">
                {data.language || 'English'}
              </span>
              <span className="badge-pill badge-black">
                ID: {data.meeting_id}
                <button
                  type="button"
                  onClick={() => copyToClipboard(data.meeting_id, 'meeting_id')}
                  style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', padding: '0 2px', display: 'inline-flex', alignItems: 'center' }}
                  title="Copy Meeting ID"
                >
                  {copiedField === 'meeting_id' ? <Check size={11} color="#FFD21F" /> : <Copy size={11} />}
                </button>
              </span>
              <span className="badge-pill badge-muted">
                ENGINE: {data.engine || 'Direct Local Pipeline'}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
              {data.title || 'Meeting Analysis'}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onExportPdf(data)}
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div className="metric-container">
        <div className="metric-card">
          <div className="metric-label">Word Count</div>
          <div className="metric-value">{data.word_count ? data.word_count.toLocaleString() : 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Character Count</div>
          <div className="metric-value">{data.char_count ? data.char_count.toLocaleString() : 0}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Inference Model</div>
          <div className="metric-value" style={{ fontSize: '1.35rem' }}>LLaMA 3.2</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Vector Cache</div>
          <div className="metric-value" style={{ fontSize: '1.35rem' }}>Redis VL</div>
        </div>
      </div>

      {/* Video Preview Embed if YouTube URL is detected */}
      {youtubeEmbedUrl && (
        <div className="swiss-card" style={{ marginBottom: '24px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Video size={16} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
              VIDEO SOURCE PLAYER
            </span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: '42%', maxHeight: '420px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--border-black)' }}>
            <iframe
              src={youtubeEmbedUrl}
              title="YouTube video player"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Swiss Editorial Tabs Navigation */}
      <div className="tabs-header">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <FileText size={15} />
          Executive Summary
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
          onClick={() => setActiveTab('actions')}
        >
          <CheckSquare size={15} />
          Action Items &amp; Decisions
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <HelpCircle size={15} />
          Open Questions
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={15} />
          Meeting Chat (RAG)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          <ScrollText size={15} />
          Transcript Workspace
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'inngest' ? 'active' : ''}`}
          onClick={() => setActiveTab('inngest')}
        >
          <GitBranch size={15} />
          Inngest Trace
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          <Download size={15} />
          Export Center
        </button>
      </div>

      {/* TAB 1: Executive Summary */}
      {activeTab === 'summary' && (
        <div className="swiss-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge-pill badge-yellow">EXECUTIVE BRIEF</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {data.word_count?.toLocaleString()} words synthesized
              </span>
            </div>
            <button
              type="button"
              className="copy-btn"
              onClick={() => copyToClipboard(data.summary || '', 'summary')}
            >
              {copiedField === 'summary' ? <Check size={13} color="#15803D" /> : <Copy size={13} />}
              {copiedField === 'summary' ? 'Copied' : 'Copy Summary'}
            </button>
          </div>
          <div className="content-box" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-card)', border: '1px solid var(--border-black)' }}>
            {data.summary || 'No summary generated for this meeting.'}
          </div>
        </div>
      )}

      {/* TAB 2: Action Items & Decisions */}
      {activeTab === 'actions' && (
        <div className="split-grid">
          {/* Action Items */}
          <div className="swiss-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <span className="badge-pill badge-yellow">DELIVERABLES</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.2rem', fontWeight: 800 }}>
                  Action Items Checklist
                </h3>
              </div>
              <button
                type="button"
                className="copy-btn"
                onClick={() => copyToClipboard(data.action_items || '', 'actions')}
              >
                {copiedField === 'actions' ? <Check size={13} color="#15803D" /> : <Copy size={13} />}
                {copiedField === 'actions' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {parsedActionItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {parsedActionItems.map((item) => (
                  <div 
                    key={item.id}
                    className={`checklist-item ${checkedItems[item.id] ? 'done' : ''}`}
                    onClick={() => toggleCheckItem(item.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      className="checklist-checkbox"
                      checked={Boolean(checkedItems[item.id])}
                      onChange={() => toggleCheckItem(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="checklist-text" style={{ fontSize: '0.92rem', lineHeight: '1.5' }}>
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="content-box" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-canvas)' }}>
                {data.action_items || 'No action items identified.'}
              </div>
            )}
          </div>

          {/* Key Decisions */}
          <div className="swiss-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <span className="badge-pill badge-black">CONSENSUS</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.2rem', fontWeight: 800 }}>
                  Key Decisions Reached
                </h3>
              </div>
              <button
                type="button"
                className="copy-btn"
                onClick={() => copyToClipboard(data.key_decisions || '', 'decisions')}
              >
                {copiedField === 'decisions' ? <Check size={13} color="#15803D" /> : <Copy size={13} />}
                {copiedField === 'decisions' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="content-box" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-canvas)' }}>
              {data.key_decisions || 'No key decisions identified.'}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Open Questions */}
      {activeTab === 'questions' && (
        <div className="swiss-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <span className="badge-pill badge-muted">UNRESOLVED</span>
              <h3 style={{ margin: '6px 0 0 0', fontSize: '1.2rem', fontWeight: 800 }}>
                Open Questions &amp; Follow-ups
              </h3>
            </div>
            <button
              type="button"
              className="copy-btn"
              onClick={() => copyToClipboard(data.open_questions || '', 'questions')}
            >
              {copiedField === 'questions' ? <Check size={13} color="#15803D" /> : <Copy size={13} />}
              {copiedField === 'questions' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div className="content-box" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-canvas)' }}>
            {data.open_questions || 'No open questions or unresolved topics.'}
          </div>
        </div>
      )}

      {/* TAB 4: Meeting Chat (RAG) */}
      {activeTab === 'chat' && (
        <div className="swiss-card chat-container">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge-pill badge-yellow">RAG KNOWLEDGE BASE</span>
              <span className="badge-pill badge-muted">REDIS SEMANTIC CACHING</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '0 0 14px 0' }}>
              Ask questions grounded strictly in the meeting transcript context. Repeated or semantically similar queries are served instantly by <b>Redis Semantic Cache</b>.
            </p>

            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              SUGGESTED QUESTIONS:
            </span>
            <div className="suggested-prompts" style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="suggested-btn"
                onClick={() => handleSendChat("What were the key decisions made in this meeting?")}
              >
                What were the key decisions?
              </button>
              <button
                type="button"
                className="suggested-btn"
                onClick={() => handleSendChat("Who was assigned action items and what are the next steps?")}
              >
                Who has assigned action items?
              </button>
              <button
                type="button"
                className="suggested-btn"
                onClick={() => handleSendChat("What questions or issues remained unresolved?")}
              >
                What remained unresolved?
              </button>
            </div>
          </div>

          {/* Chat Message History */}
          <div className="chat-history">
            {chatHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                <MessageSquare size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                <p style={{ fontSize: '0.92rem', margin: 0, fontWeight: 600 }}>
                  Start a conversation about this meeting or click one of the suggested prompts above.
                </p>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div>
                      {msg.cached === true ? (
                        <span className="cache-hit-tag">
                          <Zap size={10} />
                          REDIS SEMANTIC CACHE HIT
                        </span>
                      ) : (
                        <span className="cache-miss-tag">
                          <Database size={10} />
                          CHROMADB RETRIEVAL
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isChatLoading && (
              <div className="chat-message assistant" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="spinner" style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                  Searching meeting context and generating grounded answer...
                </span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <div className="chat-input-bar">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask a question about this meeting..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isChatLoading}
            />
            <button
              type="button"
              className="chat-send-btn"
              onClick={() => handleSendChat()}
              disabled={!chatInput.trim() || isChatLoading}
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: Full Transcript */}
      {activeTab === 'transcript' && (
        <div className="swiss-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                className="text-input"
                style={{ paddingLeft: '38px', borderRadius: 'var(--radius-pill)' }}
                placeholder="Filter transcript keywords..."
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {transcriptSearch.trim() && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  Found {searchMatches} match(es)
                </span>
              )}
              <button
                type="button"
                className="copy-btn"
                onClick={() => copyToClipboard(transcriptText, 'transcript')}
              >
                {copiedField === 'transcript' ? <Check size={13} color="#15803D" /> : <Copy size={13} />}
                {copiedField === 'transcript' ? 'Copied' : 'Copy All Transcript'}
              </button>
            </div>
          </div>

          <textarea
            readOnly
            value={transcriptText}
            rows={18}
            style={{
              width: '100%',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-black)',
              borderRadius: '8px',
              padding: '18px',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              lineHeight: '1.7',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* TAB 6: Inngest Workflow Trace */}
      {activeTab === 'inngest' && (
        <div className="swiss-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                <span className="badge-pill badge-yellow">INNGEST ORCHESTRATION</span>
                <span className="badge-pill badge-black">PORT 8288</span>
                <span className="badge-pill badge-muted">8 RESILIENT STEPS</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                8-Step Durable Workflow Architecture
              </h3>
            </div>
            <a
              href="http://localhost:8288/runs"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-black"
              style={{ padding: '8px 18px', fontSize: '0.8rem' }}
            >
              Open Inngest Dev Dashboard
              <ExternalLink size={13} />
            </a>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 18px 0' }}>
            Function <code>process-meeting</code> executes durable steps with automatic retries, step caching, and step-level observability on Inngest Dev Server.
          </p>

          <div className="workflow-grid">
            {inngestSteps.map((s, idx) => (
              <div key={idx} className="workflow-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="step-num">{s.num}</span>
                  <span className="badge-pill badge-yellow" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                    {s.status}
                  </span>
                </div>
                <div className="step-name">{s.name}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
            ))}
          </div>

          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '24px 0 12px 0' }}>
            Live Inngest Server Console (localhost:8288/runs)
          </h4>
          <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-black)' }}>
            <iframe
              src="http://localhost:8288/runs"
              title="Inngest Dev Runs"
              style={{ width: '100%', height: '480px', border: 'none', background: 'var(--bg-canvas)' }}
            />
          </div>
        </div>
      )}

      {/* TAB 7: Export Center */}
      {activeTab === 'export' && (
        <div className="swiss-card">
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800 }}>
            Export Documentation Center
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '0 0 20px 0' }}>
            Download complete meeting analysis in clean Markdown, ReportLab PDF, or structured JSON.
          </p>

          <div className="export-grid">
            {/* Markdown */}
            <div className="export-card">
              <span className="badge-pill badge-yellow">MARKDOWN FORMAT</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Markdown (.md)</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Formatted markdown document with sections, deliverables checklist, decisions, and full transcript.
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => downloadFile(
                  getMarkdownContent(),
                  `meeting_report_${data.meeting_id}.md`,
                  'text/markdown'
                )}
              >
                <ArrowDownToLine size={14} />
                Download Markdown (.md)
              </button>
            </div>

            {/* ReportLab PDF */}
            <div className="export-card">
              <span className="badge-pill badge-black">REPORTLAB PDF</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>PDF Report (.pdf)</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Executive document generated by FastAPI ReportLab with cover page, structured tables, and checklists.
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => onExportPdf(data)}
              >
                <ArrowDownToLine size={14} />
                Download PDF Report (.pdf)
              </button>
            </div>

            {/* JSON Data */}
            <div className="export-card">
              <span className="badge-pill badge-muted">STRUCTURED DATA</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>JSON Data (.json)</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Raw JSON containing deterministic meeting metadata, transcript, word count, and extracted insights.
              </p>
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => downloadFile(
                  JSON.stringify(data, null, 2),
                  `meeting_data_${data.meeting_id}.json`,
                  'application/json'
                )}
              >
                <ArrowDownToLine size={14} />
                Download JSON (.json)
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
