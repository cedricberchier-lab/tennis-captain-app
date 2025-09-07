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
    
    // Validate and set date
    const date = dateParam || getTodayString();
    if (!isValidDate(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    
    // Validate time if provided
    let time: string | null = null;
    if (timeParam) {
      if (!isValidTime(timeParam)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:MM.' },
          { status: 400 }
        );
      }
      time = timeParam;
    }
    
    const baseUrl = process.env.FAIRPLAY_BASE || 'https://online.centrefairplay.ch';
    const url = `${baseUrl}/tableau.php?responsive=false`;
    
    const html = await fetchHtml(url);
    const slots = time 
      ? parseFreeSlotsAtTime(html, date, time)
      : parseFreeSlots(html, date);
    
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
    console.error('Free courts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch free courts' },
      { status: 500 }
    );
  }
}