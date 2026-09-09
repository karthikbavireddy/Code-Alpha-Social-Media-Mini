import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Hash } from 'lucide-react';

export default function HashtagSuggestionBar({ text, onSelect, textareaRef }) {
  const [suggestions, setSuggestions] = useState([]);
  const [matchInfo, setMatchInfo] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!textareaRef?.current) return;
    const textarea = textareaRef.current;
    const caret = textarea.selectionStart ?? text.length;
    const textBeforeCaret = text.slice(0, caret);

    const match = textBeforeCaret.match(/(^|\s)#([a-zA-Z0-9_\u00C0-\u017F]*)$/);
    if (!match) {
      setSuggestions([]);
      setMatchInfo(null);
      return;
    }

    const query = match[2];
    const matchLength = match[0].length;
    const leadingSpace = match[1];
    const startPos = caret - matchLength + leadingSpace.length;

    setMatchInfo({ startPos, query });

    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const data = await api.getHashtags(query);
        if (Array.isArray(data) && data.length > 0) {
          setSuggestions(data);
          setSelectedIndex(0);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      }
    }, 80);

    return () => clearTimeout(debounceTimerRef.current);
  }, [text, textareaRef]);

  const handleSelectTag = (tag) => {
    if (!matchInfo) return;
    const { startPos, query } = matchInfo;
    const endPos = startPos + query.length + 1; // +1 for '#'

    const before = text.slice(0, startPos);
    const after = text.slice(endPos);
    const cleanTag = tag.replace(/^#/, '').trim();
    const insertion = `#${cleanTag} `;

    const newText = before + insertion + after;
    onSelect(newText);

    setSuggestions([]);
    setMatchInfo(null);

    if (textareaRef?.current) {
      setTimeout(() => {
        textareaRef.current.focus();
        const cursor = before.length + insertion.length;
        textareaRef.current.setSelectionRange(cursor, cursor);
      }, 10);
    }
  };

  if (!suggestions.length) return null;

  return (
    <div
      style={{
        marginTop: '10px',
        marginBottom: '10px',
        padding: '8px 12px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(168, 85, 247, 0.45)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px rgba(168, 85, 247, 0.25)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#c084fc',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Hash size={13} color="#c084fc" />
          Suggested Hashtags
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tap or click to add</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {suggestions.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const displayTag = (item.tag || '').toUpperCase();
          return (
            <button
              key={item.tag}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelectTag(item.tag);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '6px 14px',
                background: isSelected
                  ? 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)'
                  : 'rgba(255, 255, 255, 0.12)',
                border: isSelected
                  ? '1px solid rgba(255, 255, 255, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.22)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.14s ease',
              }}
            >
              <span style={{ opacity: 0.8, marginRight: '1px' }}>#</span>
              <span>{displayTag}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
