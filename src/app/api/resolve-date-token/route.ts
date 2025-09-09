import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Configure which board: "ext" or "int"
const getBaseUrl = (site: string) => {
  return site === "ext" 
    ? "https://online.centrefairplay.ch/tableau.php?responsive=false"
    : "https://online.centrefairplay.ch/tableau_int.php?responsive=false";
};

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
    const label = $el.text().trim(); // e.g., "Ve 12"
    // onclick="window.location.href='tableau.php?responsive=false&d=...'; return false;"
    const onclick = $el.attr("onclick") || "";
    const match = onclick.match(/href='([^']+)'/);
    const url = match ? new URL(match[1], "https://online.centrefairplay.ch/").toString() : null;
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
  const wanted = siteDayLabel(targetDate); // e.g., "Ve 12"
  let url = getBaseUrl(site);

  for (let i = 0; i < maxHops; i++) {
    try {
      const html = await fetchPage(url);
      const links = extractDayLinks(html);

      const hit = links.find(l => l.label === wanted);
      if (hit?.d) {
        return hit.d;
      }

      // Not on this page — follow the last link (moves the 8-day window forward)
      const last = links[links.length - 1];
      if (!last?.url) break;
      url = new URL(last.url, "https://online.centrefairplay.ch/").toString();
    } catch (error) {
      console.error(`Error fetching page ${url}:`, error);
      break;
    }
  }
  
  throw new Error(`Date "${wanted}" not found within ${maxHops} hops`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site');
  const date = searchParams.get('date');

  if (!site || !date) {
    return NextResponse.json(
      { error: 'Missing site or date parameter' },
      { status: 400 }
    );
  }

  if (!['ext', 'int'].includes(site)) {
    return NextResponse.json(
      { error: 'Invalid site parameter. Must be "ext" or "int"' },
      { status: 400 }
    );
  }

  try {
    const token = await resolveDayToken(date, site);
    
    return NextResponse.json({ 
      token,
      site,
      date,
      label: siteDayLabel(date)
    });
  } catch (error) {
    console.error(`Failed to resolve date token for ${site} on ${date}:`, error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        site,
        date 
      },
      { status: 500 }
    );
  }
}