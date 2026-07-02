import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { getCenters, renameCenter, deleteCenter, ensureCenter } from "../lib/centers.js";
import { exportAllData, downloadJson, importAllData } from "../lib/backup.js";

export default function SettingsTab() {
  // 내 이름
  const [myName, setMyName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // 센터 관리
  const [centers, setCenters] = useState([]);
  const [editingCenter, setEditingCenter] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newCenter, setNewCenter] = useState("");

  // 백업/복원
  const [exporting, setExporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState("");
  const fileInputRef = useRef(null);

  async function load() {
    const { data } = await supabase.from("mt_settings").select("value").eq("key", "my_name").maybeSingle();
    setMyName(data?.value ?? "");
    setCenters(await getCenters());
  }

  useEffect(() => { load(); }, []);

  async function saveMyName() {
    setNameSaving(true);
    await supabase.from("mt_settings").upsert({ key: "my_name", value: myName.trim() || null });
    setNameSaving(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function addCenter() {
    if (!newCenter.trim()) return;
    await ensureCenter(newCenter.trim());
    setNewCenter("");
    setCenters(await getCenters());
  }

  async function saveRename(oldName) {
    if (editValue.trim() && editValue.trim() !== oldName) {
      await renameCenter(oldName, editValue.trim());
      setCenters(await getCenters());
    }
    setEditingCenter(null);
  }

  async function removeCenter(name) {
    if (!confirm(`"${name}" 센터를 삭제할까요? 이 센터로 등록된 회의록·통화기록은 "미지정"으로 바뀝니다.`)) return;
    await deleteCenter(name);
    setCenters(await getCenters());
  }

  // ---- 백업 ----
  async function handleExportClipboard() {
    setExporting(true);
    try {
      const data = await exportAllData();
      await navigator.clipboard.writeText(JSON.stringify(data));
      alert("전체 데이터가 클립보드에 복사되었습니다. 메모장 등에 붙여넣어 보관하세요.");
    } catch (e) {
      alert("내보내기 실패: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportFile() {
    setExporting(true);
    try {
      const data = await exportAllData();
      const filename = `kkangbi-meeting-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadJson(data, filename);
    } catch (e) {
      alert("내보내기 실패: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  // ---- 복원 ----
  async function runImport(text) {
    if (!text || !text.trim()) return;
    if (!confirm("데이터를 복원하면 동일 ID의 기존 항목이 덮어씌워집니다. 계속할까요?")) return;
    setImporting(true);
    setImportResult("");
    try {
      const summary = await importAllData(text);
      setImportResult("복원 완료: " + summary.join(", "));
      setCenters(await getCenters());
    } catch (e) {
      setImportResult("복원 실패: " + e.message);
    } finally {
      setImporting(false);
    }
  }

  async function handleFileImport(file) {
    if (!file) return;
    const text = await file.text();
    runImport(text);
  }

  return (
    <div>
      {/* 내 이름 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginTop: 0 }}>내 이름</div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -4 }}>
          여기 입력한 이름이 할일 담당자와 일치하면 "내 할일"로 자동 표시됩니다.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            placeholder="예: 강성호"
            style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
          />
          <button className="btn" onClick={saveMyName} disabled={nameSaving}>
            {nameSaving ? "저장 중..." : nameSaved ? "저장됨 ✓" : "저장"}
          </button>
        </div>
      </div>

      {/* 센터 관리 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginTop: 0 }}>센터/부서 관리</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
          {centers.map((c) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {editingCenter === c ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid var(--border)", fontSize: 13 }}
                  />
                  <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => saveRename(c)}>저장</button>
                  <button className="btn secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditingCenter(null)}>취소</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 14 }}>{c}</span>
                  <button
                    style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer" }}
                    onClick={() => { setEditingCenter(c); setEditValue(c); }}
                  >
                    수정
                  </button>
                  <button
                    style={{ background: "none", border: "none", color: "var(--danger)", fontSize: 12, cursor: "pointer" }}
                    onClick={() => removeCenter(c)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          ))}
          {centers.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)" }}>등록된 센터가 없습니다.</p>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={newCenter}
            onChange={(e) => setNewCenter(e.target.value)}
            placeholder="새 센터/부서명"
            style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid var(--border)" }}
          />
          <button className="btn secondary" onClick={addCenter}>추가</button>
        </div>
      </div>

      {/* 백업/복원 */}
      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>데이터 백업 / 복원</div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: -4 }}>
          회의록·통화기록·할일·센터 목록 전체를 백업합니다. (첨부파일 원본은 포함되지 않고 목록 정보만 백업됩니다)
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button className="btn secondary" onClick={handleExportClipboard} disabled={exporting}>
            📋 클립보드로 복사
          </button>
          <button className="btn secondary" onClick={handleExportFile} disabled={exporting}>
            💾 파일로 저장
          </button>
        </div>

        <div className="section-title">복원</div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="백업했던 JSON 텍스트를 여기에 붙여넣으세요"
          rows={4}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", fontSize: 12, marginBottom: 8 }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn secondary" onClick={() => runImport(importText)} disabled={importing}>
            {importing ? "복원 중..." : "붙여넣은 내용으로 복원"}
          </button>
          <button className="btn secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            파일로 복원
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => handleFileImport(e.target.files?.[0])}
          />
        </div>
        {importResult && (
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>{importResult}</p>
        )}
      </div>
    </div>
  );
}
