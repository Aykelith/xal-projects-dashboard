import type { ProjectStage } from '../types';

export const STAGE_LABELS: Record<ProjectStage, string> = {
  idea: 'Idea',
  planning: 'Planning',
  in_progress: 'In Progress',
  in_production: 'In Production',
  done: 'Done',
  on_hold: 'On Hold',
  abandoned: 'Abandoned',
};

export const ALL_STAGES: ProjectStage[] = [
  'idea',
  'planning',
  'in_progress',
  'in_production',
  'done',
  'on_hold',
  'abandoned',
];

export const DEFAULT_STAGES: ProjectStage[] = ALL_STAGES.filter(
  (s) => s !== 'abandoned' && s !== 'on_hold'
);
