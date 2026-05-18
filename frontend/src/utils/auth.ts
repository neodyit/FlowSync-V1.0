export const clearLocalData = () => {
  // Clear localStorage
  localStorage.clear();
  
  // Clear all cookies
  const cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  }

  // Clear cache
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    });
  }
};

export const clearAuthAndRefresh = () => {
  clearLocalData();
  window.location.href = '/login';
};

export const checkSession = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL;
    const response = await fetch(`${apiUrl}/validate.php`, {
      credentials: 'include'
    });
    
    if (response.status === 401) {
      clearAuthAndRefresh();
      return null;
    }
    
    if (!response.ok) {
      console.warn('Session check failed with status:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (data.status === 'error') {
      clearAuthAndRefresh();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Session validation connection error', error);
    return null;
  }
};
