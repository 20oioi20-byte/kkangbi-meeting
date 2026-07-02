import React, { useState } from "react";
import UploadTab from "./components/UploadTab.jsx";
import MeetingList from "./components/MeetingList.jsx";
import MeetingDetail from "./components/MeetingDetail.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import CallsTab from "./components/CallsTab.jsx";
import ChatTab from "./components/ChatTab.jsx";
import HomeTab from "./components/HomeTab.jsx";
import KanbanBoard from "./components/KanbanBoard.jsx";
import SearchTab from "./components/SearchTab.jsx";

const NAV_ITEMS = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "meetings", label: "회의록", icon: "📋" },
  { key: "calls", label: "통화기록", icon: "☎️" },
  { key: "chat", label: "AI 채팅", icon: "💬" },
  { key: "search", label: "검색", icon: "🔍" },
];

export default function App() {
  const [mainTab, setMainTab] = useState("home");
  const [meetingViewMode, setMeetingViewMode] = useState("list"); // 'list' | 'kanban' | 'upload'

  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const [presetCenter, setPresetCenter] = useState(null);
  const [centerNonce, setCenterNonce] = useState(0);

  const [callExpandId, setCallExpandId] = useState(null);
  const [callExpandNonce, setCallExpandNonce] = useState(0);

  function openMeeting(id) {
    setSelectedMeetingId(id);
  }
  function backFromMeeting() {
    setSelectedMeetingId(null);
    setRefreshKey((k) => k + 1);
  }
  function goToCenter(name) {
    setPresetCenter(name);
    setCenterNonce((n) => n + 1);
    setMainTab("meetings");
    setMeetingViewMode("list");
  }
  function openCall(id) {
    setCallExpandId(id);
    setCallExpandNonce((n) => n + 1);
    setMainTab("calls");
  }

  function renderMain() {
    if (selectedMeetingId) {
      return <MeetingDetail meetingId={selectedMeetingId} onBack={backFromMeeting} />;
    }

    if (mainTab === "home") {
      return <HomeTab onOpenMeeting={openMeeting} onGoToCenter={goToCenter} />;
    }

    if (mainTab === "meetings") {
      return (
        <>
          <div className="tabs" style={{ marginBottom: 12 }}>
            <button className={`tab-btn ${meetingViewMode === "list" ? "active" : ""}`} style={{ fontSize: 13, padding: "6px 12px" }} onClick={() => setMeetingViewMode("list")}>목록</button>
            <button className={`tab-btn ${meetingViewMode === "kanban" ? "active" : ""}`} style={{ fontSize: 13, padding: "6px 12px" }} onClick={() => setMeetingViewMode("kanban")}>칸반</button>
            <button className={`tab-btn ${meetingViewMode === "upload" ? "active" : ""}`} style={{ fontSize: 13, padding: "6px 12px" }} onClick={() => setMeetingViewMode("upload")}>녹음 업로드</button>
          </div>
          {meetingViewMode === "upload" && <UploadTab onUploaded={() => setMeetingViewMode("list")} />}
          {meetingViewMode === "list" && (
            <MeetingList key={refreshKey} onOpen={openMeeting} initialCenter={presetCenter} centerNonce={centerNonce} />
          )}
          {meetingViewMode === "kanban" && <KanbanBoard onOpenMeeting={openMeeting} onOpenCall={openCall} />}
        </>
      );
    }

    if (mainTab === "calls") {
      return <CallsTab initialExpandId={callExpandId} expandNonce={callExpandNonce} />;
    }

    if (mainTab === "chat") return <ChatTab />;
    if (mainTab === "search") return <SearchTab onOpenMeeting={openMeeting} onOpenCall={openCall} />;

    return null;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">🎙️ 깡비서</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sidebar-item ${mainTab === item.key && !selectedMeetingId ? "active" : ""}`}
            onClick={() => {
              setSelectedMeetingId(null);
              setMainTab(item.key);
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
        <div className="sidebar-footer">
          <button className="sidebar-item" onClick={() => setShowSettings(true)}>
            <span>⚙</span>
            <span>내 이름 설정</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {renderMain()}
      </main>

      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`bottom-nav-item ${mainTab === item.key && !selectedMeetingId ? "active" : ""}`}
            onClick={() => {
              setSelectedMeetingId(null);
              setMainTab(item.key);
            }}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
