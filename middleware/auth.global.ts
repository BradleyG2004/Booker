export default defineNuxtRouteMiddleware((to) => {
  if (process.client) {
    const token = localStorage.getItem('token')

    if (token && (to.path === '/login' || to.path === '/register')) {
      window.location.href='/'
    }

    if (!token && to.path !== '/login' && to.path !== '/register') {
      window.location.href='/login'
    }
  }
})
