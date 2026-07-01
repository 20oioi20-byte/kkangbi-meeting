import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function MeetingDetail({ meetingId, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [actions, setActions] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);

  async function load() {
    const { data: m } = await supabase
      .from("mt_meetings")
      .select("*")
      .eq("id", meetingId)
      .single();
    setMeeting(m);

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

  if (!meeting) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  return (
    <div>
      <button className="btn secondary" onClick={onBack} style={{ marginBottom: 16 }}>
        ← 목록으로
      </button>

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

        {meeting.summary && (
          <>
            <div className="section-title">요약</div>
            <p style={{ lineHeight: 1.6 }}>{meeting.summary}</p>
          </>
        )}

        {meeting.key_points?.length > 0 && (
          <>
            <div className="section-title">주요 사항</div>
            <ul className="key-points">
              {meeting.key_points.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </>
        )}

        {meeting.attendees?.length > 0 && (
          <>
            <div className="section-title">참석자(추정)</div>
            <p>{meeting.attendees.join(", ")}</p>
          </>
        )}

        {actions.length > 0 && (
          <>
            <div className="section-title">할 일</div>
            {actions.map((a) => (
              <div className="action-item" key={a.id}>
                <input
                  type="checkbox"
                  checked={a.is_done}
                  onChange={() => toggleDone(a)}
                  style={{ marginTop: 3 }}
                />
                <div>
                  <div style={{ textDecoration: a.is_done ? "line-through" : "none" }}>
                    {a.content}
                  </div>
                  <div className="meta">
                    {a.owner ? `담당: ${a.owner}` : "담당 미지정"}
                    {a.due_date ? ` · 기한: ${a.due_date}` : ""}
                  </div>
                </div>
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
