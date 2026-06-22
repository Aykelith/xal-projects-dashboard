import { useState, useEffect } from 'react';
import { setKey, getKey } from '../../lib/decryptWorker';

interface Props {
  isEncrypted: boolean;
}

const SESSION_KEY = 'xal_dk';

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

async function importRawKey(bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}

export default function PasswordGate({ isEncrypted }: Props) {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEncrypted) return;
    const onUnlock = () => setVisible(false);
    window.addEventListener('decrypt:unlocked', onUnlock);

    if (getKey()) {
      // Key already in memory (same page context).
    } else {
      // Try to restore from sessionStorage.
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        importRawKey(b64ToBytes(stored))
          .then((key) => setKey(key))
          .catch(() => {
            sessionStorage.removeItem(SESSION_KEY);
            setVisible(true);
          });
      } else {
        setVisible(true);
      }
    }

    return () => window.removeEventListener('decrypt:unlocked', onUnlock);
  }, [isEncrypted]);

  if (!visible) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const config = await fetch('/enc/config.json').then((r) => r.json());
      const rawKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
      );
      // ponytail: extractable:true so we can export to sessionStorage below
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: hexToBytes(config.salt),
          iterations: 300_000,
          hash: 'SHA-256',
        },
        rawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['decrypt'],
      );
      // Validate password using check value before committing the key.
      if (config.check) {
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: hexToBytes(config.check.iv) },
          key,
          b64ToBytes(config.check.data),
        );
      }
      // Export raw key bytes to sessionStorage (cleared on tab close).
      const exported = await crypto.subtle.exportKey('raw', key);
      sessionStorage.setItem(SESSION_KEY, btoa(String.fromCharCode(...new Uint8Array(exported))));
      // Re-import as non-extractable for the in-memory key.
      const nonExtractable = await importRawKey(new Uint8Array(exported));
      setKey(nonExtractable);
      setVisible(false);
    } catch {
      setError('Wrong password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="password-overlay">
      <form className="password-form" onSubmit={handleSubmit}>
        <h2 className="password-title">Content encrypted</h2>
        <input
          type="password"
          className="password-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          disabled={loading}
        />
        {error && <p className="password-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading || !password}>
          {loading ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
