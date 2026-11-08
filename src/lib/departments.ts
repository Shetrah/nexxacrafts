/**
 * Production departments. Data only (no icons) so it can be shared by any screen.
 *
 * The service → department mapping mirrors the database trigger
 * `create_production_job_for_order_item()`, which creates one production job per order line.
 */
import { humanize } from '@/lib/format';
import type { Department } from '@/types/db';

export interface DepartmentInfo {
  id: Department;
  label: string;
  description: string;
  /** Catalogue services whose order lines are routed to this department. */
  serviceSlugs: string[];
}

/** Departments in `production_jobs.department` CHECK order. */
export const DEPARTMENTS: readonly DepartmentInfo[] = [
  {
    id: 'design',
    label: 'Design',
    description: 'Graphic design, branding and artwork preparation.',
    serviceSlugs: ['graphic-design'],
  },
  {
    id: 'printing',
    label: 'Printing',
    description: 'Banner, large-format, sticker and label printing.',
    serviceSlugs: ['banner-printing', 'sticker-printing'],
  },
  {
    id: 'mug_branding',
    label: 'Mug branding',
    description: 'Mug and merchandise branding.',
    serviceSlugs: ['mug-branding'],
  },
  {
    id: 'laser',
    label: 'Laser',
    description: 'Laser cutting and engraving.',
    serviceSlugs: ['laser-cutting'],
  },
  {
    id: 'software',
    label: 'Software',
    description: 'Website and software development.',
    serviceSlugs: ['website-software'],
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    description: 'Packing, collection and delivery. Also receives lines for services without their own department.',
    serviceSlugs: [],
  },
];

/** Department ids in display order. */
export const DEPARTMENT_IDS: readonly Department[] = DEPARTMENTS.map((department) => department.id);

/** Details for a department id, or `undefined` when unknown. */
export function getDepartment(id: string | null | undefined): DepartmentInfo | undefined {
  return DEPARTMENTS.find((department) => department.id === id);
}

/** Display label for a department id, e.g. `'mug_branding'` → `'Mug branding'`. */
export function departmentLabel(id: string | null | undefined): string {
  return getDepartment(id)?.label ?? humanize(id);
}

/**
 * Department that receives production jobs for a service — same rules as the database trigger
 * (unknown services go to `dispatch`).
 */
export function departmentForService(slug: string | null | undefined): Department {
  return DEPARTMENTS.find((department) => slug && department.serviceSlugs.includes(slug))?.id ?? 'dispatch';
}
