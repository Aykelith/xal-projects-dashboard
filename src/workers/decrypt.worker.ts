/// <reference lib="webworker" />

export type {}; // required for type: 'module' worker

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

self.onmessage = async ({
  data: { id, key, iv, data },
}: MessageEvent<{ id: string; key: CryptoKey; iv: string; data: string }>) => {
  try {
    const result = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: hexToBytes(iv) },
      key,
      b64ToBytes(data),
    );
    self.postMessage({ id, result }, [result] as unknown as Transferable[]);
  } catch (e: unknown) {
    self.postMessage({ id, error: (e as Error).message });
  }
};
