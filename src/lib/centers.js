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
