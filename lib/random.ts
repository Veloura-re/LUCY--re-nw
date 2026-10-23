/** Uniform random integer in [min, max] from the platform CSPRNG (Math.random is predictable). */
export function secureRandomInt(min: number, max: number): number {
    const range = max - min + 1;
    const limit = Math.floor(0x100000000 / range) * range;
    const buf = new Uint32Array(1);
    do {
        globalThis.crypto.getRandomValues(buf);
    } while (buf[0] >= limit);
    return min + (buf[0] % range);
}
