import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const ORIGIN = "https://online.centrefairplay.ch";

/** 08h30..21h30 exactly as rendered on the board */
const TIMES = [
  "08h30", "09h30", "10h30", "11h30", "12h30", "13h30", "14h30",
  "15h30", "16h30", "17h30", "18h30", "19h30", "20h30", "21h30"
];

/** Format Date -> site label like "Ve 12" */
function siteDayLabel(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00'); // Add time to avoid timezone issues
  
  // Manual mapping to match FairPlay site exactly
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, etc.
  const dayAbbrevs = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']; // Sunday to Saturday
  const wd = dayAbbrevs[dayOfWeek];
  const dayNum = date.getDate();
  
  console.log(`Date formatting: ${dateStr} -> day ${dayOfWeek} -> "${wd} ${dayNum}"`);
  return `${wd} ${dayNum}`;
}

/** Extract {label, url, d} from a page's day bar */
function extractDayLinks(html: string) {
  const $ = cheerio.load(html);
  const spans = $(".barre-top .btn-bar, .barre-top .btn-bar-active");
  
  const links: Array<{label: string, url: string | null, d: string | null}> = [];
  
  spans.each((_, element) => {
    const $el = $(element);
    const label = $el.text().trim();
    const onclick = $el.attr("onclick") || "";
    const match = onclick.match(/href='([^']+)'/);
    const url = match ? new URL(match[1], ORIGIN).toString() : null;
    const d = url ? new URL(url).searchParams.get("d") : null;
    
    if (d) {
      links.push({ label, url, d });
    }
  });
  
  return links;
}

/** Fetch helper with cache-busting */
async function fetchPage(url: string) {
  const u = new URL(url);
  u.searchParams.set("_", Date.now().toString());
  
  const res = await fetch(u.toString(), { 
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  
  return await res.text();
}

/** Resolve the correct "d" token for a given Date */
async function resolveDayToken(targetDate: string, site: string, maxHops: number = 10): Promise<string> {
  const wanted = siteDayLabel(targetDate);
  const page = site === "ext" ? "tableau.php" : "tableau_int.php";
  let url = `${ORIGIN}/${page}?responsive=false`;

  for (let i = 0; i < maxHops; i++) {
    try {
      const html = await fetchPage(url);
      const links = extractDayLinks(html);
      
      console.log(`Available day labels on page: ${links.map(l => l.label).join(', ')}`);
      console.log(`Looking for: "${wanted}"`);

      const hit = links.find(l => l.label === wanted);
      if (hit?.d) {
        return hit.d;
      }

      const last = links[links.length - 1];
      if (!last?.url) break;
      url = last.url;
    } catch (error) {
      console.error(`Error fetching page ${url}:`, error);
      break;
    }
  }
  
  throw new Error(`Date "${wanted}" not found within ${maxHops} hops. Available labels: ${JSON.stringify(links?.map(l => l.label) || [])}`);
}

/** Fetch the day board HTML for a given day token */
async function fetchDayBoardHtml(dayToken: string, site: string) {
  const page = site === "ext" ? "tableau.php" : "tableau_int.php";
  const url = new URL(`${ORIGIN}/${page}`);
  url.searchParams.set("responsive", "false");
  url.searchParams.set("d", dayToken);
  
  const res = await fetch(url.toString(), { 
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!res.ok) {
    throw new Error(`Board HTTP ${res.status}`);
  }
  
  return await res.text();
}

/** Find reservation link for a given court number & time on the fetched HTML */
function findReservationLink(html: string, courtNumber: number, time: string) {
  const $ = cheerio.load(html);
  const headerText = `Tennis n°${courtNumber}`;

  // Debug: log all court headers found
  const allHeaders: string[] = [];
  $(".col-courts .courts").each((_, element) => {
    const text = $(element).text().trim();
    allHeaders.push(text);
  });
  console.log(`Available court headers: ${allHeaders.join(', ')}`);
  console.log(`Looking for: "${headerText}"`);

  // Locate the court column by its header
  const courtCols = $(".col-courts .courts");
  let targetCol: cheerio.Cheerio<cheerio.Element> | null = null;
  
  courtCols.each((_, element) => {
    const $el = $(element);
    if ($el.text().includes(headerText)) {
      targetCol = $el;
      return false; // break
    }
  });

  if (!targetCol) {
    throw new Error(`Court "${headerText}" non trouvé. Available: ${allHeaders.join(', ')}`);
  }

  // Collect the time slots, excluding headers
  const slotDivs = targetCol.children().filter((_, el) => {
    const $el = $(el);
    if (!$el.hasClass("cases")) return false;
    if ($el.hasClass("bottom")) return false;
    // Skip headers (they have .tableau_entetes inside)
    return $el.find(".tableau_entetes").length === 0;
  });

  // Map "16:30" -> "16h30" then to index
  const siteTime = time.replace(":", "h");
  const idx = TIMES.indexOf(siteTime);
  console.log(`Time mapping: ${time} -> ${siteTime} -> index ${idx}`);
  console.log(`Available times: ${TIMES.join(', ')}`);
  
  if (idx < 0) {
    throw new Error(`Horaire "${siteTime}" invalide. Available: ${TIMES.join(', ')}`);
  }

  console.log(`Found ${slotDivs.length} time slots in court column`);
  if (idx >= slotDivs.length) {
    throw new Error(`Index ${idx} hors limites (${slotDivs.length} créneaux disponibles)`);
  }

  const slot = slotDivs.eq(idx);
  
  // Check if slot is free
  const className = slot.attr("class") || "";
  const onclick = slot.attr("onclick") || "";
  console.log(`Slot ${idx} (${siteTime}): class="${className}", onclick="${onclick.substring(0, 100)}..."`);
  
  if (!/libre/.test(className)) {
    throw new Error(`Créneau ${siteTime} n'est pas libre (${className})`);
  }

  // Extract onclick -> reservation1.php?d=...
  // Format: onclick="window.location='reservation1.php?d=...'; return false;"
  const match = onclick.match(/window\.location\s*=\s*'([^']+reservation1\.php\?[^']+)'/);
  if (!match) {
    throw new Error(`Lien réservation introuvable dans onclick: "${onclick}"`);
  }

  return new URL(match[1], ORIGIN).toString();
}

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

    // For now, let's use the existing free-courts API to get booking links
    // This is a temporary workaround while we debug the HTML parsing
    
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
    
    if (!slot.href) {
      return NextResponse.json(
        { 
          success: false,
          error: `No booking link available for ${targetTime} on ${targetCourtName}`
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      reservationUrl: slot.href,
      site,
      date,
      time,
      courtNumber,
      court: targetCourtName
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