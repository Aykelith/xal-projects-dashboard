import { useState, useEffect } from 'react';
import type { Project, ProjectStage } from '../types';
import { STAGE_LABELS } from '../utils/stage';
import { formatDate, daysSince } from '../utils/date';
import { getKey, decrypt } from '../lib/decryptWorker';

interface Props {
  project: Project;
}

const LOCKED = '🔒';

export default function ProjectPageHeader({ project }: Props) {
  const [title, setTitle] = useState<string | null>(project.title);
  const [stage, setStage] = useState<string | null>(project.stage);
  const [startedAt, setStartedAt] = useState<string | null>(project.started_at);
  const [lastActivityAt, setLastActivityAt] = useState<string | null>(project.last_activity_at);

  async function decryptFields(key: CryptoKey) {
    const dec = async (env: { iv: string; data: string } | undefined) =>
      env ? new TextDecoder().decode(await decrypt(key, env)) : null;

    const [t, s, sa, la] = await Promise.all([
      dec(project.enc_title),
      dec(project.enc_stage),
      dec(project.enc_started_at),
      dec(project.enc_last_activity_at),
    ]);
    if (t !== null) setTitle(t);
    if (s !== null) setStage(s);
    if (sa !== null) setStartedAt(sa);
    if (la !== null) setLastActivityAt(la);
  }

  useEffect(() => {
    const key = getKey();
    if (key) { decryptFields(key); return; }
    const onUnlock = () => { const k = getKey(); if (k) decryptFields(k); };
    window.addEventListener('decrypt:unlocked', onUnlock);
    return () => window.removeEventListener('decrypt:unlocked', onUnlock);
  }, []);

  const isLocked = !!project.enc_title && !title;
  const stageLabel = stage ? (STAGE_LABELS[stage as ProjectStage] ?? stage) : (isLocked ? LOCKED : '');
  const effectiveStage = stage || '';

  return (
    <div className="project-page-header">
      <h1 className="project-page-title">{title ?? (isLocked ? LOCKED : project.id)}</h1>
      <div className="project-page-meta">
        <div className="meta-item">
          <span className="meta-label">Stage</span>
          <span className="stage-badge" data-stage={effectiveStage || undefined}>
            {stageLabel}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Started</span>
          <span className="meta-value">{startedAt ? formatDate(startedAt) : LOCKED}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Age</span>
          <span className="meta-value">{startedAt ? `${daysSince(startedAt)} days` : LOCKED}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Last activity</span>
          <span className="meta-value">{lastActivityAt ? formatDate(lastActivityAt) : LOCKED}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Inactive for</span>
          <span className="meta-value">{lastActivityAt ? `${daysSince(lastActivityAt)} days` : LOCKED}</span>
        </div>
      </div>
    </div>
  );
}
