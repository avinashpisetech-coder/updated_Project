const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env variables
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanup() {
    console.log('--- Starting Deployment Transaction Cleanup ---');
    
    try {
        // 1. Delete Amendments
        console.log('Deleting asset_deployment_amendments...');
        const { error: err1 } = await supabase.from('asset_deployment_amendments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err1) throw err1;

        // 2. Delete Items
        console.log('Deleting asset_deployment_items...');
        const { error: err2 } = await supabase.from('asset_deployment_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err2) throw err2;

        // 3. Delete Master
        console.log('Deleting asset_deployments...');
        const { error: err3 } = await supabase.from('asset_deployments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (err3) throw err3;

        console.log('--- SUCCESS: All deployment transactions deleted from DB ---');
        console.log('NOTE: To reset the deployment number sequence, please run the SQL in db/v143_cleanup_deployments.sql in your Supabase SQL Editor.');
        
    } catch (error) {
        console.error('Cleanup failed:', error.message);
        process.exit(1);
    }
}

cleanup();
