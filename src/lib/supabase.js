import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey);

// Storage 버킷명 (Supabase 대시보드에서 미리 생성 필요: meeting-recordings, private)
export const RECORDINGS_BUCKET = "meeting-recordings";

// process-meeting Edge Function 전체 URL
// 예: https://zbiwyqwjehnogxkzlhxx.supabase.co/functions/v1/process-meeting
export const PROCESS_MEETING_URL = import.meta.env.VITE_PROCESS_MEETING_URL;
