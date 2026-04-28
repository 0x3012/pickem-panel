 export interface PickOneMatch {
  fixture: {
    id: number;
    game: string;
    competition: string;
    startsAt: string;
    teamA: Team;
    teamB: Team;
  };
  config: {
    lockAt: string;
    basePoints: number;
    multiplier: string;
    maxMultiplier: string;
    allowDraw: boolean;
  };
}

export interface Team {
  id: string;
  name: string;
  logo: string;
  pickedPercent?: number;
}
