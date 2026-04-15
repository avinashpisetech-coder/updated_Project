import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAssets() {
    const { data, error } = await supabase
        .from("assets")
        .select(`
            *,
            sub_type:asset_sub_types(
                name,
                type:asset_types(name)
            ),
            custodian:profiles!custodian_id(full_name)
        `)
        .limit(5);

    if (error) {
        console.error("Error fetching assets:", error);
    } else {
        console.log("Assets found:", data?.length);
        console.log("Sample Asset:", JSON.stringify(data?.[0], null, 2));
    }
}

checkAssets();
