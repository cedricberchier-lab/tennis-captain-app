import { PlayerProvider, PlayerSearchResult, PlayerDetailResult } from "./provider";
import { TennisPlayer } from "./schemas";

/**
 * Mock provider — used when mytennis authentication is not available.
 * Replace or remove once a live provider is wired in.
 * TODO: swap for MytennisPlayerProvider once auth token flow is stable.
 */

const MOCK_PLAYERS: TennisPlayer[] = [
  {
    id: "mytennis:10001",
    externalSource: "mytennis",
    externalId: 10001,
    firstName: "Roger",
    lastName: "Federer",
    fullName: "Roger Federer",
    classification: "N1",
    classificationValue: 100,
    ranking: 1,
    bestClassification: "N1",
    bestRanking: 1,
    ageCategory: "Masters",
    licenseStatus: "1",
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "mytennis:10002",
    externalSource: "mytennis",
    externalId: 10002,
    firstName: "Stan",
    lastName: "Wawrinka",
    fullName: "Stan Wawrinka",
    classification: "N1",
    classificationValue: 95,
    ranking: 2,
    bestClassification: "N1",
    bestRanking: 2,
    ageCategory: "Masters",
    licenseStatus: "1",
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "mytennis:10003",
    externalSource: "mytennis",
    externalId: 10003,
    firstName: "Belinda",
    lastName: "Bencic",
    fullName: "Belinda Bencic",
    classification: "N1",
    classificationValue: 98,
    ranking: 1,
    bestClassification: "N1",
    bestRanking: 1,
    ageCategory: "Dames",
    licenseStatus: "1",
    fetchedAt: new Date().toISOString(),
  },
  {
    id: "mytennis:10004",
    externalSource: "mytennis",
    externalId: 10004,
    firstName: "Marc-Andrea",
    lastName: "Hüsler",
    fullName: "Marc-Andrea Hüsler",
    classification: "N2",
    classificationValue: 85,
    ranking: 5,
    bestClassification: "N2",
    bestRanking: 4,
    ageCategory: "Hommes",
    licenseStatus: "1",
    fetchedAt: new Date().toISOString(),
  },
];

export class MockPlayerProvider implements PlayerProvider {
  async searchPlayers(keyword: string): Promise<PlayerSearchResult> {
    const q = keyword.toLowerCase();
    const players = MOCK_PLAYERS.filter((p) =>
      p.fullName.toLowerCase().includes(q)
    );
    return { players, total: players.length };
  }

  async getPlayerById(externalId: number): Promise<PlayerDetailResult | null> {
    const player = MOCK_PLAYERS.find((p) => p.externalId === externalId);
    if (!player) return null;
    return { player, clubs: [] };
  }
}
