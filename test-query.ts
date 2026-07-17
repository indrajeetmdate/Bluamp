import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://bfkxdpripwjxenfvwpfu.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJma3hkcHJpcHdqeGVuZnZ3cGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzE5MjUsImV4cCI6MjA3OTEwNzkyNX0.5JSsA1iYBE5C6LNNWXfJ58JlB2U2TFvVradyON3WIQs');
async function test() {
    const term = 'INV';
    const {data, error} = await supabase
        .from('invoices')
        .select('*')
        .or(`invoice_metadata->>invoice_number.ilike.%${term}%,receiver_details->>name.ilike.%${term}%,issuer_details->>name.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .limit(10);
    console.log('Data count:', data?.length);
    if (error) console.error('Error:', error);
}
test();
