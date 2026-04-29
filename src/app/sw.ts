/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, CacheFirst, ExpirationPlugin, StaleWhileRevalidate } from "serwist";

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
        {
            matcher: ({ request }) => request.destination === "document",
            handler: new StaleWhileRevalidate({ cacheName: "html-pages" }),
        },
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
