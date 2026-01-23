
import type { FinishedGood, Recipe } from './types';

// Timestamp cutoff for when we switched ID generation logic.
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
