'use client';

import { useEffect } from 'react';

export function StorageCleaner() {
  useEffect(() => {
    try {
      const version = localStorage.getItem('app_data_version');
      if (version !== '2') {
        console.log('Cleaning up old local storage and PWA data...');

        // 1. Clear old localStorage keys
        // We know 'voucher_batches' was used. We also shouldn't delete 'sb-*' keys (Supabase Auth).
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

        // 3. Clear IndexedDB (we might not know the exact DB name, so this is best-effort. 
        // If there are specific DBs created by the PWA, we could delete them.
        // We can check indexedDB.databases() if supported
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

        // 5. Unregister old service workers
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
              registration.unregister();
            }
          });
        }

        localStorage.setItem('app_data_version', '2');
        console.log('Cleanup complete. App data version set to 2.');
      }
    } catch (e) {
      console.error('Failed to run storage cleaner', e);
    }
  }, []);

  return null;
}
