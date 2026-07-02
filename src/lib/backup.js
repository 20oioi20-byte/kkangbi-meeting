import { supabase } from "./supabase.js";

const TABLES = [
  { name: "mt_centers", conflict: "name" },
  { name: "mt_settings", conflict: "key" },
  { name: "mt_meetings", conflict: "id" },
  { name: "mt_action_items", conflict: "id" },
  { name: "mt_attachments", conflict: "id" },
  { name: "mt_calls", conflict: "id" },
];

// 전체 데이터를 하나의 JSON 객체로 내보내기
export async function exportAllData() {
  const result = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t.name).select("*");
    if (error) throw new Error(`${t.name} 조회 실패: ${error.message}`);
    result.tables[t.name] = data ?? [];
  }
  return result;
}

export function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// JSON 텍스트를 파싱해 각 테이블에 upsert (id/key 기준 덮어쓰기)
export async function importAllData(jsonText) {
  const parsed = JSON.parse(jsonText);
  const tables = parsed.tables || parsed; // exported_at 래핑 없이 tables만 온 경우도 허용
  const summary = [];

  for (const t of TABLES) {
    const rows = tables[t.name];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    // 500건씩 나눠서 upsert (요청 크기 제한 대비)
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabase.from(t.name).upsert(chunk, { onConflict: t.conflict });
      if (error) throw new Error(`${t.name} 복원 실패: ${error.message}`);
    }
    summary.push(`${t.name}: ${rows.length}건`);
  }

  return summary;
}
