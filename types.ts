
export type IngredientCategory = 'produce' | 'dairy' | 'meat' | 'pantry' | 'beverage' | 'other';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  expiryEstimateDays?: number;
  confidence?: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: IngredientCategory;
  checked: boolean;
}

export interface NutritionStats {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface Meal {
  id: string;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  name: string;
  description: string;
  cuisine?: string;
  ingredientsUsed: string[];
  missingIngredients: { name: string; category: IngredientCategory }[];
  nutrition: NutritionStats;
  timeToCookMinutes: number;
  // New fields for Smart Recipes
  wasteReductionScore?: number; // 0-100 score based on utilizing expiring items
  expiringIngredientsUsed?: string[]; // List of specific items saved from waste
  
  // New fields for Medical/Health Context
  healthReasoning?: string; // Explainability: "Low sodium due to medical constraint."
  dietaryTags?: string[]; // e.g. "Low Sodium", "Vitamin K Controlled"

  alternatives?: Meal[]; 
}

export interface DailyPlan {
  summary: string;
  meals: Meal[];
  totalNutrition: NutritionStats;
  shoppingList: { name: string; category: IngredientCategory }[];
}

export interface MedicalConstraints {
  avoids: string[]; // e.g., "Grapefruit", "High Sodium"
  limits: string[]; // e.g., "Vitamin K", "Sugar"
  recommendations: string[]; // e.g., "Increase Iron", "Fiber"
  lastUpdated?: string;
}

export interface UserProfile {
  name: string;
  // Biometrics
  gender: 'male' | 'female';
  age: number;
  height: number; // cm
  weight: number; // kg
  
  // Goals & Preferences
  primaryGoal: 'Lose Weight' | 'Maintain' | 'Build Muscle' | 'Endurance';
  activityLevel: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active';
  
  dietaryType: 'Omnivore' | 'Vegetarian' | 'Vegan' | 'Paleo' | 'Keto' | 'Mediterranean';
  dietaryRestrictions: string[]; 
  allergens: string[]; // List of ingredient names that are allergens
  
  // New Medical Integration
  medicalConstraints?: MedicalConstraints;
  medicalConsentGiven?: boolean;

  cookingTime: 'Quick (<15m)' | 'Medium (30-45m)' | 'Elaborate (1h+)';
  sustainabilityFocus: boolean; // "Maximize local/seasonal, minimize waste"
  
  // Derived/Live Data
  dailyCalorieTarget: number; // Base target from profile settings
  steps: number; 
  caloriesBurned: number; 
}

export type ViewState = 'dashboard' | 'scan' | 'inventory' | 'recipes' | 'grocery';
