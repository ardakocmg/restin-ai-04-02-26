/**
 * registerServiceWorker - PWA Service Worker Registration
 * 
 * Enables offline-first capabilities via service worker
 */

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);

          // Listen for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;

            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('🔄 New service worker available - refresh to update');

                    // Optionally notify user
                    if (window.confirm('New version available. Refresh now?')) {
                      window.location.reload();
                    }
                  } else {
                    console.log('✅ Content cached for offline use');
                  }
                }
              };
            }
          };

          // Register for background sync (optional feature)
          if ('sync' in registration) {
            navigator.serviceWorker.ready.then((activeRegistration) => {
              activeRegistration.sync.register('sync-offline-queue').catch(err => {
                console.warn('Background Sync registration failed (not critical):', err.message);
              });
            }).catch(error => {
              console.warn('Background Sync not available (not critical):', error.message);
            });
          }
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'TRIGGER_SYNC') {
          console.log('🔄 Sync triggered by service worker');
          // Trigger sync via event
          window.dispatchEvent(new CustomEvent('sw-sync-trigger'));
        }
      });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error('❌ Service Worker unregister failed:', error);
      });
  }
}
