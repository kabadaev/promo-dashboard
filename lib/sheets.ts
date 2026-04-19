import { google } from "googleapis";

// In-memory cache. Vercel serverless functions are stateless between requests,
// but a single warm instance will reuse this cache within its lifetime.
type CacheEntry<T> = { data: T; fetchedAt: number };
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY in environment"
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function getRange(range: string): Promise<(string | number | null)[][]> {
  const cacheKey = `range:${range}`;
  const cached = cache.get(cacheKey) as CacheEntry<(string | number | null)[][]> | undefined;
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const sheetId = process.env.SHEET_ID;
  if (!sheetId) throw new Error("Missing SHEET_ID in environment");

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const data = (res.data.values || []) as (string | number | null)[][];
  cache.set(cacheKey, { data, fetchedAt: Date.now() });
  return data;
}

export type Promo = {
  id: string;
  name: string;
  brand: string;
  manager: string;
  uploadBy: string;
  start: string; // ISO date yyyy-mm-dd
  end: string;
  duration: number;
  budget: number | null;
  campaignType: string;
  materials: string;
  landing: string;
  ig: string;
  fb: string;
  goal: string;
  notes: string;
};

export type Brand = {
  brand: string;
  manager: string;
  annualBudget: number;
  monthlyBudget: number;
  segment: string;
  role: string;
};

export type MonthlyBudget = {
  months: string[];
  paidAds: number[];
  meta: number[];
  google: number[];
  youtube: number[];
};

export type Event = {
  name: string;
  type: string;
  brand: string;
  manager: string;
  start: string;
  end: string;
  duration: number;
  location: string;
  budget: string;
  actualCost: string;
  notes: string;
};

export type BudgetTrackerRow = {
  brand: string;
  monthlyBudget: number;
  plannedMedia: number;
  remaining: number;
};

// Google Sheets serial date -> ISO. Excel epoch is 1899-12-30.
function serialToISO(serial: number): string {
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + serial * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}

function parseDate(cell: string | number | null): string {
  if (cell === null || cell === "" || cell === undefined) return "";
  if (typeof cell === "number") return serialToISO(cell);
  const s = String(cell).trim();
  // Try yyyy-mm-dd hh:mm:ss
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // Try Bulgarian "01-фев-2026" format
  const bgMonths: Record<string, string> = {
    "ян": "01", "фев": "02", "март": "03", "апр": "04",
    "май": "05", "юни": "06", "юли": "07", "авг": "08",
    "сеп": "09", "окт": "10", "ное": "11", "дек": "12",
  };
  const bg = s.match(/^(\d{1,2})-([а-яА-Я]+)-(\d{4})$/);
  if (bg) {
    const month = bgMonths[bg[2].toLowerCase().slice(0, 3)] || bgMonths[bg[2].toLowerCase()];
    if (month) return `${bg[3]}-${month}-${bg[1].padStart(2, "0")}`;
  }
  return s;
}

function toStr(cell: string | number | null): string {
  if (cell === null || cell === undefined) return "";
  return String(cell).trim();
}

function toNum(cell: string | number | null): number | null {
  if (cell === null || cell === undefined || cell === "") return null;
  if (typeof cell === "number") return cell;
  const parsed = Number(String(cell).replace(/[^\d.,-]/g, "").replace(",", "."));
  return isNaN(parsed) ? null : parsed;
}

export async function fetchPromos(): Promise<Promo[]> {
  // Headers are on row 2, data starts on row 3
  const rows = await getRange("PROMO_DETAILS!A3:P1000");
  const promos: Promo[] = [];
  for (const row of rows) {
    const name = toStr(row[1]);
    const brand = toStr(row[2]);
    if (!name || !brand) continue; // skip empty rows
    promos.push({
      id: toStr(row[0]),
      name,
      brand,
      manager: toStr(row[3]),
      uploadBy: toStr(row[4]),
      start: parseDate(row[5] ?? null),
      end: parseDate(row[6] ?? null),
      duration: Math.round(Number(toNum(row[7] ?? null) ?? 0)),
      budget: toNum(row[8] ?? null),
      campaignType: toStr(row[9]),
      materials: toStr(row[10]),
      landing: toStr(row[11]),
      ig: toStr(row[12]),
      fb: toStr(row[13]),
      goal: toStr(row[14]),
      notes: toStr(row[15]),
    });
  }
  return promos;
}

export async function fetchBrands(): Promise<Brand[]> {
  const rows = await getRange("BRANDS!A2:F100");
  const brands: Brand[] = [];
  for (const row of rows) {
    const name = toStr(row[0]);
    if (!name) continue;
    brands.push({
      brand: name,
      manager: toStr(row[1]),
      annualBudget: Number(toNum(row[2] ?? null) ?? 0),
      monthlyBudget: Number(toNum(row[3] ?? null) ?? 0),
      segment: toStr(row[4]),
      role: toStr(row[5]),
    });
  }
  return brands;
}

export async function fetchMonthlyBudget(): Promise<MonthlyBudget> {
  // Marketing Budget 2026 tab:
  // row 3 = month headers (cols C-N)
  // row 4 = Paid Ads totals
  // row 6 = Meta Ads
  // row 9 = Google Ads
  // row 10 = YouTube Ads
  const rows = await getRange("'Marketing Budget 2026'!A3:N10");
  const monthRow = rows[0] || [];
  const paidRow = rows[1] || [];
  const metaRow = rows[3] || [];
  const googleRow = rows[6] || [];
  const youtubeRow = rows[7] || [];

  const months: string[] = [];
  const paidAds: number[] = [];
  const meta: number[] = [];
  const googleVals: number[] = [];
  const youtube: number[] = [];

  for (let i = 2; i <= 13; i++) {
    const label = toStr(monthRow[i] ?? null);
    if (!label) continue;
    months.push(label);
    paidAds.push(Number(toNum(paidRow[i] ?? null) ?? 0));
    meta.push(Number(toNum(metaRow[i] ?? null) ?? 0));
    googleVals.push(Number(toNum(googleRow[i] ?? null) ?? 0));
    youtube.push(Number(toNum(youtubeRow[i] ?? null) ?? 0));
  }

  return { months, paidAds, meta, google: googleVals, youtube };
}

export async function fetchEvents(): Promise<Event[]> {
  // Events tab: headers on row 1, data from row 2
  const rows = await getRange("Events!A2:P200");
  const events: Event[] = [];
  for (const row of rows) {
    const name = toStr(row[0]);
    const brand = toStr(row[2]);
    const type = toStr(row[1]);
    // Skip rows that are completely empty or just contain "Define" placeholder
    if (!name && !brand && (!type || type === "Define")) continue;
    events.push({
      name: name || "(без име)",
      type,
      brand,
      manager: toStr(row[3]),
      start: parseDate(row[4] ?? null),
      end: parseDate(row[5] ?? null),
      duration: Math.round(Number(toNum(row[6] ?? null) ?? 0)),
      location: toStr(row[7]),
      budget: toStr(row[8]),
      actualCost: toStr(row[9]),
      notes: toStr(row[15]),
    });
  }
  return events;
}

export async function fetchBudgetTracker(): Promise<BudgetTrackerRow[]> {
  const rows = await getRange("BUDGET_TRACKER!A2:D100");
  const items: BudgetTrackerRow[] = [];
  for (const row of rows) {
    const name = toStr(row[0]);
    if (!name) continue;
    items.push({
      brand: name,
      monthlyBudget: Number(toNum(row[1] ?? null) ?? 0),
      plannedMedia: Number(toNum(row[2] ?? null) ?? 0),
      remaining: Number(toNum(row[3] ?? null) ?? 0),
    });
  }
  return items;
}

export function clearCache() {
  cache.clear();
}
