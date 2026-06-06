import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  
  let hasTime = false;
  if (typeof dateInput === 'string') {
    hasTime = dateInput.includes(':');
  } else if (dateInput instanceof Date) {
    hasTime = dateInput.getHours() !== 0 || dateInput.getMinutes() !== 0;
  }
  
  const date = dateInput instanceof Date ? dateInput : new Date(typeof dateInput === 'string' ? dateInput.replace(' ', 'T') : dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  if (hasTime) {
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formattedHours = String(hours).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} · ${formattedHours}:${minutes} ${ampm}`;
  }
  
  return `${day}/${month}/${year}`;
}

export function getDownloadUrl(filePath: string): string {
  if (!filePath) return '#';
  const apiUrl = import.meta.env.VITE_API_URL;
  return `${apiUrl}/download.php?file=${encodeURIComponent(filePath)}`;
}

export function calculateProgress(status: string, currentProgress: number = 0): number {
  switch (status) {
    case 'Assigned': return 0;
    case 'Accepted':
    case 'In Progress': return 10;
    case 'Submitted': return 98;
    case 'Approved':
    case 'Completed': return 100;
    case 'Rework Required': return 40;
    case 'Rejected': return currentProgress;
    default: return currentProgress;
  }
}

export function getDeadlineStatus(deadline: string | null | undefined): { text: string, isPassed: boolean, isValid: boolean } {
  if (!deadline) return { text: 'No deadline', isPassed: false, isValid: false };
  const d = typeof deadline === 'string' ? new Date(deadline.replace(' ', 'T')) : new Date(deadline);
  if (isNaN(d.getTime())) return { text: 'Invalid Date', isPassed: false, isValid: false };

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const isPassed = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  let timeString = '';
  if (days > 0) {
    timeString = `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    timeString = `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    timeString = `${minutes} min${minutes > 1 ? 's' : ''}`;
  } else {
    timeString = 'less than a minute';
  }

  if (isPassed) {
    return { text: `Passed by ${timeString}`, isPassed: true, isValid: true };
  } else {
    return { text: `${timeString} remaining`, isPassed: false, isValid: true };
  }
}
