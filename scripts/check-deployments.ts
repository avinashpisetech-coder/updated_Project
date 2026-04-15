import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'placeholder',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

// We need to use the actual URL from .env.local
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

async function check() {
  console.log("Checking DB...");
  const { data, error } = await db.from("asset_deployments").select("*");
  console.log("Deployments: ", data?.length);
  if (error) console.error("Error: ", error);
  
  const { data: d2, error: e2 } = await db.from("asset_deployments").select(`
            *,
            project:projects(name),
            company:companies(name),
            recipient:profiles(full_name),
            department:departments(name),
            store:asset_stores(name),
            asset_deployment_items(*)
        `);
  if (e2) console.error("Query Error: ", e2);
  else console.log("Query success! Length: ", d2?.length);
}

check();
