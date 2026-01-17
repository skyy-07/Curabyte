
import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import InventoryList from './components/InventoryList';
import GroceryList from './components/GroceryList';
import FridgeScanner from './components/FridgeScanner';
import SmartRecipes from './components/SmartRecipes';
import ProfileSettings from './components/ProfileSettings'; 
import { ViewState, Ingredient, DailyPlan, UserProfile, ShoppingItem, IngredientCategory } from './types';
import { MOCK_USER, INITIAL_INVENTORY } from './constants';
import { generateMealPlan } from './services/geminiService';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isScanning, setIsScanning] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // State initialization
  const [userProfile, setUserProfile] = useState<UserProfile>(MOCK_USER);
  const [inventory, setInventory] = useState<Ingredient[]>(INITIAL_INVENTORY);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  
  // Cloud Sync State
  const [isCloudLoading, setIsCloudLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [storageUsage, setStorageUsage] = useState(0);

  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  
  // Live health stats simulation
  const [liveStats, setLiveStats] = useState({ 
    steps: MOCK_USER.steps, 
    burned: MOCK_USER.caloriesBurned 
  });

  // 1. Initial Cloud Hydration
  useEffect(() => {
    const hydrate = async () => {
      setIsCloudLoading(true);
      const data = await storageService.loadData();
      if (data.user) setUserProfile(data.user);
      if (data.inventory.length > 0) setInventory(data.inventory);
      if (data.plan) setDailyPlan(data.plan);
      if (data.shoppingList) setShoppingList(data.shoppingList);
      
      setLastSynced(new Date());
      setStorageUsage(storageService.getStorageUsageKB());
      setIsCloudLoading(false);
    };
    hydrate();
  }, []);

  // 2. Auto-Sync Logic (Debounced)
  useEffect(() => {
    if (isCloudLoading) return; 

    const syncToCloud = async () => {
      setIsSyncing(true);
      await Promise.all([
        storageService.syncInventory(inventory),
        storageService.syncPlan(dailyPlan),
        storageService.syncShoppingList(shoppingList)
      ]);
      setLastSynced(new Date());
      setStorageUsage(storageService.getStorageUsageKB());
      setIsSyncing(false);
    };

    const timeoutId = setTimeout(syncToCloud, 2000); 
    return () => clearTimeout(timeoutId);
  }, [inventory, dailyPlan, shoppingList, isCloudLoading]);

  // Manual Sync Trigger
  const handleForceSync = useCallback(async () => {
    setIsSyncing(true);
    await Promise.all([
      storageService.syncInventory(inventory),
      storageService.syncPlan(dailyPlan),
      storageService.syncShoppingList(shoppingList)
    ]);
    setLastSynced(new Date());
    setStorageUsage(storageService.getStorageUsageKB());
    setIsSyncing(false);
  }, [inventory, dailyPlan, shoppingList]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        steps: prev.steps + Math.floor(Math.random() * 8),
        burned: prev.burned + (Math.random() > 0.8 ? 1 : 0)
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Expose setTab globally
  useEffect(() => {
    (window as any).setTab = (view: ViewState) => {
      if (view === 'scan') {
        setIsScanning(true);
      } else {
        setCurrentView(view);
      }
    };
  }, []);

  const handleScanComplete = (newIngredients: Ingredient[]) => {
    setInventory(prev => [...newIngredients, ...prev]);
    setIsScanning(false);
    setCurrentView('inventory');
  };

  const handleManualAdd = (item: Omit<Ingredient, 'id'>) => {
    const newIngredient: Ingredient = {
      ...item,
      id: Math.random().toString(36).substring(7),
    };
    setInventory(prev => [newIngredient, ...prev]);
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    
    // Create a dynamic profile with the latest live stats
    const dynamicProfile: UserProfile = {
      ...userProfile,
      steps: liveStats.steps,
      caloriesBurned: liveStats.burned
    };

    try {
      const plan = await generateMealPlan(
        inventory, 
        dynamicProfile
      );
      setDailyPlan(plan);
      
      // OPTIONAL: Automatically add generated shopping list items to the main list if not present
      if (plan.shoppingList && plan.shoppingList.length > 0) {
        handleAddIngredientsToShop(plan.shoppingList);
      }

      // Switch to recipes view if generated from dashboard
      if (currentView === 'dashboard') {
         setCurrentView('recipes');
      }
    } catch (error: any) {
      console.error("Failed to generate plan", error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Failed to generate plan: ${msg}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const removeInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
  };

  const handleToggleAllergen = (ingredientName: string) => {
    setUserProfile(prev => {
      const current = prev.allergens || [];
      const exists = current.includes(ingredientName);
      // If it exists, remove it; if not, add it
      const newAllergens = exists 
        ? current.filter(a => a !== ingredientName) 
        : [...current, ingredientName];
      return { ...prev, allergens: newAllergens };
    });
  };
  
  // Modified to handle categorized objects
  const handleAddIngredientsToShop = (newItems: { name: string; category: IngredientCategory }[]) => {
    setShoppingList(prev => {
      const existingNames = new Set(prev.map(i => i.name.toLowerCase()));
      const uniqueNewItems = newItems
        .filter(item => !existingNames.has(item.name.toLowerCase()))
        .map(item => ({
          id: Math.random().toString(36).substring(7),
          name: item.name,
          category: item.category,
          checked: false
        }));
      return [...prev, ...uniqueNewItems];
    });
  };
  
  const handleToggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const handleRemoveShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const handleClearCheckedShoppingItems = () => {
    setShoppingList(prev => prev.filter(item => !item.checked));
  };

  const handleUpdateProfile = (updated: UserProfile) => {
    setUserProfile(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center">
      <div className="w-full max-w-md bg-slate-50 relative min-h-screen shadow-2xl overflow-hidden">
        
        {/* Main Content Area */}
        <div className="p-4 pt-8 h-full overflow-y-auto no-scrollbar pb-24">
          {currentView === 'dashboard' && (
            <Dashboard 
              user={userProfile} 
              liveStats={liveStats}
              plan={dailyPlan} 
              inventory={inventory}
              onGeneratePlan={handleGeneratePlan}
              isGenerating={isGeneratingPlan}
              onOpenSettings={() => setIsProfileOpen(true)}
            />
          )}
          
          {currentView === 'inventory' && (
            <InventoryList 
              items={inventory} 
              allergens={userProfile.allergens || []}
              onRemove={removeInventoryItem}
              onAdd={() => setIsScanning(true)}
              onManualAdd={handleManualAdd}
              onToggleAllergen={handleToggleAllergen}
            />
          )}
          
          {currentView === 'recipes' && (
            <SmartRecipes 
               plan={dailyPlan}
               user={userProfile}
               inventory={inventory}
               onGenerate={handleGeneratePlan}
               isGenerating={isGeneratingPlan}
               onAddToShoppingList={handleAddIngredientsToShop}
            />
          )}
          
          {currentView === 'grocery' && (
            <GroceryList 
              items={shoppingList}
              onToggle={handleToggleShoppingItem}
              onRemove={handleRemoveShoppingItem}
              onClearChecked={handleClearCheckedShoppingItems}
            />
          )}
        </div>

        {/* Overlay Scanner */}
        {isScanning && (
          <FridgeScanner 
            onClose={() => setIsScanning(false)} 
            onIngredientsDetected={handleScanComplete}
          />
        )}
        
        {/* Profile Settings Modal */}
        {isProfileOpen && (
           <ProfileSettings 
              user={userProfile}
              onClose={() => setIsProfileOpen(false)}
              onSave={handleUpdateProfile}
              isSyncing={isSyncing}
              lastSynced={lastSynced}
              storageUsage={storageUsage}
              onForceSync={handleForceSync}
           />
        )}

        {/* Bottom Navigation */}
        <Navbar 
          currentView={currentView} 
          onChange={setCurrentView} 
          onScan={() => setIsScanning(true)} 
        />
      </div>
    </div>
  );
};

export default App;
