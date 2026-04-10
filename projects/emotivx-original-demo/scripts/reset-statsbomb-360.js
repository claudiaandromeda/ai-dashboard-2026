require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const CHUNK_SIZE = 200;

const deleteInChunks = async (supabase, table, idColumn) => {
  let total = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(idColumn)
      .limit(CHUNK_SIZE);
    if (error) {
      throw new Error(`Failed to list ${table}: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    const ids = data.map((row) => row[idColumn]).filter(Boolean).map(String);
    if (ids.length === 0) break;
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .in(idColumn, ids);
    if (deleteError) {
      throw new Error(`Failed to delete ${table}: ${deleteError.message}`);
    }
    total += ids.length;
    console.log(`Deleted ${ids.length} from ${table}...`);
  }
  return total;
};

const main = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const framesDeleted = await deleteInChunks(
    supabase,
    "statsbomb_360_frames",
    "event_uuid"
  );
  const eventsDeleted = await deleteInChunks(
    supabase,
    "statsbomb_events",
    "event_id"
  );
  console.log(
    `Cleared statsbomb_events (${eventsDeleted}) and statsbomb_360_frames (${framesDeleted}).`
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
