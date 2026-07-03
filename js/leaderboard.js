/**
 * leaderboard.js — submit game results + fetch global top-N.
 * Uses the existing supabase client from auth.js.
 */
import { supabase } from './auth.js';

const TABLE = 'leaderboard';
const TOP_N = 10;

/**
 * Submit all players' sips from a completed game.
 * sessionId ties all rows from the same game together.
 */
export async function submitResults(players, sessionId) {
  if (!players || !players.length) return;
  const rows = players
    .filter(p => p.sips > 0)
    .map(p => ({
      player_name: p.name,
      emoji: p.emoji || '🍺',
      sips: p.sips,
      session_id: sessionId,
    }));
  if (!rows.length) return;
  await supabase.from(TABLE).insert(rows);
}

/**
 * Fetch global top-N players ordered by sips descending.
 * Returns array of { player_name, emoji, sips, played_at }.
 */
export async function fetchTopPlayers(limit = TOP_N) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('player_name, emoji, sips, played_at')
    .order('sips', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}
