import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { getCenters, ensureCenter } from "../lib/centers.js";

export default function CallsTab({ initialExpandId, expandNonce }) {
  const [calls, setCalls] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(initialExpandId || null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (initialExpandId) setExpandedId(initialExpandId);
  }, [initialExpandId, expandNonce]);

  const [draft, setDraft] = useState({
    center: "", department: "", counterpart_name: "",
    call_datetime: new Date().toISOString().slice(0, 16), content: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("mt_calls")
      .select("*")
      .order("call_datetime", { ascending: false })
      .limit(200);
    setCalls(data ?? []);
    setCenters(await getCenters());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCallFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    const textFiles = files.filter((f) => f.type === "text/plain" || f.name.endsWith(".txt"));
    if (textFiles.length === 0) {
      alert("텍스트(.txt) 파일만 자동으로 내용에 반영됩니다. 클로바노트/에이닷노트 등에서 텍스트로 내보낸 뒤 업로드해주세요.");
      return;
    }
    let combined = "";
    for (const f of textFiles) {
      const text = await f.text();
      combined += (combined ? "\n\n" : "") + (textFiles.length > 1 ? `=== ${f.name} ===\n` : "") + text;
    }
    setDraft((d) => ({ ...d, content: d.content ? d.content + "\n\n" + combined : combined }));
  }

  async function createCall() {
    if (!draft.content.trim()) {
      alert("통화 내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    if (draft.center) await ensureCenter(draft.center);

    const { data: row, error } = await supabase
      .from("mt_calls")
      .insert({
        center: draft.center || null,
        department: draft.department || null,
        counterpart_name: draft.counterpart_name || null,
        call_datetime: draft.call_datetime,
        content: draft.content,
        status: "draft",
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    setCalls((prev) => [row, ...prev]);
    setShowForm(false);
    setDraft({ center: "", department: "", counterpart_name: "", call_datetime: new Date().toISOString().slice(0, 16), content: "" });
    generateSummary(row.id);
  }

  async function generateSummary(callId) {
    setCalls((prev) => prev.map((c) => (c.id === callId ? { ...c, status: "summarizing" } : c)));
    const { error } = await supabase.functions.invoke("kkangbi-call", { body: { call_id: callId } });
    if (error) console.error(error);
    setTimeout(load, 2500);
  }

  async function deleteCall(id) {
    if (!confirm("이 통화기록을 삭제할까요?")) return;
    await supabase.from("mt_calls").delete().eq("id", id);
    setCalls((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "닫기" : "+ 새 통화 기록"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <input
              type="text" list="calls-centers-list" placeholder="센터명"
              value={draft.center} onChange={(e) => setDraft((d) => ({ ...d, center: e.target.value }))}
              style={{ flex: "1 1 140px", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
            />
            <datalist id="calls-centers-list">
              {centers.map((c) => <option key={c} value={c} />)}
            </datalist>
            <input
              type="text" placeholder="부서명"
              value={draft.department} onChange={(e) => setDraft((d) => ({ ...d, department: e.target.value }))}
              style={{ flex: "1 1 140px", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <input
              type="text" placeholder="통화 상대방"
              value={draft.counterpart_name} onChange={(e) => setDraft((d) => ({ ...d, counterpart_name: e.target.value }))}
              style={{ flex: "1 1 160px", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
            />
            <input
              type="datetime-local"
              value={draft.call_datetime} onChange={(e) => setDraft((d) => ({ ...d, call_datetime: e.target.value }))}
              style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 12, color: "var(--muted)" }}>
              통화 텍스트 파일 업로드 (선택, .txt, 여러 개 가능)
            </label>
            <input
              type="file"
              accept=".txt,text/plain"
              multiple
              onChange={(e) => handleCallFiles(e.target.files)}
              style={{ display: "block", marginTop: 4, fontSize: 13 }}
            />
          </div>
          <textarea
            placeholder="통화 내용을 입력하거나, 통화 녹음을 클로바노트/에이닷노트로 전사한 텍스트를 붙여넣으세요. (위에서 파일을 올리면 자동으로 채워집니다)"
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            rows={6}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, marginBottom: 8 }}
          />
          <button className="btn" onClick={createCall} disabled={saving}>
            {saving ? "저장 중..." : "저장하고 AI 요약 생성"}
          </button>
        </div>
      )}

      {calls.length === 0 && !showForm && (
        <div className="card" style={{ textAlign: "center", color: "var(--muted)" }}>
          등록된 통화기록이 없습니다.
        </div>
      )}

      <div className="meeting-list">
        {calls.map((c) => (
          <div key={c.id} className="card" style={{ padding: 14 }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {c.counterpart_name || "상대방 미입력"}
                </div>
                {c.summary_bullets?.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--text)", opacity: 0.75, marginTop: 2 }}>
                    {c.summary_bullets[0]}
                  </div>
                )}
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  통화일 {new Date(c.call_datetime).toLocaleString("ko-KR")} · 등록 {new Date(c.created_at).toLocaleDateString("ko-KR")} · {c.center || "센터 미지정"}{c.department ? ` · ${c.department}` : ""}
                </div>
              </div>
              <span className={`badge ${c.status === "done" ? "done" : c.status === "failed" ? "failed" : "processing"}`}>
                {c.status === "done" ? "완료" : c.status === "failed" ? "실패" : c.status === "summarizing" ? "요약중" : "초안"}
              </span>
            </div>

            {expandedId === c.id && (
              <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                {c.summary_bullets?.length > 0 && (
                  <>
                    <div className="section-title" style={{ marginTop: 0 }}>AI 요약</div>
                    <ul className="key-points">
                      {c.summary_bullets.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </>
                )}
                <div className="section-title">통화 내용</div>
                <div className="transcript-box" style={{ maxHeight: 240 }}>{c.content}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {c.status !== "summarizing" && (
                    <button className="btn secondary" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => generateSummary(c.id)}>
                      AI 요약 다시 생성
                    </button>
                  )}
                  <button className="btn secondary" style={{ fontSize: 12, padding: "4px 10px", color: "var(--danger)" }} onClick={() => deleteCall(c.id)}>
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
