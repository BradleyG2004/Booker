export default defineNuxtRouteMiddleware((to) => {
  if (process.client) {
    const token = localStorage.getItem('token')

    // Fonction pour vérifier l'expiration d'un JWT
    function isTokenExpired(token) {
      if (!token) return true;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
      } catch (e) {
        return true;
      }
    }

    if (token && isTokenExpired(token)) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return;
    }

    if (token && (to.path === '/login' || to.path === '/register')) {
      window.location.href = '/';
    }

    if (!token && to.path !== '/login' && to.path !== '/register'&& to.path !== '/book') {
      window.location.href = '/login';
    }
  }
})
