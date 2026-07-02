import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0=일
  const diff = (day === 0 ? -6 : 1) - day; // 월요일 시작
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function HomeTab({ onOpenMeeting, onGoToCenter }) {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [actions, setActions] = useState([]);
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: a }, { data: c }] = await Promise.all([
        supabase.from("mt_meetings").select("id, title, meeting_date, center, department, status, source_file_name").order("meeting_date", { ascending: false }).limit(200),
        supabase.from("mt_action_items").select("id, due_date, is_done, is_mine"),
        supabase.from("mt_calls").select("id, center, call_datetime"),
      ]);
      setMeetings(m ?? []);
      setActions(a ?? []);
      setCalls(c ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  const myOpenCount = actions.filter((a) => a.is_mine && !a.is_done).length;

  const today = new Date();
  const in3days = new Date();
  in3days.setDate(today.getDate() + 3);
  const dueSoonCount = actions.filter((a) => {
    if (a.is_done || !a.due_date) return false;
    const d = new Date(a.due_date);
    return d >= today && d <= in3days;
  }).length;

  const weekStart = startOfWeek(today);
  const weekCount = meetings.filter((m) => m.meeting_date && new Date(m.meeting_date) >= weekStart).length;

  const recentMeetings = meetings.slice(0, 5);

  const centerCounts = {};
  meetings.forEach((m) => {
    const c = m.center || "미지정";
    centerCounts[c] = (centerCounts[c] || 0) + 1;
  });
  calls.forEach((c) => {
    const key = c.center || "미지정";
    centerCounts[key] = (centerCounts[key] || 0) + 1;
  });
  const centerEntries = Object.entries(centerCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">내 할일</div>
          <div className="num">{myOpenCount}건</div>
        </div>
        <div className="stat-card">
          <div className="label">이번주 회의</div>
          <div className="num">{weekCount}건</div>
        </div>
        <div className="stat-card">
          <div className="label" style={{ color: dueSoonCount > 0 ? "var(--danger)" : "var(--muted)" }}>기한 임박(3일내)</div>
          <div className="num" style={{ color: dueSoonCount > 0 ? "var(--danger)" : "inherit" }}>{dueSoonCount}건</div>
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 0 }}>최근 회의록</div>
      <div className="meeting-list" style={{ marginBottom: 20 }}>
        {recentMeetings.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>등록된 회의록이 없습니다.</p>}
        {recentMeetings.map((m) => (
          <div key={m.id} className="meeting-row" onClick={() => onOpenMeeting(m.id)}>
            <div>
              <div style={{ fontWeight: 600 }}>{m.title || m.source_file_name || "제목 없음"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {m.meeting_date} · {m.center || "센터 미지정"}{m.department ? ` · ${m.department}` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title">센터별 현황</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {centerEntries.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>데이터가 없습니다.</p>}
        {centerEntries.map(([name, count]) => (
          <button
            key={name}
            className="badge"
            style={{ border: "none", cursor: "pointer" }}
            onClick={() => onGoToCenter(name)}
          >
            {name} {count}건
          </button>
        ))}
      </div>
    </div>
  );
}
