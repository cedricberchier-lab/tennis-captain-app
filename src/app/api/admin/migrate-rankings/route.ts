import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization (basic check)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 1: Check current ranking distribution
    const { rows: currentStats } = await sql`
      SELECT ranking, COUNT(*) as count
      FROM users
      WHERE role = 'player'
      GROUP BY ranking
      ORDER BY ranking
    `;

    // Step 2: Ensure all NULL rankings are set to 0 (NA)
    const { rowCount: nullUpdates } = await sql`
      UPDATE users
      SET ranking = 0, updated_at = CURRENT_TIMESTAMP
      WHERE ranking IS NULL AND role = 'player'
    `;

    // Step 3: Ensure any negative rankings are set to 0 (NA)
    const { rowCount: negativeUpdates } = await sql`
      UPDATE users
      SET ranking = 0, updated_at = CURRENT_TIMESTAMP
      WHERE ranking < 0 AND role = 'player'
    `;

    // Step 4: Get final ranking distribution
    const { rows: finalStats } = await sql`
      SELECT ranking, COUNT(*) as count
      FROM users
      WHERE role = 'player'
      GROUP BY ranking
      ORDER BY ranking
    `;

    // Step 5: Get total count of players with ranking 0 (NA)
    const { rows: naCount } = await sql`
      SELECT COUNT(*) as na_players
      FROM users
      WHERE ranking = 0 AND role = 'player'
    `;

    return NextResponse.json({
      success: true,
      migration: {
        nullRankingsFixed: nullUpdates || 0,
        negativeRankingsFixed: negativeUpdates || 0,
        totalNAPlayers: parseInt(naCount[0]?.na_players || '0'),
        currentDistribution: currentStats,
        finalDistribution: finalStats
      },
      message: 'Ranking migration completed successfully. All players without rankings now show as NA (ranking = 0).'
    });

  } catch (error) {
    console.error('Ranking migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current ranking distribution for inspection
    const { rows: rankingStats } = await sql`
      SELECT
        ranking,
        COUNT(*) as count,
        CASE
          WHEN ranking = 0 THEN 'NA (No Ranking)'
          WHEN ranking BETWEEN 1 AND 3 THEN 'N-Series'
          WHEN ranking BETWEEN 4 AND 12 THEN 'R-Series'
          ELSE 'Unknown'
        END as category
      FROM users
      WHERE role = 'player'
      GROUP BY ranking
      ORDER BY ranking
    `;

    // Get examples of players for each ranking
    const { rows: examples } = await sql`
      SELECT
        name,
        email,
        ranking,
        CASE
          WHEN ranking = 0 THEN 'NA'
          WHEN ranking = 1 THEN 'N1'
          WHEN ranking = 2 THEN 'N2'
          WHEN ranking = 3 THEN 'N3'
          WHEN ranking = 4 THEN 'R1'
          WHEN ranking = 5 THEN 'R2'
          WHEN ranking = 6 THEN 'R3'
          WHEN ranking = 7 THEN 'R4'
          WHEN ranking = 8 THEN 'R5'
          WHEN ranking = 9 THEN 'R6'
          WHEN ranking = 10 THEN 'R7'
          WHEN ranking = 11 THEN 'R8'
          WHEN ranking = 12 THEN 'R9'
          ELSE 'Unknown'
        END as display_ranking
      FROM users
      WHERE role = 'player'
      ORDER BY ranking ASC, name ASC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      statistics: {
        distribution: rankingStats,
        playerExamples: examples,
        totalPlayers: examples.length
      },
      info: {
        message: 'Current ranking data analysis',
        note: 'Ranking 0 = NA (No Ranking), Rankings 1-3 = N-Series, Rankings 4-12 = R-Series'
      }
    });

  } catch (error) {
    console.error('Ranking analysis failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}