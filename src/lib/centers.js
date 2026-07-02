import { supabase } from "./supabase.js";

export async function getCenters() {
  const { data } = await supabase.from("mt_centers").select("name").order("name");
  return (data ?? []).map((c) => c.name);
}

// 새 센터명이면 마스터 목록에 추가 (이미 있으면 무시)
export async function ensureCenter(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  await supabase.from("mt_centers").upsert({ name: trimmed }, { onConflict: "name" });
}

// 센터명 변경 - 참조 중인 회의록/통화기록도 함께 갱신
export async function renameCenter(oldName, newName) {
  const trimmed = (newName || "").trim();
  if (!trimmed || trimmed === oldName) return;

  await supabase.from("mt_centers").insert({ name: trimmed }).select().maybeSingle();
  await supabase.from("mt_meetings").update({ center: trimmed }).eq("center", oldName);
  await supabase.from("mt_calls").update({ center: trimmed }).eq("center", oldName);
  await supabase.from("mt_centers").delete().eq("name", oldName);
}

// 센터 삭제 - 참조 중인 회의록/통화기록은 "미지정"(null)으로 변경
export async function deleteCenter(name) {
  await supabase.from("mt_meetings").update({ center: null }).eq("center", name);
  await supabase.from("mt_calls").update({ center: null }).eq("center", name);
  await supabase.from("mt_centers").delete().eq("name", name);
}

