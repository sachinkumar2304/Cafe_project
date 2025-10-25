"use client";
/**
 * Admin Panel Component: Handles Email/Password Login, Role-Based Access Control (RBAC), and Menu Management.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, Auth, User, signOut, createUserWithEmailAndPassword } from 'firebase/auth'; 
import { getFirestore, onSnapshot, collection, query, DocumentData, Firestore, addDoc, getDocs, writeBatch, doc, setDoc, deleteDoc, getDoc as getDocFirestore } from 'firebase/firestore'; 
import { Utensils, Zap, Loader2, Key, List, Plus, MapPin, Edit, Trash, Check, X, RefreshCw, BarChart2, DollarSign, EyeOff, LogOut, User as UserIcon, Minus as MinusIcon, Plus as PlusIcon } from 'lucide-react';

// --- Global Constants ---
const ADMIN_ROLE_PATH = 'admins'; // Firestore collection to check Admin UIDs
const DEFAULT_IMAGE_URL = 'https://placehold.co/150x150/DC2626/ffffff?text=CAFÉ'; // Placeholder

// --- Firebase Setup Configuration (Hardcoded for Guaranteed Functionality) ---
const firebaseConfig = {
    apiKey: "AIzaSyDFGONbEvdW0m5HmhOYdBmiWDhkJBG6pS8", 
    authDomain: "cafe-project-2025.firebaseapp.com",
    projectId: "cafe-project-2025", 
    storageBucket: "cafe-project-2025.firebasestorage.app",
    appId: "1:84755652433:web:b60bc30d406bc48199fd70",
};
const PROJECT_ID = firebaseConfig.projectId || 'default-project-id';


// --- Interfaces and Types ---
interface ShopLocation { id: string; name: string; address: string; highlights: string; }
interface MenuItem { id: string; name: string; description: string; price: number; category: string; isVeg: boolean; isAvailable: boolean; imageUrl: string; locationId: string; }
interface AdminRole { role: 'super_admin' | 'staff' | 'viewer'; }

// --- Firebase Initialization and Auth Hook ---
const useFirebaseSetup = () => {
    const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
    const [db, setDb] = useState<Firestore | null>(null);
    const [auth, setAuth] = useState<Auth | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false); 
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // 1. Initialize Firebase App
    useEffect(() => {
        if (!getApps().length) {
            try {
                const app = initializeApp(firebaseConfig as any);
                setFirebaseApp(app);
            } catch (error: any) {
                setAuthError(`Initialization Failed: ${error.message}`);
            }
        } else {
            setFirebaseApp(getApp());
        }
    }, []);

    // 2. Setup Services and Authentication Listener + Role Check
    useEffect(() => {
        if (!firebaseApp || authError) return;

        try {
            const authInstance = getAuth(firebaseApp);
            const dbInstance = getFirestore(firebaseApp);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setCurrentUser(user);
                    
                    // --- RBAC CHECK (Admin check only) ---
                    if (dbInstance) {
                        // Try both paths: artifacts path first, then direct admins path
                        const artifactsAdminRef = doc(dbInstance, `artifacts/${PROJECT_ID}/${ADMIN_ROLE_PATH}/${user.uid}`);
                        const directAdminRef = doc(dbInstance, `${ADMIN_ROLE_PATH}/${user.uid}`);
                        
                        // ADDED: Small delay for network stabilization before reading Firestore
                        await new Promise(resolve => setTimeout(resolve, 100)); 
                        
                        // Check artifacts path first
                        let adminDoc = await getDocFirestore(artifactsAdminRef);
                        
                        // If not found in artifacts path, check direct admins path
                        if (!adminDoc.exists()) {
                            adminDoc = await getDocFirestore(directAdminRef);
                        }

                        if (adminDoc.exists() && adminDoc.data()?.role === 'super_admin') {
                            setIsAdmin(true);
                        } else {
                            setIsAdmin(false);
                        }
                    }
                } else {
                    setCurrentUser(null);
                    setIsAdmin(false);
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe(); 
        } catch (error: any) {
            setAuthError(`Service Setup Failed: ${error.message}`);
        }
    }, [firebaseApp, authError]);

    // Admin Specific Functions
    const loginAdmin = async (email: string, password: string) => {
        try {
            if (!auth) throw new Error("Auth service not initialized.");
            await signInWithEmailAndPassword(auth, email, password);
            setAuthError(null);
            return true;
        } catch (error: any) {
            console.error("Firebase Login Error:", error); 
            // Throw error message to be displayed on the screen
            throw new Error(error.message);
        }
    };
    
    // Admin Sign Up (For first time admin creation)
    const signupAdmin = async (email: string, password: string) => {
        try {
            if (!auth) throw new Error("Auth service not initialized.");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;
            
            return { success: true, uid };
        } catch (error: any) {
             throw new Error(error.message); 
        }
    };
    
    const logoutAdmin = async () => {
        if (auth) {
            await signOut(auth);
        }
        window.location.href = '/'; 
    };


    return { db, auth, currentUser, isAdmin, isAuthReady, authError, loginAdmin, signupAdmin, logoutAdmin };
};


// --- Data Fetcher Hook (Fetches Locations and Menu Items) ---
const useDataFetcher = (db: Firestore | null, isAuthReady: boolean) => {
    const [locations, setLocations] = useState<ShopLocation[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        if (!isAuthReady) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch locations
                const locationsResponse = await fetch('/api/locations');
                if (locationsResponse.ok) {
                    const locationsData = await locationsResponse.json();
                    setLocations(locationsData);
                    console.log('Admin Panel: Locations loaded:', locationsData.length);
                } else {
                    console.error('Failed to fetch locations');
                    setLocations([]);
                }

                // Fetch menu items
                const menuResponse = await fetch('/api/menu');
                if (menuResponse.ok) {
                    const menuData = await menuResponse.json();
                    const mappedItems = menuData.map((item: any) => ({
                        id: item.id,
                        name: item.name || 'Unnamed Item',
                        description: item.description || '',
                        price: item.price || 0,
                        category: item.category || 'Other',
                        isVeg: item.is_veg !== undefined ? item.is_veg : true,
                        isAvailable: item.is_available !== undefined ? item.is_available : true,
                        imageUrl: item.image_url || 'https://placehold.co/100x100/A0522D/ffffff?text=Food',
                        locationId: item.location_id || 'loc1'
                    }));
                    console.log('Admin Panel: Menu items loaded:', mappedItems.length);
                    setMenuItems(mappedItems.sort((a: MenuItem, b: MenuItem) => a.name.localeCompare(b.name)));
                } else {
                    console.error('Failed to fetch menu items');
                    setMenuItems([]);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setLocations([]);
                setMenuItems([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [isAuthReady, refreshTrigger]);

    const refreshData = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return { locations, menuItems, isLoading, refreshData };
};

// --- Menu Management Form Component ---

const MenuManager = ({ locations, menuItems, isLoading, refreshData }: { 
    locations: ShopLocation[], 
    menuItems: MenuItem[], 
    isLoading: boolean,
    refreshData: () => void,
}) => {
    const [activeLocation, setActiveLocation] = useState<ShopLocation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | '' }>({ text: '', type: '' });
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);

    // Automatically set first location as active
    useEffect(() => {
        if (locations.length > 0 && !activeLocation) {
            setActiveLocation(locations[0]);
        }
    }, [locations, activeLocation]);

    // Filter menu items by active location and remove duplicates
    const filteredMenu = useMemo(() => {
        if (!activeLocation) return [];
        
        console.log('Admin Panel: Filtering for location:', activeLocation.id);
        console.log('Admin Panel: Total menu items:', menuItems.length);
        
        // Filter by location and remove duplicates based on ID
        const filtered = menuItems.filter(item => {
            console.log(`Item ${item.name} (${item.id}): locationId=${item.locationId}, activeLocation=${activeLocation.id}`);
            return item.locationId === activeLocation.id;
        });
        
        console.log('Admin Panel: Filtered items:', filtered.length);
        
        const uniqueItems = filtered.reduce((acc, current) => {
            const existingItem = acc.find(item => item.id === current.id);
            if (!existingItem) {
                acc.push(current);
            }
            return acc;
        }, [] as MenuItem[]);
        
        console.log('Admin Panel: Unique items:', uniqueItems.length);
        return uniqueItems;
    }, [menuItems, activeLocation]);

    // Handle Form Submission (Add/Edit Item) - Now using PostgreSQL
    const handleSaveItem = async (itemData: Omit<MenuItem, 'id'>) => {
        if (!activeLocation) return;
        
        const itemPayload = {
            name: itemData.name,
            description: itemData.description,
            price: Number(itemData.price),
            category: itemData.category,
            is_veg: itemData.isVeg,
            is_available: itemData.isAvailable,
            image_url: itemData.imageUrl || DEFAULT_IMAGE_URL,
            location_id: activeLocation.id
        };

        try {
            if (editingItem) {
                // UPDATE operation
                const response = await fetch('/api/menu', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingItem.id, ...itemPayload })
                });
                
                if (response.ok) {
                    setMessage({ text: `${itemData.name} updated successfully!`, type: 'success' });
                    refreshData(); // Refresh data after updating
                } else {
                    const error = await response.json();
                    setMessage({ text: `Error updating item: ${error.error}`, type: 'error' });
                }
            } else {
                // ADD operation
                const response = await fetch('/api/menu', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(itemPayload)
                });
                
                if (response.ok) {
                    setMessage({ text: `${itemData.name} added successfully!`, type: 'success' });
                    refreshData(); // Refresh data after adding
                } else {
                    const error = await response.json();
                    setMessage({ text: `Error adding item: ${error.error}`, type: 'error' });
                }
            }
            setEditingItem(null);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving item:", error);
            setMessage({ text: `Error saving item: ${error}`, type: 'error' });
        }
    };
    
    // Handle Delete - Now using PostgreSQL
    const handleDelete = async (itemId: string, itemName: string) => {
        if (!itemId || !confirm(`Are you sure you want to delete ${itemName}?`)) return;

        try {
            console.log('Deleting item:', itemId, itemName);
            const response = await fetch('/api/menu', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: itemId })
            });
            
            if (response.ok) {
                setMessage({ text: `${itemName} deleted successfully!`, type: 'success' });
                refreshData(); // Refresh data after deleting
            } else {
                const error = await response.json();
                setMessage({ text: `Error deleting item: ${error.error}`, type: 'error' });
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            setMessage({ text: `Error deleting item: ${error}`, type: 'error' });
        }
    };

    // Handle Toggle Availability - Now using PostgreSQL
    const handleToggleAvailable = async (item: MenuItem) => {
        if (!item.id) {
            console.error('Cannot toggle availability: missing item.id', item);
            setMessage({ text: `Error: Item ID is missing for ${item.name}`, type: 'error' });
            return;
        }

        try {
            console.log('Toggling availability for item:', item.id, item.name);
            const response = await fetch('/api/menu', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: item.id, 
                    is_available: !item.isAvailable 
                })
            });
            
            if (response.ok) {
                setMessage({ text: `${item.name} availability toggled!`, type: 'success' });
                refreshData(); // Refresh data after toggling
            } else {
                const error = await response.json();
                setMessage({ text: `Error toggling availability: ${error.error}`, type: 'error' });
            }
        } catch (error) {
            console.error("Error toggling availability:", error);
            setMessage({ text: `Error toggling availability: ${error}`, type: 'error' });
        }
    };

    // Clear All Menu Items - Now using PostgreSQL
    const handleClearAllItems = async () => {
        if (!confirm('⚠️ WARNING: This will delete ALL menu items from the database. Are you sure?')) return;
        if (!confirm('This action cannot be undone. Type "CLEAR ALL" to confirm:')) return;

        try {
            console.log('Clearing all menu items...');
            
            // First, get all items to count them
            const response = await fetch('/api/menu');
            if (!response.ok) {
                setMessage({ text: 'Error fetching items to clear', type: 'error' });
                return;
            }
            
            const items = await response.json();
            console.log(`Found ${items.length} items to delete`);
            
            // Delete all items one by one
            const deletePromises = items.map((item: any) => {
                console.log('Deleting item:', item.id);
                return fetch('/api/menu', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: item.id })
                });
            });
            
            await Promise.all(deletePromises);
            setMessage({ text: `✅ Cleared ${items.length} items from database!`, type: 'success' });
            refreshData(); // Refresh data after clearing
            
        } catch (error) {
            console.error("Error clearing database:", error);
            setMessage({ text: `Error clearing database: ${error}`, type: 'error' });
        }
    };

    // Bulk Operations
    const handleSelectAll = () => {
        if (selectedItems.size === filteredMenu.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredMenu.map(item => item.id)));
        }
    };

    const handleSelectItem = (itemId: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedItems(newSelected);
    };

    const handleBulkTransfer = async (targetLocationId: string) => {
        if (selectedItems.size === 0) return;

        try {
            const transferPromises = Array.from(selectedItems).map(itemId => 
                fetch('/api/menu', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: itemId, location_id: targetLocationId })
                })
            );
            
            await Promise.all(transferPromises);
            setMessage({ text: `${selectedItems.size} items transferred successfully!`, type: 'success' });
            setSelectedItems(new Set());
            setShowBulkActions(false);
            refreshData(); // Refresh data after transfer
        } catch (error) {
            console.error("Error transferring items:", error);
            setMessage({ text: `Error transferring items: ${error}`, type: 'error' });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) return;

        try {
            const deletePromises = Array.from(selectedItems).map(itemId => 
                fetch('/api/menu', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: itemId })
                })
            );
            
            await Promise.all(deletePromises);
            setMessage({ text: `${selectedItems.size} items deleted successfully!`, type: 'success' });
            setSelectedItems(new Set());
            setShowBulkActions(false);
            refreshData(); // Refresh data after bulk delete
        } catch (error) {
            console.error("Error deleting items:", error);
            setMessage({ text: `Error deleting items: ${error}`, type: 'error' });
        }
    };

    // Form Modal Component (Same as before)
    const ItemFormModal = ({ itemToEdit }: { itemToEdit: MenuItem | null }) => {
        const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>({
            name: itemToEdit?.name || '',
            description: itemToEdit?.description || '',
            price: itemToEdit?.price || 0,
            category: itemToEdit?.category || '',
            isVeg: itemToEdit?.isVeg ?? true,
            isAvailable: itemToEdit?.isAvailable ?? true,
            imageUrl: itemToEdit?.imageUrl || '', 
            locationId: activeLocation?.id || '', 
        });

        // Optimization for typing (useCallback)
        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const { name, value, type } = e.target;
            const finalValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value);

            setFormData(prev => ({ ...prev, [name]: finalValue }));
        }, []);

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            handleSaveItem(formData);
        };
        
        // Predefined categories for the dropdown
        const predefinedCategories = [
            'Signature Dosas',
            'Traditional Dosas', 
            'Traditional Sweets',
            'Savory Snacks',
            'Quick Bites',
            'Beverages',
            'Desserts',
            'Main Course',
            'Appetizers',
            'Other'
        ];
        
        // Get unique categories from existing items + predefined categories
        const existingCategories = Array.from(new Set(menuItems.map(item => item.category)));
        const allCategories = [...new Set([...predefinedCategories, ...existingCategories])].sort();

        return (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b pb-3 mb-4">
                        <h3 className="text-2xl font-bold text-red-700">{itemToEdit ? 'Edit Menu Item' : 'Add New Item'}</h3>
                        <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100"><X className="h-6 w-6 text-gray-500 hover:text-red-500" /></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-gray-600">Adding/Editing for: <span className="font-semibold text-red-700">{activeLocation?.name}</span></p>

                        <label className="block">
                            <span className="text-gray-700 font-medium">Item Name:</span>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-orange-500 focus:ring-orange-500 text-gray-900"
                            />
                        </label>

                        <label className="block">
                            <span className="text-gray-700 font-medium">Price (₹):</span>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                min="1"
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-orange-500 focus:ring-orange-500 text-gray-900"
                            />
                        </label>
                        
                        <label className="block">
                            <span className="text-gray-700 font-medium">Category:</span>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 bg-white focus:border-orange-500 focus:ring-orange-500 text-gray-900"
                            >
                                <option value="" disabled>Select category</option>
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </label>

                        <div className="flex items-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isVeg"
                                    checked={formData.isVeg}
                                    onChange={handleChange}
                                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                                />
                                <span className="text-gray-700 font-medium">Vegetarian</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="isAvailable"
                                    checked={formData.isAvailable}
                                    onChange={handleChange}
                                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                                />
                                <span className="text-gray-700 font-medium">Available (Out of Stock Toggle)</span>
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-gray-700 font-medium">Description (Optional):</span>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={2}
                                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 resize-none focus:border-orange-500 focus:ring-orange-500 text-gray-900"
                            />
                        </label>

                        <label className="block">
                            <span className="text-gray-700 font-medium">Image Options:</span>
                            <div className="mt-2 space-y-3">
                                {/* Image URL Input */}
                                <div>
                                    <label className="text-sm text-gray-600">Image URL:</label>
                                    <input
                                        type="url"
                                        name="imageUrl"
                                        value={formData.imageUrl}
                                        onChange={handleChange}
                                        placeholder="https://example.com/image.jpg"
                                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-orange-500 focus:ring-orange-500 text-gray-900"
                                    />
                                </div>
                                
                                {/* File Upload Option */}
                                <div>
                                    <label className="text-sm text-gray-600">Or Upload Image:</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                // For now, we'll use a placeholder URL
                                                // In production, you'd upload to Firebase Storage
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    setFormData(prev => ({ 
                                                        ...prev, 
                                                        imageUrl: event.target?.result as string || DEFAULT_IMAGE_URL 
                                                    }));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:border-orange-500 focus:ring-orange-500 text-gray-900"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Upload will convert to base64 (for demo)</p>
                                </div>
                                
                                {/* Preview */}
                                {formData.imageUrl && (
                                    <div>
                                        <label className="text-sm text-gray-600">Preview:</label>
                                        <img 
                                            src={formData.imageUrl} 
                                            alt="Preview" 
                                            className="mt-1 w-20 h-20 object-cover rounded border"
                                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE_URL }}
                                        />
                                    </div>
                                )}
                            </div>
                        </label>
                        
                        <button
                            type="submit"
                            className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition duration-150 shadow-md flex items-center justify-center space-x-2"
                        >
                            <Check className="w-5 h-5" />
                            <span>{itemToEdit ? 'Save Changes' : 'Add Item'}</span>
                        </button>
                    </form>
                </div>
            </div>
        );
    };


    return (
        <div className="p-6 bg-white rounded-xl shadow-lg mt-6">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
                <h2 className="text-2xl font-bold text-red-900">Menu Management</h2>
                <div className="flex space-x-3">
                    <button 
                        onClick={handleClearAllItems}
                        className="flex items-center bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 transition shadow-md"
                    >
                        <Trash className="w-4 h-4 mr-1" /> Clear All Items
                    </button>
                    <button 
                        onClick={() => { 
                            localStorage.removeItem('cafe_menu_items');
                            refreshData();
                            setMessage({ text: 'All data cleared! Starting fresh.', type: 'success' });
                        }}
                        className="flex items-center bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition shadow-md"
                    >
                        <RefreshCw className="w-4 h-4 mr-1" /> Reset to Empty
                    </button>
                    <button 
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="flex items-center bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition shadow-md"
                    >
                        <PlusIcon className="w-5 h-5 mr-1" /> Add New Item
                    </button>
                </div>
            </div>
            
            {/* Location Tabs */}
            <div className="flex overflow-x-auto space-x-4 mb-6 p-1 border-b">
                {locations.map(loc => (
                    <button
                        key={loc.id}
                        onClick={() => setActiveLocation(loc)}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-lg flex-shrink-0 transition-colors duration-200 ${
                            activeLocation?.id === loc.id
                                ? 'bg-orange-500 text-white border-b-2 border-red-700'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        {loc.name}
                    </button>
                ))}
            </div>

            {/* Status Message */}
            {message.text && (
                <div className={`p-3 mb-4 rounded-lg font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            {/* Bulk Actions */}
            {filteredMenu.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.size === filteredMenu.length && filteredMenu.length > 0}
                                    onChange={handleSelectAll}
                                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    Select All ({selectedItems.size}/{filteredMenu.length})
                                </span>
                            </label>
                            
                            {selectedItems.size > 0 && (
                                <button
                                    onClick={() => setShowBulkActions(!showBulkActions)}
                                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                                >
                                    Bulk Actions ({selectedItems.size})
                                </button>
                            )}
                        </div>
                        
                        {showBulkActions && selectedItems.size > 0 && (
                            <div className="flex items-center space-x-2">
                                <select
                                    onChange={(e) => e.target.value && handleBulkTransfer(e.target.value)}
                                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                                    defaultValue=""
                                >
                                    <option value="">Transfer to...</option>
                                    {locations.filter(loc => loc.id !== activeLocation?.id).map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                                
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                                >
                                    Delete Selected
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Menu List - Card Format */}
            <h3 className="text-xl font-semibold mb-6">Items in {activeLocation?.name || '...'} ({filteredMenu.length})</h3>
            
            {isLoading ? (
                <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto text-red-700" /></div>
            ) : filteredMenu.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl">
                    <Utensils className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h4 className="text-2xl font-bold text-gray-600 mb-2">No Items Yet</h4>
                    <p className="text-gray-500 mb-6">Start by adding your first menu item for this location.</p>
                    <button 
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition shadow-md"
                    >
                        <PlusIcon className="w-5 h-5 mr-2 inline" /> Add First Item
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMenu.map((item, index) => (
                        <div key={`${item.id}-${index}-${activeLocation?.id}`} className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden relative">
                            {/* Selection Checkbox */}
                            <div className="absolute top-2 left-2 z-10">
                                <input
                                    type="checkbox"
                                    checked={selectedItems.has(item.id)}
                                    onChange={() => handleSelectItem(item.id)}
                                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4 bg-white shadow"
                                />
                            </div>
                            {/* Image Section */}
                            <div className="relative h-40 bg-gray-200">
                                <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE_URL }}
                                />
                                {/* Price Tag */}
                                <span className="absolute top-2 left-2 bg-red-700 text-white text-lg font-bold px-3 py-1 rounded-full shadow-md">
                                    ₹{item.price}
                                </span>
                                {/* Availability Status */}
                                <span className={`absolute top-2 right-2 text-white text-sm font-bold px-2 py-1 rounded-full shadow-md ${item.isAvailable ? 'bg-green-600' : 'bg-red-600'}`}>
                                    {item.isAvailable ? 'AVAILABLE' : 'O/S'}
                                </span>
                            </div>

                            {/* Content & Actions */}
                            <div className="p-4">
                                <h4 className="text-xl font-bold text-red-900 mb-1">{item.name}</h4>
                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                                
                                <div className="flex justify-between items-center border-t pt-3 mt-auto">
                                    <span className={`text-sm font-semibold flex items-center ${item.isVeg ? 'text-green-600' : 'text-red-500'}`}>
                                        {item.category}
                                    </span>
                                    <div className="flex space-x-2">
                                        {/* Availability Toggle Button */}
                                        <button
                                            onClick={() => {
                                                if (!item.id) {
                                                    console.error('Cannot toggle: item.id is missing', item);
                                                    setMessage({ text: `Error: Item ID missing for ${item.name}`, type: 'error' });
                                                    return;
                                                }
                                                handleToggleAvailable(item);
                                            }}
                                            className={`p-2 rounded-full transition-colors shadow-sm ${
                                                item.isAvailable ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
                                            }`}
                                            title={item.isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
                                        >
                                            {item.isAvailable ? <EyeOff className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                                        </button>

                                        {/* Edit Button */}
                                        <button
                                            onClick={() => {
                                                if (!item.id) {
                                                    console.error('Cannot edit: item.id is missing', item);
                                                    setMessage({ text: `Error: Item ID missing for ${item.name}`, type: 'error' });
                                                    return;
                                                }
                                                setEditingItem(item);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 text-blue-600 bg-blue-100 hover:bg-blue-200 rounded-full transition shadow-sm"
                                            aria-label="Edit Item"
                                        >
                                            <Edit className="w-5 h-5" />
                                        </button>
                                        
                                        {/* Delete Button */}
                                        <button
                                            onClick={() => {
                                                if (!item.id) {
                                                    console.error('Cannot delete: item.id is missing', item);
                                                    setMessage({ text: `Error: Item ID missing for ${item.name}`, type: 'error' });
                                                    return;
                                                }
                                                handleDelete(item.id, item.name);
                                            }}
                                            className="p-2 text-red-600 bg-red-100 hover:bg-red-200 rounded-full transition shadow-sm"
                                            aria-label="Delete Item"
                                        >
                                            <Trash className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {isModalOpen && <ItemFormModal itemToEdit={editingItem} />}

        </div>
    );
};

// --- Admin Panel Main Component ---

const AdminApp = () => {
    const { db, isAdmin, loginAdmin, signupAdmin, logoutAdmin, isAuthReady, authError, currentUser } = useFirebaseSetup();
    const { locations, menuItems, isLoading, refreshData } = useDataFetcher(db, isAuthReady);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isSignupMode, setIsSignupMode] = useState(false); // To toggle between Login and Signup
    const [isAuthenticating, setIsAuthenticating] = useState(false); // Loading state

    // Handle Input change efficiently (Using useCallback to prevent re-render focus loss)
    const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    }, []);

    const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    }, []);


    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsAuthenticating(true); // Start loading

        try {
            if (isSignupMode) {
                const result = await signupAdmin(email, password);
                if (result.success) {
                    // Display success message with UID
                    setLoginError(`Signup successful! Your UID is: ${result.uid}. Please add this UID to the Firestore 'admins' collection with role: 'super_admin' to gain access.`);
                    setEmail('');
                    setPassword('');
                }
            } else {
                // Login
                const success = await loginAdmin(email, password);
                if (!success) {
                     // Login failed - error is already set by loginAdmin throw
                     setLoginError(authError || 'Login Failed: Check your credentials or sign up.');
                } else {
                     // Login success: Force a small delay and reload
                     await new Promise(resolve => setTimeout(resolve, 500)); 
                     window.location.reload(); // FORCED RELOAD TO ENSURE RBAC CHECK COMPLETES
                }
            }
        } catch (error: any) {
             // Catch the error thrown by loginAdmin
             setLoginError(error.message); 
        } finally {
            setIsAuthenticating(false); // Stop loading regardless of success/failure
        }
    };
    
    // Real Data for Analytics (initially 0 until orders are placed)
    const REAL_REVENUE = '₹0';
    const REAL_ORDERS = '0';
    const REAL_AVG_ORDER = '₹0';
    
    // Memoized Login Screen Component to prevent input re-rendering
    const AdminLoginScreen = useMemo(() => () => (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl text-center border-t-4 border-red-700">
                <Key className="w-10 h-10 text-red-700 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{isSignupMode ? 'Admin Sign Up' : 'Admin Login'}</h2>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Admin Email"
                        value={email}
                        onChange={handleEmailChange} // Optimized onChange
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-gray-900"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={handlePasswordChange} // Optimized onChange
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-gray-900"
                    />
                    {loginError && (
                        <p className={`text-sm ${loginError.includes("UID") ? 'text-green-600 font-bold' : 'text-red-500'}`}>
                            {loginError}
                        </p>
                    )}
                    
                    <button
                        type="submit"
                        disabled={isAuthenticating} // Disable during authentication
                        className={`w-full py-3 text-white font-bold rounded-lg transition duration-150 shadow-md flex items-center justify-center space-x-2 ${
                            isAuthenticating ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-700 hover:bg-red-800'
                        }`}
                    >
                        {isAuthenticating && <Loader2 className='w-5 h-5 mr-2 animate-spin' />}
                        {isSignupMode ? 'Create Admin Account' : 'Log In'}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => { setIsSignupMode(!isSignupMode); setLoginError(''); setEmail(''); setPassword(''); }} // Reset fields on toggle
                        disabled={isAuthenticating}
                        className="w-full py-2 text-sm text-gray-600 hover:text-red-500 transition"
                    >
                        {isSignupMode ? 'Already have an account? Log In' : 'New Admin? Sign Up'}
                    </button>
                    
                    <p className="text-xs text-gray-500 mt-4">
                        *After signup, check the message above for your UID and set the 'super_admin' role in Firestore.
                    </p>
                    {authError && <p className="text-xs text-red-500 mt-2">{authError}</p>}
                </form>
            </div>
        </div>
    ), [isSignupMode, email, password, loginError, authError, isAuthenticating, handleAuth, handleEmailChange, handlePasswordChange]);
    
    // --- Render Logic ---
    
    if (!isAuthReady || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
                <Loader2 className="h-10 w-10 animate-spin text-red-700 mb-4" />
                <p className="text-lg text-gray-700">Loading Admin Dashboard...</p>
                {authError && <p className="text-sm text-red-500 mt-4">{authError}</p>}
            </div>
        );
    }
    
    if (!isAdmin) {
        return AdminLoginScreen();
    }

    // --- Main Admin Dashboard UI ---
    
    const AnalyticsPanel = () => (
        <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500">
                <DollarSign className="w-6 h-6 text-orange-500 mb-2" />
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-800">{REAL_REVENUE}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
                <List className="w-6 h-6 text-red-500 mb-2" />
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-3xl font-bold text-gray-800">{REAL_ORDERS}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500">
                <BarChart2 className="w-6 h-6 text-green-500 mb-2" />
                <p className="text-sm text-gray-500">Average Order Value</p>
                <p className="text-3xl font-bold text-gray-800">{REAL_AVG_ORDER}</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            {/* Admin Header */}
            <header className="bg-red-900 text-white p-4 shadow-xl sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="text-2xl font-extrabold flex items-center">
                        <BarChart2 className="w-6 h-6 mr-3" /> CAFÉ DELIGHTS - Admin Panel
                    </h1>
                    <div className="flex items-center space-x-4">
                         <span className="text-sm flex items-center"><UserIcon className="w-4 h-4 mr-1"/>{currentUser?.email || 'Admin'}</span>
                        <a href="/" className="text-sm hover:text-red-200 transition">View Live Site</a>
                        <button onClick={logoutAdmin} className="text-sm bg-red-700 px-3 py-1 rounded-lg hover:bg-red-600 transition flex items-center">
                            <LogOut className='w-4 h-4 mr-1'/> Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
                
                <AnalyticsPanel />

                {/* Menu Management Section */}
                <MenuManager 
                    locations={locations} 
                    menuItems={menuItems} 
                    isLoading={isLoading}
                    refreshData={refreshData}
                />
            </main>
            
            {/* Footer */}
            <footer className="bg-white text-gray-600 p-4 text-center mt-10 rounded-xl shadow-inner">
                <p className="text-xs">&copy; 2025 Admin Control System. Highly Secure.</p>
            </footer>
        </div>
    );
};

export default AdminApp;