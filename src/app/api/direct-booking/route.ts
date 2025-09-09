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
  const fr = date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  
  // Handle different French formats
  let [wdRaw, dayStr] = fr.replace(/\u00A0/g, " ").split(" ");
  
  // Clean up weekday (remove periods, take first 2 chars)
  wdRaw = (wdRaw || "").replace(/\./g, "").slice(0, 2).toLowerCase();
  const wd = wdRaw.charAt(0).toUpperCase() + wdRaw.charAt(1);
  
  // Clean up day number
  const dayNum = parseInt((dayStr || "").replace(/[^\d]/g, ""), 10);
  
  console.log(`Date formatting: ${dateStr} -> ${fr} -> "${wd} ${dayNum}"`);
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
    throw new Error(`Court "${headerText}" non trouvé`);
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
  if (idx < 0) {
    throw new Error(`Horaire "${siteTime}" invalide`);
  }

  if (idx >= slotDivs.length) {
    throw new Error(`Index ${idx} hors limites (${slotDivs.length} créneaux disponibles)`);
  }

  const slot = slotDivs.eq(idx);
  
  // Check if slot is free
  const className = slot.attr("class") || "";
  if (!/libre/.test(className)) {
    throw new Error(`Créneau ${siteTime} n'est pas libre (${className})`);
  }

  // Extract onclick -> reservation1.php?d=...
  const onclick = slot.attr("onclick") || "";
  const match = onclick.match(/'([^']+reservation1\.php\?[^']+)'/);
  if (!match) {
    throw new Error("Lien réservation introuvable");
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

    // Resolve the day token
    const dayToken = await resolveDayToken(date, site);
    
    // Fetch the board HTML
    const html = await fetchDayBoardHtml(dayToken, site);
    
    // Find the reservation link
    const reservationUrl = findReservationLink(html, courtNumber, time);
    
    return NextResponse.json({
      success: true,
      reservationUrl,
      dayToken,
      site,
      date,
      time,
      courtNumber
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