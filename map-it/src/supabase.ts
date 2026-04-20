import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cqnujcgvvmlhxvxxabxo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxbnVqY2d2dm1saHh2eHhhYnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTk5NTIsImV4cCI6MjA5MjIzNTk1Mn0.DxO2ykbU-SMppwqO0n2LiWk81mXK9xgVkkNhSz43BdY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
