'use client';

import { logout } from './login/actions';

export function LogoutButton() {
  const handleLogout = async () => {
    // 1. Clear old localStorage keys (excluding sb-* and app_data_version)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('sb-') && key !== 'app_data_version') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 2. Clear sessionStorage
    sessionStorage.clear();

    // 3. Clear IndexedDB
    if (indexedDB.databases) {
       indexedDB.databases().then(dbs => {
         dbs.forEach(db => {
           if (db.name) indexedDB.deleteDatabase(db.name);
         });
       });
    }

    // 4. Clear Cache Storage
    if ('caches' in window) {
      caches.keys().then(names => {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }

    // Run server logout action
    await logout();
  };

  return (
    <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900 font-bold bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
      Logout
    </button>
  );
}
