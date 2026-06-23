import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { getKey, clearKey, decrypt, type Envelope } from '../../lib/decryptWorker';

interface Props {
  envelope: Envelope;
  type?: 'html' | 'text' | 'markdown';
  className?: string;
}

export default function EncryptedContent({ envelope, type = 'html', className }: Props) {
  const [content, setContent] = useState<string | null>(null);

  async function tryDecrypt(key: CryptoKey) {
    try {
      const buf = await decrypt(key, envelope);
      const text = new TextDecoder().decode(buf);
      console.log('[EncryptedContent] decrypted', buf.byteLength, 'bytes, text len:', text.length, 'iv:', envelope.iv);
      setContent(text);
    } catch (e) {
      console.error('[EncryptedContent] decrypt error:', e);
      clearKey();
    }
  }

  useEffect(() => {
    const onUnlock = () => {
      const k = getKey();
      if (k) tryDecrypt(k);
    };
    window.addEventListener('decrypt:unlocked', onUnlock);
    const key = getKey();
    if (key) tryDecrypt(key);
    return () => window.removeEventListener('decrypt:unlocked', onUnlock);
  }, []);
  if (content === null) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>🔒 Encrypted — enter password to view.</p>;
  }
  if (type === 'html') {
    return <div className={className} dangerouslySetInnerHTML={{ __html: content }} />;
  }
  if (type === 'markdown') {
    return <div className={className} dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />;
  }
  return <pre className={`encrypted-markdown${className ? ` ${className}` : ''}`}>{content}</pre>;
}
