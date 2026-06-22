/**
 * Pre-build script: generates derived fields in task frontmatter and project JSON files.
 *
 * Run with: node scripts/generate-fields.mjs
 */

import matter from 'gray-matter';
import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from 'fs';
import { join, resolve, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function walkDir(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full));
    else results.push(full);
  }
  return results;
}

function updateTaskFiles() {
  const tasksDir = join(ROOT, 'data', 'content', 'tasks');
  const files = walkDir(tasksDir).filter((f) => f.endsWith('.md'));
  for (const filePath of files) {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    const mtime = statSync(filePath).mtime.toISOString();
    if (parsed.data.last_activity_at !== mtime) {
      parsed.data.last_activity_at = mtime;
      writeFileSync(filePath, matter.stringify(parsed.content, parsed.data));
      console.log(`  updated task last_activity_at: ${filePath}`);
    }
  }
  return files;
}

function getPostActivity(postPath) {
  const raw = readFileSync(postPath, 'utf-8');
  const parsed = matter(raw);
  return parsed.data.updated_at ?? parsed.data.published_at ?? null;
}

function getTaskActivity(taskPath) {
  const raw = readFileSync(taskPath, 'utf-8');
  const parsed = matter(raw);
  return parsed.data.last_activity_at ?? null;
}

function getLastUlid(dir) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => /\.md$/.test(f))
    .sort();
  if (!files.length) return null;
  return basename(files[files.length - 1], extname(files[files.length - 1]));
}

function updateProjectFiles() {
  const projectsDir = join(ROOT, 'data', 'projects');
  const tasksBase = join(ROOT, 'data', 'content', 'tasks');
  const postsBase = join(ROOT, 'data', 'content', 'posts');

  if (!existsSync(projectsDir)) return;
  const jsonFiles = readdirSync(projectsDir).filter((f) => f.endsWith('.json'));

  for (const jsonFile of jsonFiles) {
    const filePath = join(projectsDir, jsonFile);
    const project = JSON.parse(readFileSync(filePath, 'utf-8'));

    const projectTasksDir = join(tasksBase, project.id);
    const projectPostsDir = join(postsBase, project.id);

    const taskFiles = existsSync(projectTasksDir)
      ? readdirSync(projectTasksDir)
          .filter((f) => /\.md$/.test(f))
          .sort()
          .map((f) => join(projectTasksDir, f))
      : [];

    const postFiles = existsSync(projectPostsDir)
      ? readdirSync(projectPostsDir)
          .filter((f) => /\.md$/.test(f))
          .sort()
          .map((f) => join(projectPostsDir, f))
      : [];

    const taskDates = taskFiles.map(getTaskActivity).filter(Boolean);
    const postDates = postFiles.map(getPostActivity).filter(Boolean);
    const allDates = [...taskDates, ...postDates, project.started_at].filter(Boolean);

    const lastActivityAt = allDates.sort().reverse()[0];
    const lastTaskId = getLastUlid(projectTasksDir);
    const lastPostId = getLastUlid(projectPostsDir);

    const updated = {
      ...project,
      last_activity_at: lastActivityAt,
      last_task_id: lastTaskId,
      last_post_id: lastPostId,
    };

    if (JSON.stringify(project) !== JSON.stringify(updated)) {
      writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
      console.log(`  updated project: ${project.id}`);
    }
  }
}

console.log('Generating fields…');
updateTaskFiles();
updateProjectFiles();
console.log('Done.');
