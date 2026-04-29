/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: [
        {
            matcher: ({ url }) => url.pathname.startsWith("/api/media/public"),
            handler: new CacheFirst({
                cacheName: "public-media",
                plugins: [
                    new ExpirationPlugin({
                        maxEntries: 60,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                    }),
                ],
            }),
        },
        {
            matcher: ({ url }) => url.pathname.startsWith("/icons"),
            handler: new CacheFirst({
                cacheName: "icons",
                plugins: [
                    new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 }),
                ],
            }),
        },
        // defaultCache è un catch-all NetworkOnly: niente HTML/dati autenticati restano in
        // cache, evitando che pagine /portal o /clients siano servite dopo logout.
        // Quando offline interviene il fallback "/offline" (precachato).
        ...defaultCache,
    ],
    fallbacks: {
        entries: [
            {
                url: "/offline",
                matcher: ({ request }) => request.destination === "document",
            },
        ],
    },
});

serwist.addEventListeners();
