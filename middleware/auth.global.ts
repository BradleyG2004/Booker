export default defineNuxtRouteMiddleware((to) => {
    if (process.client) {
      const token = localStorage.getItem('token')
  
      // Si l'utilisateur est connecté, on empêche l'accès à /login et /register
      if (token && (to.path === '/login' || to.path === '/register')) {
        return navigateTo('/')
      }
  
      // Si l'utilisateur n'est pas connecté, on bloque toutes les autres pages sauf /login et /register
      if (!token && to.path !== '/login' && to.path !== '/register') {
        return navigateTo('/login')
      }
    }
  })
  