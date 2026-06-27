'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Users, Copy, Download, RefreshCw,
  ChevronDown, ChevronUp, Trophy, Zap, Check,
  Terminal, Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from 'jspdf';

const GREETING = {
  id: 'greeting',
  role: 'assistant',
  type: 'text',
  content: `Hello. What do you need me to create for you?`,
  ts: Date.now(),
};

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '12px 16px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--cyan)', display: 'inline-block',
          animation: 'pulse 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`, opacity: 0.7,
        }} />
      ))}
    </div>
  );
}

function CouncilProgress({ stage }) {
  const steps = [
    { n: 1, label: 'Querying 8 models' },
    { n: 2, label: 'Peer ranking'      },
    { n: 3, label: 'Chairman synthesis'},
  ];
  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Users size={13} color="var(--purple)" />
        <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.6rem', letterSpacing: '2px', color: 'var(--purple)', textTransform: 'uppercase' }}>
          Council in session
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {steps.map(s => {
          const done   = stage > s.n;
          const active = stage === s.n;
          return (
            <div key={s.n} style={{
              flex: 1, padding: '10px 12px', borderRadius: 4,
              border: `1px solid ${done ? 'rgba(0,255,157,0.3)' : active ? 'rgba(188,19,254,0.5)' : 'var(--border)'}`,
              background: done ? 'rgba(0,255,157,0.04)' : active ? 'rgba(188,19,254,0.08)' : 'transparent',
            }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '0.55rem', letterSpacing: '1px', color: done ? 'var(--green)' : active ? 'var(--purple)' : 'var(--dimmer)', marginBottom: 4 }}>
                {done ? '✓' : active ? '▶' : '○'} STAGE {s.n}
              </div>
              <div style={{ fontSize: '0.78rem', color: done || active ? 'var(--text)' : 'var(--dim)', fontFamily: 'var(--font-body)' }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CouncilPanel({ meta }) {
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState('rankings');
  const [expanded, setExpanded] = useState(null);
  if (!meta) return null;

  return (
    <div style={{ borderTop: '1px solid var(--border-purple)' }}>
      <div onClick={() => setOpen(p => !p)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', cursor: 'pointer', background: 'rgba(188,19,254,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={12} color="var(--purple)" />
          <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.58rem', color: 'var(--purple)', letterSpacing: '2px', textTransform: 'uppercase' }}>Council report</span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--dim)' }}>
            {meta.membersResponded}/{meta.membersQueried} models · {meta.chairmanFailed ? `fallback: ${meta.fallbackMember}` : 'chairman ok'}
          </span>
        </div>
        {open ? <ChevronUp size={12} color="var(--dim)" /> : <ChevronDown size={12} color="var(--dim)" />}
      </div>

      {open && (
        <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {[['rankings','Rankings'],['responses','Responses']].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '4px 12px', cursor: 'pointer', borderRadius: 3,
                fontFamily: 'var(--font-head)', fontSize: '0.58rem', letterSpacing: '1.5px', textTransform: 'uppercase',
                background: tab === t ? 'rgba(188,19,254,0.15)' : 'transparent',
                border: `1px solid ${tab === t ? 'var(--border-purple)' : 'var(--border)'}`,
                color: tab === t ? 'var(--purple)' : 'var(--dim)',
              }}>{l}</button>
            ))}
          </div>

          {tab === 'rankings' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['#', 'Model', 'Avg rank', 'Votes'].map((h, i) => (
                    <th key={h} style={{ padding: '6px 10px', color: 'var(--purple)', fontWeight: 500, textAlign: i > 1 ? 'center' : 'left', fontFamily: 'var(--font-head)', fontSize: '0.58rem', letterSpacing: '1px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meta.aggregateRankings?.map((r, i) => (
                  <tr key={r.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: i === 0 ? 'rgba(188,19,254,0.05)' : 'transparent' }}>
                    <td style={{ padding: '8px 10px', color: i === 0 ? 'var(--purple)' : 'var(--dim)' }}>{i === 0 ? '▲' : i + 1}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{r.label}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--cyan)' }}>{r.avgRank?.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--dim)' }}>{r.votes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'responses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {meta.stage1Responses?.map(r => (
                <div key={r.label} style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div onClick={() => setExpanded(p => p === r.label ? null : r.label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', background: expanded === r.label ? 'rgba(0,243,255,0.04)' : 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.6rem', color: 'var(--cyan)', letterSpacing: '1.5px' }}>{r.label}</span>
                    {expanded === r.label ? <ChevronUp size={11} color="var(--dim)" /> : <ChevronDown size={11} color="var(--dim)" />}
                  </div>
                  {expanded === r.label && (
                    <div className="md" style={{ padding: '12px 14px', maxHeight: 340, overflowY: 'auto', fontSize: '0.88rem', borderTop: '1px solid var(--border)' }}>
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

function UserBubble({ msg }) {
  return (
    <div className="fadein" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
      <div style={{
        maxWidth: '68%', padding: '11px 16px',
        background: 'rgba(0,243,255,0.06)',
        border: '1px solid rgba(0,243,255,0.15)',
        borderRadius: '10px 10px 2px 10px',
        fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.6, color: 'var(--text)',
      }}>
        {msg.content}
      </div>
    </div>
  );
}

function AssistantBubble({ msg }) {
  return (
    <div className="fadein" style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, flexShrink: 0, marginTop: 1, border: '1px solid rgba(0,243,255,0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,243,255,0.04)' }}>
        <Cpu size={13} color="var(--cyan)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: '2px solid rgba(0,243,255,0.3)', borderRadius: '0 8px 8px 8px' }}>
          <div className="md" style={{ fontSize: '0.97rem', lineHeight: 1.7 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
          </div>
        </div>
        <div style={{ marginTop: 4, paddingLeft: 2, fontFamily: 'monospace', fontSize: '0.62rem', color: 'var(--dimmer)' }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function ResultBubble({ msg, onPDF }) {
  const [copied, setCopied] = useState(false);
  const isCouncil = !!msg.councilMeta;
  const accent    = isCouncil ? 'var(--purple)' : 'var(--cyan)';
  const accentB   = isCouncil ? 'var(--border-purple)' : 'var(--border-cyan)';
  const accentBg  = isCouncil ? 'rgba(188,19,254,0.06)' : 'rgba(0,243,255,0.06)';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fadein" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: accentBg, border: `1px solid ${accentB}`, borderBottom: 'none', borderRadius: '6px 6px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ff5f56','#ffbd2e','#27c93f'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.8 }} />)}
          </div>
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          {isCouncil ? <Users size={12} color="var(--purple)" /> : <Terminal size={12} color="var(--cyan)" />}
          <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.58rem', letterSpacing: '2px', color: accent, textTransform: 'uppercase' }}>
            {isCouncil ? 'Council output' : 'Generated output'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleCopy} className="btn" style={{ color: copied ? 'var(--green)' : undefined, borderColor: copied ? 'rgba(0,255,157,0.3)' : undefined }}>
            {copied ? <Check size={10} /> : <Copy size={10} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button onClick={() => onPDF?.(msg.content)} className="btn">
            <Download size={10} /> PDF
          </button>
        </div>
      </div>

      <div className="md" style={{ padding: '20px 22px', background: 'rgba(6,6,14,0.95)', border: `1px solid ${accentB}`, borderTop: 'none', borderRadius: isCouncil ? '0' : '0 0 6px 6px', fontSize: '0.97rem', lineHeight: 1.75 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        <span className="blink" style={{ display: 'inline-block', width: 6, height: 14, background: accent, verticalAlign: 'middle', marginLeft: 3, opacity: 0.7 }} />
      </div>

      {isCouncil && (
        <div style={{ border: `1px solid ${accentB}`, borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
          <CouncilPanel meta={msg.councilMeta} />
        </div>
      )}

      <div style={{ marginTop: 5, paddingLeft: 2, fontFamily: 'monospace', fontSize: '0.62rem', color: 'var(--dimmer)' }}>
        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}

export default function ChatInterface() {
  const [messages,     setMessages]     = useState([GREETING]);
  const [input,        setInput]        = useState('');
  const [councilMode,  setCouncilMode]  = useState(false);
  const [phase,        setPhase]        = useState('intake');
  const [councilStage, setCouncilStage] = useState(0);
  const [typing,       setTyping]       = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const push = useCallback(msg => setMessages(p => [...p, msg]), []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || phase === 'generating') return;
    setInput('');

    push({ id: Date.now(), role: 'user', type: 'text', content: text, ts: Date.now() });
    historyRef.current.push({ role: 'user', content: text });
    setTyping(true);

    try {
      const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'intake', history: historyRef.current }) });
      const data = await res.json();
      setTyping(false);

      if (data.error) { push({ id: Date.now(), role: 'assistant', type: 'text', content: `Error: ${data.error}`, ts: Date.now() }); return; }

      if (data.done) {
        setPhase('generating');
        historyRef.current.push({ role: 'assistant', content: 'Intent captured.' });
        push({ id: Date.now(), role: 'assistant', type: 'text', content: councilMode ? `Got it. Convening the council — **8 models** across 3 stages.\n\n*Takes ~30–60 seconds.*` : `Got it. Generating now...`, ts: Date.now() });
        await generate(data.intent, councilMode);
      } else {
        const reply = data.reply || 'Tell me more.';
        historyRef.current.push({ role: 'assistant', content: reply });
        push({ id: Date.now(), role: 'assistant', type: 'question', content: reply, ts: Date.now() });
      }
    } catch (err) {
      setTyping(false);
      push({ id: Date.now(), role: 'assistant', type: 'text', content: `Network error: ${err.message}`, ts: Date.now() });
    }
  }, [input, phase, councilMode, push]);

  const generate = useCallback(async (intent, withCouncil) => {
    setTyping(false);
    if (withCouncil) {
      setMessages(p => [...p, { id: `stage-${Date.now()}`, role: 'assistant', type: 'stage', content: '', ts: Date.now() }]);
      setCouncilStage(1);
    } else { setTyping(true); }

    try {
      const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'generate', intent, useCouncil: withCouncil }) });
      const data = await res.json();
      setTyping(false); setCouncilStage(0);
      setMessages(p => p.filter(m => m.type !== 'stage'));
      push(data.success
        ? { id: Date.now(), role: 'assistant', type: 'result', content: data.data, councilMeta: data.councilMeta ?? null, ts: Date.now() }
        : { id: Date.now(), role: 'assistant', type: 'text', content: `Failed: ${data.error}`, ts: Date.now() });
      setPhase('done');
    } catch (err) {
      setTyping(false); setCouncilStage(0);
      setMessages(p => p.filter(m => m.type !== 'stage'));
      push({ id: Date.now(), role: 'assistant', type: 'text', content: `Error: ${err.message}`, ts: Date.now() });
      setPhase('done');
    }
  }, [push]);

  const reset = () => {
    setMessages([{ ...GREETING, ts: Date.now() }]);
    setPhase('intake'); setCouncilStage(0); setTyping(false); setInput('');
    historyRef.current = [];
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const exportPDF = content => {
    const doc = new jsPDF();
    doc.text(doc.splitTextToSize(content.replace(/[#*`_]/g, ''), 180), 10, 10);
    doc.save('ClarAI-output.pdf');
  };

  const disabled    = phase === 'generating';
  const statusText  = disabled
    ? (councilMode ? 'Council deliberating...' : 'Generating...')
    : phase === 'done' ? 'Done — ask a follow-up or start over' : 'Ready';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 820, margin: '0 auto', padding: '0 16px' }}>

      {/* HEADER */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0 11px', borderBottom: `1px solid ${councilMode ? 'rgba(188,19,254,0.2)' : 'var(--border)'}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, border: '1px solid rgba(0,243,255,0.4)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,243,255,0.05)' }}>
            <Zap size={14} color="var(--cyan)" />
          </div>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '3px', color: 'var(--cyan)', textShadow: '0 0 16px rgba(0,243,255,0.4)' }}>CLARAI</span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: 'var(--dimmer)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 2 }}>v2</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => !disabled && setCouncilMode(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 8px', borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer', border: `1px solid ${councilMode ? 'rgba(188,19,254,0.4)' : 'var(--border)'}`, background: councilMode ? 'rgba(188,19,254,0.07)' : 'transparent', opacity: disabled ? 0.4 : 1 }}>
            <Users size={13} color={councilMode ? 'var(--purple)' : 'var(--dim)'} />
            <span style={{ fontFamily: 'var(--font-head)', fontSize: '0.58rem', letterSpacing: '1.5px', color: councilMode ? 'var(--purple)' : 'var(--dim)', textTransform: 'uppercase' }}>
              {councilMode ? 'Council on' : 'Council'}
            </span>
            <div style={{ width: 26, height: 14, borderRadius: 7, position: 'relative', background: councilMode ? 'var(--purple)' : 'rgba(255,255,255,0.08)' }}>
              <div style={{ position: 'absolute', top: 2, left: councilMode ? 14 : 2, width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
            </div>
          </button>
          <button onClick={reset} className="btn"><RefreshCw size={10} /> New chat</button>
        </div>
      </header>

      {/* MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0 8px' }}>
        {messages.map(msg => {
          if (msg.role === 'user') return <UserBubble key={msg.id} msg={msg} />;
          if (msg.type === 'stage') return (
            <div key={msg.id} className="fadein" style={{ border: '1px solid rgba(188,19,254,0.2)', borderRadius: 6, marginBottom: 16, background: 'rgba(13,13,26,0.8)' }}>
              <CouncilProgress stage={councilStage} />
            </div>
          );
          if (msg.type === 'result') return <ResultBubble key={msg.id} msg={msg} onPDF={exportPDF} />;
          return <AssistantBubble key={msg.id} msg={msg} />;
        })}

        {typing && (
          <div className="fadein" style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 30, height: 30, flexShrink: 0, border: '1px solid rgba(0,243,255,0.3)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,243,255,0.04)' }}>
              <Cpu size={13} color="var(--cyan)" />
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: '2px solid rgba(0,243,255,0.3)', borderRadius: '0 8px 8px 8px' }}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div style={{ flexShrink: 0, padding: '8px 0 14px', borderTop: `1px solid ${councilMode ? 'rgba(188,19,254,0.15)' : 'var(--border)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block', background: disabled ? (councilMode ? 'var(--purple)' : 'var(--cyan)') : phase === 'done' ? 'var(--green)' : 'var(--cyan)' }} />
          <span style={{ fontFamily: 'monospace', fontSize: '0.62rem', color: 'var(--dimmer)' }}>{statusText}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 1, fontFamily: 'monospace', fontSize: '1rem', color: councilMode ? 'rgba(188,19,254,0.5)' : 'rgba(0,243,255,0.4)', flexShrink: 0, userSelect: 'none' }}>›</div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={disabled}
            placeholder={disabled ? (councilMode ? 'Council deliberating...' : 'Generating...') : 'Message ClarAI'}
            rows={1}
            style={{ flex: 1, padding: '10px 12px', background: 'rgba(255,255,255,0.025)', border: `1px solid ${disabled ? 'var(--border)' : councilMode ? 'rgba(188,19,254,0.2)' : 'rgba(0,243,255,0.15)'}`, borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '1rem', lineHeight: 1.5, outline: 'none', resize: 'none', opacity: disabled ? 0.4 : 1 }}
          />
          <button onClick={handleSend} disabled={disabled || !input.trim()} className={`btn-send${councilMode ? ' council' : ''}`}>
            <Send size={15} />
          </button>
        </div>
        <div style={{ marginTop: 5, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.58rem', color: 'var(--dimmer)' }}>
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}
