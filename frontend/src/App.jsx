import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import WelcomeView from './components/WelcomeView';
import ProcessingView from './components/ProcessingView';
import MeetingDashboard from './components/MeetingDashboard';
import MeetingHistoryDrawer from './components/MeetingHistoryDrawer';

export default function App() {
  // Input configuration states
  const [sourceType, setSourceType] = useState('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [language, setLanguage] = useState('english');
  const [workflowEngine, setWorkflowEngine] = useState('direct');

  // Processing & Run states
  const [isProcessing, setIsProcessing] = useState(false);
  const [inngestEventId, setInngestEventId] = useState(null);
  const [meetingData, setMeetingData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // History Drawer state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Diagnostics & History
  const [diagnostics, setDiagnostics] = useState({
    api: true,
    ollama: false,
    redis: false,
    inngest: false,
  });
  const [recentRuns, setRecentRuns] = useState([]);
  const [latestRun, setLatestRun] = useState(null);

  // Chat states
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Fetch diagnostics on mount and periodic interval
  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch {
      // Backend may be starting up
    }
  };

  const parseResponseError = async (res, defaultMsg) => {
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        return json.detail || json.message || defaultMsg;
      } catch {
        return text || `${defaultMsg} (HTTP ${res.status})`;
      }
    } catch {
      return `${defaultMsg} (HTTP ${res.status})`;
    }
  };

  // Fetch saved runs from .inngest_results
  const fetchRuns = async () => {
    try {
      const [runsRes, latestRes] = await Promise.all([
        fetch('/api/runs'),
        fetch('/api/runs/latest'),
      ]);

      if (runsRes.ok) {
        const data = await runsRes.json();
        setRecentRuns(data.runs || []);
      }
      if (latestRes.ok) {
        const data = await latestRes.json();
        if (data && data.status !== 'no_runs' && data.title) {
          setLatestRun(data);
        } else {
          setLatestRun(null);
        }
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchRuns();
    const interval = setInterval(fetchDiagnostics, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle meeting processing
  const handleProcess = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setInngestEventId(null);

    try {
      let resolvedSource = '';

      // Step 1: Upload file if file mode
      if (sourceType === 'file' || sourceType === 'record') {
        if (!uploadedFile) {
          throw new Error('Please select an audio/video file or record audio first.');
        }

        const formData = new FormData();
        formData.append('file', uploadedFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const detail = await parseResponseError(uploadRes, 'File upload failed');
          throw new Error(detail);
        }

        const uploadData = await uploadRes.json();
        resolvedSource = uploadData.filepath;
      } else {
        if (!youtubeUrl || !youtubeUrl.trim()) {
          throw new Error('Please enter a YouTube video URL.');
        }
        resolvedSource = youtubeUrl.trim();
      }

      // Step 2: Dispatch based on engine
      if (workflowEngine === 'direct') {
        const res = await fetch('/api/process-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: resolvedSource,
            language: language,
          }),
        });

        if (!res.ok) {
          const detail = await parseResponseError(res, 'Pipeline execution failed');
          throw new Error(detail);
        }

        const data = await res.json();
        setMeetingData(data);
        setChatHistory([]);
        fetchRuns();
      } else {
        // Inngest Durable Workflow
        const res = await fetch('/process-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: resolvedSource,
            language: language,
          }),
        });

        if (!res.ok) {
          const detail = await parseResponseError(res, 'Failed to dispatch Inngest event');
          throw new Error(detail);
        }

        const eventData = await res.json();
        setInngestEventId(eventData.event_ids?.[0] || 'accepted');

        // Poll for completion from .inngest_results/latest.json
        const startTime = Date.now();
        const timeoutMs = 600000; // 10 minutes
        let completedData = null;

        while (Date.now() - startTime < timeoutMs) {
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const checkRes = await fetch('/api/runs/latest');
            if (checkRes.ok) {
              const candidate = await checkRes.json();
              if (candidate.status === 'completed' && candidate.transcript) {
                completedData = candidate;
                break;
              }
            }
          } catch {
            // keep polling
          }
        }

        if (!completedData) {
          throw new Error('Inngest workflow run timed out or was interrupted. Check http://localhost:8288/runs');
        }

        setMeetingData(completedData);
        setChatHistory([]);
        fetchRuns();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred during processing');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle loading a prior run from history
  const handleLoadRun = async (meetingId) => {
    try {
      const endpoint = meetingId === 'latest' ? '/api/runs/latest' : `/api/runs/${meetingId}`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Could not load meeting run');
      const data = await res.json();
      setMeetingData(data);
      setChatHistory([]);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load run');
    }
  };

  // Handle RAG Chat messages
  const handleSendMessage = async (question) => {
    if (!meetingData || !question.trim() || isChatLoading) return;

    const userMsg = { role: 'user', content: question };
    setChatHistory((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meetingData.meeting_id,
          question: question,
        }),
      });

      if (!res.ok) {
        const detail = await parseResponseError(res, 'Chat query failed');
        throw new Error(detail);
      }

      const data = await res.json();
      const assistantMsg = {
        role: 'assistant',
        content: data.answer,
        cached: data.cached,
      };
      setChatHistory((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${err.message || 'Failed to generate answer. Ensure Ollama & ChromaDB are available.'}`,
          cached: false,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle PDF Export download
  const handleExportPdf = async (data) => {
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: data.meeting_id,
          title: data.title,
          summary: data.summary,
          action_items: data.action_items,
          key_decisions: data.key_decisions,
          open_questions: data.open_questions,
        }),
      });

      if (!res.ok) throw new Error('PDF export failed on server');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting_report_${data.meeting_id || 'analysis'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Could not export PDF: ${err.message}`);
    }
  };

  // Reset to landing state
  const handleReset = () => {
    setMeetingData(null);
    setChatHistory([]);
    setErrorMessage(null);
    setYoutubeUrl('');
    setUploadedFile(null);
  };

  return (
    <div className="app-root">
      {/* Top Swiss Header Navigation */}
      <Header
        diagnostics={diagnostics}
        recentRunsCount={recentRuns.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        meetingData={meetingData}
        onReset={handleReset}
      />

      {/* Main Layout Area */}
      <div className="app-layout">
        {/* Optional companion sidebar when meeting is loaded */}
        {meetingData && !isProcessing && (
          <Sidebar
            sourceType={sourceType}
            setSourceType={setSourceType}
            youtubeUrl={youtubeUrl}
            setYoutubeUrl={setYoutubeUrl}
            uploadedFile={uploadedFile}
            setUploadedFile={setUploadedFile}
            language={language}
            setLanguage={setLanguage}
            workflowEngine={workflowEngine}
            setWorkflowEngine={setWorkflowEngine}
            onProcess={handleProcess}
            isProcessing={isProcessing}
            diagnostics={diagnostics}
            meetingData={meetingData}
            onReset={handleReset}
            recentRuns={recentRuns}
            onLoadRun={handleLoadRun}
          />
        )}

        <main className="app-main">
          {/* Error Message Banner (Swiss Alert style) */}
          {errorMessage && (
            <div 
              style={{ 
                background: 'var(--color-error-bg)', 
                border: '1px solid var(--border-black)', 
                borderRadius: '8px', 
                padding: '12px 18px', 
                color: 'var(--color-error)', 
                marginBottom: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--shadow-crisp)',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              <span>⚠️ {errorMessage}</span>
              <button 
                type="button" 
                onClick={() => setErrorMessage(null)}
                style={{ 
                  background: 'none', 
                  border: '1px solid var(--border-black)', 
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-main)', 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}
              >
                ✕
              </button>
            </div>
          )}

          {isProcessing ? (
            <ProcessingView 
              workflowEngine={workflowEngine} 
              inngestEventId={inngestEventId} 
            />
          ) : meetingData ? (
            <MeetingDashboard
              data={meetingData}
              chatHistory={chatHistory}
              onSendMessage={handleSendMessage}
              isChatLoading={isChatLoading}
              onExportPdf={handleExportPdf}
            />
          ) : (
            <WelcomeView
              sourceType={sourceType}
              setSourceType={setSourceType}
              youtubeUrl={youtubeUrl}
              setYoutubeUrl={setYoutubeUrl}
              uploadedFile={uploadedFile}
              setUploadedFile={setUploadedFile}
              language={language}
              setLanguage={setLanguage}
              workflowEngine={workflowEngine}
              setWorkflowEngine={setWorkflowEngine}
              onProcess={handleProcess}
              isProcessing={isProcessing}
              inngestOnline={diagnostics.inngest}
              latestRun={latestRun}
              onLoadRun={handleLoadRun}
            />
          )}
        </main>
      </div>

      {/* Slide-out Meeting History Drawer */}
      <MeetingHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        recentRuns={recentRuns}
        onLoadRun={handleLoadRun}
      />
    </div>
  );
}
