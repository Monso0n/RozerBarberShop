import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://euzhxvobdkotwkfytkap.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1emh4dm9iZGtvdHdrZnl0a2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NTk2OTcsImV4cCI6MjA2NjQzNTY5N30.YRcAO2vHzXAc8Lkx3BbRT7Et0QrArdfH831bzB4tmDg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
