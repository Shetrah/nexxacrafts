/**
 * Projects (`public.projects`) and project tasks (`public.project_tasks`).
 */
import type { ProjectRow, ProjectTaskRow, TaskStatus } from '@/types/db';
import {
  cleanText,
  columnsOf,
  expectMaybeRow,
  expectRow,
  expectRows,
  expectUpdatedRow,
  getClient,
  isEmptyPayload,
  newestFirst,
  requireText,
  selectByIds,
  toOptionalDateOnly,
  toOptionalNumber,
} from './client';

const PROJECT_COLUMNS = columnsOf<ProjectRow>()(
  'id, order_id, customer_id, name, project_type, description, status, start_date, due_date, budget, created_at, updated_at',
);

const TASK_COLUMNS = columnsOf<ProjectTaskRow>()(
  'id, project_id, title, description, status, assigned_to, due_at, created_at, updated_at',
);

/** Project types offered by the staff portal's project form (`projects.project_type` is free text). */
export const PROJECT_TYPES: readonly string[] = ['software', 'graphic_design', 'branding', 'fabrication', 'other'];

/* -------------------------------------------------------------------------------------------------
 * Projects
 * -----------------------------------------------------------------------------------------------*/

export interface ListProjectsOptions {
  /** Maximum number of rows. Default 200. */
  limit?: number;
  /** Only projects linked to this customer. */
  customerId?: string;
}

/**
 * Projects, newest first.
 *
 * Access (RLS): super_admin, admin, developer, designer and production_manager read every project;
 * customers read projects whose `customer_id` is their own (projects created from the staff form
 * are not linked to a customer).
 */
export async function listProjects(options: ListProjectsOptions = {}): Promise<ProjectRow[]> {
  const client = getClient();
  const { limit = 200, customerId } = options;
  let builder = client.from('projects').select(PROJECT_COLUMNS);
  if (customerId) builder = builder.eq('customer_id', customerId);
  const response = await builder.order('created_at', { ascending: false }).limit(limit);
  return expectRows<ProjectRow>(response);
}

/**
 * A single project, or `null` when missing or not visible.
 *
 * Access (RLS): as {@link listProjects}.
 */
export async function getProject(id: string): Promise<ProjectRow | null> {
  const client = getClient();
  const response = await client.from('projects').select(PROJECT_COLUMNS).eq('id', id).maybeSingle();
  return expectMaybeRow<ProjectRow>(response);
}

/** Values for a new project (same fields as the staff portal's project form). */
export interface NewProject {
  name: string;
  /** Default `'software'`; see {@link PROJECT_TYPES}. */
  project_type?: string;
  description?: string | null;
  /** `YYYY-MM-DD`. */
  due_date?: string | null;
  /** KES. Form strings are converted with `Number()`; blank means no budget. */
  budget?: number | string | null;
}

/**
 * Creates a project (status `planning` by database default) and returns it.
 *
 * Access (RLS): super_admin, admin, developer, designer, production_manager.
 */
export async function createProject(input: NewProject): Promise<ProjectRow> {
  const client = getClient();
  const payload = {
    name: requireText(input.name, 'Project name'),
    project_type: cleanText(input.project_type) ?? 'software',
    description: cleanText(input.description),
    due_date: toOptionalDateOnly(input.due_date, 'Due date'),
    budget: toOptionalNumber(input.budget, 'Budget', { min: 0 }),
  };
  const response = await client.from('projects').insert(payload).select(PROJECT_COLUMNS).single();
  return expectRow<ProjectRow>(response);
}

/** Fields `updateProject` may change. Nothing else is ever sent. */
export interface ProjectPatch {
  /** Free text; see `PROJECT_STATUSES` in `@/lib/status` for the suggested values. */
  status?: string;
  /** `YYYY-MM-DD`, or `null` to clear. */
  due_date?: string | null;
  /** `YYYY-MM-DD`, or `null` to clear. */
  start_date?: string | null;
  description?: string | null;
  /** KES, or `null`/blank to clear. */
  budget?: number | string | null;
}

type ProjectUpdate = Partial<Pick<ProjectRow, 'status' | 'due_date' | 'start_date' | 'description' | 'budget'>>;

/**
 * Updates a project and returns the updated row. Throws when nothing was updated (missing project,
 * or blocked by RLS).
 *
 * Access (RLS): super_admin, admin, developer, designer, production_manager (and the linked customer).
 */
export async function updateProject(id: string, patch: ProjectPatch): Promise<ProjectRow> {
  const client = getClient();
  const payload: ProjectUpdate = {};
  if (patch.status !== undefined) payload.status = requireText(patch.status, 'Status');
  if (patch.due_date !== undefined) payload.due_date = toOptionalDateOnly(patch.due_date, 'Due date');
  if (patch.start_date !== undefined) payload.start_date = toOptionalDateOnly(patch.start_date, 'Start date');
  if (patch.description !== undefined) payload.description = cleanText(patch.description);
  if (patch.budget !== undefined) payload.budget = toOptionalNumber(patch.budget, 'Budget', { min: 0 });

  if (isEmptyPayload(payload)) {
    const current = await getProject(id);
    if (!current) throw new Error('The project could not be found.');
    return current;
  }
  const response = await client.from('projects').update(payload).eq('id', id).select(PROJECT_COLUMNS);
  return expectUpdatedRow<ProjectRow>(response);
}

/* -------------------------------------------------------------------------------------------------
 * Tasks
 * -----------------------------------------------------------------------------------------------*/

export interface ListTasksOptions {
  /** Only tasks of this project. */
  projectId?: string;
  /** Only tasks of these projects. An empty array returns no rows. */
  projectIds?: readonly string[];
  /** Only tasks assigned to this user; `null` for unassigned tasks. */
  assignedTo?: string | null;
  /** Only these statuses (an empty array means no status filter). */
  statuses?: readonly TaskStatus[];
  /** Maximum number of rows. Default 500. */
  limit?: number;
}

/**
 * Project tasks, newest first.
 *
 * Access (RLS): super_admin, admin, developer, designer, production_manager. Customers (and every
 * other role) receive no rows.
 */
export async function listTasks(options: ListTasksOptions = {}): Promise<ProjectTaskRow[]> {
  const client = getClient();
  const { projectId, projectIds, assignedTo, statuses, limit = 500 } = options;

  const query = (ids?: string[]) => {
    let builder = client.from('project_tasks').select(TASK_COLUMNS);
    if (ids) builder = builder.in('project_id', ids);
    else if (projectId) builder = builder.eq('project_id', projectId);
    if (assignedTo === null) builder = builder.is('assigned_to', null);
    else if (assignedTo) builder = builder.eq('assigned_to', assignedTo);
    if (statuses?.length) builder = builder.in('status', statuses);
    return builder.order('created_at', { ascending: false }).limit(limit);
  };

  if (projectIds) {
    const ids = projectId ? [...projectIds, projectId] : projectIds;
    const rows = await selectByIds<ProjectTaskRow>(ids, (idChunk) => query(idChunk));
    return newestFirst(rows).slice(0, limit);
  }
  return expectRows<ProjectTaskRow>(await query());
}

/**
 * A single task, or `null` when missing or not visible.
 *
 * Access (RLS): as {@link listTasks}.
 */
export async function getTask(id: string): Promise<ProjectTaskRow | null> {
  const client = getClient();
  const response = await client.from('project_tasks').select(TASK_COLUMNS).eq('id', id).maybeSingle();
  return expectMaybeRow<ProjectTaskRow>(response);
}

export interface NewTask {
  project_id: string;
  title: string;
  description?: string | null;
  /** Default `'todo'`. */
  status?: TaskStatus;
  assigned_to?: string | null;
  /** ISO timestamp. */
  due_at?: string | null;
}

/**
 * Creates a task and returns it.
 *
 * Access (RLS): super_admin, admin, developer, designer, production_manager.
 */
export async function createTask(input: NewTask): Promise<ProjectTaskRow> {
  const client = getClient();
  const payload = {
    project_id: requireText(input.project_id, 'Project'),
    title: requireText(input.title, 'Task title'),
    description: cleanText(input.description),
    status: input.status ?? ('todo' satisfies TaskStatus),
    assigned_to: input.assigned_to || null,
    due_at: input.due_at || null,
  };
  const response = await client.from('project_tasks').insert(payload).select(TASK_COLUMNS).single();
  return expectRow<ProjectTaskRow>(response);
}

/** Fields `updateTask` may change. Nothing else is ever sent. */
export interface TaskPatch {
  status?: TaskStatus;
  /** Staff user id, or `null` to unassign. */
  assigned_to?: string | null;
  /** ISO timestamp, or `null` to clear. */
  due_at?: string | null;
  title?: string;
  description?: string | null;
}

type TaskUpdate = Partial<Pick<ProjectTaskRow, 'status' | 'assigned_to' | 'due_at' | 'title' | 'description'>>;

/**
 * Updates a task and returns the updated row. Throws when nothing was updated (missing task, or
 * blocked by RLS).
 *
 * Access (RLS): super_admin, admin, developer, designer, production_manager.
 */
export async function updateTask(id: string, patch: TaskPatch): Promise<ProjectTaskRow> {
  const client = getClient();
  const payload: TaskUpdate = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.assigned_to !== undefined) payload.assigned_to = patch.assigned_to || null;
  if (patch.due_at !== undefined) payload.due_at = patch.due_at || null;
  if (patch.title !== undefined) payload.title = requireText(patch.title, 'Task title');
  if (patch.description !== undefined) payload.description = cleanText(patch.description);

  if (isEmptyPayload(payload)) {
    const current = await getTask(id);
    if (!current) throw new Error('The task could not be found.');
    return current;
  }
  const response = await client.from('project_tasks').update(payload).eq('id', id).select(TASK_COLUMNS);
  return expectUpdatedRow<ProjectTaskRow>(response);
}
