import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');

const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  async function test() {
    const { data, error } = await supabase.from('ticket_categories').select('*');
    if (error) {
      console.log("Error:", error.message);
    } else {
      console.log("Categories found:", data.length);
      console.log(data);
    }
  }
  test();
} else {
  console.log("Could not find env vars");
}
