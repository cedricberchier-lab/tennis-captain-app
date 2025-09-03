import bcrypt from 'bcryptjs';
import { User, UserRole, Player, PlayerStats } from '@/types';
import fs from 'fs';
import path from 'path';

const USERS_STORAGE_KEY = 'tennis-captain-users';
const PLAYERS_STORAGE_KEY = 'tennis-captain-players';
const LOCAL_USERS_FILE = path.join(process.cwd(), '.local-users.json');
const LOCAL_PLAYERS_FILE = path.join(process.cwd(), '.local-players.json');

export interface LocalUser {
  id: string;
  username: string;
  email: string;
  name: string;
  phone: string;
  ranking: number;
  password: string; // hashed
  role: UserRole;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}

// Get all users from file storage (server-side) or localStorage (client-side)
function getStoredUsers(): LocalUser[] {
  // Server-side: use file storage
  if (typeof window === 'undefined') {
    try {
      if (fs.existsSync(LOCAL_USERS_FILE)) {
        const fileContent = fs.readFileSync(LOCAL_USERS_FILE, 'utf8');
        return JSON.parse(fileContent);
      }
      return [];
    } catch (error) {
      console.error('Error reading users from file:', error);
      return [];
    }
  }
  
  // Client-side: use localStorage
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading users from localStorage:', error);
    return [];
  }
}

// Save users to file storage (server-side) or localStorage (client-side)
function saveUsers(users: LocalUser[]): void {
  // Server-side: use file storage
  if (typeof window === 'undefined') {
    try {
      fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
      console.error('Error saving users to file:', error);
    }
    return;
  }
  
  // Client-side: use localStorage
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users to localStorage:', error);
  }
}

// Create a new user locally
export async function createLocalUser(userData: {
  username: string;
  email: string;
  name: string;
  phone: string;
  ranking: number;
  password: string;
  role?: UserRole;
}): Promise<LocalUser> {
  const users = getStoredUsers();
  
  // Check if username already exists
  const existingUser = users.find(u => u.username === userData.username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  
  // Create new user
  const newUser: LocalUser = {
    id: crypto.randomUUID(),
    username: userData.username,
    email: userData.email,
    name: userData.name,
    phone: userData.phone,
    ranking: userData.ranking,
    password: hashedPassword,
    role: userData.role || UserRole.CAPTAIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add to users array and save
  users.push(newUser);
  saveUsers(users);

  // Automatically create a player record with the user's information
  try {
    createLocalPlayer({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      ranking: userData.ranking
    });
  } catch (error) {
    console.error('Error creating player record for user:', error);
    // Don't fail the user creation if player creation fails
  }

  return newUser;
}

// Validate user credentials locally
export async function validateLocalCredentials(username: string, password: string): Promise<LocalUser | null> {
  const users = getStoredUsers();
  const user = users.find(u => u.username === username);
  
  if (!user) return null;
  
  const isValid = await bcrypt.compare(password, user.password);
  return isValid ? user : null;
}

// Get user by username locally
export function getLocalUserByUsername(username: string): LocalUser | null {
  const users = getStoredUsers();
  return users.find(u => u.username === username) || null;
}

// Get all local users (without passwords)
export function getAllLocalUsers(): Omit<LocalUser, 'password'>[] {
  const users = getStoredUsers();
  return users.map(({ password, ...user }) => user);
}

// Convert LocalUser to User format
export function localUserToUser(localUser: LocalUser): User {
  return {
    id: localUser.id,
    username: localUser.username,
    email: localUser.email,
    name: localUser.name,
    phone: localUser.phone,
    ranking: localUser.ranking,
    password: localUser.password,
    role: localUser.role,
    teamId: localUser.teamId,
    createdAt: new Date(localUser.createdAt),
    updatedAt: new Date(localUser.updatedAt)
  };
}

// Check if we have local users
export function hasLocalUsers(): boolean {
  return getStoredUsers().length > 0;
}

// Clear all local users (for migration)
export function clearLocalUsers(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USERS_STORAGE_KEY);
}

// Get local users for migration
export function getLocalUsersForMigration(): LocalUser[] {
  return getStoredUsers();
}

// Player Management Functions for Local Storage

// Get all players from storage
function getStoredPlayers(): Player[] {
  // Server-side: use file storage
  if (typeof window === 'undefined') {
    try {
      if (fs.existsSync(LOCAL_PLAYERS_FILE)) {
        const fileContent = fs.readFileSync(LOCAL_PLAYERS_FILE, 'utf8');
        return JSON.parse(fileContent);
      }
      return [];
    } catch (error) {
      console.error('Error reading players from file:', error);
      return [];
    }
  }
  
  // Client-side: use localStorage
  try {
    const stored = localStorage.getItem(PLAYERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading players from localStorage:', error);
    return [];
  }
}

// Save players to storage
function savePlayers(players: Player[]): void {
  // Server-side: use file storage
  if (typeof window === 'undefined') {
    try {
      fs.writeFileSync(LOCAL_PLAYERS_FILE, JSON.stringify(players, null, 2));
    } catch (error) {
      console.error('Error saving players to file:', error);
    }
    return;
  }
  
  // Client-side: use localStorage
  try {
    localStorage.setItem(PLAYERS_STORAGE_KEY, JSON.stringify(players));
  } catch (error) {
    console.error('Error saving players to localStorage:', error);
  }
}

// Create a new player locally
export function createLocalPlayer(playerData: {
  name: string;
  email: string;
  phone: string;
  ranking: number;
}): Player {
  const players = getStoredPlayers();
  
  // Create new player with default stats
  const newPlayer: Player = {
    id: crypto.randomUUID(),
    name: playerData.name,
    email: playerData.email,
    phone: playerData.phone,
    ranking: playerData.ranking,
    absences: [],
    stats: {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      winsIn2Sets: 0,
      winsIn3Sets: 0,
      lossesIn2Sets: 0,
      lossesIn3Sets: 0,
      performance: 0,
      underperformance: 0,
      trainingAttendance: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Add to players array and save
  players.push(newPlayer);
  savePlayers(players);

  return newPlayer;
}

// Get all local players
export function getAllLocalPlayers(): Player[] {
  return getStoredPlayers();
}

// Get player by email locally
export function getLocalPlayerByEmail(email: string): Player | null {
  const players = getStoredPlayers();
  return players.find(p => p.email === email) || null;
}

// Utility function to ensure all local users have player records
export function ensureAllLocalUsersHavePlayerRecords(): { created: number; errors: number } {
  try {
    const users = getStoredUsers();
    const players = getStoredPlayers();
    let created = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        // Check if player exists for this user
        const existingPlayer = players.find(p => p.email === user.email);
        
        if (!existingPlayer) {
          // Create player record
          createLocalPlayer({
            name: user.name,
            email: user.email,
            phone: user.phone,
            ranking: user.ranking
          });
          created++;
        }
      } catch (error) {
        console.error(`Error creating player for user ${user.email}:`, error);
        errors++;
      }
    }
    
    return { created, errors };
  } catch (error) {
    console.error('Error ensuring all local users have player records:', error);
    return { created: 0, errors: 1 };
  }
}