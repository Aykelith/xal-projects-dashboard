import { useState, useEffect, useCallback, useRef } from 'react';
import { getKey, decrypt, type Envelope } from '../../lib/decryptWorker';

interface Props {
  encSrc: string;
  alt: string;
  className?: string;
  // true = auto-decrypt when key available (covers, thumbnails)
  // false = show "Decrypt" button; also decrypts on decrypt:all event
  decryptOnLoad?: boolean;
}

export default function EncryptedImage({ encSrc, alt, className, decryptOnLoad = false }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const blobRef = useRef<string | null>(null);

  const doDecrypt = useCallback(async () => {
    if (started.current) return;
    const key = getKey();
    console.log('[EncryptedImage] doDecrypt called, key:', !!key, 'encSrc:', encSrc);
    if (!key) return;
    started.current = true;
    setDecrypting(true);
    try {
      const res = await fetch(encSrc);
      console.log('[EncryptedImage] fetch', encSrc, 'status:', res.status);
      if (!res.ok) throw new Error('fetch failed');
      const envelope: Envelope = await res.json();
      const buf = await decrypt(key, envelope);
      console.log('[EncryptedImage] decrypted', buf.byteLength, 'bytes');
      const url = URL.createObjectURL(new Blob([buf], { type: 'image/jpeg' }));
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = url;
      setBlobUrl(url);
    } catch (e) {
      console.error('[EncryptedImage] decrypt failed:', e);
      started.current = false;
      setFailed(true);
    } finally {
      setDecrypting(false);
    }
  }, [encSrc]);

  useEffect(() => {
    if (decryptOnLoad) {
      const k = getKey();
      console.log('[EncryptedImage] useEffect, key:', !!k, 'encSrc:', encSrc);
      if (k) { doDecrypt(); return; }
      const onUnlock = () => {
        console.log('[EncryptedImage] onUnlock fired, encSrc:', encSrc);
        doDecrypt();
      };
      window.addEventListener('decrypt:unlocked', onUnlock);
      console.log('[EncryptedImage] registered decrypt:unlocked listener for', encSrc);
      return () => window.removeEventListener('decrypt:unlocked', onUnlock);
    } else {
      const onAll = () => doDecrypt();
      window.addEventListener('decrypt:all', onAll);
      return () => window.removeEventListener('decrypt:all', onAll);
    }
  }, [decryptOnLoad, doDecrypt]);

  useEffect(() => {
    return () => { if (blobRef.current) URL.revokeObjectURL(blobRef.current); };
  }, []);

  const placeholderClass = `img-placeholder${className ? ` ${className}` : ''}`;

  if (blobUrl) {
    return <img src={blobUrl} alt={alt} className={className} />;
  }
  if (failed) {
    return <div className={placeholderClass}>&#128193;</div>;
  }
  if (decrypting) {
    return <div className={placeholderClass} style={{ opacity: 0.5 }}>⏳</div>;
  }
  if (!decryptOnLoad) {
    return (
      <div className={placeholderClass}>
        <button className="btn decrypt-img-btn" onClick={doDecrypt} disabled={!getKey()}>
          🔒 Decrypt
        </button>
      </div>
    );
  }
  return <div className={placeholderClass}>🔒</div>;
}
