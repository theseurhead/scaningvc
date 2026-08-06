import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Voucher SN QR Generator',
    short_name: 'QR Gen',
    description: 'Aplikasi internal untuk generate QR Code Serial Number Voucher Telkomsel',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#d6001c', // Telkomsel red
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
