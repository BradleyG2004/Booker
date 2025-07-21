<template>
    <div class="min-h-screen flex items-center justify-center bg-base-200" style="background-color:#f9f6ed;">
        <div class="bg-base-100 rounded-2xl shadow-xl flex w-full max-w-4xl overflow-hidden">
            <!-- Formulaire -->
            <div class="w-full md:w-3/4 py-4 px-7 flex flex-col justify-center" style="font-family: 'Courier New', Courier, monospace;">
                <h1 class="text-3xl font-bold mb-2 text-center booker-title" style="color: #F9F6ED;">Booker</h1>
                <hr class="w-1/2 mx-auto mb-4" style="color:#fc789f" />
                <h2 class="text-2xl font-bold mb-2">Register</h2>
                <form @submit="onSubmit">
                    <div class="mb-4">
                        <label class="label">
                            <span class="label-text">Email</span>
                        </label>
                        <input v-model="email" type="text" placeholder="mike142@yourmail.com" class="input input-bordered w-full" />
                    </div>
                    <div class="mb-2">
                        <label class="label">
                            <span class="label-text">Username</span>
                        </label>
                        <input v-model="username" type="text" placeholder="Johnson Doe" class="input input-bordered w-full" />
                    </div>
                    <div class="mb-2">
                        <label class="label">
                            <span class="label-text">Password</span>
                        </label>
                        <div class="relative">
                            <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="********"
                                class="input input-bordered w-full pr-10" />
                            <button type="button" @click="showPassword = !showPassword"
                                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" class="w-5 h-5">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.383A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.973 9.973 0 01-4.043 5.306M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M3 3l18 18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center mb-4" style="visibility: hidden;">
                        <input type="checkbox" class="checkbox checkbox-sm mr-2" />
                        <span class="text-sm">Remember me</span>
                    </div>
                    <button class="btn btn-primary w-full mb-2" type="submit">Sign up</button>
                    <p class="mb-6 text-sm" style="justify-self: center;">
                        or <NuxtLink to="/login" style="color:#422AD5;font-weight: bold;">login</NuxtLink>
                    </p>
                </form>
            </div>
            <!-- Illustration -->
            <div class="hidden md:flex w-1/2 bg-base-200 items-center justify-center">
                <img src="../assets/image.png" alt="logo" class="w-full h-full object-cover">
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRuntimeConfig, navigateTo } from '#imports'

onMounted(() => {
  if (process.client && localStorage.getItem('token')) {
    window.location.href = '/' // reload propre via location.href
  }
})

const showPassword = ref(false)
const password = ref('')
const email = ref('')
const username = ref('')

const config = useRuntimeConfig()
const toast = useToast()

const onSubmit = async (e) => {
  e.preventDefault()
  try {
    const response = await $fetch(`${config.public.API_BASE_URL}/users/register`, {
      method: 'POST',
      body: {
        email: email.value,
        username: username.value,
        password: password.value
      }
    })
    toast.add({
      title: 'Inscription réussie !',
      color: 'primary'
    })
    navigateTo('/login')
  } catch (error) {
    toast.add({
      title: 'Erreur lors de l\'inscription',
      color: 'error'
    })
  }
}
</script>