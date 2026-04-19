import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

const kvIncrementalCache = () => import("@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache").then(m => m.default);
const kvTagCache = () => import("@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache").then(m => m.default);


const config: OpenNextConfig = {
    default: {
        override: {
            wrapper: "cloudflare-node",
            converter: "edge",
            proxyExternalRequest: "fetch",
            incrementalCache: kvIncrementalCache,
            tagCache: kvTagCache,
            queue: "dummy",
        },
    },
    edgeExternals: ["node:crypto"],
    middleware: {
        external: true,
        override: {
            wrapper: "cloudflare-edge",
            converter: "edge",
            proxyExternalRequest: "fetch",
            incrementalCache: kvIncrementalCache,
            tagCache: kvTagCache,
            queue: "dummy",
        },
    },
};

export default config;
