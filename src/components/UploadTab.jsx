import React, { useState, useRef } from "react";
import { supabase, RECORDINGS_BUCKET } from "../lib/supabase.js";

export default function UploadTab({ onUploaded }) {
  const [mode, setMode] = useState("file"); // 'file' | 'paste'
  const [dragOver, setDragOver] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const inputRef = useRef(null);

  function safeStorageKey(ext) {
    const random = Math.random().toString(36).slice(2, 10);
    return `upload/${Date.now()}_${random}.${ext}`;
  }

  async function submitText(text, sourceFileName) {
    setUploading(true);
    setProgressMsg("회의록 텍스트 저장 중...");

    try {
      const storagePath = safeStorageKey("txt");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });

      const { error: upErr } = await supabase.storage
        .from(RECORDINGS_BUCKET)
        .upload(storagePath, blob, { contentType: "text/plain;charset=utf-8" });

      if (upErr) throw upErr;

      setProgressMsg("회의 레코드 생성 중...");
      const { data: meeting, error: insErr } = await supabase
        .from("mt_meetings")
        .insert({
          source: "upload",
          source_file_name: sourceFileName,
          storage_path: storagePath,
          meeting_date: meetingDate,
          title: title || null,
          status: "uploaded",
        })
        .select()
        .single();

      if (insErr) throw insErr;

      setProgressMsg("요약·할일 추출을 시작합니다 (1분 내외 소요)...");

      const { error: fnErr } = await supabase.functions.invoke("kkangbi-meeting", {
        body: { meeting_id: meeting.id },
      });
      if (fnErr) console.error("함수 호출 오류:", fnErr);

      setProgressMsg("등록 완료! 목록에서 처리 상태를 확인하세요.");
      setPasteText("");
      setTitle("");
      setTimeout(() => onUploaded?.(), 1000);
    } catch (e) {
      console.error(e);
      setProgressMsg("오류가 발생했습니다: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;

    if (files.length === 1) {
      const text = await files[0].text();
      submitText(text, files[0].name);
      return;
    }

    // 여러 파일 선택 시: 같은 회의가 여러 세션으로 나뉜 경우로 보고 하나로 병합
    setUploading(true);
    setProgressMsg(`${files.length}개 파일을 하나로 합치는 중...`);
    try {
      const parts = [];
      for (const f of files) {
        const text = await f.text();
        parts.push(`\n\n=== ${f.name} ===\n\n${text}`);
      }
      const combined = parts.join("");
      const combinedName = `${files[0].name} 외 ${files.length - 1}건`;
      await submitText(combined, combinedName);
    } catch (e) {
      setProgressMsg("파일 병합 실패: " + e.message);
      setUploading(false);
    }
  }

  return (
    <div className="card">
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
        클로바노트 앱에서 회의 녹음 → 자동 STT·화자분리 완료 후,
        <b> [내보내기 → txt]</b>로 다운받은 파일을 올리거나 텍스트를 그대로 붙여넣으세요.
        <br />
        같은 회의가 여러 세션(파일)으로 나뉘어 있다면 <b>여러 파일을 한번에 선택</b>하면 하나로 합쳐서 분석합니다.
      </div>

      <div className="section-title">회의 날짜</div>
      <input
        type="date"
        value={meetingDate}
        onChange={(e) => setMeetingDate(e.target.value)}
        style={{ marginBottom: 12, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
      />

      <div className="section-title">회의 제목 (선택, 비워두면 AI가 자동 생성)</div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="예: KB손해보험 정기 운영미팅"
        style={{
          marginBottom: 16, padding: 8, borderRadius: 8, border: "1px solid var(--border)",
          width: "100%",
        }}
      />

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab-btn ${mode === "file" ? "active" : ""}`}
          onClick={() => setMode("file")}
        >
          파일 업로드
        </button>
        <button
          className={`tab-btn ${mode === "paste" ? "active" : ""}`}
          onClick={() => setMode("paste")}
        >
          텍스트 붙여넣기
        </button>
      </div>

      {mode === "file" ? (
        <div
          className={`dropzone ${dragOver ? "dragover" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <p>{progressMsg}</p>
          ) : (
            <p style={{ margin: 0, fontSize: 15 }}>
              클로바노트에서 내보낸 .txt 파일을 드래그하거나 클릭해서 선택 (여러 개 선택 가능)
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".txt,text/plain"
            multiple
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      ) : (
        <div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="클로바노트 화면에서 전사 텍스트를 복사해 여기에 붙여넣으세요."
            rows={10}
            style={{
              width: "100%", padding: 12, borderRadius: 8, border: "1px solid var(--border)",
              fontSize: 13, lineHeight: 1.5, resize: "vertical",
            }}
            disabled={uploading}
          />
          <button
            className="btn"
            style={{ marginTop: 12 }}
            disabled={uploading || pasteText.trim().length < 10}
            onClick={() => submitText(pasteText, `붙여넣기_${Date.now()}.txt`)}
          >
            {uploading ? "처리 중..." : "등록하고 요약 시작"}
          </button>
          {progressMsg && (
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>{progressMsg}</p>
          )}
        </div>
      )}

      {mode === "file" && !uploading && progressMsg && (
        <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>{progressMsg}</p>
      )}
    </div>
  );
}
