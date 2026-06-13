export const clearLocalData = () => {
  // Clear localStorage
  try {
    localStorage.clear();
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
  }
  
  // Clear sessionStorage
  try {
    sessionStorage.clear();
  } catch (e) {
    console.error('Failed to clear sessionStorage:', e);
  }
  
  // Clear all cookies
  try {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      
      // Clear cookie with standard path
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      // Clear cookie with current hostname domain
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
      // Clear for other common paths
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/FlowSync";
      document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/FlowSync/backend";
    }
  } catch (e) {
    console.error('Failed to clear cookies:', e);
  }

  // Clear cache storage
  if ('caches' in window) {
    try {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    } catch (e) {
      console.error('Failed to clear caches:', e);
    }
  }

  // Unregister service workers to completely disable background proxy caching
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    } catch (e) {
      console.error('Failed to unregister service workers:', e);
    }
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
      // If server returns a 5xx error or temporary failure, try to fall back to cached session
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser);
          return {
            status: 'success',
            isOffline: true,
            user,
            session: {
              user_id: user.id,
              email: user.email,
              role: user.role,
              role_id: user.role_id,
              college_id: user.college_id
            }
          };
        } catch (e) {}
      }
      return null;
    }
    
    const data = await response.json();
    if (data.status === 'error') {
      clearAuthAndRefresh();
      return null;
    }
    
    if (data.status === 'maintenance') {
      data.session.maintenance = true;
    }
    
    return data;
  } catch (error) {
    console.error('Session validation connection error', error);
    // If network is offline or server is unreachable, fall back to cached user session
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        const user = JSON.parse(cachedUser);
        return {
          status: 'success',
          isOffline: true,
          user,
          session: {
            user_id: user.id,
            email: user.email,
            role: user.role,
            role_id: user.role_id,
            college_id: user.college_id
          }
        };
      } catch (e) {}
    }
    return null;
  }
};
