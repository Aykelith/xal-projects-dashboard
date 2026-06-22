import { useState, useEffect } from 'react';
import { getKey, decrypt, type Envelope } from '../../lib/decryptWorker';

interface Props {
  envelope: Envelope;
  // ponytail: 'text' renders as <pre> (raw markdown); switch type to 'html' for pre-rendered HTML
  type?: 'html' | 'text';
  className?: string;
}

export default function EncryptedContent({ envelope, type = 'html', className }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function tryDecrypt(key: CryptoKey) {
    try {
      const buf = await decrypt(key, envelope);
      const text = new TextDecoder().decode(buf);
      console.log('[EncryptedContent] decrypted', buf.byteLength, 'bytes, text len:', text.length, 'iv:', envelope.iv);
      setContent(text);
    } catch (e) {
      console.error('[EncryptedContent] decrypt error:', e);
      setError(true);
    }
  }

  useEffect(() => {
    const key = getKey();
    if (key) {
      tryDecrypt(key);
      return;
    }
    const onUnlock = () => {
      const k = getKey();
      if (k) tryDecrypt(k);
    };
    window.addEventListener('decrypt:unlocked', onUnlock);
    return () => window.removeEventListener('decrypt:unlocked', onUnlock);
  }, []);

  if (error) {
    return <p style={{ color: 'var(--stage-abandoned)', fontSize: '0.875rem' }}>Decryption failed.</p>;
  }
  if (content === null) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>🔒 Encrypted — enter password to view.</p>;
  }
  if (type === 'html') {
    return <div className={className} dangerouslySetInnerHTML={{ __html: content }} />;
  }
  return <pre className={`encrypted-markdown${className ? ` ${className}` : ''}`}>{content}</pre>;
}
