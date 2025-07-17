// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()],
  },
  css: ["./assets/app.css"],
  app: {
    head: {
      meta: [
        { name: 'google-signin-client_id', content: '838493994247-k6lv58esjcq4gbeai625vj29j7ip90u3.apps.googleusercontent.com' }
      ],
      script: [
        { src: 'https://apis.google.com/js/platform.js', async: true, defer: true }
      ]
    }
  }
});
