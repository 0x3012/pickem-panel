export interface LeaderboardPagePrize {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ruleType: 'RANK' | 'POINTS' | 'MANUAL';
  minRank: number | null;
  maxRank: number | null;
  minPoints: number | null;
  quantityTotal: number | null;
  quantityClaimed: number | null;
}

export interface LeaderboardPageEntry {
  userId: number;
  email: string | null;
  totalPoints: number;
  rank: number;
  totalPicks: number;
  correctPicks?: number;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
}

export interface LeaderboardPagePlayer {
  userId: number;
  email: string;
  rank: number;
  totalPoints: number;
  wins: number;
  losses: number;
  totalPicks: number;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
}

export interface LeaderboardPageResponse {
  weekId: number;
  sportAlias: string;
  status: 'OPEN' | 'CLOSED';
  weekStartUtc: string;
  weekEndUtc: string;
  cutoffUtc: string;
  entries: LeaderboardPageEntry[];
  player: LeaderboardPagePlayer | null;
  prizes: LeaderboardPagePrize[];
}

export interface GetLeaderboardPageParams {
  tenantId: number;
  sportAlias?: string;
  weekId?: number;
  email?: string;
  limit?: number;
  offset?: number;
}