import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";

export default function SettingsModal({ onClose }) {
  const [myName, setMyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mt_settings")
        .select("value")
        .eq("key", "my_name")
        .maybeSingle();
      setMyName(data?.value ?? "");
      setLoaded(true);
    })();
  }, []);

  async function save() {
    setSaving(true);
    await supabase
      .from("mt_settings")
      .upsert({ key: "my_name", value: myName.trim() || null });
    setSaving(false);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 360, background: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, fontSize: 16 }}>내 이름 설정</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -4 }}>
          여기 입력한 이름이 할일 담당자와 일치하면 "내 할일"로 자동 표시됩니다.
        </p>
        {loaded && (
          <input
            type="text"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            placeholder="예: 강성호"
            style={{
              width: "100%", padding: 10, borderRadius: 8,
              border: "1px solid var(--border)", marginBottom: 16, fontSize: 14,
            }}
          />
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn secondary" onClick={onClose}>취소</button>
          <button className="btn" onClick={save} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
