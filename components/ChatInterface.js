'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Users, Copy, Download, RefreshCw, ChevronDown, ChevronUp, Trophy, Zap, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';

// ─── Constants ────────────────────────────────────────────────────────────────

const GREETING = {
  id: 'greeting',
  role: 'assistant',
  type: 'text',
  content: `SYSTEM ONLINE. ClarAI v2 ready.\n\nWhat do you need me to create for you?`,
  ts: Date.now(),
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '5px', padding: '14px 16px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--primary-neon)',
          animation: 'pulse 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
          display: 'inline-block',
        }} />
      ))}
    </div>
  );
}

function CouncilStageIndicator({ stage }) {
  const stages = [
    { n: 1, label: 'Querying models' },
    { n: 2, label: 'Peer ranking'    },
    { n: 3, label: 'Synthesising'    },
  ];
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: 10 }}>
        <Users size={14} color="var(--secondary-neon)" />
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.72rem', color: 'var(--secondary-neon)', letterSpacing: 1 }}>
          COUNCIL IN SESSION
        </span>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {stages.map(s => (
          <div key={s.n} style={{
            flex: 1, padding: '8px 10px', borderRadius: 4,
            border: `1px solid ${stage >= s.n ? 'var(--secondary-neon)' : 'var(--glass-border)'}`,
            background: stage === s.n ? 'rgba(188,19,254,0.12)' : stage > s.n ? 'rgba(188,19,254,0.05)' : 'transparent',
            transition: 'all 0.3s ease',
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: stage >= s.n ? 'var(--secondary-neon)' : 'var(--text-dim)' }}>
              {stage > s.n ? '✓' : stage === s.n ? '▶' : '○'} STAGE {s.n}
            </div>
            <div style={{ fontSize: '0.72rem', color: stage >= s.n ? 'var(--text-main)' : 'var(--text-dim)', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouncilPanel({ meta }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('rankings');
  const [expanded, setExpanded] = useState(null);
  if (!meta) return null;

  const tabBtn = (t, label) => (
    <button onClick={() => setTab(t)} style={{
      padding: '5px 12px',
      background: tab === t ? 'rgba(188,19,254,0.2)' : 'transparent',
      border: `1px solid ${tab === t ? 'var(--secondary-neon)' : 'var(--glass-border)'}`,
      color: tab === t ? 'var(--secondary-neon)' : 'var(--text-dim)',
      borderRadius: 3, cursor: 'pointer',
      fontFamily: 'var(--font-heading)', fontSize: '0.7rem', letterSpacing: 1, textTransform: 'uppercase',
    }}>{label}</button>
  );

  return (
    <div style={{ marginTop: 10, border: '1px solid rgba(188,19,254,0.2)', borderRadius: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(p => !p)} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '9px 14px', background: 'rgba(188,19,254,0.07)',
        cursor: 'pointer', borderBottom: open ? '1px solid rgba(188,19,254,0.15)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={13} color="var(--secondary-neon)" />
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem', color: 'var(--secondary-neon)', letterSpacing: 1, textTransform: 'uppercase' }}>
            Council Report
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {meta.membersResponded}/{meta.membersQueried} responded
            {meta.chairmanFailed ? ` · fallback: ${meta.fallbackMember}` : ''}
          </span>
        </div>
        {open ? <ChevronUp size={13} color="var(--secondary-neon)" /> : <ChevronDown size={13} color="var(--secondary-neon)" />}
      </div>

      {open && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {tabBtn('rankings', 'Rankings')}
            {tabBtn('responses', 'Responses')}
          </div>

          {tab === 'rankings' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  {['#','Model','Avg Rank','Votes'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: h === '#' || h === 'Avg Rank' || h === 'Votes' ? 'center' : 'left', color: 'var(--secondary-neon)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meta.aggregateRankings?.map((r, i) => (
                  <tr key={r.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i === 0 ? 'rgba(188,19,254,0.05)' : 'transparent' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: i === 0 ? 'var(--secondary-neon)' : 'var(--text-dim)' }}>{i === 0 ? '🏆' : i + 1}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-main)' }}>{r.label}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--primary-neon)' }}>{r.avgRank?.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-dim)' }}>{r.votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'responses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {meta.stage1Responses?.map(r => (
                <div key={r.label} style={{ border: '1px solid var(--glass-border)', borderRadius: 6, overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(p => p === r.label ? null : r.label)} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', cursor: 'pointer',
                    background: expanded === r.label ? 'rgba(0,243,255,0.05)' : 'rgba(255,255,255,0.02)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem', color: 'var(--primary-neon)', letterSpacing: 1, textTransform: 'uppercase' }}>{r.label}</span>
                    {expanded === r.label ? <ChevronUp size={12} color="var(--text-dim)" /> : <ChevronDown size={12} color="var(--text-dim)" />}
                  </div>
                  {expanded === r.label && (
                    <div className="md-content" style={{ padding: '12px 16px', maxHeight: 360, overflowY: 'auto', fontSize: '0.88rem', lineHeight: 1.65 }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, onCopy, onExportPDF }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.(msg.content);
  };

  // User bubble
  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }} className="animate-fadeup">
        <div style={{
          maxWidth: '72%', padding: '10px 14px',
          background: 'rgba(0,243,255,0.08)',
          border: '1px solid rgba(0,243,255,0.2)',
          borderRadius: '12px 12px 2px 12px',
          fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.55, color: 'var(--text-main)',
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  // System/assistant text bubble
  if (msg.type === 'text' || msg.type === 'question') {
    return (
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }} className="animate-fadeup">
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          border: '1px solid var(--primary-neon)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-heading)', fontSize: '0.55rem', color: 'var(--primary-neon)',
          letterSpacing: 0, marginTop: 2,
        }}>AI</div>

        <div style={{ flex: 1, maxWidth: '82%' }}>
          <div style={{
            padding: '10px 14px',
            background: 'rgba(20,20,30,0.7)',
            border: '1px solid var(--glass-border)',
            borderRadius: '2px 12px 12px 12px',
          }}>
            <div className="md-content" style={{ fontFamily: 'var(--font-body)', fontSize: '1rem' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          </div>
          {/* Time */}
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 4, paddingLeft: 4, fontFamily: 'monospace' }}>
            {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  // Final generated result bubble
  if (msg.type === 'result') {
    return (
      <div style={{ marginBottom: 16 }} className="animate-fadeup">
        {/* Result header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px',
          background: msg.councilMeta ? 'rgba(188,19,254,0.1)' : 'rgba(0,243,255,0.08)',
          border: `1px solid ${msg.councilMeta ? 'rgba(188,19,254,0.3)' : 'rgba(0,243,255,0.2)'}`,
          borderBottom: 'none',
          borderRadius: '8px 8px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {msg.councilMeta
              ? <Users size={14} color="var(--secondary-neon)" />
              : <Zap size={14} color="var(--primary-neon)" />}
            <span style={{
              fontFamily: 'var(--font-heading)', fontSize: '0.7rem', letterSpacing: 1, textTransform: 'uppercase',
              color: msg.councilMeta ? 'var(--secondary-neon)' : 'var(--primary-neon)',
            }}>
              {msg.councilMeta ? 'Council Output' : 'Generated Output'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleCopy} style={{
              background: 'transparent', border: '1px solid var(--glass-border)',
              color: copied ? '#28c840' : 'var(--text-dim)',
              padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
              fontFamily: 'var(--font-heading)', fontSize: '0.65rem', letterSpacing: 1,
              display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase',
            }}>
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={() => onExportPDF?.(msg.content)} style={{
              background: 'transparent', border: '1px solid var(--glass-border)',
              color: 'var(--text-dim)', padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
              fontFamily: 'var(--font-heading)', fontSize: '0.65rem', letterSpacing: 1,
              display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase',
            }}>
              <Download size={11} /> PDF
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="md-content" style={{
          padding: '16px 18px',
          background: 'rgba(5,5,10,0.85)',
          border: `1px solid ${msg.councilMeta ? 'rgba(188,19,254,0.3)' : 'rgba(0,243,255,0.2)'}`,
          borderTop: 'none',
          borderRadius: msg.councilMeta ? '0' : '0 0 8px 8px',
          fontSize: '0.95rem', lineHeight: 1.7,
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          <span className="cursor-blink" style={{ display: 'inline-block', width: 7, height: 14, background: 'var(--primary-neon)', verticalAlign: 'middle', marginLeft: 4 }} />
        </div>

        {/* Council panel */}
        {msg.councilMeta && (
          <div style={{ border: `1px solid rgba(188,19,254,0.3)`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
            <CouncilPanel meta={msg.councilMeta} />
          </div>
        )}

        {/* Timestamp */}
        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 5, paddingLeft: 4, fontFamily: 'monospace' }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main Chat Component ──────────────────────────────────────────────────────

export default function ChatInterface() {
  const [messages, setMessages]       = useState([GREETING]);
  const [input, setInput]             = useState('');
  const [councilMode, setCouncilMode] = useState(false);
  const [phase, setPhase]             = useState('intake'); // 'intake' | 'generating'
  const [councilStage, setCouncilStage] = useState(0);
  const [typing, setTyping]           = useState(false);
  const [intent, setIntent]           = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const historyRef = useRef([]); // raw {role, content} history for API

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const pushMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  // ── Send handler ────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || phase === 'generating') return;

    setInput('');

    // Add user bubble
    const userMsg = { id: Date.now(), role: 'user', type: 'text', content: text, ts: Date.now() };
    pushMessage(userMsg);
    historyRef.current.push({ role: 'user', content: text });

    setTyping(true);

    // ── Intake phase ──────────────────────────────────────────────────────
    if (phase === 'intake') {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'intake', history: historyRef.current }),
        });
        const data = await res.json();
        setTyping(false);

        if (data.error) {
          pushMessage({ id: Date.now(), role: 'assistant', type: 'text', content: `Error: ${data.error}`, ts: Date.now() });
          return;
        }

        if (data.done) {
          // Intent resolved — confirm and generate
          setIntent(data.intent);
          historyRef.current.push({ role: 'assistant', content: 'Intent captured. Generating now...' });

          // Show confirmation bubble
          const confirmText = councilMode
            ? `Got it. Convening the council — **8 models** will debate this across 3 stages.\n\n_This takes ~30–60 seconds. Hang tight._`
            : `Got it. Generating your ${data.intent.outputType || 'response'} now...`;

          pushMessage({ id: Date.now(), role: 'assistant', type: 'text', content: confirmText, ts: Date.now() });

          // Kick off generation
          await runGeneration(data.intent, councilMode);
        } else {
          // Another follow-up question
          const reply = data.reply || 'Could you tell me more?';
          historyRef.current.push({ role: 'assistant', content: reply });
          pushMessage({ id: Date.now(), role: 'assistant', type: 'question', content: reply, ts: Date.now() });
        }
      } catch (err) {
        setTyping(false);
        pushMessage({ id: Date.now(), role: 'assistant', type: 'text', content: `Network error: ${err.message}`, ts: Date.now() });
      }
    }
  }, [input, phase, councilMode, pushMessage]);

  // ── Generation ──────────────────────────────────────────────────────────────
  const runGeneration = useCallback(async (resolvedIntent, withCouncil) => {
    setPhase('generating');
    setTyping(false);

    if (withCouncil) {
      // Show stage tracker
      const stageId = `stage-${Date.now()}`;
      setMessages(prev => [...prev, { id: stageId, role: 'assistant', type: 'stage', content: '', stage: 1, ts: Date.now() }]);
      setCouncilStage(1);
    } else {
      setTyping(true);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate', intent: resolvedIntent, useCouncil: withCouncil }),
      });

      const data = await res.json();
      setTyping(false);
      setCouncilStage(0);

      // Remove stage indicator
      setMessages(prev => prev.filter(m => m.type !== 'stage'));

      if (!data.success) {
        pushMessage({ id: Date.now(), role: 'assistant', type: 'text', content: `Generation failed: ${data.error}`, ts: Date.now() });
        setPhase('done');
        return;
      }

      pushMessage({
        id: Date.now(),
        role: 'assistant',
        type: 'result',
        content: data.data,
        councilMeta: data.councilMeta ?? null,
        ts: Date.now(),
      });

      setPhase('done');
    } catch (err) {
      setTyping(false);
      setCouncilStage(0);
      setMessages(prev => prev.filter(m => m.type !== 'stage'));
      pushMessage({ id: Date.now(), role: 'assistant', type: 'text', content: `Error: ${err.message}`, ts: Date.now() });
      setPhase('done');
    }
  }, [pushMessage]);

  // ── New conversation ─────────────────────────────────────────────────────────
  const handleReset = () => {
    setMessages([{ ...GREETING, ts: Date.now() }]);
    setPhase('intake');
    setIntent(null);
    setCouncilStage(0);
    setTyping(false);
    setInput('');
    historyRef.current = [];
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleExportPDF = (content) => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(content.replace(/[#*`]/g, ''), 180);
    doc.text(lines, 10, 10);
    doc.save('ClarAI-output.pdf');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const isInputDisabled = phase === 'generating';
  const placeholder = phase === 'generating'
    ? 'Council in session...'
    : phase === 'done'
    ? 'Ask a follow-up or start over...'
    : 'Type your message...';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      maxWidth: 780, margin: '0 auto', padding: '0 12px',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 0 10px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="neon-text" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 700, letterSpacing: 2 }}>
            ClarAI
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--text-dim)', border: '1px solid var(--glass-border)', padding: '2px 7px', borderRadius: 3 }}>
            v2
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Council toggle */}
          <div
            onClick={() => phase !== 'generating' && setCouncilMode(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 10px', borderRadius: 20,
              border: `1px solid ${councilMode ? 'var(--secondary-neon)' : 'var(--glass-border)'}`,
              background: councilMode ? 'rgba(188,19,254,0.08)' : 'transparent',
              cursor: phase === 'generating' ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease', opacity: phase === 'generating' ? 0.5 : 1,
            }}
          >
            <Users size={13} color={councilMode ? 'var(--secondary-neon)' : 'var(--text-dim)'} />
            <span style={{
              fontFamily: 'var(--font-heading)', fontSize: '0.65rem', letterSpacing: 1,
              color: councilMode ? 'var(--secondary-neon)' : 'var(--text-dim)',
              textTransform: 'uppercase',
            }}>
              {councilMode ? 'Council ON' : 'Council'}
            </span>
            {/* pill */}
            <div style={{
              width: 28, height: 15, borderRadius: 8, position: 'relative',
              background: councilMode ? 'var(--secondary-neon)' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.25s',
            }}>
              <div style={{
                position: 'absolute', top: 2, left: councilMode ? 15 : 2,
                width: 11, height: 11, borderRadius: '50%', background: '#fff',
                transition: 'left 0.25s',
              }} />
            </div>
          </div>

          {/* Reset */}
          <button onClick={handleReset} style={{
            background: 'transparent', border: '1px solid var(--glass-border)',
            color: 'var(--text-dim)', padding: '5px 10px', borderRadius: 4,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-heading)', fontSize: '0.65rem', letterSpacing: 1, textTransform: 'uppercase',
          }}>
            <RefreshCw size={12} /> New
          </button>
        </div>
      </div>

      {/* ── Message list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 0 8px' }}>
        {messages.map(msg => {
          if (msg.type === 'stage') {
            return (
              <div key={msg.id} className="animate-fadeup" style={{
                background: 'rgba(5,5,10,0.8)',
                border: '1px solid rgba(188,19,254,0.25)',
                borderRadius: 8, marginBottom: 14,
              }}>
                <CouncilStageIndicator stage={councilStage} />
              </div>
            );
          }
          return (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onExportPDF={handleExportPDF}
            />
          );
        })}

        {typing && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }} className="animate-fadeup">
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              border: '1px solid var(--primary-neon)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-heading)', fontSize: '0.55rem', color: 'var(--primary-neon)',
            }}>AI</div>
            <div style={{
              background: 'rgba(20,20,30,0.7)', border: '1px solid var(--glass-border)',
              borderRadius: '2px 12px 12px 12px',
            }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={{
        flexShrink: 0, padding: '10px 0 16px',
        borderTop: '1px solid var(--glass-border)',
      }}>
        {/* Phase hint */}
        {phase !== 'generating' && (
          <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 'done' ? 'var(--secondary-neon)' : 'var(--primary-neon)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              {phase === 'intake' ? 'INTAKE — tell me what you need' : 'SESSION COMPLETE — ask a follow-up or start new'}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            placeholder={placeholder}
            rows={1}
            style={{
              flex: 1, padding: '10px 14px',
              background: 'rgba(5,5,10,0.7)',
              border: `1px solid ${isInputDisabled ? 'var(--glass-border)' : 'rgba(0,243,255,0.25)'}`,
              borderRadius: 8, color: 'var(--text-main)',
              fontFamily: 'var(--font-body)', fontSize: '1rem',
              outline: 'none', resize: 'none',
              transition: 'border-color 0.2s ease',
              opacity: isInputDisabled ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={isInputDisabled || !input.trim()}
            className="btn-primary"
            style={{
              padding: '10px 16px', alignSelf: 'flex-end', flexShrink: 0,
              borderColor: councilMode ? 'var(--secondary-neon)' : 'var(--primary-neon)',
              color: councilMode ? 'var(--secondary-neon)' : 'var(--primary-neon)',
            }}
          >
            <Send size={16} />
          </button>
        </div>
        <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: '0.62rem', color: 'var(--text-dim)', textAlign: 'right' }}>
          Shift+Enter for newline · Enter to send
        </div>
      </div>
    </div>
  );
}
