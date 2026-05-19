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
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
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
    case 'Accepted': return Math.max(currentProgress, 25);
    case 'In Progress': return Math.max(currentProgress, 50);
    case 'Submitted': return 100;
    case 'Approved':
    case 'Completed': return 100;
    case 'Rework Required': return 40;
    case 'Rejected': return currentProgress;
    default: return currentProgress;
  }
}
