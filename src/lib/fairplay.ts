export interface Slot {
  date: string; // YYYY-MM-DD
  court: string; // e.g., "Tennis n°6"
  start: string; // HH:MM
  end: string; // HH:MM
}

export async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.text();
}

function normalizeTime(timeStr: string): string {
  // Convert 20h30 to 20:30
  const match = timeStr.match(/(\d{1,2})h(\d{2})/);
  if (match) {
    const [, hours, minutes] = match;
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  return timeStr;
}

function addHour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const newHours = (hours + 1) % 24;
  return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function isCourtHeader(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return /tennis\s?n[°º]?\s?\d+/.test(normalized);
}

function extractCourtNumber(text: string): string {
  const match = text.trim().match(/tennis\s?n[°º]?\s?(\d+)/i);
  return match ? `Tennis n°${match[1]}` : text.trim();
}

function isCellFree(cellText: string): boolean {
  const trimmed = cellText.trim();
  if (!trimmed) return true;
  return !trimmed.toLowerCase().includes('fermé');
}

function isCellClosed(cellText: string): boolean {
  return cellText.trim().toLowerCase().includes('fermé');
}

function getLargestTable(html: string): Element {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = Array.from(doc.querySelectorAll('table'));
  
  if (tables.length === 0) {
    throw new Error('No tables found in HTML');
  }
  
  return tables.reduce((largest, current) => {
    const largestTdCount = largest.querySelectorAll('td').length;
    const currentTdCount = current.querySelectorAll('td').length;
    return currentTdCount > largestTdCount ? current : largest;
  });
}

export function parseFreeSlots(html: string, date: string): Slot[] {
  const table = getLargestTable(html);
  const rows = Array.from(table.querySelectorAll('tr'));
  
  if (rows.length < 2) {
    return [];
  }
  
  // Parse header row to get court columns
  const headerRow = rows[0];
  const headerCells = Array.from(headerRow.querySelectorAll('th, td'));
  const courtColumns: { [index: number]: string } = {};
  
  headerCells.forEach((cell, index) => {
    const text = cell.textContent || '';
    if (isCourtHeader(text)) {
      courtColumns[index] = extractCourtNumber(text);
    }
  });
  
  const slots: Slot[] = [];
  
  // Parse body rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = Array.from(row.querySelectorAll('td'));
    
    if (cells.length === 0) continue;
    
    // First cell should be the time
    const timeCell = cells[0];
    const timeText = timeCell.textContent || '';
    const normalizedTime = normalizeTime(timeText);
    
    if (!/^\d{2}:\d{2}$/.test(normalizedTime)) continue;
    
    const endTime = addHour(normalizedTime);
    
    // Check each court column
    cells.forEach((cell, cellIndex) => {
      if (cellIndex === 0) return; // Skip time column
      
      const courtName = courtColumns[cellIndex];
      if (!courtName) return;
      
      const cellText = cell.textContent || '';
      
      if (!isCellClosed(cellText) && isCellFree(cellText)) {
        slots.push({
          date,
          court: courtName,
          start: normalizedTime,
          end: endTime
        });
      }
    });
  }
  
  return slots;
}

export function parseFreeSlotsAtTime(html: string, date: string, time: string): Slot[] {
  const allSlots = parseFreeSlots(html, date);
  return allSlots.filter(slot => slot.start === time);
}