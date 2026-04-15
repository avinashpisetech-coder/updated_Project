import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'assets' });

    if (error) {
        // Fallback: try a direct query to see columns
        const { data: cols, error: err2 } = await supabase.from('assets').select('*').limit(1);
        if (err2) {
            console.error("Error checking columns:", err2);
        } else {
            console.log("Columns in assets:", Object.keys(cols?.[0] || {}));
        }
    } else {
        console.log("Assets Columns:", data);
    }
}

checkSchema();
