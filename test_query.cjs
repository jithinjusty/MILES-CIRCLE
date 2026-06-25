require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, recipient_id, content, created_at, sender:sender_id(full_name), recipient:recipient_id(full_name)')
        .limit(1);
    console.log("Data:", data);
    console.log("Error:", error);
}
test();
