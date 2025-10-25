// Clear Database Script
// This will delete ALL menu items from Firebase

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBQJQJQJQJQJQJQJQJQJQJQJQJQJQJQJQ",
  authDomain: "cafe-project-12345.firebaseapp.com",
  projectId: "cafe-project-12345",
  storageBucket: "cafe-project-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearAllMenuItems() {
  try {
    console.log('Starting database clear...');
    
    // Get all menu items
    const menuRef = collection(db, `artifacts/${firebaseConfig.projectId}/public/data/menu`);
    const snapshot = await getDocs(menuRef);
    
    console.log(`Found ${snapshot.docs.length} items to delete`);
    
    // Delete all items in batches
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });
    
    await batch.commit();
    console.log('✅ All menu items deleted successfully!');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  }
}

// Run the clear function
clearAllMenuItems();
