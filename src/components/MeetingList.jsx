import React, { useEffect, useMemo, useState } from "react";
import { supabase, RECORDINGS_BUCKET } from "../lib/supabase.js";
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

function fmtDate(d) {
  if (!d) return "";
  return String(d).slice(0, 10);
}

export default function MeetingList({ onOpen, initialCenter, centerNonce }) {
  const [meetings, setMeetings] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCenter, setSelectedCenter] = useState(initialCenter || "all");
  const [monthFilter, setMonthFilter] = useState("");
  const [search, setSearch] = useState("");
  const [moveMenuId, setMoveMenuId] = useState(null);
  const [newCenterName, setNewCenterName] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (initialCenter) setSelectedCenter(initialCenter);
  }, [initialCenter, centerNonce]);

  async function load() {
    setLoading(true);
    const [{ data: m }, cs] = await Promise.all([
      supabase
        .from("mt_meetings")
        .select("id, title, meeting_date, center, department, source, status, source_file_name, created_at, summary_bullets, raw_transcript")
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

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function mergeSelected() {
    const targets = meetings.filter((m) => selectedIds.includes(m.id));
    if (targets.length < 2) return;

    const missingTranscript = targets.some((m) => !m.raw_transcript);
    if (missingTranscript) {
      alert("선택한 회의록 중 아직 처리(완료)되지 않은 항목이 있습니다. 완료된 회의록만 통합할 수 있습니다.");
      return;
    }

    const defaultTitle = "[통합] " + targets[0].title;
    const title = prompt("통합 회의록 제목을 입력하세요.", defaultTitle);
    if (title === null) return;

    setMerging(true);
    try {
      const sorted = [...targets].sort((a, b) => (a.meeting_date || "").localeCompare(b.meeting_date || ""));
      const combined = sorted
        .map((m) => `\n\n=== ${m.title || m.source_file_name} (${m.meeting_date}) ===\n\n${m.raw_transcript}`)
        .join("");
      const repDate = sorted[sorted.length - 1].meeting_date;

      const storagePath = `merged/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`;
      const blob = new Blob([combined], { type: "text/plain;charset=utf-8" });
      const { error: upErr } = await supabase.storage.from(RECORDINGS_BUCKET).upload(storagePath, blob, { contentType: "text/plain;charset=utf-8" });
      if (upErr) throw upErr;

      const { data: newMeeting, error: insErr } = await supabase
        .from("mt_meetings")
        .insert({
          source: "merged",
          source_file_name: title,
          storage_path: storagePath,
          meeting_date: repDate,
          title,
          center: targets[0].center || null,
          department: targets[0].department || null,
          merged_from: targets.map((m) => m.id),
          status: "uploaded",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      await supabase.functions.invoke("kkangbi-meeting", { body: { meeting_id: newMeeting.id } });

      setSelectedIds([]);
      onOpen(newMeeting.id);
    } catch (e) {
      alert("통합 실패: " + e.message);
    } finally {
      setMerging(false);
    }
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

      {selectedIds.length > 0 && (
        <div className="card" style={{ marginBottom: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--accent-soft)" }}>
          <span style={{ fontSize: 13 }}>{selectedIds.length}개 선택됨</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setSelectedIds([])}>선택 해제</button>
            <button className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={mergeSelected} disabled={selectedIds.length < 2 || merging}>
              {merging ? "통합 중..." : "통합 회의록 만들기"}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
          조건에 맞는 회의록이 없습니다.
        </div>
      )}

      <div className="meeting-list">
        {filtered.map((m) => (
          <div className="meeting-row" key={m.id} style={{ position: "relative", cursor: "default", alignItems: "flex-start" }}>
            {m.status === "done" && (
              <input
                type="checkbox"
                checked={selectedIds.includes(m.id)}
                onChange={() => toggleSelect(m.id)}
                style={{ marginTop: 4, marginRight: 10 }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onOpen(m.id)}>
              <div style={{ fontWeight: 600 }}>{m.title || m.source_file_name || "제목 없음"}</div>
              {m.summary_bullets?.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--text)", opacity: 0.75, marginTop: 2 }}>
                  {m.summary_bullets[0]}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                회의일 {fmtDate(m.meeting_date)} · 업로드 {fmtDate(m.created_at)} · {m.center || "센터 미지정"}{m.department ? ` · ${m.department}` : ""}
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
