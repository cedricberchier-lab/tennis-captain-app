import bcrypt from 'bcryptjs';
import { User, UserRole } from '@/types';
import fs from 'fs';
import path from 'path';

const USERS_STORAGE_KEY = 'tennis-captain-users';
const LOCAL_USERS_FILE = path.join(process.cwd(), '.local-users.json');

export interface LocalUser {
  id: string;
  username: string;
  email: string;
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
    password: hashedPassword,
    role: userData.role || UserRole.CAPTAIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add to users array and save
  users.push(newUser);
  saveUsers(users);

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