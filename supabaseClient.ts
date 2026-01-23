
import { createClient } from '@supabase/supabase-js';

// Ultra-safe environment variable access
const getEnv = (key: string) => {
  try {
    // Check if import.meta exists and has env
    if (import.meta && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
    // Fallback for some process.env environments
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || "https://bfkxdpripwjxenfvwpfu.supabase.co";
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJma3hkcHJpcHdqeGVuZnZ3cGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzE5MjUsImV4cCI6MjA3OTEwNzkyNX0.5JSsA1iYBE5C6LNNWXfJ58JlB2U2TFvVradyON3WIQs";

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing. App may not function correctly.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
