export interface EncEnvelope {
  iv: string;
  data: string;
}

export type ProjectStage =
  | 'idea'
  | 'planning'
  | 'in_progress'
  | 'in_production'
  | 'done'
  | 'abandoned';

export interface Project {
  id: string;
  title: string | null;
  stage: ProjectStage | null;
  started_at: string | null;
  last_activity_at: string | null;
  last_task_id: string | null;
  last_post_id: string | null;
  home_description: string | null;
  enc_home_description?: EncEnvelope;
  enc_title?: EncEnvelope;
  enc_stage?: EncEnvelope;
  enc_started_at?: EncEnvelope;
  enc_last_activity_at?: EncEnvelope;
  enc_last_task_id?: EncEnvelope;
  enc_last_post_id?: EncEnvelope;
}

export interface PostData {
  id: string;
  title: string;
  project_id: string;
  project_title: string;
  published_at: string;
  updated_at?: string;
  tags: string[];
  slug: string;
  excerpt: string;
  effective_date: string;
}

export interface TaskData {
  id: string;
  stage: 'planned' | 'started' | 'done';
  started_at: string;
  last_activity_at: string;
  body: string;
}
