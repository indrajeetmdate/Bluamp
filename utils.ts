
import type { FinishedGood, Recipe } from './types';

// Timestamp cutoff for when we switched ID generation logic..
// Items created BEFORE this timestamp will use the old legacy logic to preserve history.
// Items created AFTER will use the new short/jumbled logic.
// Set to a recent timestamp (approx Feb 8, 2025).
const LEGACY_CUTOFF_TIMESTAMP = 1739000000000; 

export const generateBatchId = (good: FinishedGood, allGoods: FinishedGood[], recipes: Recipe[]): string => {
    const recipe = recipes.find(r => r.id === good.recipeId);
    const recipeName = recipe ? recipe.name : 'Unknown';
    
    // Generate prefix: First 4 chars of recipe name, uppercase, remove all non-alphanumeric chars (spaces, symbols)
    const cleanName = recipeName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const namePart = cleanName.substring(0, 4);

    // --- LEGACY LOGIC (For historical items) ---
    // If item was created before the update, reproduce the old ID format:
    // Format: NAME4-DDMMYY-HHMM[-SUFFIX]
    if (good.timestamp < LEGACY_CUTOFF_TIMESTAMP) {
        const dateObj = new Date(good.timestamp);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = String(dateObj.getFullYear()).slice(-2);
        const datePart = `${day}${month}${year}`;
        
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const timePart = `${hours}${minutes}`;

        // Legacy format used a different name cleaning (X for spaces) but let's stick to base reconstruction
        // The previous logic was: namePart + '-' + datePart + '-' + timePart
        // We will do best effort match. Since this function is mostly for display of *existing* items, 
        // if the ID is stored or deterministically reproducible, this is fine.
        // Actually, 'FinishedGoods' view uses this to *display* IDs.
        
        const baseId = `${namePart}-${datePart}-${timePart}`;
        
        // Legacy Collision Check (Approximate)
        if (allGoods && allGoods.length > 0) {
            const sameTimeGoods = allGoods.filter(g => {
                if (g.id === good.id) return true;
                if (g.recipeId !== good.recipeId) return false;
                const t = new Date(g.timestamp);
                // Check if minute matches
                return Math.floor(t.getTime() / 60000) === Math.floor(good.timestamp / 60000);
            });

            if (sameTimeGoods.length > 1) {
                sameTimeGoods.sort((a, b) => a.id.localeCompare(b.id));
                const index = sameTimeGoods.findIndex(g => g.id === good.id);
                if (index > 0) {
                    return `${baseId}-${index + 1}`; // Legacy used -1, -2 suffix
                }
            }
        }
        return baseId;
    }

    // --- NEW LOGIC (Short, Jumbled, Unique) ---
    // 1. Get timestamp as string
    const tsStr = good.timestamp.toString();
    // 2. Reverse digits: Puts rapidly changing milliseconds at the front, creating a "jumbled" non-sequential look
    const reversedTsStr = tsStr.split('').reverse().join('');
    // 3. Convert to Base36: Shortens the numeric string significantly
    const reversedNum = parseInt(reversedTsStr, 10);
    const timePart = reversedNum.toString(36).toUpperCase();

    const baseId = `${namePart}-${timePart}`;

    // Collision Check: Handle exact timestamp matches (rare, but possible in bulk ops)
    if (allGoods && allGoods.length > 0) {
        const sameTimeGoods = allGoods.filter(g => {
            if (g.id === good.id) return true; // Self
            if (g.recipeId !== good.recipeId) return false;
            return g.timestamp === good.timestamp;
        });

        if (sameTimeGoods.length > 1) {
            // Sort by ID to ensure deterministic suffix assignment
            sameTimeGoods.sort((a, b) => a.id.localeCompare(b.id));
            const index = sameTimeGoods.findIndex(g => g.id === good.id);
            if (index > 0) {
                // Append suffix letter for duplicates (A, B, C...)
                const suffix = String.fromCharCode(65 + (index - 1));
                return `${baseId}${suffix}`;
            }
        }
    }

    return baseId;
};

export const generateUnitIds = (good: FinishedGood, allGoods: FinishedGood[], recipes: Recipe[]): string[] => {
    const batchId = generateBatchId(good, allGoods, recipes);
    if (good.quantity <= 0) return [];
    
    const ids: string[] = [];
    const padding = String(good.quantity).length; 
    
    for (let i = 1; i <= good.quantity; i++) {
        ids.push(`${batchId}-${String(i).padStart(padding, '0')}`);
    }
    return ids;
};

export interface DueDateBadgeInfo {
  formattedText: string;
  dayOfWeek: string;
  ddmmyy: string;
  priority: 1 | 2 | 3 | 4;
  badgeClass: string;
  dotColor: string;
}

export const getDueDateBadgeInfo = (dueDateStr?: string): DueDateBadgeInfo | null => {
  if (!dueDateStr) return null;
  const parts = dueDateStr.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const targetDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  const ddmmyy = `${dd}/${mm}/${yy}`;
  const formattedText = `${dayOfWeek}, ${ddmmyy}`;

  if (diffDays <= 0) {
    // Priority 1: Today or Overdue (Red / Crimson)
    return {
      formattedText,
      dayOfWeek,
      ddmmyy,
      priority: 1,
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      dotColor: 'bg-rose-600',
    };
  } else if (diffDays <= 7) {
    // Priority 2: Tomorrow till next week (1 to 7 days) (Amber / Yellow)
    return {
      formattedText,
      dayOfWeek,
      ddmmyy,
      priority: 2,
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
      dotColor: 'bg-amber-500',
    };
  } else if (diffDays <= 30) {
    // Priority 3: Next week till end of 30 days (8 to 30 days) (Emerald / Blue)
    return {
      formattedText,
      dayOfWeek,
      ddmmyy,
      priority: 3,
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
      dotColor: 'bg-emerald-500',
    };
  } else {
    // Priority 4: Beyond 30 days (Neutral Slate)
    return {
      formattedText,
      dayOfWeek,
      ddmmyy,
      priority: 4,
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
      dotColor: 'bg-slate-400',
    };
  }
};

