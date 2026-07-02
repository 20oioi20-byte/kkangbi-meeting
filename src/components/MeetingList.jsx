import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { getCenters, ensureCenter } from "../lib/centers.js";

const STATUS_LABEL = {
  uploaded: "대기중",
  summarizing: "요약중",
  done: "완료",
  failed: "실패",
};

function statusClass(status) {
  if (status === "done") return "done";
  if (status === "failed") return "failed";
  return "processing";
}

export default function MeetingList({ onOpen, initialCenter, centerNonce }) {
  const [meetings, setMeetings] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCenter, setSelectedCenter] = useState(initialCenter || "all");

  useEffect(() => {
    if (initialCenter) setSelectedCenter(initialCenter);
  }, [initialCenter, centerNonce]);
  const [monthFilter, setMonthFilter] = useState(""); // 'YYYY-MM' or ''
  const [search, setSearch] = useState("");
  const [moveMenuId, setMoveMenuId] = useState(null);
  const [newCenterName, setNewCenterName] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: m }, cs] = await Promise.all([
      supabase
        .from("mt_meetings")
        .select("id, title, meeting_date, center, department, source, status, source_file_name, created_at")
        .order("meeting_date", { ascending: false })
        .limit(300),
      getCenters(),
    ]);
    setMeetings(m ?? []);
    setCenters(cs);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      setMeetings((prev) => {
        const hasProcessing = prev.some((x) => x.status !== "done" && x.status !== "failed");
        if (hasProcessing) load();
        return prev;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const months = useMemo(() => {
    const set = new Set(meetings.map((m) => (m.meeting_date || "").slice(0, 7)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [meetings]);

  const filtered = meetings.filter((m) => {
    if (selectedCenter !== "all" && (m.center || "미지정") !== selectedCenter) return false;
    if (monthFilter && !(m.meeting_date || "").startsWith(monthFilter)) return false;
    if (search.trim() && !(m.title || m.source_file_name || "").includes(search.trim())) return false;
    return true;
  });

  async function deleteMeeting(id) {
    if (!confirm("이 회의록을 삭제할까요? 관련 할일·첨부자료도 함께 삭제됩니다.")) return;
    await supabase.from("mt_meetings").delete().eq("id", id);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  }

  async function moveMeeting(id, centerName) {
    const name = centerName.trim();
    if (!name) return;
    await ensureCenter(name);
    await supabase.from("mt_meetings").update({ center: name }).eq("id", id);
    setMoveMenuId(null);
    setNewCenterName("");
    load();
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <button
          className="badge"
          style={{
            border: "none", cursor: "pointer",
            background: selectedCenter === "all" ? "var(--accent)" : "var(--accent-soft)",
            color: selectedCenter === "all" ? "#fff" : "var(--accent)",
          }}
          onClick={() => setSelectedCenter("all")}
        >
          전체
        </button>
        {centers.map((c) => (
          <button
            key={c}
            className="badge"
            style={{
              border: "none", cursor: "pointer",
              background: selectedCenter === c ? "var(--accent)" : "var(--accent-soft)",
              color: selectedCenter === c ? "#fff" : "var(--accent)",
            }}
            onClick={() => setSelectedCenter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}>
          <option value="">전체 기간</option>
          {months.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="제목 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
        />
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
          조건에 맞는 회의록이 없습니다.
        </div>
      )}

      <div className="meeting-list">
        {filtered.map((m) => (
          <div className="meeting-row" key={m.id} style={{ position: "relative", cursor: "default" }}>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onOpen(m.id)}>
              <div style={{ fontWeight: 600 }}>{m.title || m.source_file_name || "제목 없음"}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                {m.meeting_date} · {m.center || "센터 미지정"}{m.department ? ` · ${m.department}` : ""}
              </div>
            </div>
            <span className={`badge ${statusClass(m.status)}`}>{STATUS_LABEL[m.status] || m.status}</span>
            <div style={{ position: "relative", marginLeft: 8 }}>
              <button
                className="btn secondary"
                style={{ padding: "4px 8px", fontSize: 14 }}
                onClick={() => setMoveMenuId(moveMenuId === m.id ? null : m.id)}
              >
                ⋯
              </button>
              {moveMenuId === m.id && (
                <div
                  className="card"
                  style={{
                    position: "absolute", right: 0, top: 32, zIndex: 10, width: 220,
                    background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>센터/부서 이동</div>
                  <select
                    style={{ width: "100%", padding: 6, marginBottom: 6, borderRadius: 6, border: "1px solid var(--border)" }}
                    onChange={(e) => e.target.value && moveMeeting(m.id, e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>센터 선택</option>
                    {centers.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="새 센터명"
                      value={newCenterName}
                      onChange={(e) => setNewCenterName(e.target.value)}
                      style={{ flex: 1, padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }}
                    />
                    <button className="btn secondary" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => moveMeeting(m.id, newCenterName)}>추가</button>
                  </div>
                  <button
                    className="btn secondary"
                    style={{ width: "100%", color: "var(--danger)", fontSize: 12 }}
                    onClick={() => deleteMeeting(m.id)}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
