import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (urlMatch && keyMatch) {
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  async function test() {
    // 1. Get first active profile
    const { data: profile } = await supabase.from('profiles').select('id, full_name, role').limit(1).single();
    if (!profile) {
      console.log("No profiles found to test with.");
      return;
    }
    
    console.log(`Testing with profile: ${profile.full_name} (${profile.id}) role: ${profile.role}`);
    
    // 2. Call RPC
    const { data, error } = await supabase.rpc('get_advanced_analytics', {
      p_profile_id: profile.id
    });
    
    if (error) {
      console.log("RPC Error:", JSON.stringify(error, null, 2));
    } else {
      console.log("RPC Success. Data keys:", Object.keys(data));
    }
  }
  
  test();
} else {
  console.log("Missing config in .env.local");
}
