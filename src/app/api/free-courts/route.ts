import { NextResponse } from "next/server";

// Helpers
const FCP_BASE = "https://online.centrefairplay.ch";
const PAGES = {
  ext: "tableau.php?responsive=false",
  int: "tableau_int.php?responsive=false",
  squash: "tableau_squash.php?responsive=false",
  bad: "tableau_bad.php?responsive=false",
  padel: "tableau_padel.php?responsive=false",
};

function toMinutes(hhmm: string) {
  // handles "08h30" or "08:30"
  const [h, m] = hhmm.replace("h", ":").split(":").map(Number);
  return h * 60 + m;
}
function minutesToHHMM(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}

function mergeRanges(times: string[], cells: { status: string; href?: string }[]) {
  // Build contiguous free ranges with start/end and first available booking href found
  const ranges: { start: string; end: string; href?: string }[] = [];
  let i = 0;
  while (i < cells.length) {
    if (cells[i].status === "free") {
      let j = i + 1;
      let href: string | undefined = cells[i].href;
      while (j < cells.length && cells[j].status === "free") {
        href ||= cells[j].href;
        j++;
      }
      // times[i] is the start label; end = times[j] (end boundary)
      const startMin = toMinutes(times[i]);
      const endMin = toMinutes(times[j] ?? times[i]); // guard
      ranges.push({
        start: minutesToHHMM(startMin),
        end: minutesToHHMM(endMin),
        href,
      });
      i = j;
    } else {
      i++;
    }
  }
  return ranges;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // site: ext|int|squash|bad|padel
    const site = (searchParams.get("site") ?? "ext").toLowerCase() as keyof typeof PAGES;
    // forward the vendor's obfuscated date token if you have one (optional)
    const d = searchParams.get("d"); // e.g., "ZwNlAF0jBF0kZN=="
    const pagePath = PAGES[site] ?? PAGES.ext;
    const url = `${FCP_BASE}/${pagePath}${d ? `&d=${encodeURIComponent(d)}` : ""}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html",
      },
      // Make sure this runs server-side; don't cache too long
      cache: "no-store",
    });
    const html = await res.text();

    // --- ultra-light DOM parsing without external deps ---
    // 1) Extract time labels (left column)
    // They appear like: <span class="couleur_2_text heures">08h30</span>
    const timeMatches = [...html.matchAll(/<span[^>]*class="[^"]*couleur_2_text[^"]*heures[^"]*"[^>]*>\s*([\d]{2}[h:][\d]{2})\s*<\/span>/g)]
      .map(m => m[1]);

    // The first & last are headers in some layouts; filter duplicates, keep ascending
    // We'll keep them all as the slots grid seems aligned exactly to these entries.
    const times = timeMatches;

    // 2) Split per court column blocks: <div class="courts"> ... </div>
    const courtBlocks = [...html.matchAll(/<div class="courts">([\s\S]*?)<\/div>\s*<!------------------- FIN COURT/g)];

    const courts = courtBlocks.map(block => {
      const blockHtml = block[1];

      // court name appears twice (top & bottom); pick the first "tableau_entetes single"
      const nameMatch = blockHtml.match(/<span[^>]*class="[^"]*tableau_entetes[^"]*single[^"]*"[^>]*>\s*([^<]+)\s*<\/span>/);
      const courtName = (nameMatch?.[1] ?? "Court").trim();

      // pick all cell divs (skip header/bottom bars)
      // cells look like <div class="tennis_ext_libre cases" ...> ... </div>
      const cellMatches = [...blockHtml.matchAll(/<div class="([^"]*?)\s+cases"([^>]*)>([\s\S]*?)<\/div>/g)];

      const cells = cellMatches
        // Filter out the header/bottom bars (contain "base" AND also "tableau_entetes" inside; we want actual time cells)
        .filter(m => !/base/.test(m[1]) || /membre|libre|indisp|club/.test(m[1]))
        .map(m => {
          const cls = m[1];
          const attrs = m[2];

          let status: "free" | "booked" | "unavailable" | "closed" = "unavailable";
          if (/libre/.test(cls)) status = "free";
          else if (/membre/.test(cls)) status = "booked";
          else if (/club/.test(cls)) status = "closed";
          else if (/indisp/.test(cls)) status = "unavailable";

          // Extract booking link if present in onclick
          let href: string | undefined;
          const onclick = attrs.match(/onclick="[^"]*'([^']*reservation1\.php\?[^']*)'[^"]*"/);
          if (onclick?.[1]) href = `${FCP_BASE}/${onclick[1].replace(/^\.\//, "")}`;

          return { status, href };
        });

      // Cells should align to times length; if misaligned, trim to min length
      const L = Math.min(times.length, cells.length);
      const alignedCells = cells.slice(0, L);

      const freeRanges = mergeRanges(times, alignedCells);

      return {
        court: courtName,
        slots: alignedCells.map((c, i) => ({
          time: times[i],
          status: c.status,
          href: c.href,
        })),
        freeRanges,
      };
    });

    return NextResponse.json({ site, url, times, courts });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to scrape" }, { status: 500 });
  }
}