import { sql } from '@vercel/postgres';
import { Player, User, UserRole } from '@/types';
import bcrypt from 'bcryptjs';

// Database initialization - creates tables if they don't exist
export async function initializeDatabase() {
  try {
    // Create users table with all player data consolidated
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        ranking INTEGER DEFAULT 0,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'player',
        team_id VARCHAR(255),
        absences TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of absence strings
        matches_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        wins_in_2_sets INTEGER DEFAULT 0,
        wins_in_3_sets INTEGER DEFAULT 0,
        losses_in_2_sets INTEGER DEFAULT 0,
        losses_in_3_sets INTEGER DEFAULT 0,
        performance INTEGER DEFAULT 0,
        underperformance INTEGER DEFAULT 0,
        training_attendance INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Migrate existing users table to add missing columns
    await migrateUsersTableSchema();

    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error };
  }
}

// Migrate existing users table to add missing columns
async function migrateUsersTableSchema() {
  try {
    // Add missing columns if they don't exist
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS absences TEXT[] DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS wins_in_2_sets INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS wins_in_3_sets INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS losses_in_2_sets INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS losses_in_3_sets INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS performance INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS underperformance INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS training_attendance INTEGER DEFAULT 0
    `;
    console.log('Users table schema migration completed');
  } catch (error) {
    console.warn('Users table schema migration failed (columns may already exist):', error);
  }
}


// Player CRUD operations (now using users table)
export async function createPlayer(player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
  const id = crypto.randomUUID();
  const now = new Date();

  // Create a user record with player data and default auth credentials
  const tempPassword = await bcrypt.hash('temp123', 10); // Temporary password
  const username = player.email || `player_${id}`;

  await sql`
    INSERT INTO users (
      id, username, email, name, phone, ranking, password, role, team_id,
      absences, matches_played, wins, losses, wins_in_2_sets, wins_in_3_sets,
      losses_in_2_sets, losses_in_3_sets, performance, underperformance,
      training_attendance, created_at, updated_at
    ) VALUES (
      ${id}, ${username}, ${player.email}, ${player.name}, ${player.phone}, ${player.ranking},
      ${tempPassword}, 'player', NULL, ARRAY[]::TEXT[], ${player.stats.matchesPlayed}, 
      ${player.stats.wins}, ${player.stats.losses}, ${player.stats.winsIn2Sets}, 
      ${player.stats.winsIn3Sets}, ${player.stats.lossesIn2Sets}, ${player.stats.lossesIn3Sets}, 
      ${player.stats.performance}, ${player.stats.underperformance}, ${player.stats.trainingAttendance}, 
      ${now}, ${now}
    )
  `;

  return {
    id,
    ...player,
    createdAt: now,
    updatedAt: now
  };
}

export async function getAllPlayers(): Promise<Player[]> {
  const { rows } = await sql`
    SELECT * FROM users WHERE role = 'player' ORDER BY 
      CASE WHEN ranking = 0 THEN 1 ELSE 0 END,
      ranking ASC,
      name ASC
  `;

  return rows.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    ranking: row.ranking || 0,
    absences: row.absences || [],
    stats: {
      matchesPlayed: row.matches_played || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      winsIn2Sets: row.wins_in_2_sets || 0,
      winsIn3Sets: row.wins_in_3_sets || 0,
      lossesIn2Sets: row.losses_in_2_sets || 0,
      lossesIn3Sets: row.losses_in_3_sets || 0,
      performance: row.performance || 0,
      underperformance: row.underperformance || 0,
      trainingAttendance: row.training_attendance || 0
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }));
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id} AND role = 'player'`;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    ranking: row.ranking || 0,
    absences: row.absences || [],
    stats: {
      matchesPlayed: row.matches_played || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      winsIn2Sets: row.wins_in_2_sets || 0,
      winsIn3Sets: row.wins_in_3_sets || 0,
      lossesIn2Sets: row.losses_in_2_sets || 0,
      lossesIn3Sets: row.losses_in_3_sets || 0,
      performance: row.performance || 0,
      underperformance: row.underperformance || 0,
      trainingAttendance: row.training_attendance || 0
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<Player | null> {
  const now = new Date();
  
  await sql`
    UPDATE users SET 
      name = COALESCE(${updates.name}, name),
      email = COALESCE(${updates.email}, email),
      phone = COALESCE(${updates.phone}, phone),
      ranking = COALESCE(${updates.ranking}, ranking),
      absences = COALESCE(${updates.absences ? updates.absences : null}, absences),
      matches_played = COALESCE(${updates.stats?.matchesPlayed}, matches_played),
      wins = COALESCE(${updates.stats?.wins}, wins),
      losses = COALESCE(${updates.stats?.losses}, losses),
      wins_in_2_sets = COALESCE(${updates.stats?.winsIn2Sets}, wins_in_2_sets),
      wins_in_3_sets = COALESCE(${updates.stats?.winsIn3Sets}, wins_in_3_sets),
      losses_in_2_sets = COALESCE(${updates.stats?.lossesIn2Sets}, losses_in_2_sets),
      losses_in_3_sets = COALESCE(${updates.stats?.lossesIn3Sets}, losses_in_3_sets),
      performance = COALESCE(${updates.stats?.performance}, performance),
      underperformance = COALESCE(${updates.stats?.underperformance}, underperformance),
      training_attendance = COALESCE(${updates.stats?.trainingAttendance}, training_attendance),
      updated_at = ${now}
    WHERE id = ${id} AND role = 'player'
  `;

  return getPlayerById(id);
}

export async function deletePlayer(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM users WHERE id = ${id} AND role = 'player'`;
  return result.rowCount > 0;
}

export async function getPlayerByEmail(email: string): Promise<Player | null> {
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email} AND role = 'player'`;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    ranking: row.ranking || 0,
    absences: row.absences || [],
    stats: {
      matchesPlayed: row.matches_played || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      winsIn2Sets: row.wins_in_2_sets || 0,
      winsIn3Sets: row.wins_in_3_sets || 0,
      lossesIn2Sets: row.losses_in_2_sets || 0,
      lossesIn3Sets: row.losses_in_3_sets || 0,
      performance: row.performance || 0,
      underperformance: row.underperformance || 0,
      trainingAttendance: row.training_attendance || 0
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

// Utility function to migrate from localStorage to database
export async function migrateFromLocalStorage(): Promise<{ success: boolean; count: number }> {
  try {
    // This would be called from the frontend with localStorage data
    // For now, just return success
    return { success: true, count: 0 };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, count: 0 };
  }
}

// Utility function to migrate old players table data to users table (if needed)
export async function migratePlayersToUsers(): Promise<{ migrated: number; errors: number }> {
  try {
    // Check if players table exists and has data
    const { rows: playerRows } = await sql`
      SELECT * FROM players
    `;
    
    let migrated = 0;
    let errors = 0;
    
    for (const playerRow of playerRows) {
      try {
        // Check if user already exists with this email
        const existingUser = await getUserByEmail(playerRow.email);
        
        if (!existingUser) {
          // Create user from player data
          const tempPassword = await bcrypt.hash('temp123', 10);
          const username = playerRow.email || `player_${playerRow.id}`;
          
          await createUser({
            username,
            email: playerRow.email,
            name: playerRow.name,
            phone: playerRow.phone,
            ranking: playerRow.ranking,
            password: tempPassword,
            role: UserRole.PLAYER,
            absences: playerRow.absences || [],
            stats: {
              matchesPlayed: playerRow.matches_played || 0,
              wins: playerRow.wins || 0,
              losses: playerRow.losses || 0,
              winsIn2Sets: playerRow.wins_in_2_sets || 0,
              winsIn3Sets: playerRow.wins_in_3_sets || 0,
              lossesIn2Sets: playerRow.losses_in_2_sets || 0,
              lossesIn3Sets: playerRow.losses_in_3_sets || 0,
              performance: playerRow.performance || 0,
              underperformance: playerRow.underperformance || 0,
              trainingAttendance: playerRow.training_attendance || 0
            }
          });
          migrated++;
        }
      } catch (error) {
        console.error(`Error migrating player ${playerRow.email}:`, error);
        errors++;
      }
    }
    
    // Drop the players table after successful migration
    if (migrated > 0 && errors === 0) {
      await sql`DROP TABLE IF EXISTS players`;
    }
    
    return { migrated, errors };
  } catch (error) {
    console.error('Player migration not needed or failed:', error);
    return { migrated: 0, errors: 0 };
  }
}

// User Authentication CRUD operations
export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, skipHashing = false): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date();
  
  // Hash the password (unless already hashed for migration)
  const hashedPassword = skipHashing ? userData.password : await bcrypt.hash(userData.password, 12);

  await sql`
    INSERT INTO users (
      id, username, email, name, phone, ranking, password, role, team_id,
      absences, matches_played, wins, losses, wins_in_2_sets, wins_in_3_sets,
      losses_in_2_sets, losses_in_3_sets, performance, underperformance,
      training_attendance, created_at, updated_at
    ) VALUES (
      ${id}, ${userData.username}, ${userData.email}, ${userData.name}, ${userData.phone}, ${userData.ranking},
      ${hashedPassword}, ${userData.role || UserRole.PLAYER}, ${userData.teamId || null},
      ${userData.absences || []}, ${userData.stats?.matchesPlayed || 0}, ${userData.stats?.wins || 0}, 
      ${userData.stats?.losses || 0}, ${userData.stats?.winsIn2Sets || 0}, ${userData.stats?.winsIn3Sets || 0},
      ${userData.stats?.lossesIn2Sets || 0}, ${userData.stats?.lossesIn3Sets || 0}, ${userData.stats?.performance || 0},
      ${userData.stats?.underperformance || 0}, ${userData.stats?.trainingAttendance || 0}, ${now}, ${now}
    )
  `;

  return {
    id,
    username: userData.username,
    email: userData.email,
    name: userData.name,
    phone: userData.phone,
    ranking: userData.ranking,
    password: hashedPassword,
    role: userData.role || UserRole.PLAYER,
    teamId: userData.teamId,
    absences: userData.absences || [],
    stats: userData.stats || {
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
    createdAt: now,
    updatedAt: now
  };
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const { rows } = await sql`SELECT * FROM users WHERE username = ${username}`;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    phone: row.phone,
    ranking: row.ranking,
    password: row.password,
    role: row.role as UserRole,
    teamId: row.team_id || undefined,
    absences: row.absences || [],
    stats: {
      matchesPlayed: row.matches_played || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      winsIn2Sets: row.wins_in_2_sets || 0,
      winsIn3Sets: row.wins_in_3_sets || 0,
      lossesIn2Sets: row.losses_in_2_sets || 0,
      lossesIn3Sets: row.losses_in_3_sets || 0,
      performance: row.performance || 0,
      underperformance: row.underperformance || 0,
      trainingAttendance: row.training_attendance || 0
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    phone: row.phone,
    ranking: row.ranking,
    password: row.password,
    role: row.role as UserRole,
    teamId: row.team_id || undefined,
    absences: row.absences || [],
    stats: {
      matchesPlayed: row.matches_played || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      winsIn2Sets: row.wins_in_2_sets || 0,
      winsIn3Sets: row.wins_in_3_sets || 0,
      lossesIn2Sets: row.losses_in_2_sets || 0,
      lossesIn3Sets: row.losses_in_3_sets || 0,
      performance: row.performance || 0,
      underperformance: row.underperformance || 0,
      trainingAttendance: row.training_attendance || 0
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    phone: row.phone,
    ranking: row.ranking,
    password: row.password,
    role: row.role as UserRole,
    teamId: row.team_id || undefined,
    absences: row.absences || [],
    stats: {
      matchesPlayed: row.matches_played || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      winsIn2Sets: row.wins_in_2_sets || 0,
      winsIn3Sets: row.wins_in_3_sets || 0,
      lossesIn2Sets: row.losses_in_2_sets || 0,
      lossesIn3Sets: row.losses_in_3_sets || 0,
      performance: row.performance || 0,
      underperformance: row.underperformance || 0,
      trainingAttendance: row.training_attendance || 0
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export async function validateUserCredentials(username: string, password: string): Promise<User | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;
  
  const isValid = await bcrypt.compare(password, user.password);
  return isValid ? user : null;
}

export async function getAllUsers(): Promise<Omit<User, 'password'>[]> {
  const { rows } = await sql`
    SELECT id, username, email, name, phone, ranking, role, team_id, 
           absences, matches_played, wins, losses, wins_in_2_sets, wins_in_3_sets,
           losses_in_2_sets, losses_in_3_sets, performance, underperformance,
           training_attendance, created_at, updated_at 
    FROM users 
    ORDER BY created_at DESC
  `;

  return rows.map(row => ({
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    phone: row.phone,
    ranking: row.ranking,
    role: row.role as UserRole,
    teamId: row.team_id || undefined,
    absences: row.absences || [],
    stats: {
      matchesPlayed: row.matches_played || 0,
      wins: row.wins || 0,
      losses: row.losses || 0,
      winsIn2Sets: row.wins_in_2_sets || 0,
      winsIn3Sets: row.wins_in_3_sets || 0,
      lossesIn2Sets: row.losses_in_2_sets || 0,
      lossesIn3Sets: row.losses_in_3_sets || 0,
      performance: row.performance || 0,
      underperformance: row.underperformance || 0,
      trainingAttendance: row.training_attendance || 0
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }));
}

export async function updateUser(id: string, updates: Partial<Omit<User, 'id' | 'password'>>): Promise<User | null> {
  const now = new Date();
  
  await sql`
    UPDATE users SET 
      username = COALESCE(${updates.username}, username),
      email = COALESCE(${updates.email}, email),
      role = COALESCE(${updates.role}, role),
      team_id = COALESCE(${updates.teamId}, team_id),
      updated_at = ${now}
    WHERE id = ${id}
  `;

  return getUserById(id);
}

export async function deleteUser(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM users WHERE id = ${id}`;
  return result.rowCount > 0;
}


// Database cleanup functions
export async function cleanupMatchTables(): Promise<{ success: boolean; tablesRemoved: string[] }> {
  const tablesRemoved: string[] = [];
  
  try {
    // Drop tables in correct order due to foreign key constraints
    
    // Drop match_results table first
    await sql`DROP TABLE IF EXISTS match_results`;
    tablesRemoved.push('match_results');
    
    // Drop match_lineup table second
    await sql`DROP TABLE IF EXISTS match_lineup`;
    tablesRemoved.push('match_lineup');
    
    // Drop matches table last
    await sql`DROP TABLE IF EXISTS matches`;
    tablesRemoved.push('matches');
    
    console.log('Match-related tables cleaned up successfully:', tablesRemoved);
    return { success: true, tablesRemoved };
  } catch (error) {
    console.error('Database cleanup failed:', error);
    return { success: false, tablesRemoved };
  }
}