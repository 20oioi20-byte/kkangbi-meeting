import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function MeetingDetail({ meetingId, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [actions, setActions] = useState([]);
  const [attendees, setAttendees] = useState([]); // [{label, name}]
  const [attendeesSaving, setAttendeesSaving] = useState(false);
  const [attendeesSaved, setAttendeesSaved] = useState(false);

  const [filterMine, setFilterMine] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ content: "", owner: "", due_date: "" });

  const [showTranscript, setShowTranscript] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  async function load() {
    const { data: m } = await supabase
      .from("mt_meetings")
      .select("*")
      .eq("id", meetingId)
      .single();
    setMeeting(m);
    setAttendees(Array.isArray(m?.attendees) ? m.attendees : []);

    const { data: a } = await supabase
      .from("mt_action_items")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true });
    setActions(a ?? []);
  }

  useEffect(() => {
    load();
  }, [meetingId]);

  // 라벨 -> 현재 화면에 표시할 이름 (수정된 값 우선, 없으면 라벨 그대로)
  function nameForLabel(label) {
    const found = attendees.find((x) => x.label === label);
    return found?.name?.trim() ? found.name.trim() : label;
  }

  function updateAttendeeName(label, name) {
    setAttendees((prev) =>
      prev.map((a) => (a.label === label ? { ...a, name } : a))
    );
    setAttendeesSaved(false);
  }

  async function saveAttendees() {
    setAttendeesSaving(true);
    const { error } = await supabase
      .from("mt_meetings")
      .update({ attendees })
      .eq("id", meetingId);
    setAttendeesSaving(false);
    if (!error) {
      setAttendeesSaved(true);
      setMeeting((prev) => ({ ...prev, attendees }));
    }
  }

  async function toggleDone(item) {
    const { error } = await supabase
      .from("mt_action_items")
      .update({ is_done: !item.is_done })
      .eq("id", item.id);
    if (!error) {
      setActions((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_done: !a.is_done } : a))
      );
    }
  }

  async function toggleMine(item) {
    const { error } = await supabase
      .from("mt_action_items")
      .update({ is_mine: !item.is_mine })
      .eq("id", item.id);
    if (!error) {
      setActions((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_mine: !a.is_mine } : a))
      );
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditDraft({
      content: item.content || "",
      owner: item.owner || "",
      due_date: item.due_date || "",
    });
  }

  async function saveEdit(id) {
    const { error } = await supabase
      .from("mt_action_items")
      .update({
        content: editDraft.content,
        owner: editDraft.owner || null,
        due_date: editDraft.due_date || null,
      })
      .eq("id", id);
    if (!error) {
      setActions((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, content: editDraft.content, owner: editDraft.owner || null, due_date: editDraft.due_date || null }
            : a
        )
      );
      setEditingId(null);
    }
  }

  function buildMailText() {
    if (!meeting) return "";
    const lines = [];
    lines.push(`[${meeting.title || meeting.source_file_name}]`);
    lines.push(`일시: ${meeting.meeting_date}`);
    lines.push("");

    if (meeting.summary_bullets?.length) {
      lines.push("■ 핵심 요약");
      meeting.summary_bullets.forEach((b) => lines.push(`- ${b}`));
      lines.push("");
    }

    if (meeting.speaker_highlights?.length) {
      lines.push("■ 참석자별 주요 발언");
      meeting.speaker_highlights.forEach((s) => {
        const name = nameForLabel(s.label);
        lines.push(`▪ ${name}`);
        (s.points || []).forEach((p) => lines.push(`  - ${p}`));
      });
      lines.push("");
    }

    if (actions.length) {
      lines.push("■ 할 일");
      actions.forEach((a) => {
        const meta = [];
        if (a.owner) meta.push(`담당: ${a.owner}`);
        if (a.due_date) meta.push(`기한: ${a.due_date}`);
        lines.push(`- ${a.content}${meta.length ? ` (${meta.join(" · ")})` : ""}`);
      });
    }

    return lines.join("\n");
  }

  async function copyMail() {
    const text = buildMailText();
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("복사되었습니다! 메일 본문에 붙여넣기(Ctrl+V) 하세요.");
    } catch {
      setCopyStatus("복사 실패 — 아래 원문 전사 영역처럼 직접 선택 후 복사해주세요.");
    }
    setTimeout(() => setCopyStatus(""), 4000);
  }

  if (!meeting) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  const visibleActions = filterMine ? actions.filter((a) => a.is_mine) : actions;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <button className="btn secondary" onClick={onBack}>← 목록으로</button>
        <button className="btn" onClick={copyMail}>📋 메일 본문 복사</button>
      </div>

      {copyStatus && (
        <div className="card" style={{ marginBottom: 12, padding: 12, fontSize: 13, background: "var(--accent-soft)" }}>
          {copyStatus}
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {meeting.title || meeting.source_file_name}
          </h2>
          <span className="badge">{meeting.meeting_date}</span>
        </div>

        {meeting.status !== "done" && meeting.status !== "failed" && (
          <p style={{ color: "var(--muted)", marginTop: 12 }}>
            아직 처리 중입니다 (상태: {meeting.status}). 잠시 후 새로고침 해주세요.
          </p>
        )}
        {meeting.status === "failed" && (
          <p style={{ color: "var(--danger)", marginTop: 12 }}>
            처리 실패: {meeting.error_message}
          </p>
        )}

        {/* 핵심 요약 */}
        {meeting.summary_bullets?.length > 0 && (
          <>
            <div className="section-title">핵심 요약</div>
            <ul className="key-points">
              {meeting.summary_bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </>
        )}

        {/* 참석자 (이름 수정 가능) */}
        {attendees.length > 0 && (
          <>
            <div className="section-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>참석자 (이름 수정 가능)</span>
              <button
                className="btn secondary"
                style={{ padding: "2px 10px", fontSize: 12 }}
                onClick={saveAttendees}
                disabled={attendeesSaving}
              >
                {attendeesSaving ? "저장 중..." : attendeesSaved ? "저장됨 ✓" : "이름 저장"}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {attendees.map((a) => (
                <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>{a.label}:</span>
                  <input
                    type="text"
                    value={a.name || ""}
                    placeholder="이름 입력"
                    onChange={(e) => updateAttendeeName(a.label, e.target.value)}
                    style={{
                      width: 90, padding: "4px 8px", fontSize: 13,
                      borderRadius: 6, border: "1px solid var(--border)",
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* 참석자별 주요 발언 */}
        {meeting.speaker_highlights?.length > 0 && (
          <>
            <div className="section-title">참석자별 주요 발언</div>
            {meeting.speaker_highlights.map((s, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  {nameForLabel(s.label)}
                </div>
                <ul className="key-points" style={{ marginTop: 0 }}>
                  {(s.points || []).map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}

        {/* 할 일 */}
        {actions.length > 0 && (
          <>
            <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>할 일</span>
              <div className="tabs" style={{ marginBottom: 0, border: "none" }}>
                <button
                  className={`tab-btn ${!filterMine ? "active" : ""}`}
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() => setFilterMine(false)}
                >
                  전체
                </button>
                <button
                  className={`tab-btn ${filterMine ? "active" : ""}`}
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={() => setFilterMine(true)}
                >
                  내 할일만
                </button>
              </div>
            </div>

            {visibleActions.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--muted)" }}>내 할일로 표시된 항목이 없습니다.</p>
            )}

            {visibleActions.map((a) => (
              <div className="action-item" key={a.id}>
                {editingId === a.id ? (
                  <div style={{ width: "100%" }}>
                    <textarea
                      value={editDraft.content}
                      onChange={(e) => setEditDraft((d) => ({ ...d, content: e.target.value }))}
                      rows={2}
                      style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)", fontSize: 13, marginBottom: 6 }}
                    />
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <input
                        type="text"
                        placeholder="담당자"
                        value={editDraft.owner}
                        onChange={(e) => setEditDraft((d) => ({ ...d, owner: e.target.value }))}
                        style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}
                      />
                      <input
                        type="date"
                        value={editDraft.due_date || ""}
                        onChange={(e) => setEditDraft((d) => ({ ...d, due_date: e.target.value }))}
                        style={{ padding: 6, borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => saveEdit(a.id)}>저장</button>
                      <button className="btn secondary" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => setEditingId(null)}>취소</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      checked={a.is_done}
                      onChange={() => toggleDone(a)}
                      style={{ marginTop: 3 }}
                      title="완료 여부"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ textDecoration: a.is_done ? "line-through" : "none" }}>
                        {a.content}
                      </div>
                      <div className="meta">
                        {a.owner ? `담당: ${a.owner}` : "담당 미지정"}
                        {a.due_date ? ` · 기한: ${a.due_date}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
                          <input type="checkbox" checked={a.is_mine} onChange={() => toggleMine(a)} />
                          내 할일
                        </label>
                        <button
                          onClick={() => startEdit(a)}
                          style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0 }}
                        >
                          수정
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </>
        )}

        {meeting.raw_transcript && (
          <>
            <div className="section-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>원문 전사</span>
              <button
                className="btn secondary"
                style={{ padding: "2px 10px", fontSize: 12 }}
                onClick={() => setShowTranscript((s) => !s)}
              >
                {showTranscript ? "숨기기" : "보기"}
              </button>
            </div>
            {showTranscript && (
              <div className="transcript-box">{meeting.raw_transcript}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
