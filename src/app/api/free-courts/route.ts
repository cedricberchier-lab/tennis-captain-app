import { NextRequest, NextResponse } from 'next/server';
import { fetchHtml, parseFreeSlots, parseFreeSlotsAtTime } from '@/lib/fairplay';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

function isValidTime(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const timeParam = searchParams.get('time');
    
    console.log('[FairPlay API] Request params:', { dateParam, timeParam });
    
    // Validate and set date
    const date = dateParam || getTodayString();
    if (!isValidDate(date)) {
      console.log('[FairPlay API] Invalid date:', date);
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    
    // Validate time if provided
    let time: string | null = null;
    if (timeParam) {
      if (!isValidTime(timeParam)) {
        console.log('[FairPlay API] Invalid time:', timeParam);
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:MM.' },
          { status: 400 }
        );
      }
      time = timeParam;
    }
    
    const baseUrl = process.env.FAIRPLAY_BASE || 'https://online.centrefairplay.ch';
    const url = `${baseUrl}/tableau.php?responsive=false`;
    
    console.log('[FairPlay API] Fetching from:', url);
    
    const html = await fetchHtml(url);
    console.log('[FairPlay API] HTML length:', html.length);
    
    const slots = time 
      ? parseFreeSlotsAtTime(html, date, time)
      : parseFreeSlots(html, date);
    
    console.log('[FairPlay API] Found slots:', slots.length);
    
    return NextResponse.json({
      date,
      time,
      slots: slots.map(slot => ({
        court: slot.court,
        start: slot.start,
        end: slot.end
      }))
    });
    
  } catch (error) {
    console.error('[FairPlay API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });
    return NextResponse.json(
      { error: `Failed to fetch free courts: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}