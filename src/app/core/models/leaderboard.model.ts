export interface LeaderboardEntry {
  userId: string;
  email: string | null;
  totalPoints: number;
  rank: number;
  totalPicks?: number;
  correctPicks?: number;
  username?: string | null;
  displayName?: string | null;
}

export interface LeaderboardResponse {
  weekId: string;
  sportAlias: string;
  status: 'OPEN' | 'CLOSED';
  weekStartUtc: string;
  weekEndUtc: string;
  cutoffUtc: string;
  entries: LeaderboardEntry[];
}
