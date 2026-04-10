import { supabase } from "./client";
import type { Club, Player, Pattern, Competition } from "./types";

export async function getClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Club[];
}

export async function getPlayers(clubId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("club_id", clubId)
    .eq("active", true)
    .order("jersey_number");
  if (error) throw error;
  return data as Player[];
}

export async function getPatterns(): Promise<Pattern[]> {
  const { data, error } = await supabase
    .from("patterns")
    .select("*")
    .eq("enabled", true)
    .order("sort_order");
  if (error) throw error;
  return data as Pattern[];
}

export async function getCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data as Competition[];
}

export async function getClubByTeamId(
  statsbombId: number
): Promise<Club | null> {
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("statsbomb_team_id", statsbombId)
    .maybeSingle();
  if (error) throw error;
  return data as Club | null;
}

export async function getClubById(clubId: string): Promise<Club | null> {
  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .maybeSingle();
  if (error) throw error;
  return data as Club | null;
}
