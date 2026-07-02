import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function KanbanBoard({ onOpenMeeting, onOpenCall }) {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: c }] = await Promise.all([
        supabase.from("mt_meetings").select("id, title, meeting_date, center, department, source_file_name, status").order("meeting_date", { ascending: false }).limit(300),
        supabase.from("mt_calls").select("id, counterpart_name, call_datetime, center, department, status").order("call_datetime", { ascending: false }).limit(300),
      ]);
      setMeetings(m ?? []);
      setCalls(c ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  const columns = {};
  function ensureColumn(name) {
    if (!columns[name]) columns[name] = [];
    return columns[name];
  }

  meetings.forEach((m) => {
    ensureColumn(m.center || "미지정").push({
      type: "meeting", id: m.id,
      title: m.title || m.source_file_name || "제목 없음",
      date: m.meeting_date, department: m.department, status: m.status,
    });
  });
  calls.forEach((c) => {
    ensureColumn(c.center || "미지정").push({
      type: "call", id: c.id,
      title: c.counterpart_name ? `☎ ${c.counterpart_name}` : "☎ 상대방 미입력",
      date: c.call_datetime ? c.call_datetime.slice(0, 10) : "", department: c.department, status: c.status,
    });
  });

  Object.values(columns).forEach((items) => items.sort((a, b) => (b.date || "").localeCompare(a.date || "")));

  const columnNames = Object.keys(columns).sort((a, b) => columns[b].length - columns[a].length);

  if (columnNames.length === 0) {
    return <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>표시할 데이터가 없습니다.</div>;
  }

  return (
    <div className="kanban-scroll">
      {columnNames.map((name) => (
        <div className="kanban-column" key={name}>
          <div className="kanban-column-title">
            <span>{name}</span>
            <span style={{ color: "var(--muted)" }}>{columns[name].length}</span>
          </div>
          {columns[name].map((item) => (
            <div
              key={item.type + item.id}
              className="kanban-card"
              onClick={() => (item.type === "meeting" ? onOpenMeeting(item.id) : onOpenCall(item.id))}
            >
              <div style={{ fontWeight: 600 }}>{item.title}</div>
              <div className="meta">{item.date}{item.department ? ` · ${item.department}` : ""}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
