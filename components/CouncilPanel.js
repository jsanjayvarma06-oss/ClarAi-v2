'use client';

/**
 * CouncilPanel.js
 * Collapsible panel showing Stage 1 individual responses + aggregate rankings.
 * Rendered below the main ResultDisplay when councilMeta is present.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const panelStyle = {
    background: 'rgba(5, 5, 10, 0.8)',
    border: '1px solid rgba(188, 19, 254, 0.25)',
    borderRadius: '8px',
    marginTop: '16px',
    overflow: 'hidden',
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    cursor: 'pointer',
    background: 'rgba(188, 19, 254, 0.08)',
    borderBottom: '1px solid rgba(188, 19, 254, 0.15)',
    userSelect: 'none',
};

export default function CouncilPanel({ councilMeta }) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('rankings');
    const [expandedMember, setExpandedMember] = useState(null);

    if (!councilMeta) return null;

    const { membersQueried, membersResponded, aggregateRankings, stage1Responses, chairmanFailed, fallbackMember } = councilMeta;

    const tabStyle = (tab) => ({
        padding: '8px 16px',
        background: activeTab === tab ? 'rgba(188, 19, 254, 0.2)' : 'transparent',
        border: `1px solid ${activeTab === tab ? 'var(--secondary-neon)' : 'var(--glass-border)'}`,
        borderRadius: '4px',
        color: activeTab === tab ? 'var(--secondary-neon)' : 'var(--text-dim)',
        fontFamily: 'var(--font-heading)',
        fontSize: '0.75rem',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        cursor: 'pointer',
    });

    return (
        <div style={panelStyle}>
            {/* Header */}
            <div style={headerStyle} onClick={() => setOpen(p => !p)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Trophy size={16} color="var(--secondary-neon)" />
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', letterSpacing: '1px', color: 'var(--secondary-neon)', textTransform: 'uppercase' }}>
                        COUNCIL_REPORT
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {membersResponded}/{membersQueried} models responded
                        {chairmanFailed ? ` · fallback: ${fallbackMember}` : ''}
                    </span>
                </div>
                {open ? <ChevronUp size={16} color="var(--secondary-neon)" /> : <ChevronDown size={16} color="var(--secondary-neon)" />}
            </div>

            {open && (
                <div style={{ padding: '20px' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                        <button style={tabStyle('rankings')} onClick={() => setActiveTab('rankings')}>RANKINGS</button>
                        <button style={tabStyle('responses')} onClick={() => setActiveTab('responses')}>INDIVIDUAL RESPONSES</button>
                    </div>

                    {/* Rankings Tab */}
                    {activeTab === 'rankings' && (
                        <div>
                            {aggregateRankings?.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--secondary-neon)', fontWeight: 600 }}>#</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--secondary-neon)', fontWeight: 600 }}>MODEL</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--secondary-neon)', fontWeight: 600 }}>AVG RANK</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--secondary-neon)', fontWeight: 600 }}>VOTES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aggregateRankings.map((r, i) => (
                                            <tr key={r.label} style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                background: i === 0 ? 'rgba(188,19,254,0.06)' : 'transparent'
                                            }}>
                                                <td style={{ padding: '10px 12px', color: i === 0 ? 'var(--secondary-neon)' : 'var(--text-dim)' }}>
                                                    {i === 0 ? '🏆' : i + 1}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: 'var(--text-main)' }}>{r.label}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--primary-neon)' }}>{r.avgRank?.toFixed(2)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-dim)' }}>{r.votes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                    No ranking data available (stage 2 may have failed).
                                </p>
                            )}
                        </div>
                    )}

                    {/* Individual Responses Tab */}
                    {activeTab === 'responses' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {stage1Responses?.map((r) => (
                                <div key={r.label} style={{
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 16px',
                                            background: 'rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            borderBottom: expandedMember === r.label ? '1px solid var(--glass-border)' : 'none',
                                        }}
                                        onClick={() => setExpandedMember(p => p === r.label ? null : r.label)}
                                    >
                                        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.78rem', color: 'var(--primary-neon)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {r.label}
                                        </span>
                                        {expandedMember === r.label
                                            ? <ChevronUp size={14} color="var(--text-dim)" />
                                            : <ChevronDown size={14} color="var(--text-dim)" />}
                                    </div>
                                    {expandedMember === r.label && (
                                        <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto', fontSize: '0.9rem', color: '#d1d5db', lineHeight: 1.6 }}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {r.content}
                                            </ReactMarkdown>
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
