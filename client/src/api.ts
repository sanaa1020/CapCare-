// api.ts: thin client for the CapCare+ backend (Express + SQLite).
//
// Design goal: keep every existing screen's visuals and synchronous
// localStorage reads working untouched. This module is the one place that
// talks to the network; screens call it from the same event handlers that
// used to touch localStorage directly, and it mirrors results back into the
// same localStorage keys (cc_user_name, cc_age, cc_weight, cc_height,
// cc_allergens, cc_token) so the rest of the UI keeps reading instantly and
// synchronously exactly like before; the backend is now the source of
// truth, localStorage is just the fast local cache/session token.

export interface Profile {
  username: string;
  name: string;
  age: string;
  weight: string;
  height: string;
  allergens: string[];
  tutSeen: Record<string, boolean>;
  tutorialDone: boolean;
}

const TOKEN_KEY = "cc_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("cc_user_name");
  localStorage.removeItem("cc_age");
  localStorage.removeItem("cc_weight");
  localStorage.removeItem("cc_height");
  localStorage.removeItem("cc_allergens");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let resp: Response;
  try {
    resp = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    throw new Error("Can't reach the server, check your connection");
  }

  let data: any = null;
  try {
    data = await resp.json();
  } catch {
    /* empty body is fine for some endpoints */
  }

  if (!resp.ok) {
    const err: any = new Error(data?.error || `Request failed (${resp.status})`);
    err.status = resp.status;
    err.code = data?.code;
    throw err;
  }
  return data as T;
}

// Mirrors a profile into the legacy localStorage keys every screen already reads.
function cacheProfile(profile: Profile) {
  localStorage.setItem("cc_user_name", profile.name || profile.username);
  if (profile.age) localStorage.setItem("cc_age", profile.age);
  if (profile.weight) localStorage.setItem("cc_weight", profile.weight);
  if (profile.height) localStorage.setItem("cc_height", profile.height);
  localStorage.setItem("cc_allergens", JSON.stringify(profile.allergens || []));
}

// Auth
export async function signup(username: string, password: string) {
  const data = await request<{ token: string; profile: Profile }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  cacheProfile(data.profile);
  return data.profile;
}

export async function login(username: string, password: string) {
  const data = await request<{ token: string; profile: Profile }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  cacheProfile(data.profile);
  return data.profile;
}

// Called once on app boot (if a token exists) to refresh the local cache
// from the server, so every screen's synchronous localStorage reads reflect
// whatever was last saved from any device.
export async function bootstrapProfile(): Promise<Profile | null> {
  if (!getToken()) return null;
  try {
    const data = await request<{ profile: Profile }>("/auth/me");
    cacheProfile(data.profile);
    return data.profile;
  } catch {
    // token invalid/expired, drop the session so the user is sent back to onboarding
    clearSession();
    return null;
  }
}

export async function updateProfile(fields: Partial<Pick<Profile, "name" | "age" | "weight" | "height" | "allergens">>) {
  const data = await request<{ profile: Profile }>("/profile", {
    method: "PUT",
    body: JSON.stringify(fields),
  });
  cacheProfile(data.profile);
  return data.profile;
}

export async function markTutorialSeen(context: string, done = false) {
  try {
    await request("/profile/tutorial-seen", { method: "POST", body: JSON.stringify({ context, done }) });
  } catch {
    /* non-critical */
  }
}

// Symptom log
export interface SymptomEntry { id?: number; label: string; cat: string; date: string; time: string }

export async function listSymptoms() {
  const data = await request<{ entries: SymptomEntry[] }>("/symptoms");
  return data.entries;
}
export async function addSymptom(entry: SymptomEntry) {
  const data = await request<{ entry: SymptomEntry }>("/symptoms", { method: "POST", body: JSON.stringify(entry) });
  return data.entry;
}
export async function deleteSymptom(id: number) {
  await request(`/symptoms/${id}`, { method: "DELETE" });
}
export async function getStreak() {
  const data = await request<{ streak: number }>("/symptoms/streak");
  return data.streak;
}

// Personal notes
export interface NoteEntry { id?: number; text: string; ts: string }

export async function listNotes() {
  const data = await request<{ entries: NoteEntry[] }>("/notes");
  return data.entries;
}
export async function addNote(text: string) {
  const data = await request<{ entry: NoteEntry }>("/notes", { method: "POST", body: JSON.stringify({ text }) });
  return data.entry;
}
export async function deleteNote(id: number) {
  await request(`/notes/${id}`, { method: "DELETE" });
}

// Allergy label/OCR scan history
export interface AllergyScanEntry {
  id?: number; product: string; flagCount: number; ingredients: string[]; date: string; time: string;
}
export async function listAllergyScans() {
  const data = await request<{ entries: AllergyScanEntry[] }>("/scans");
  return data.entries;
}
export async function addAllergyScan(entry: AllergyScanEntry) {
  const data = await request<{ entry: AllergyScanEntry }>("/scans", { method: "POST", body: JSON.stringify(entry) });
  return data.entry;
}

// Barcode / Open Food Facts
export interface FoodProduct {
  barcode: string; name: string; brand: string; quantity: string; serving_size: string;
  description: string; ingredients: string; allergens: string; traces: string;
  categories: string; labels: string; image_url: string | null;
  energy: string | number; fat: string | number; saturated_fat: string | number;
  carbohydrates: string | number; sugars: string | number; protein: string | number;
  fiber: string | number; salt: string | number; nutriscore: string;
}

export async function lookupBarcode(code: string) {
  return request<{ product: FoodProduct; matchedAllergens: string[] }>(`/barcode/${encodeURIComponent(code)}`);
}

export interface BarcodeHistoryEntry {
  id: number; barcode: string; productName: string; brand: string; quantity: string;
  imageUrl: string | null; nutriscore: string; scannedAt: string; product: FoodProduct;
}
export async function listBarcodeHistory() {
  const data = await request<{ entries: BarcodeHistoryEntry[] }>("/barcode/history/list");
  return data.entries;
}

// Health news feed: general headlines ranked by relevance to the user's
// saved allergens (server-side, see server/routes/news.js), plus two
// separate structured feeds: official food recalls (openFDA) and CDC
// outbreak/health alerts. `tags` on articles/recalls are the allergen ids
// that matched, so the client can show a "relevant to you" indicator.
export interface NewsArticle { id: string; title: string; link: string; pubDate: string; source: string; summary?: string; tags: string[]; }
export async function listNews() {
  const data = await request<{ articles: NewsArticle[] }>("/news");
  return data.articles;
}

export interface FoodRecall {
  id: string; title: string; link: string; pubDate: string; source: string;
  summary: string; classification: string; status: string; tags: string[];
}
export async function listRecalls() {
  const data = await request<{ recalls: FoodRecall[] }>("/news/recalls");
  return data.recalls;
}

export interface HealthAlert { id: string; title: string; link: string; pubDate: string; source: string; summary?: string; }
export async function listAlerts() {
  const data = await request<{ alerts: HealthAlert[] }>("/news/alerts");
  return data.alerts;
}

// Safer alternatives to a scanned product: other Open Food Facts products in
// the same category that don't contain the allergens that flagged this one.
export interface AlternativeProduct {
  barcode: string; name: string; brand: string; image_url: string | null; nutriscore: string;
}
export async function getAlternatives(barcode: string) {
  const data = await request<{ alternatives: AlternativeProduct[] }>(
    `/barcode/${encodeURIComponent(barcode)}/alternatives`
  );
  return data.alternatives;
}
