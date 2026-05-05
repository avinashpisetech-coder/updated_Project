import { differenceInHours, isPast } from "date-fns";

export type SLAStatus = 'HEALTHY' | 'WARNING' | 'BREACHED' | 'NOT_APPLICABLE';

export interface SLAMetadata {
  status: SLAStatus;
  label: string;
  color: string;
  hoursRemaining: number | null;
}

/**
 * Calculates the SLA status based on the due date.
 * @param dueDate The SLA due date from the database
 * @returns SLAMetadata object with status and visual properties
 */
export function calculateSLAStatus(dueDate: string | Date | null | undefined): SLAMetadata {
  if (!dueDate) {
    return {
      status: 'NOT_APPLICABLE',
      label: 'NO_SLA',
      color: 'bg-slate-100 text-slate-400',
      hoursRemaining: null
    };
  }

  const target = new Date(dueDate);
  const now = new Date();

  if (isPast(target)) {
    return {
      status: 'BREACHED',
      label: 'SLA_BREACHED',
      color: 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]',
      hoursRemaining: Math.abs(differenceInHours(now, target))
    };
  }

  const hoursDiff = differenceInHours(target, now);

  if (hoursDiff <= 4) {
    return {
      status: 'WARNING',
      label: 'CRITICAL_WINDOW',
      color: 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]',
      hoursRemaining: hoursDiff
    };
  }

  return {
    status: 'HEALTHY',
    label: 'ON_TRACK',
    color: 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]',
    hoursRemaining: hoursDiff
  };
}
