// Menu Storage System - Stores items in localStorage for persistence
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl: string;
  locationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopLocation {
  id: string;
  name: string;
  address: string;
  highlights: string;
}

// Default locations
export const defaultLocations: ShopLocation[] = [
  {
    id: 'loc1',
    name: 'Rameshwaram Dosa Center',
    address: '123 Main Street, Downtown',
    highlights: 'Famous for Traditional Dosas'
  },
  {
    id: 'loc2',
    name: 'Vighnaharta Sweet & Snacks Corner',
    address: '456 Park Avenue, Midtown',
    highlights: 'Best South Indian Sweets'
  },
  {
    id: 'loc3',
    name: 'Vighnaharta Snacks Corner',
    address: '789 Oak Street, Uptown',
    highlights: 'Quick Bites & Snacks'
  }
];

// Default menu items - EMPTY ARRAY (no hardcoded items)
export const defaultMenuItems: MenuItem[] = [];

// Server-side storage (in-memory for now)
let serverMenuItems: MenuItem[] = [];

// Storage functions
export const getMenuItems = (): MenuItem[] => {
  if (typeof window === 'undefined') {
    // Server-side: return in-memory storage
    return serverMenuItems;
  }
  
  // Client-side: use localStorage
  try {
    const stored = localStorage.getItem('cafe_menu_items');
    if (stored) {
      const items = JSON.parse(stored);
      return items.length > 0 ? items : defaultMenuItems;
    }
    return defaultMenuItems;
  } catch {
    return defaultMenuItems;
  }
};

export const saveMenuItems = (items: MenuItem[]): void => {
  if (typeof window === 'undefined') {
    // Server-side: update in-memory storage
    serverMenuItems = items;
    return;
  }
  
  // Client-side: use localStorage
  try {
    localStorage.setItem('cafe_menu_items', JSON.stringify(items));
  } catch (error) {
    console.error('Error saving menu items:', error);
  }
};

export const addMenuItem = (item: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>): MenuItem => {
  console.log('Adding menu item:', item);
  const items = getMenuItems();
  console.log('Current items before adding:', items);
  
  const newItem: MenuItem = {
    id: Date.now().toString(),
    ...item,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('New item created:', newItem);
  
  const updatedItems = [...items, newItem];
  console.log('Updated items array:', updatedItems);
  
  saveMenuItems(updatedItems);
  console.log('Items saved to localStorage');
  
  return newItem;
};

export const updateMenuItem = (id: string, updates: Partial<MenuItem>): MenuItem | null => {
  const items = getMenuItems();
  const index = items.findIndex(item => item.id === id);
  
  if (index === -1) return null;
  
  const updatedItem = {
    ...items[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  const updatedItems = [...items];
  updatedItems[index] = updatedItem;
  saveMenuItems(updatedItems);
  return updatedItem;
};

export const deleteMenuItem = (id: string): boolean => {
  const items = getMenuItems();
  const filteredItems = items.filter(item => item.id !== id);
  
  if (filteredItems.length === items.length) return false;
  
  saveMenuItems(filteredItems);
  return true;
};

export const getLocations = (): ShopLocation[] => {
  return defaultLocations;
};

export const clearAllMenuItems = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('cafe_menu_items');
  } catch (error) {
    console.error('Error clearing menu items:', error);
  }
};

// Function to clear hardcoded data and start fresh
export const clearHardcodedData = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Clear any existing data
    localStorage.removeItem('cafe_menu_items');
    console.log('Hardcoded data cleared - starting with empty menu');
  } catch (error) {
    console.error('Error clearing hardcoded data:', error);
  }
};
