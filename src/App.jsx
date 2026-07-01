import React, { useState } from "react";
import UploadTab from "./components/UploadTab.jsx";
import MeetingList from "./components/MeetingList.jsx";
import MeetingDetail from "./components/MeetingDetail.jsx";
import SettingsModal from "./components/SettingsModal.jsx";

export default function App() {
  const [tab, setTab] = useState("list"); // 'upload' | 'list'
  const [selectedId, setSelectedId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  function openMeeting(id) {
    setSelectedId(id);
  }

  function backToList() {
    setSelectedId(null);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="app-shell">
      <div className="app-header">
        <h1>🎙️ 깡비서 회의록</h1>
        <button
          className="btn secondary"
          style={{ fontSize: 12, padding: "6px 12px" }}
          onClick={() => setShowSettings(true)}
        >
          ⚙ 내 이름 설정
        </button>
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

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
