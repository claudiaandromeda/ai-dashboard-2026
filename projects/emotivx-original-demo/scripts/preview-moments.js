const { createClient } = require("@supabase/supabase-js");

const usage = () => {
  console.log("Usage:");
  console.log("  node scripts/preview-moments.js [--limit N]");
};

const getArgValue = (args, key) => {
  const index = args.indexOf(key);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const main = async () => {
  const args = process.argv.slice(2);
  const limit = parseInt(getArgValue(args, "--limit") ?? "5", 10);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data: moments, error: momentsError } = await supabase
    .from("moments")
    .select("moment_id, moment_type, title, timestamp, league, match_id")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (momentsError) {
    console.error("Moments query failed:", momentsError.message);
    process.exit(1);
  }

  if (!moments || moments.length === 0) {
    console.log("No moments found.");
    return;
  }

  const momentIds = moments.map((m) => m.moment_id);
  const { data: lines, error: linesError } = await supabase
    .from("data_lines")
    .select("moment_id, sequence, label, actor, team")
    .in("moment_id", momentIds)
    .order("sequence", { ascending: true });

  if (linesError) {
    console.error("Data lines query failed:", linesError.message);
    process.exit(1);
  }

  const grouped = new Map();
  (lines ?? []).forEach((line) => {
    if (!grouped.has(line.moment_id)) grouped.set(line.moment_id, []);
    grouped.get(line.moment_id).push(line);
  });

  console.log(`Previewing ${moments.length} moments:\n`);
  moments.forEach((moment) => {
    console.log(
      `- ${moment.moment_id} | ${moment.moment_type} | ${moment.title} | ${moment.timestamp}`
    );
    const dataLines = grouped.get(moment.moment_id) ?? [];
    const preview = dataLines.slice(0, 5).map((line) => {
      const actor = line.actor ? ` (${line.actor})` : "";
      return `  ${line.sequence}. ${line.label}${actor}`;
    });
    if (preview.length > 0) {
      console.log(preview.join("\n"));
    } else {
      console.log("  (no data lines)");
    }
    console.log("");
  });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
