const { createClient } = require("@supabase/supabase-js");

const tables = ["normalized_events", "moments", "data_lines"];

const main = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error(`${table} count failed:`, error.message);
      process.exit(1);
    }
    console.log(`${table}: ${count}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
