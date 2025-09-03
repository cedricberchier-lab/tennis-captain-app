// User Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string;
  ranking: number;
  password: string; // hashed
  role: UserRole;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  CAPTAIN = 'captain',
  PLAYER = 'player',
  ADMIN = 'admin'
}

export interface AuthResponse {
  user?: Omit<User, 'password'>;
  token?: string;
  error?: string;
  usingLocalStorage?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  name: string;
  phone: string;
  ranking: number;
  password: string;
  role?: UserRole;
}

// Player Data Types
export interface Player {
  id: string;
  name: string;
  email: string;
  phone: string;
  ranking: number;
  absences: string[];
  stats: PlayerStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  winsIn2Sets: number;
  winsIn3Sets: number;
  lossesIn2Sets: number;
  lossesIn3Sets: number;
  performance: number; // wins vs higher rank
  underperformance: number; // losses vs lower rank
  trainingAttendance: number;
}


// Match Data Types
export interface Match {
  id: string;
  season: string;
  category: string;
  group: string;
  matchId: string;
  date: Date;
  time: string;
  location: string;
  isHome: boolean;
  opponentTeam: OpponentTeam;
  roster: MatchRoster;
  results: MatchResult[];
  teamScore: TeamScore;
  status: MatchStatus;
  validation: MatchValidation;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingParticipant {
  id: string;
  playerId?: string; // Reference to Player table (home team only)
  playerName: string;
  isManualEntry: boolean; // true if entered manually vs picked from roster
  email?: string;
  phone?: string;
}

export interface Training {
  id: string;
  date: Date;
  dayName: string; // e.g., "Monday", "Tuesday"
  timeStart: string; // e.g., "18:00"
  timeEnd: string; // e.g., "20:00"
  courtNumber: string;
  participants: TrainingParticipant[]; // up to 4 players
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpponentTeam {
  name: string;
  captain: Captain;
}

export interface Captain {
  name: string;
  email: string;
  phone: string;
}

export interface MatchRoster {
  homeLineup: LineupPlayer[];
  opponentLineup: LineupPlayer[];
  homeDoublesLineup: LineupPlayer[];
  opponentDoublesLineup: LineupPlayer[];
}

export interface LineupPlayer {
  id: string;
  position: number; // 1-6 for singles, 1-3 for doubles
  playerId?: string; // Reference to Player table (home team only)
  playerName: string;
  ranking: number;
  email?: string;
  phone?: string;
  isOpponent: boolean;
  isManualEntry: boolean; // true if entered manually vs picked from roster
  type: 'singles' | 'doubles'; // indicates if this is for singles or doubles
  partnerId?: string; // for doubles, the partner player ID
  partnerName?: string; // for doubles, the partner player name
}

export interface MatchResult {
  id: string;
  type: 'singles' | 'doubles';
  position: number;
  homePlayer: string;
  awayPlayer: string;
  sets: SetResult[];
  outcome: MatchOutcome;
  forfeit?: boolean;
}

export interface SetResult {
  setNumber: number;
  homeGames: number;
  awayGames: number;
}

export enum MatchOutcome {
  WIN = 'V',
  LOSS = 'D',
  FORFEIT = 'Forfeit'
}

export interface TeamScore {
  home: number;
  away: number;
  autoCalculated: boolean;
}

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface MatchValidation {
  captainAConfirmed: boolean;
  captainBConfirmed: boolean;
  confirmedAt?: Date;
}

// Chat Data Types
export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  type: ChatMessageType;
}

export enum ChatMessageType {
  TEXT = 'text',
  SYSTEM = 'system',
  MATCH_UPDATE = 'match_update'
}

export interface ChatRoom {
  id: string;
  matchId: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  isActive: boolean;
  createdAt: Date;
}

export interface ChatParticipant {
  id: string;
  name: string;
  role: 'captain' | 'player';
  isOnline: boolean;
  lastSeen: Date;
}

// Training Data Types
export interface TrainingSession {
  id: string;
  date: Date;
  time: string;
  location: string;
  description?: string;
  availability: PlayerAvailability[];
  attendance: PlayerAttendance[];
  status: TrainingStatus;
  createdAt: Date;
}

export interface PlayerAvailability {
  playerId: string;
  playerName: string;
  available: boolean;
  respondedAt: Date;
  note?: string;
}

export interface PlayerAttendance {
  playerId: string;
  playerName: string;
  attended: boolean;
  recordedAt: Date;
}

export enum TrainingStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

// Export/Import Types
export interface SwissTennisExport {
  matchId: string;
  season: string;
  category: string;
  group: string;
  date: Date;
  homeTeam: string;
  awayTeam: string;
  results: ExportResult[];
  teamScore: TeamScore;
  validation: MatchValidation;
  exportedAt: Date;
}

export interface ExportResult {
  type: 'singles' | 'doubles';
  position: number;
  homePlayer: string;
  awayPlayer: string;
  score: string; // "6-3, 6-4" format
  outcome: MatchOutcome;
}