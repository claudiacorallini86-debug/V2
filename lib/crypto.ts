/**
 * SHA-256 implementation using Browser Crypto API with a fallback.
 */
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  
  // Use Browser Crypto API if available (PWA / Web)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for environments without SubtleCrypto (should rarely happen in PWA)
  // Simple but correct bitwise SHA-256 would be needed here, 
  // but for a PWA, SubtleCrypto is standard.
  // Re-using the manual implementation logic but ensuring unsigned 32-bit.
  return hashManual(data);
}

function hashManual(m: Uint8Array) {
  const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z);
  const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const sigma0 = (x: number) => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
  const sigma1 = (x: number) => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
  const gamma0 = (x: number) => rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
  const gamma1 = (x: number) => rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const l = m.length;
  const padding = new Uint8Array(((l + 8) >> 6) + 1 << 6);
  padding.set(m);
  padding[l] = 0x80;
  const view = new DataView(padding.buffer);
  view.setBigUint64(padding.length - 8, BigInt(l * 8));

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
      h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  for (let i = 0; i < padding.length; i += 64) {
    const w = new Uint32Array(64);
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4);
    for (let j = 16; j < 64; j++) {
      const s0 = gamma0(w[j - 15]);
      const s1 = gamma1(w[j - 2]);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = [h0, h1, h2, h3, h4, h5, h6, h7];
    for (let j = 0; j < 64; j++) {
      const s1 = sigma1(e);
      const t1 = (h + s1 + ch(e, f, g) + K[j] + w[j]) >>> 0;
      const s0 = sigma0(a);
      const t2 = (s0 + maj(a, b, c)) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map(n => n.toString(16).padStart(8, '0')).join('');
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hashStr;
}

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
