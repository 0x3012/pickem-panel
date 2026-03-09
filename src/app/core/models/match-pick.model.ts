

export type PickChoice = 'A' | 'B' | 'DRAW';

export interface CreateMatchPickRequest {
    tenantId: number;

    userId: number;
    userEmail: string;
    matchId: number;
    pick: PickChoice;
    userLockTime?: string;
    pickedTeamId: number | null;
  deviceHash?: string;  

}

export interface MatchPick {
    tenantId: number;

    id: number;

    userId: number;
    userEmail: string;

    fixtureId: number;

    pick?: PickChoice;
    pickedTeamId: number | null;

    userLockTime?: string;
    serverReceivedAt: string;

    createdAt: string;
    updatedAt: string;


}

export interface CreateMatchPickResponse {
    success: boolean;
    data: MatchPick;
}
