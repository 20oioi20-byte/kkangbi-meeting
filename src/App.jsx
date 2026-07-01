import React, { useState } from "react";
import UploadTab from "./components/UploadTab.jsx";
import MeetingList from "./components/MeetingList.jsx";
import MeetingDetail from "./components/MeetingDetail.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import CallsTab from "./components/CallsTab.jsx";
import ChatTab from "./components/ChatTab.jsx";

export default function App() {
  const [mainTab, setMainTab] = useState("meetings"); // 'meetings' | 'calls' | 'chat'
  const [meetingSubTab, setMeetingSubTab] = useState("list"); // 'list' | 'upload'
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
          <button className={`tab-btn ${mainTab === "meetings" ? "active" : ""}`} onClick={() => setMainTab("meetings")}>
            📋 회의록
          </button>
          <button className={`tab-btn ${mainTab === "calls" ? "active" : ""}`} onClick={() => setMainTab("calls")}>
            ☎️ 통화기록
          </button>
          <button className={`tab-btn ${mainTab === "chat" ? "active" : ""}`} onClick={() => setMainTab("chat")}>
            💬 AI 채팅
          </button>
        </div>
      )}

      {mainTab === "meetings" && (
        <>
          {selectedId ? (
            <MeetingDetail meetingId={selectedId} onBack={backToList} />
          ) : (
            <>
              <div className="tabs" style={{ marginBottom: 12 }}>
                <button
                  className={`tab-btn ${meetingSubTab === "list" ? "active" : ""}`}
                  style={{ fontSize: 13, padding: "6px 12px" }}
                  onClick={() => setMeetingSubTab("list")}
                >
                  목록
                </button>
                <button
                  className={`tab-btn ${meetingSubTab === "upload" ? "active" : ""}`}
                  style={{ fontSize: 13, padding: "6px 12px" }}
                  onClick={() => setMeetingSubTab("upload")}
                >
                  녹음 업로드
                </button>
              </div>
              {meetingSubTab === "upload" ? (
                <UploadTab onUploaded={() => setMeetingSubTab("list")} />
              ) : (
                <MeetingList key={refreshKey} onOpen={openMeeting} />
              )}
            </>
          )}
        </>
      )}

      {mainTab === "calls" && <CallsTab />}
      {mainTab === "chat" && <ChatTab />}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
