import { TennisPlayer, TennisPlayerClub } from "./schemas";

export interface PlayerSearchResult {
  players: TennisPlayer[];
  total?: number;
}

export interface PlayerDetailResult {
  player: TennisPlayer;
  clubs: TennisPlayerClub[];
}

/**
 * Provider interface — swap implementations without touching the API routes.
 * TODO: plug in a real SwissTennis / mytennis provider when credentials are ready.
 */
export interface PlayerProvider {
  searchPlayers(
    keyword: string,
    offset?: number,
    limit?: number
  ): Promise<PlayerSearchResult>;

  getPlayerById(externalId: number): Promise<PlayerDetailResult | null>;
}
