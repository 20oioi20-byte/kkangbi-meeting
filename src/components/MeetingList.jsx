import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

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

export default function MeetingList({ onOpen }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("mt_meetings")
      .select("id, title, meeting_date, source, status, source_file_name, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) setMeetings(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // 처리중인 항목이 있으면 15초마다 자동 갱신 (상태 폴링)
    const interval = setInterval(() => {
      setMeetings((prev) => {
        const hasProcessing = prev.some(
          (m) => m.status !== "done" && m.status !== "failed"
        );
        if (hasProcessing) load();
        return prev;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  if (meetings.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
        아직 등록된 회의가 없습니다. "녹음 업로드" 탭에서 시작하세요.
      </div>
    );
  }

  return (
    <div className="meeting-list">
      {meetings.map((m) => (
        <div className="meeting-row" key={m.id} onClick={() => onOpen(m.id)}>
          <div>
            <div style={{ fontWeight: 600 }}>
              {m.title || m.source_file_name || "제목 없음"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {m.meeting_date} · {m.source === "drive" ? "Drive 자동수집" : "직접 업로드"}
            </div>
          </div>
          <span className={`badge ${statusClass(m.status)}`}>
            {STATUS_LABEL[m.status] || m.status}
          </span>
        </div>
      ))}
    </div>
  );
}
