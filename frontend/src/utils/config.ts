/**
 * Configuration utilities for the application.
 */

export const getAppName = (): string => {
  return localStorage.getItem('app_name') || 'NeoSync';
};

export const setAppName = (name: string): void => {
  localStorage.setItem('app_name', name);
};
