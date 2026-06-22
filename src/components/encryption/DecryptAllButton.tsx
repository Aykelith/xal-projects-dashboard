import { useState, useEffect } from 'react';
import { getKey, triggerDecryptAll } from '../../lib/decryptWorker';

export default function DecryptAllButton() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (getKey()) { setUnlocked(true); return; }
    const onUnlock = () => setUnlocked(true);
    window.addEventListener('decrypt:unlocked', onUnlock);
    return () => window.removeEventListener('decrypt:unlocked', onUnlock);
  }, []);

  if (!unlocked) return null;
  return (
    <button className="btn" onClick={triggerDecryptAll} style={{ marginBottom: '1rem' }}>
      Decrypt all images
    </button>
  );
}
