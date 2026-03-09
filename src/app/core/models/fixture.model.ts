 
export interface Fixture {
  id: string;

  competition_id: string;
  competition_name: string | null;

  sport_alias: string;
  sport_name: string | null;

  status: string | null;

  scheduled_start_time: string | null;
  start_time: string | null;
  end_time: string | null;

  participants0_id: string | null;
  participants0_name: string | null;
  participants0_score: number | null;

  participants1_id: string | null;
  participants1_name: string | null;
  participants1_score: number | null;
}
