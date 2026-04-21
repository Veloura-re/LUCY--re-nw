import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

const kvIncrementalCache = () => import("@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache").then(m => m.default);

const config: OpenNextConfig = {
    default: {
        override: {
            wrapper: "cloudflare-node",
            converter: "edge",
            proxyExternalRequest: "fetch",
            incrementalCache: kvIncrementalCache,
            tagCache: "dummy",
            queue: "dummy",
        },
    },
    edgeExternals: ["node:crypto", "node:string_decoder"],
    middleware: {
        external: true,
        override: {
            wrapper: "cloudflare-edge",
            converter: "edge",
            proxyExternalRequest: "fetch",
            incrementalCache: kvIncrementalCache,
            tagCache: "dummy",
            queue: "dummy",
        },
    },
};

export default config;
