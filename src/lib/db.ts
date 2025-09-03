import { sql } from '@vercel/postgres';
import { Player, User, UserRole, Match, LineupPlayer, MatchResult } from '@/types';
import bcrypt from 'bcryptjs';

// Database initialization - creates tables if they don't exist
export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        ranking INTEGER DEFAULT 0,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'captain',
        team_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create players table
    await sql`
      CREATE TABLE IF NOT EXISTS players (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(255),
        ranking INTEGER DEFAULT 0,
        absences TEXT[], -- Array of absence strings
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

    // Create matches table for future use
    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id VARCHAR(255) PRIMARY KEY,
        season VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        match_group VARCHAR(10) NOT NULL,
        match_id VARCHAR(255) NOT NULL,
        match_date DATE NOT NULL,
        match_time TIME NOT NULL,
        location TEXT NOT NULL,
        is_home BOOLEAN NOT NULL,
        opponent_team_name VARCHAR(255) NOT NULL,
        opponent_captain_name VARCHAR(255) NOT NULL,
        opponent_captain_email VARCHAR(255),
        opponent_captain_phone VARCHAR(255),
        home_score INTEGER DEFAULT 0,
        away_score INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'scheduled',
        captain_a_confirmed BOOLEAN DEFAULT FALSE,
        captain_b_confirmed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create match_lineup table
    await sql`
      CREATE TABLE IF NOT EXISTS match_lineup (
        id VARCHAR(255) PRIMARY KEY,
        match_id VARCHAR(255) REFERENCES matches(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        player_id VARCHAR(255) REFERENCES players(id) ON DELETE SET NULL,
        player_name VARCHAR(255) NOT NULL,
        ranking INTEGER DEFAULT 0,
        email VARCHAR(255),
        phone VARCHAR(255),
        is_opponent BOOLEAN NOT NULL,
        is_manual_entry BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create match_results table
    await sql`
      CREATE TABLE IF NOT EXISTS match_results (
        id VARCHAR(255) PRIMARY KEY,
        match_id VARCHAR(255) REFERENCES matches(id) ON DELETE CASCADE,
        result_type VARCHAR(20) NOT NULL, -- 'singles' or 'doubles'
        position INTEGER NOT NULL,
        home_player VARCHAR(255) NOT NULL,
        away_player VARCHAR(255) NOT NULL,
        sets JSONB NOT NULL, -- Array of set results
        outcome VARCHAR(20) NOT NULL, -- 'V', 'D', 'Forfeit'
        forfeit BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error };
  }
}

// Player CRUD operations
export async function createPlayer(player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
  const id = crypto.randomUUID();
  const now = new Date();

  await sql`
    INSERT INTO players (
      id, name, email, phone, ranking, absences,
      matches_played, wins, losses, wins_in_2_sets, wins_in_3_sets,
      losses_in_2_sets, losses_in_3_sets, performance, underperformance,
      training_attendance, created_at, updated_at
    ) VALUES (
      ${id}, ${player.name}, ${player.email}, ${player.phone}, ${player.ranking},
      ARRAY[]::TEXT[], ${player.stats.matchesPlayed}, ${player.stats.wins},
      ${player.stats.losses}, ${player.stats.winsIn2Sets}, ${player.stats.winsIn3Sets},
      ${player.stats.lossesIn2Sets}, ${player.stats.lossesIn3Sets}, ${player.stats.performance},
      ${player.stats.underperformance}, ${player.stats.trainingAttendance}, ${now}, ${now}
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
    SELECT * FROM players ORDER BY 
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
  const { rows } = await sql`SELECT * FROM players WHERE id = ${id}`;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    ranking: row.ranking || 0,
    absences: JSON.parse(row.absences || '[]'),
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
    UPDATE players SET 
      name = COALESCE(${updates.name}, name),
      email = COALESCE(${updates.email}, email),
      phone = COALESCE(${updates.phone}, phone),
      ranking = COALESCE(${updates.ranking}, ranking),
      absences = COALESCE(${updates.absences ? JSON.stringify(updates.absences) : null}, absences),
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
    WHERE id = ${id}
  `;

  return getPlayerById(id);
}

export async function deletePlayer(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM players WHERE id = ${id}`;
  return result.rowCount > 0;
}

export async function getPlayerByEmail(email: string): Promise<Player | null> {
  const { rows } = await sql`SELECT * FROM players WHERE email = ${email}`;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    ranking: row.ranking || 0,
    absences: JSON.parse(row.absences || '[]'),
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

// Utility function to ensure all users have player records
export async function ensureAllUsersHavePlayerRecords(): Promise<{ created: number; errors: number }> {
  try {
    // Get all users
    const { rows: userRows } = await sql`SELECT * FROM users`;
    let created = 0;
    let errors = 0;
    
    for (const userRow of userRows) {
      try {
        // Check if player exists for this user
        const existingPlayer = await getPlayerByEmail(userRow.email);
        
        if (!existingPlayer) {
          // Create player record
          await createPlayer({
            name: userRow.name,
            email: userRow.email,
            phone: userRow.phone,
            ranking: userRow.ranking,
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
            }
          });
          created++;
        }
      } catch (error) {
        console.error(`Error creating player for user ${userRow.email}:`, error);
        errors++;
      }
    }
    
    return { created, errors };
  } catch (error) {
    console.error('Error ensuring all users have player records:', error);
    return { created: 0, errors: 1 };
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
      id, username, email, name, phone, ranking, password, role, team_id, created_at, updated_at
    ) VALUES (
      ${id}, ${userData.username}, ${userData.email}, ${userData.name}, ${userData.phone}, ${userData.ranking},
      ${hashedPassword}, ${userData.role || UserRole.CAPTAIN}, ${userData.teamId || null}, ${now}, ${now}
    )
  `;

  // Automatically create a player record with the user's information
  try {
    await createPlayer({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      ranking: userData.ranking,
      absences: [], // Start with no absences
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
      }
    });
  } catch (error) {
    console.error('Error creating player record for user:', error);
    // Don't fail the user creation if player creation fails
  }

  return {
    id,
    username: userData.username,
    email: userData.email,
    name: userData.name,
    phone: userData.phone,
    ranking: userData.ranking,
    password: hashedPassword,
    role: userData.role || UserRole.CAPTAIN,
    teamId: userData.teamId,
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
    SELECT id, username, email, role, team_id, created_at, updated_at 
    FROM users 
    ORDER BY created_at DESC
  `;

  return rows.map(row => ({
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role as UserRole,
    teamId: row.team_id || undefined,
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

// Match CRUD operations
export async function createMatch(matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<Match> {
  const id = crypto.randomUUID();
  const now = new Date();

  await sql`
    INSERT INTO matches (
      id, season, category, match_group, match_id, match_date, match_time, location,
      is_home, opponent_team_name, opponent_captain_name, opponent_captain_email,
      opponent_captain_phone, home_score, away_score, status, captain_a_confirmed,
      captain_b_confirmed, created_at, updated_at
    ) VALUES (
      ${id}, ${matchData.season}, ${matchData.category}, ${matchData.group},
      ${matchData.matchId}, ${matchData.date}, ${matchData.time}, ${matchData.location},
      ${matchData.isHome}, ${matchData.opponentTeam.name}, ${matchData.opponentTeam.captain.name},
      ${matchData.opponentTeam.captain.email}, ${matchData.opponentTeam.captain.phone},
      ${matchData.teamScore.home}, ${matchData.teamScore.away}, ${matchData.status},
      ${matchData.validation.captainAConfirmed}, ${matchData.validation.captainBConfirmed},
      ${now}, ${now}
    )
  `;

  return {
    id,
    ...matchData,
    createdAt: now,
    updatedAt: now
  };
}

export async function getAllMatches(): Promise<Match[]> {
  const { rows } = await sql`
    SELECT * FROM matches 
    ORDER BY match_date ASC, match_time ASC
  `;

  const matches = await Promise.all(rows.map(async row => {
    // Get lineup data
    const lineupRows = await sql`
      SELECT * FROM match_lineup 
      WHERE match_id = ${row.id} 
      ORDER BY position ASC
    `;
    
    // Get results data
    const resultsRows = await sql`
      SELECT * FROM match_results 
      WHERE match_id = ${row.id} 
      ORDER BY position ASC
    `;
    
    const homeLineup = lineupRows.rows
      .filter(lineup => !lineup.is_opponent)
      .map(lineup => ({
        id: lineup.id,
        position: lineup.position,
        playerId: lineup.player_id || undefined,
        playerName: lineup.player_name,
        ranking: lineup.ranking,
        email: lineup.email || undefined,
        phone: lineup.phone || undefined,
        isOpponent: lineup.is_opponent,
        isManualEntry: lineup.is_manual_entry
      }));
      
    const opponentLineup = lineupRows.rows
      .filter(lineup => lineup.is_opponent)
      .map(lineup => ({
        id: lineup.id,
        position: lineup.position,
        playerId: lineup.player_id || undefined,
        playerName: lineup.player_name,
        ranking: lineup.ranking,
        email: lineup.email || undefined,
        phone: lineup.phone || undefined,
        isOpponent: lineup.is_opponent,
        isManualEntry: lineup.is_manual_entry
      }));
      
    const results = resultsRows.rows.map(result => ({
      id: result.id,
      type: result.result_type,
      position: result.position,
      homePlayer: result.home_player,
      awayPlayer: result.away_player,
      sets: result.sets,
      outcome: result.outcome,
      forfeit: result.forfeit || false
    }));

    return {
      id: row.id,
      season: row.season,
      category: row.category,
      group: row.match_group,
      matchId: row.match_id,
      date: new Date(row.match_date),
      time: row.match_time,
      location: row.location,
      isHome: row.is_home,
      opponentTeam: {
        name: row.opponent_team_name,
        captain: {
          name: row.opponent_captain_name,
          email: row.opponent_captain_email || '',
          phone: row.opponent_captain_phone || ''
        }
      },
      roster: {
        homeLineup,
        opponentLineup
      },
      results,
      teamScore: {
        home: row.home_score || 0,
        away: row.away_score || 0,
        autoCalculated: false
      },
      status: row.status,
      validation: {
        captainAConfirmed: row.captain_a_confirmed || false,
        captainBConfirmed: row.captain_b_confirmed || false
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }));
  
  return matches;
}

export async function getMatchById(id: string): Promise<Match | null> {
  const { rows } = await sql`SELECT * FROM matches WHERE id = ${id}`;
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  
  // Get lineup data
  const lineupRows = await sql`
    SELECT * FROM match_lineup 
    WHERE match_id = ${id} 
    ORDER BY position ASC
  `;
  
  // Get results data
  const resultsRows = await sql`
    SELECT * FROM match_results 
    WHERE match_id = ${id} 
    ORDER BY position ASC
  `;
  
  const homeLineup = lineupRows.rows
    .filter(lineup => !lineup.is_opponent)
    .map(lineup => ({
      id: lineup.id,
      position: lineup.position,
      playerId: lineup.player_id || undefined,
      playerName: lineup.player_name,
      ranking: lineup.ranking,
      email: lineup.email || undefined,
      phone: lineup.phone || undefined,
      isOpponent: lineup.is_opponent,
      isManualEntry: lineup.is_manual_entry
    }));
    
  const opponentLineup = lineupRows.rows
    .filter(lineup => lineup.is_opponent)
    .map(lineup => ({
      id: lineup.id,
      position: lineup.position,
      playerId: lineup.player_id || undefined,
      playerName: lineup.player_name,
      ranking: lineup.ranking,
      email: lineup.email || undefined,
      phone: lineup.phone || undefined,
      isOpponent: lineup.is_opponent,
      isManualEntry: lineup.is_manual_entry
    }));
    
  const results = resultsRows.rows.map(result => ({
    id: result.id,
    type: result.result_type,
    position: result.position,
    homePlayer: result.home_player,
    awayPlayer: result.away_player,
    sets: result.sets,
    outcome: result.outcome,
    forfeit: result.forfeit || false
  }));
  
  return {
    id: row.id,
    season: row.season,
    category: row.category,
    group: row.match_group,
    matchId: row.match_id,
    date: new Date(row.match_date),
    time: row.match_time,
    location: row.location,
    isHome: row.is_home,
    opponentTeam: {
      name: row.opponent_team_name,
      captain: {
        name: row.opponent_captain_name,
        email: row.opponent_captain_email || '',
        phone: row.opponent_captain_phone || ''
      }
    },
    roster: {
      homeLineup,
      opponentLineup
    },
    results,
    teamScore: {
      home: row.home_score || 0,
      away: row.away_score || 0,
      autoCalculated: false
    },
    status: row.status,
    validation: {
      captainAConfirmed: row.captain_a_confirmed || false,
      captainBConfirmed: row.captain_b_confirmed || false
    },
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

export async function updateMatch(id: string, updates: Partial<Match>): Promise<Match | null> {
  const now = new Date();
  
  await sql`
    UPDATE matches SET 
      season = COALESCE(${updates.season}, season),
      category = COALESCE(${updates.category}, category),
      match_group = COALESCE(${updates.group}, match_group),
      match_id = COALESCE(${updates.matchId}, match_id),
      match_date = COALESCE(${updates.date}, match_date),
      match_time = COALESCE(${updates.time}, match_time),
      location = COALESCE(${updates.location}, location),
      is_home = COALESCE(${updates.isHome}, is_home),
      opponent_team_name = COALESCE(${updates.opponentTeam?.name}, opponent_team_name),
      opponent_captain_name = COALESCE(${updates.opponentTeam?.captain.name}, opponent_captain_name),
      opponent_captain_email = COALESCE(${updates.opponentTeam?.captain.email}, opponent_captain_email),
      opponent_captain_phone = COALESCE(${updates.opponentTeam?.captain.phone}, opponent_captain_phone),
      home_score = COALESCE(${updates.teamScore?.home}, home_score),
      away_score = COALESCE(${updates.teamScore?.away}, away_score),
      status = COALESCE(${updates.status}, status),
      captain_a_confirmed = COALESCE(${updates.validation?.captainAConfirmed}, captain_a_confirmed),
      captain_b_confirmed = COALESCE(${updates.validation?.captainBConfirmed}, captain_b_confirmed),
      updated_at = ${now}
    WHERE id = ${id}
  `;

  // Update roster if provided
  if (updates.roster) {
    await saveMatchLineup(id, updates.roster);
  }
  
  // Update results if provided
  if (updates.results) {
    await saveMatchResults(id, updates.results);
  }

  return getMatchById(id);
}

export async function deleteMatch(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM matches WHERE id = ${id}`;
  return result.rowCount > 0;
}

// Lineup management functions
export async function saveMatchLineup(matchId: string, lineup: { homeLineup: LineupPlayer[], opponentLineup: LineupPlayer[] }): Promise<void> {
  // Clear existing lineup
  await sql`DELETE FROM match_lineup WHERE match_id = ${matchId}`;
  
  // Save home lineup
  for (const player of lineup.homeLineup) {
    await sql`
      INSERT INTO match_lineup (
        id, match_id, position, player_id, player_name, ranking, email, phone, 
        is_opponent, is_manual_entry, created_at
      ) VALUES (
        ${crypto.randomUUID()}, ${matchId}, ${player.position}, ${player.playerId}, 
        ${player.playerName}, ${player.ranking}, ${player.email}, ${player.phone},
        ${false}, ${player.isManualEntry}, ${new Date()}
      )
    `;
  }
  
  // Save opponent lineup
  for (const player of lineup.opponentLineup) {
    await sql`
      INSERT INTO match_lineup (
        id, match_id, position, player_id, player_name, ranking, email, phone, 
        is_opponent, is_manual_entry, created_at
      ) VALUES (
        ${crypto.randomUUID()}, ${matchId}, ${player.position}, ${player.playerId}, 
        ${player.playerName}, ${player.ranking}, ${player.email}, ${player.phone},
        ${true}, ${player.isManualEntry}, ${new Date()}
      )
    `;
  }
}

// Results management functions  
export async function saveMatchResults(matchId: string, results: MatchResult[]): Promise<void> {
  // Clear existing results
  await sql`DELETE FROM match_results WHERE match_id = ${matchId}`;
  
  // Save new results
  for (const result of results) {
    await sql`
      INSERT INTO match_results (
        id, match_id, result_type, position, home_player, away_player, 
        sets, outcome, forfeit, created_at
      ) VALUES (
        ${result.id || crypto.randomUUID()}, ${matchId}, ${result.type}, ${result.position}, 
        ${result.homePlayer}, ${result.awayPlayer}, ${JSON.stringify(result.sets)}, 
        ${result.outcome}, ${result.forfeit || false}, ${new Date()}
      )
    `;
  }
}