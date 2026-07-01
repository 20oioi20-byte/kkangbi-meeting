import React, { useEffect, useState } from "react";
import { supabase, RECORDINGS_BUCKET } from "../lib/supabase.js";
import { getCenters, ensureCenter } from "../lib/centers.js";

export default function MeetingDetail({ meetingId, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [actions, setActions] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [centers, setCenters] = useState([]);

  const [attendeesSaving, setAttendeesSaving] = useState(false);
  const [attendeesSaved, setAttendeesSaved] = useState(false);

  const [memo, setMemo] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);

  const [basicDraft, setBasicDraft] = useState({ title: "", center: "", department: "", meeting_date: "" });
  const [basicSaving, setBasicSaving] = useState(false);
  const [basicSaved, setBasicSaved] = useState(false);

  const [bullets, setBullets] = useState([]);
  const [bulletsSaving, setBulletsSaving] = useState(false);
  const [bulletsSaved, setBulletsSaved] = useState(false);

  const [reanalyzing, setReanalyzing] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [filterMine, setFilterMine] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ content: "", owner: "", due_date: "" });

  const [showTranscript, setShowTranscript] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  async function load() {
    const { data: m } = await supabase.from("mt_meetings").select("*").eq("id", meetingId).single();
    setMeeting(m);
    setAttendees(Array.isArray(m?.attendees) ? m.attendees : []);
    setMemo(m?.memo || "");
    setBasicDraft({
      title: m?.title || "",
      center: m?.center || "",
      department: m?.department || "",
      meeting_date: m?.meeting_date || "",
    });
    setBullets(m?.summary_bullets && m.summary_bullets.length ? [...m.summary_bullets] : []);

    const { data: a } = await supabase
      .from("mt_action_items")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true });
    setActions(a ?? []);

    const { data: at } = await supabase
      .from("mt_attachments")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true });
    setAttachments(at ?? []);

    setCenters(await getCenters());
  }

  useEffect(() => {
    load();
  }, [meetingId]);

  function nameForLabel(label) {
    const found = attendees.find((x) => x.label === label);
    return found && found.name && found.name.trim() ? found.name.trim() : label;
  }

  // ---- 메모 ----
  async function saveMemo() {
    setMemoSaving(true);
    const { error } = await supabase.from("mt_meetings").update({ memo }).eq("id", meetingId);
    setMemoSaving(false);
    if (!error) {
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    }
  }

  // ---- 기본정보 ----
  async function saveBasic() {
    setBasicSaving(true);
    if (basicDraft.center) await ensureCenter(basicDraft.center);
    const { error } = await supabase
      .from("mt_meetings")
      .update({
        title: basicDraft.title || null,
        center: basicDraft.center || null,
        department: basicDraft.department || null,
        meeting_date: basicDraft.meeting_date || null,
      })
      .eq("id", meetingId);
    setBasicSaving(false);
    if (!error) {
      setBasicSaved(true);
      setMeeting((prev) => ({ ...prev, ...basicDraft }));
      setCenters(await getCenters());
      setTimeout(() => setBasicSaved(false), 2000);
    }
  }

  // ---- 핵심 요약 bullet 편집 ----
  function updateBullet(i, value) {
    setBullets((prev) => prev.map((b, idx) => (idx === i ? value : b)));
    setBulletsSaved(false);
  }
  function removeBullet(i) {
    setBullets((prev) => prev.filter((_, idx) => idx !== i));
    setBulletsSaved(false);
  }
  function addBullet() {
    setBullets((prev) => [...prev, ""]);
    setBulletsSaved(false);
  }
  async function saveBullets() {
    setBulletsSaving(true);
    const cleaned = bullets.map((b) => b.trim()).filter(Boolean);
    const { error } = await supabase
      .from("mt_meetings")
      .update({ summary_bullets: cleaned })
      .eq("id", meetingId);
    setBulletsSaving(false);
    if (!error) {
      setBullets(cleaned);
      setMeeting((prev) => ({ ...prev, summary_bullets: cleaned }));
      setBulletsSaved(true);
      setTimeout(() => setBulletsSaved(false), 2000);
    }
  }

  // ---- 참석자 이름 ----
  function updateAttendeeName(label, name) {
    setAttendees((prev) => prev.map((a) => (a.label === label ? { ...a, name } : a)));
    setAttendeesSaved(false);
  }
  async function saveAttendees() {
    setAttendeesSaving(true);
    const { error } = await supabase.from("mt_meetings").update({ attendees }).eq("id", meetingId);
    setAttendeesSaving(false);
    if (!error) {
      setAttendeesSaved(true);
      setMeeting((prev) => ({ ...prev, attendees }));
    }
  }

  // ---- 할일 ----
  async function toggleDone(item) {
    const { error } = await supabase.from("mt_action_items").update({ is_done: !item.is_done }).eq("id", item.id);
    if (!error) setActions((prev) => prev.map((a) => (a.id === item.id ? { ...a, is_done: !a.is_done } : a)));
  }
  async function toggleMine(item) {
    const { error } = await supabase.from("mt_action_items").update({ is_mine: !item.is_mine }).eq("id", item.id);
    if (!error) setActions((prev) => prev.map((a) => (a.id === item.id ? { ...a, is_mine: !a.is_mine } : a)));
  }
  function startEdit(item) {
    setEditingId(item.id);
    setEditDraft({ content: item.content || "", owner: item.owner || "", due_date: item.due_date || "" });
  }
  async function saveEdit(id) {
    const { error } = await supabase
      .from("mt_action_items")
      .update({ content: editDraft.content, owner: editDraft.owner || null, due_date: editDraft.due_date || null })
      .eq("id", id);
    if (!error) {
      setActions((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, content: editDraft.content, owner: editDraft.owner || null, due_date: editDraft.due_date || null } : a
        )
      );
      setEditingId(null);
    }
  }
  async function deleteAction(id) {
    if (!confirm("이 할일을 삭제할까요?")) return;
    await supabase.from("mt_action_items").delete().eq("id", id);
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  // ---- 첨부자료 ----
  async function uploadAttachment(file) {
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
      const storagePath = `attachments/${meetingId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage.from(RECORDINGS_BUCKET).upload(storagePath, file);
      if (upErr) throw upErr;

      let contentText = null;
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        contentText = await file.text();
      }

      const { data: row, error: insErr } = await supabase
        .from("mt_attachments")
        .insert({ meeting_id: meetingId, file_name: file.name, storage_path: storagePath, content_text: contentText })
        .select()
        .single();
      if (insErr) throw insErr;

      setAttachments((prev) => [...prev, row]);
    } catch (e) {
      alert("첨부 업로드 실패: " + e.message);
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function deleteAttachment(id) {
    if (!confirm("이 첨부자료를 삭제할까요?")) return;
    await supabase.from("mt_attachments").delete().eq("id", id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function downloadAttachment(att) {
    const { data } = await supabase.storage.from(RECORDINGS_BUCKET).createSignedUrl(att.storage_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function reanalyze() {
    setReanalyzing(true);
    const { error } = await supabase.functions.invoke("kkangbi-meeting", { body: { meeting_id: meetingId } });
    setReanalyzing(false);
    if (error) {
      alert("재분석 요청 실패: " + error.message);
    } else {
      alert("재분석을 시작했습니다. 잠시 후 새로고침(목록 → 다시 진입)해서 확인해주세요.");
    }
  }

  async function deleteMeeting() {
    if (!confirm("이 회의록을 삭제할까요? 할일·첨부자료도 함께 삭제됩니다.")) return;
    await supabase.from("mt_meetings").delete().eq("id", meetingId);
    onBack();
  }

  // ---- 보고서 초안 ----
  function buildReportText() {
    if (!meeting) return "";
    const lines = [];
    const centerLine = [basicDraft.center, basicDraft.department].filter(Boolean).join(" ");
    lines.push(`[보고] ${centerLine ? centerLine + " - " : ""}${meeting.title || meeting.source_file_name}`);
    lines.push("");
    lines.push("1. 회의 개요");
    lines.push(`- 일시: ${basicDraft.meeting_date || meeting.meeting_date}`);
    if (centerLine) lines.push(`- 센터/부서: ${centerLine}`);
    if (attendees.length) {
      lines.push(`- 참석자: ${attendees.map((a) => nameForLabel(a.label)).join(", ")}`);
    }
    lines.push("");

    if (bullets.length) {
      lines.push("2. 주요 논의사항");
      bullets.forEach((b) => lines.push(`- ${b}`));
      lines.push("");
    }

    if (meeting.speaker_highlights?.length) {
      lines.push("3. 참석자별 주요 발언");
      meeting.speaker_highlights.forEach((s) => {
        lines.push(`▪ ${nameForLabel(s.label)}`);
        (s.points || []).forEach((p) => lines.push(`  - ${p}`));
      });
      lines.push("");
    }

    if (actions.length) {
      lines.push("4. 향후 조치사항");
      actions.forEach((a) => {
        const meta = [];
        if (a.owner) meta.push(`담당: ${a.owner}`);
        if (a.due_date) meta.push(`기한: ${a.due_date}`);
        lines.push(`- ${a.content}${meta.length ? ` (${meta.join(" · ")})` : ""}`);
      });
      lines.push("");
    }

    if (memo.trim()) {
      lines.push("5. 특이사항 / 메모");
      lines.push(memo.trim());
    }

    return lines.join("\n");
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(buildReportText());
      setCopyStatus("보고서 초안이 복사되었습니다! 메일 본문에 붙여넣기(Ctrl+V) 하세요.");
    } catch {
      setCopyStatus("복사 실패 — 원문 전사 영역처럼 직접 선택 후 복사해주세요.");
    }
    setTimeout(() => setCopyStatus(""), 4000);
  }

  if (!meeting) return <p style={{ color: "var(--muted)" }}>불러오는 중...</p>;

  const visibleActions = filterMine ? actions.filter((a) => a.is_mine) : actions;

  return (
    <div>
      <datalist id="centers-list">
        {centers.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <button className="btn secondary" onClick={onBack}>← 목록으로</button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn secondary" onClick={reanalyze} disabled={reanalyzing}>
            {reanalyzing ? "재분석 중..." : "🔄 다시 분석"}
          </button>
          <button className="btn" onClick={copyReport}>📄 보고서 초안 복사</button>
          <button className="btn secondary" style={{ color: "var(--danger)" }} onClick={deleteMeeting}>삭제</button>
        </div>
      </div>

      {copyStatus && (
        <div className="card" style={{ marginBottom: 12, padding: 12, fontSize: 13, background: "var(--accent-soft)" }}>
          {copyStatus}
        </div>
      )}

      {/* 메모 */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="section-title" style={{ marginTop: 0, display: "flex", justifyContent: "space-between" }}>
          <span>메모</span>
          <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={saveMemo} disabled={memoSaving}>
            {memoSaving ? "저장 중..." : memoSaved ? "저장됨 ✓" : "메모 저장"}
          </button>
        </div>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="회의 관련 추가 메모를 자유롭게 기록하세요."
          rows={3}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
        />
      </div>

      <div className="card">
        {/* 기본정보 */}
        <div className="section-title" style={{ marginTop: 0, display: "flex", justifyContent: "space-between" }}>
          <span>기본정보</span>
          <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={saveBasic} disabled={basicSaving}>
            {basicSaving ? "저장 중..." : basicSaved ? "저장됨 ✓" : "기본정보 저장"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={basicDraft.title}
            onChange={(e) => setBasicDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="회의 제목"
            style={{ flex: "1 1 260px", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
          />
          <input
            type="date"
            value={basicDraft.meeting_date || ""}
            onChange={(e) => setBasicDraft((d) => ({ ...d, meeting_date: e.target.value }))}
            style={{ padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <input
            type="text"
            list="centers-list"
            value={basicDraft.center}
            onChange={(e) => setBasicDraft((d) => ({ ...d, center: e.target.value }))}
            placeholder="센터명 (예: 강남센터)"
            style={{ flex: "1 1 160px", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
          />
          <input
            type="text"
            value={basicDraft.department}
            onChange={(e) => setBasicDraft((d) => ({ ...d, department: e.target.value }))}
            placeholder="부서명 (예: 소비자보호파트)"
            style={{ flex: "1 1 160px", padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
          />
        </div>

        {/* 핵심 요약 */}
        <div className="section-title" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>핵심 요약</span>
          <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={saveBullets} disabled={bulletsSaving}>
            {bulletsSaving ? "저장 중..." : bulletsSaved ? "저장됨 ✓" : "요약 저장"}
          </button>
        </div>
        {bullets.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input
              type="text"
              value={b}
              onChange={(e) => updateBullet(i, e.target.value)}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}
            />
            <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => removeBullet(i)}>삭제</button>
          </div>
        ))}
        <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12, marginBottom: 8 }} onClick={addBullet}>
          + 항목 추가
        </button>

        {/* 참석자 */}
        {attendees.length > 0 && (
          <>
            <div className="section-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>참석자 (이름 수정 가능)</span>
              <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={saveAttendees} disabled={attendeesSaving}>
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
                    style={{ width: 90, padding: "4px 8px", fontSize: 13, borderRadius: 6, border: "1px solid var(--border)" }}
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
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{nameForLabel(s.label)}</div>
                <ul className="key-points" style={{ marginTop: 0 }}>
                  {(s.points || []).map((p, j) => <li key={j}>{p}</li>)}
                </ul>
              </div>
            ))}
          </>
        )}

        {/* 할 일 */}
        <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>할 일</span>
          <div className="tabs" style={{ marginBottom: 0, border: "none" }}>
            <button className={"tab-btn " + (!filterMine ? "active" : "")} style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setFilterMine(false)}>전체</button>
            <button className={"tab-btn " + (filterMine ? "active" : "")} style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setFilterMine(true)}>내 할일만</button>
          </div>
        </div>

        {visibleActions.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>표시할 할일이 없습니다.</p>}

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
                  <input type="text" placeholder="담당자" value={editDraft.owner} onChange={(e) => setEditDraft((d) => ({ ...d, owner: e.target.value }))} style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }} />
                  <input type="date" value={editDraft.due_date || ""} onChange={(e) => setEditDraft((d) => ({ ...d, due_date: e.target.value }))} style={{ padding: 6, borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => saveEdit(a.id)}>저장</button>
                  <button className="btn secondary" style={{ padding: "4px 12px", fontSize: 12 }} onClick={() => setEditingId(null)}>취소</button>
                </div>
              </div>
            ) : (
              <>
                <input type="checkbox" checked={a.is_done} onChange={() => toggleDone(a)} style={{ marginTop: 3 }} title="완료 여부" />
                <div style={{ flex: 1 }}>
                  <div style={{ textDecoration: a.is_done ? "line-through" : "none" }}>{a.content}</div>
                  <div className="meta">
                    {a.owner ? "담당: " + a.owner : "담당 미지정"}
                    {a.due_date ? " · 기한: " + a.due_date : ""}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
                      <input type="checkbox" checked={a.is_mine} onChange={() => toggleMine(a)} />
                      내 할일
                    </label>
                    <button onClick={() => startEdit(a)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", padding: 0 }}>수정</button>
                    <button onClick={() => deleteAction(a.id)} style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 12, cursor: "pointer", padding: 0 }}>삭제</button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {/* 첨부자료 */}
        <div className="section-title">첨부자료</div>
        {attachments.map((att) => (
          <div key={att.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
            <span>{att.file_name}{att.content_text ? "" : " (텍스트 아님 — 분석 미반영)"}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadAttachment(att)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer" }}>다운로드</button>
              <button onClick={() => deleteAttachment(att.id)} style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 12, cursor: "pointer" }}>삭제</button>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 10 }}>
          <input
            type="file"
            onChange={(e) => uploadAttachment(e.target.files?.[0])}
            disabled={uploadingAttachment}
            style={{ fontSize: 13 }}
          />
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            .txt 파일은 "다시 분석"할 때 회의록 내용에 함께 반영됩니다. 다른 형식(PDF·이미지 등)은 참고용으로만 저장됩니다.
          </p>
        </div>

        {/* 원문 전사 */}
        {meeting.raw_transcript && (
          <>
            <div className="section-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>원문 전사</span>
              <button className="btn secondary" style={{ padding: "2px 10px", fontSize: 12 }} onClick={() => setShowTranscript((s) => !s)}>
                {showTranscript ? "숨기기" : "보기"}
              </button>
            </div>
            {showTranscript && <div className="transcript-box">{meeting.raw_transcript}</div>}
          </>
        )}
      </div>
    </div>
  );
}
