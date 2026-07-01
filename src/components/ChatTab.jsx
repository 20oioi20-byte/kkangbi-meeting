import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

export default function ChatTab() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "저장된 회의록과 통화기록을 바탕으로 궁금한 걸 물어보세요. 예: \"지난달 KB손보 관련 할일 뭐 남았어?\"" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("kkangbi-meeting-chat", {
      body: { question },
    });

    setLoading(false);
    if (error) {
      setMessages((prev) => [...prev, { role: "assistant", text: "오류가 발생했습니다: " + error.message }]);
    } else {
      setMessages((prev) => [...prev, { role: "assistant", text: data?.answer || "답변을 받지 못했습니다." }]);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: 520 }}>
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              background: m.role === "user" ? "var(--accent)" : "var(--surface, #f3f4f6)",
              color: m.role === "user" ? "#fff" : "var(--text)",
              padding: "10px 14px",
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", fontSize: 13, color: "var(--muted)" }}>답변 작성 중...</div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="궁금한 내용을 입력하세요 (Enter로 전송, Shift+Enter로 줄바꿈)"
          rows={2}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--border)", fontSize: 14, resize: "none" }}
        />
        <button className="btn" onClick={send} disabled={loading || !input.trim()}>전송</button>
      </div>
    </div>
  );
}
