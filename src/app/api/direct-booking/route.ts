import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { date, time, courtNumber, site } = await request.json();

    if (!date || !time || !courtNumber || !site) {
      return NextResponse.json(
        { error: 'Missing required parameters: date, time, courtNumber, site' },
        { status: 400 }
      );
    }

    if (!['ext', 'int'].includes(site)) {
      return NextResponse.json(
        { error: 'Invalid site parameter. Must be "ext" or "int"' },
        { status: 400 }
      );
    }

    // Use the existing free-courts API to get booking links
    const freeCourtsResponse = await fetch(`${request.nextUrl.origin}/api/free-courts?site=${site}`, {
      cache: 'no-store'
    });
    
    if (!freeCourtsResponse.ok) {
      throw new Error('Failed to fetch free courts data');
    }
    
    const freeCourtsData = await freeCourtsResponse.json();
    
    // Find the court and time slot
    const targetCourtName = `Tennis n°${courtNumber}`;
    const targetTime = time.replace(':', 'h'); // Convert 16:30 to 16h30
    
    const court = freeCourtsData.courts.find((c: any) => c.court === targetCourtName);
    if (!court) {
      return NextResponse.json(
        { 
          success: false,
          error: `Court "${targetCourtName}" not found. Available courts: ${freeCourtsData.courts.map((c: any) => c.court).join(', ')}`
        },
        { status: 404 }
      );
    }
    
    const slot = court.slots.find((s: any) => s.time === targetTime && s.status === 'free');
    if (!slot) {
      return NextResponse.json(
        { 
          success: false,
          error: `Time slot ${targetTime} not available or not free on ${targetCourtName}`
        },
        { status: 404 }
      );
    }
    
    // Use the exact booking URL if available, otherwise use the main booking page
    let reservationUrl: string;
    if (slot.href) {
      reservationUrl = slot.href;
    } else {
      // Fallback to main booking page  
      reservationUrl = site === 'ext' ? 
        'https://online.centrefairplay.ch/tableau.php?responsive=false' :
        'https://online.centrefairplay.ch/tableau_int.php?responsive=false';
    }
    
    return NextResponse.json({
      success: true,
      reservationUrl,
      site,
      date,
      time,
      courtNumber,
      court: targetCourtName,
      hasDirectLink: !!slot.href
    });

  } catch (error) {
    console.error('Direct booking error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}