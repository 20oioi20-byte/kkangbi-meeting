import React, { useState } from "react";
import UploadTab from "./components/UploadTab.jsx";
import MeetingList from "./components/MeetingList.jsx";
import MeetingDetail from "./components/MeetingDetail.jsx";

export default function App() {
  const [tab, setTab] = useState("list"); // 'upload' | 'list'
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function openMeeting(id) {
    setSelectedId(id);
  }

  function backToList() {
    setSelectedId(null);
    setRefreshKey((k) => k + 1); // 목록 새로고침
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>🎙️ 깡비서 회의록</h1>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          대면회의 자동 STT · 요약 · 할일 관리
        </span>
      </div>

      {!selectedId && (
        <div className="tabs">
          <button
            className={`tab-btn ${tab === "list" ? "active" : ""}`}
            onClick={() => setTab("list")}
          >
            회의 목록
          </button>
          <button
            className={`tab-btn ${tab === "upload" ? "active" : ""}`}
            onClick={() => setTab("upload")}
          >
            녹음 업로드
          </button>
        </div>
      )}

      {selectedId ? (
        <MeetingDetail meetingId={selectedId} onBack={backToList} />
      ) : tab === "upload" ? (
        <UploadTab onUploaded={() => setTab("list")} />
      ) : (
        <MeetingList key={refreshKey} onOpen={openMeeting} />
      )}
    </div>
  );
}
