import { useState } from 'react';
import type { Project } from '../types';
import { STAGE_LABELS } from '../utils/stage';
import { formatDate, daysSince } from '../utils/date';
import EncryptedContent from './encryption/EncryptedContent';
import EncryptedImage from './encryption/EncryptedImage';

interface Props {
  project: Project;
}

const LOCKED = '🔒';

export default function ProjectCard({ project }: Props) {
  const [imgError, setImgError] = useState(false);
  const isImgEncrypted = !!project.enc_home_description;
  const isMetaLocked = !!project.enc_title && !project.title;

  const title = project.title || (isMetaLocked ? LOCKED : '');
  const stage = (project.stage as string) || '';
  const stageLabel = STAGE_LABELS[project.stage!] ?? LOCKED;
  const startedAt = project.started_at;
  const lastActivityAt = project.last_activity_at;

  return (
    <article className="project-card">
      <div className="project-card-image">
        {isImgEncrypted ? (
          <EncryptedImage
            encSrc={`/photos/home_page/${project.id}.enc`}
            alt=""
            decryptOnLoad
          />
        ) : imgError ? (
          <div className="img-placeholder">&#128193;</div>
        ) : (
          <img
            src={`/photos/home_page/${project.id}.jpg`}
            alt=""
            onError={() => setImgError(true)}
          />
        )}
      </div>

      <div className="project-card-body">
        <div className="project-card-header">
          <h2 className="project-card-title">{title}</h2>
          <span className="stage-badge" data-stage={stage || undefined}>
            {stageLabel}
          </span>
        </div>

        <div className="project-card-meta">
          <div className="meta-item">
            <span className="meta-label">Started</span>
            <span className="meta-value">{startedAt ? formatDate(startedAt) : LOCKED}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Age</span>
            <span className="meta-value">{startedAt ? `${daysSince(startedAt)} days` : LOCKED}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Last update</span>
            <span className="meta-value">{lastActivityAt ? formatDate(lastActivityAt) : LOCKED}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Inactive</span>
            <span className="meta-value">{lastActivityAt ? `${daysSince(lastActivityAt)} days` : LOCKED}</span>
          </div>
        </div>

        {isImgEncrypted ? (
          <EncryptedContent
            envelope={project.enc_home_description!}
            type="html"
            className="project-card-description"
          />
        ) : project.home_description ? (
          <div
            className="project-card-description"
            dangerouslySetInnerHTML={{ __html: project.home_description }}
          />
        ) : null}

        <div className="project-card-footer">
          <a href={`/projects/${project.id}`} className="btn-primary">
            View project
          </a>
        </div>
      </div>
    </article>
  );
}
