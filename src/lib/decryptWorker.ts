// Shared key store and worker singleton — module-level state persists across all islands on a page.

export interface Envelope {
  iv: string;
  data: string;
}

let _key: CryptoKey | null = null;
let _worker: Worker | null = null;
let _id = 0;
const _pending = new Map<string, { resolve: (r: ArrayBuffer) => void; reject: (e: Error) => void }>();

export function getKey(): CryptoKey | null {
  return _key;
}

export function setKey(key: CryptoKey): void {
  _key = key;
  window.dispatchEvent(new CustomEvent('decrypt:unlocked'));
}

export function triggerDecryptAll(): void {
  window.dispatchEvent(new CustomEvent('decrypt:all'));
}

function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL('../workers/decrypt.worker.ts', import.meta.url), { type: 'module' });
    _worker.onmessage = ({ data: { id, result, error } }: MessageEvent) => {
      const p = _pending.get(id);
      if (!p) return;
      _pending.delete(id);
      if (error) p.reject(new Error(error));
      else p.resolve(result as ArrayBuffer);
    };
  }
  return _worker;
}

export function decrypt(key: CryptoKey, envelope: Envelope): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const id = String(_id++);
    _pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, key, iv: envelope.iv, data: envelope.data });
  });
}
