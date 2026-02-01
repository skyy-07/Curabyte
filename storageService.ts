
import { Ingredient, DailyPlan, UserProfile, ShoppingItem } from '../types';
import { MOCK_USER, INITIAL_INVENTORY } from '../constants';

const STORAGE_KEYS = {
  USER: 'smart_fridge_user_v1',
  INVENTORY: 'smart_fridge_inventory_v1',
  PLAN: 'smart_fridge_plan_v1',
  SHOPPING: 'smart_fridge_shopping_v1',
};

// Simulate network latency for realistic "Cloud" behavior
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const storageService = {
  /**
   * Fetches all user data from the cloud storage.
   */
  async loadData(): Promise<{ user: UserProfile, inventory: Ingredient[], plan: DailyPlan | null, shoppingList: ShoppingItem[] }> {
    // Simulate network fetch latency
    await delay(800);
    
    try {
      const userRaw = localStorage.getItem(STORAGE_KEYS.USER);
      const invRaw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      const planRaw = localStorage.getItem(STORAGE_KEYS.PLAN);
      const shopRaw = localStorage.getItem(STORAGE_KEYS.SHOPPING);

      return {
        user: userRaw ? JSON.parse(userRaw) : MOCK_USER,
        // If inventory is null (first visit), fallback to INITIAL_INVENTORY
        inventory: invRaw ? JSON.parse(invRaw) : INITIAL_INVENTORY,
        plan: planRaw ? JSON.parse(planRaw) : null,
        shoppingList: shopRaw ? JSON.parse(shopRaw) : []
      };
    } catch (e) {
      console.error("Cloud fetch failed, reverting to defaults", e);
      return { user: MOCK_USER, inventory: INITIAL_INVENTORY, plan: null, shoppingList: [] };
    }
  },

  /**
   * Syncs the current inventory state to the cloud.
   */
  async syncInventory(inventory: Ingredient[]): Promise<void> {
    await delay(600); // Simulate network write
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  },

  /**
   * Syncs the current meal plan to the cloud.
   */
  async syncPlan(plan: DailyPlan | null): Promise<void> {
    await delay(600); // Simulate network write
    if (plan) {
      localStorage.setItem(STORAGE_KEYS.PLAN, JSON.stringify(plan));
    } else {
      localStorage.removeItem(STORAGE_KEYS.PLAN);
    }
  },

  /**
   * Syncs the shopping list to the cloud.
   */
  async syncShoppingList(items: ShoppingItem[]): Promise<void> {
    await delay(400); 
    localStorage.setItem(STORAGE_KEYS.SHOPPING, JSON.stringify(items));
  },

  /**
   * Returns current storage usage in KB.
   */
  getStorageUsageKB(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('smart_fridge_')) {
        total += ((localStorage[key].length + key.length) * 2);
      }
    }
    return parseFloat((total / 1024).toFixed(2));
  }
};
