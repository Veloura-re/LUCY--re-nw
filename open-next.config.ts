import type { OpenNextConfig } from "@opennextjs/aws/types/open-next.js";

<<<<<<< HEAD
=======
const kvIncrementalCache = () => import("@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache").then(m => m.default);



>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
const config: OpenNextConfig = {
    default: {
        override: {
            wrapper: "cloudflare-node",
            converter: "edge",
            proxyExternalRequest: "fetch",
<<<<<<< HEAD
            incrementalCache: "dummy",
=======
            incrementalCache: kvIncrementalCache,
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
            tagCache: "dummy",
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
<<<<<<< HEAD
            incrementalCache: "dummy",
=======
            incrementalCache: kvIncrementalCache,
>>>>>>> dd98834c9a006342647ee3b70627d513ddc6e533
            tagCache: "dummy",
            queue: "dummy",
        },
    },
};

export default config;
