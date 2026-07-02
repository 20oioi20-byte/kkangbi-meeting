import React, { useState } from "react";
import { supabase } from "../lib/supabase.js";

function snippet(text, query, len) {
  if (!text) return "";
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, len);
  const start = Math.max(0, idx - 20);
  return (start > 0 ? "..." : "") + text.slice(start, start + len);
}

export default function SearchTab({ onOpenMeeting, onOpenCall }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);

    const [{ data: meetings }, { data: calls }] = await Promise.all([
      supabase
        .from("mt_meetings")
        .select("id, title, meeting_date, center, department, summary_bullets, raw_transcript, source_file_name")
        .limit(500),
      supabase
        .from("mt_calls")
        .select("id, counterpart_name, call_datetime, center, department, content, summary_bullets")
        .limit(500),
    ]);

    const lower = q.toLowerCase();

    const meetingHits = (meetings ?? [])
      .filter((m) => {
        const hay = [
          m.title, m.source_file_name,
          (m.summary_bullets || []).join(" "),
          m.raw_transcript,
        ].join(" ").toLowerCase();
        return hay.includes(lower);
      })
      .map((m) => ({
        type: "meeting",
        id: m.id,
        title: m.title || m.source_file_name || "제목 없음",
        date: m.meeting_date,
        meta: [m.center, m.department].filter(Boolean).join(" · "),
        snippet: snippet(m.raw_transcript || (m.summary_bullets || []).join(" "), q, 80),
      }));

    const callHits = (calls ?? [])
      .filter((c) => {
        const hay = [
          c.counterpart_name,
          (c.summary_bullets || []).join(" "),
          c.content,
        ].join(" ").toLowerCase();
        return hay.includes(lower);
      })
      .map((c) => ({
        type: "call",
        id: c.id,
        title: c.counterpart_name ? `☎ ${c.counterpart_name}` : "☎ 상대방 미입력",
        date: c.call_datetime ? c.call_datetime.slice(0, 10) : "",
        meta: [c.center, c.department].filter(Boolean).join(" · "),
        snippet: snippet(c.content || (c.summary_bullets || []).join(" "), q, 80),
      }));

    const combined = [...meetingHits, ...callHits].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    setResults(combined);
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") runSearch();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="제목, 내용, 통화 상대방 등으로 검색"
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border)" }}
        />
        <button className="btn" onClick={runSearch} disabled={loading || !query.trim()}>
          {loading ? "검색 중..." : "검색"}
        </button>
      </div>

      {results === null && (
        <p style={{ color: "var(--muted)", fontSize: 13 }}>회의록과 통화기록 전체에서 검색합니다.</p>
      )}

      {results !== null && results.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>검색 결과가 없습니다.</div>
      )}

      {results?.map((r) => (
        <div
          key={r.type + r.id}
          className="search-result-item"
          onClick={() => (r.type === "meeting" ? onOpenMeeting(r.id) : onOpenCall(r.id))}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {r.type === "meeting" ? "📋 " : ""}{r.title}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {r.date} {r.meta ? `· ${r.meta}` : ""}
            </div>
            {r.snippet && <div className="search-snippet">{r.snippet}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
