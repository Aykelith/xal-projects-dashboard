import { useState, useEffect, useCallback } from 'react';
import type { Project, ProjectStage } from '../types';
import { ALL_STAGES, DEFAULT_STAGES, STAGE_LABELS } from '../utils/stage';
import { getKey, decrypt } from '../lib/decryptWorker';
import ProjectCard from './ProjectCard';

interface Props {
  projects: Project[];
}

type SortKey = 'last_activity_at' | 'started_at';

const PAGE_SIZE = 10;

const ENC_META_FIELDS = ['title', 'stage', 'started_at', 'last_activity_at', 'last_task_id', 'last_post_id'] as const;

async function decryptProjectMeta(p: Project, key: CryptoKey): Promise<Project> {
  const result = { ...p };
  for (const field of ENC_META_FIELDS) {
    const env = p[`enc_${field}` as keyof Project] as { iv: string; data: string } | undefined;
    if (env) {
      const buf = await decrypt(key, env);
      (result as Record<string, unknown>)[field] = new TextDecoder().decode(buf);
    }
  }
  return result;
}

function getUrlState() {
  const p = new URLSearchParams(window.location.search);
  const sort = (p.get('sort') ?? 'last_activity_at') as SortKey;
  const rawStages = p.get('stages');
  const stages: ProjectStage[] = rawStages
    ? (rawStages.split(',').filter((s) => ALL_STAGES.includes(s as ProjectStage)) as ProjectStage[])
    : [...DEFAULT_STAGES];
  const page = Math.max(1, parseInt(p.get('page') ?? '1', 10) || 1);
  return { sort, stages, page };
}

export default function ProjectsGrid({ projects }: Props) {
  const [sort, setSort] = useState<SortKey>('last_activity_at');
  const [stages, setStages] = useState<ProjectStage[]>([...DEFAULT_STAGES]);
  const [page, setPage] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [decryptedProjects, setDecryptedProjects] = useState<Project[] | null>(null);

  const isMetaEncrypted = projects.some((p) => !!p.enc_title);
  const activeProjects = decryptedProjects ?? projects;
  const isReady = !isMetaEncrypted || !!decryptedProjects;

  async function decryptAll(key: CryptoKey) {
    const result = await Promise.all(projects.map((p) => decryptProjectMeta(p, key)));
    setDecryptedProjects(result);
  }

  useEffect(() => {
    const state = getUrlState();
    setSort(state.sort);
    setStages(state.stages);
    setPage(state.page);
    setHydrated(true);

    const key = getKey();
    if (key) decryptAll(key);

    const onUnlock = () => {
      const k = getKey();
      if (k) decryptAll(k);
    };
    window.addEventListener('decrypt:unlocked', onUnlock);
    return () => window.removeEventListener('decrypt:unlocked', onUnlock);
  }, []);

  const pushUrl = useCallback(
    (nextSort: SortKey, nextStages: ProjectStage[], nextPage: number) => {
      const p = new URLSearchParams();
      if (nextSort !== 'last_activity_at') p.set('sort', nextSort);
      const defaultSet = new Set(DEFAULT_STAGES);
      const differs =
        nextStages.length !== DEFAULT_STAGES.length ||
        nextStages.some((s) => !defaultSet.has(s));
      if (differs) p.set('stages', nextStages.join(','));
      if (nextPage > 1) p.set('page', String(nextPage));
      const qs = p.toString();
      history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
    },
    []
  );

  const handleSort = (key: SortKey) => {
    setSort(key);
    setPage(1);
    pushUrl(key, stages, 1);
  };

  const toggleStage = (stage: ProjectStage) => {
    const next = stages.includes(stage)
      ? stages.filter((s) => s !== stage)
      : [...stages, stage];
    setStages(next);
    setPage(1);
    pushUrl(sort, next, 1);
  };

  const handlePage = (p: number) => {
    setPage(p);
    pushUrl(sort, stages, p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filtered = isReady
    ? activeProjects
        .filter((p) => stages.includes(p.stage as ProjectStage))
        .sort((a, b) => (b[sort] ?? '').localeCompare(a[sort] ?? ''))
    : activeProjects;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!hydrated) {
    const preHydrated = isMetaEncrypted
      ? projects.slice(0, PAGE_SIZE)
      : projects
          .filter((p) => DEFAULT_STAGES.includes(p.stage as ProjectStage))
          .sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''))
          .slice(0, PAGE_SIZE);
    return (
      <div>
        {preHydrated.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="controls">
        <div className="controls-group">
          <span className="controls-label">Sort by</span>
          <div className="sort-buttons">
            <button
              className={`btn${sort === 'last_activity_at' ? ' active' : ''}`}
              onClick={() => handleSort('last_activity_at')}
              disabled={!isReady}
            >
              Last activity
            </button>
            <button
              className={`btn${sort === 'started_at' ? ' active' : ''}`}
              onClick={() => handleSort('started_at')}
              disabled={!isReady}
            >
              Date started
            </button>
          </div>
        </div>

        <div className="controls-group">
          <span className="controls-label">Filter by stage</span>
          <div className="stage-filters">
            {ALL_STAGES.map((stage) => (
              <button
                key={stage}
                data-stage={stage}
                className={`stage-chip${stages.includes(stage) ? ' selected' : ''}`}
                onClick={() => toggleStage(stage)}
                disabled={!isReady}
              >
                {STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {paginated.length === 0 ? (
        <div className="empty-state">
          <p>No projects match the current filter.</p>
        </div>
      ) : (
        paginated.map((p) => <ProjectCard key={p.id} project={p} />)
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => handlePage(safePage - 1)}
            disabled={safePage <= 1}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`page-btn${n === safePage ? ' active' : ''}`}
              onClick={() => handlePage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="page-btn"
            onClick={() => handlePage(safePage + 1)}
            disabled={safePage >= totalPages}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
