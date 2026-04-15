
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkModules() {
    const { data: modules } = await supabase.from('modules').select('name, slug');
    const { data: perms } = await supabase.from('permissions').select('resource, action').ilike('resource', '%asset%');
    
    console.log('--- DATABASE MODULES ---');
    console.table(modules);
    console.log('--- ASSET PERMISSIONS ---');
    console.table(perms);
}

checkModules();
