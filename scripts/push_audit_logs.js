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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function pushAuditRecords() {
    console.log('--- Pushing Audit Records ---');
    
    try {
        // Fetch existing deployments
        const { data: deployments } = await supabase.from('asset_deployments').select('id, deployment_number');
        
        if (!deployments || deployments.length === 0) {
            console.log('No deployments found to audit.');
            return;
        }

        const logs = deployments.map(d => ({
            table_name: 'asset_deployments',
            record_id: d.id,
            action: 'INSERT',
            new_data: { deployment_number: d.deployment_number, status: 'manual_audit_push' },
            created_at: new Date().toISOString()
        }));

        const { error } = await supabase.from('asset_master_logs').insert(logs);
        
        if (error) throw error;
        console.log(`Successfully pushed ${logs.length} audit records.`);
        
    } catch (error) {
        console.error('Push failed:', error.message);
    }
}

pushAuditRecords();
