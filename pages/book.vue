<template>
    <div class="min-h-screen bg-gray-50 flex flex-col items-center py-8"
        style="font-family: 'Courier New', Courier, monospace;background-color: #F9F6ED;">
        <div class="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8">
            <h1 class="text-3xl font-bold mb-2 text-center booker-title" style="color: #F9F6ED;">Booker</h1>
            <hr class="w-1/2 mx-auto mb-4" style="color:#fc789f" />
            <!-- Tabs -->
            <center>
                Consultez les Creneaux disponibles
            </center>
            <!-- Bookings List -->
            <div v-for="(group, groupIndex) in groupedBookings" :key="groupIndex" class="mb-8">
                <div v-if="group.label" class="text-xs text-gray-400 font-bold uppercase mb-2">{{ group.label }}</div>
                <div v-for="(booking, i) in group.items" :key="i"
                    class="bg-white rounded-xl border border-gray-100 shadow-2xl flex items-center px-4 py-3 mb-3 relative"
                    style="border-color: black;">
                    <!-- Date -->
                    <div class="flex flex-col items-center w-14 mr-4">
                        <span class="text-xs text-orange-500 font-bold">{{ booking.dayShort }}</span>
                        <span class="text-lg font-bold text-orange-500">{{ booking.dayNum }}</span>
                    </div>
                    <!-- Infos -->
                    <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-1">
                            <span class="text-sm font-semibold">{{ booking.time }}</span>
                        </div>
                        <div class="text-sm font-medium">{{ booking.title }}</div>
                        <div class="flex items-center text-xs text-gray-400 mt-1">
                            <span class="mr-2"><i class="i-heroicons-map-pin"></i> {{ booking.location }}</span>
                        </div>
                    </div>
                    <!-- Edit menu -->
                    <div class="relative ml-4">
                        <UModal title="Confirm your Informations 🔗">
                            <UButton class="btn btn-primary w-full mb-2" type="button" label="Book it" @click="openModal(booking)" />
                            <template #body>
                                <form class="flex flex-col gap-3" @submit.prevent="submitClientForm">
                                    <label class="flex flex-col text-sm font-medium">
                                        Email
                                        <input v-model="email" type="email" class="border rounded px-2 py-1 mt-1" required />
                                    </label>
                                    <label class="flex flex-col text-sm font-medium">
                                        Name
                                        <input v-model="name" type="text" class="border rounded px-2 py-1 mt-1" required />
                                    </label>
                                    <button type="submit" class="btn btn-primary mt-2">Envoyer</button>
                                </form>
                            </template>
                        </UModal>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRuntimeConfig } from '#imports'

const config = useRuntimeConfig()
const toast = useToast()

// Typage correct pour les disponibilités
interface Disponibilite {
  date: string;
  heure_debut: string;
  heure_fin: string;
}

// Typage pour l'affichage enrichi
interface BookingDisplay extends Disponibilite {
  dayShort: string;
  dayNum: number;
  time: string;
  title: string;
  location: string;
  dateAffichee: string;
}

const disponibilites = ref<Disponibilite[]>([])
const selectedSlot = ref<Disponibilite | null>(null)
const email = ref('')
const name = ref('')

// Récupération des disponibilités depuis l'API
onMounted(async () => {
    try {
        const token = localStorage.getItem('token')
        const res = await $fetch(`${config.public.API_BASE_URL}/disponibilities`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        disponibilites.value = Array.isArray(res) ? res : []
        console.log('Disponibilités reçues de l\'API:', disponibilites.value)
    } catch (e) {
        disponibilites.value = []
        console.error('Erreur lors de la récupération des disponibilités:', e)
    }
})

// Utility function to get local time range from UTC date and times
function getLocalTimeRange(dateUTC: string, heure_debut: string, heure_fin: string): string {
  const start = new Date(`${dateUTC.split('T')[0]}T${heure_debut}Z`)
  const end = new Date(`${dateUTC.split('T')[0]}T${heure_fin}Z`)
  return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

// Utility function to get local day info from UTC date and start time
function getLocalDateInfo(dateUTC: string, heure_debut: string) {
  const date = new Date(`${dateUTC.split('T')[0]}T${heure_debut}Z`)
  return {
    dayShort: date.toLocaleDateString(undefined, { weekday: 'short' }),
    dayNum: date.getDate()
  }
}

// Regrouper les disponibilités par mois pour l'affichage
const groupedBookings = computed(() => {
  const groups: Array<{ label: string, items: BookingDisplay[] }> = []
  let lastMonth = ''

  // Filtrer uniquement les disponibilités disponibles
  const disponibles = disponibilites.value.filter((d: any) => d.available === true)
  console.log('Nombre total de disponibilités:', disponibilites.value.length)
  console.log('Nombre de disponibilités disponibles:', disponibles.length)
  console.log('Disponibilités disponibles:', disponibles)

  disponibles.forEach(d => {
    console.log('Date brute backend:', d.date)
    const fullStartDate = new Date(`${d.date.split('T')[0]}T${d.heure_debut}Z`)
    const month = fullStartDate.toLocaleString('default', { month: 'long', year: 'numeric' })

    if (lastMonth !== month) {
      groups.push({ label: month, items: [] })
      lastMonth = month
    }

    groups[groups.length - 1].items.push({
      ...d,
      dayShort: fullStartDate.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNum: fullStartDate.getDate(),
      dateAffichee: fullStartDate.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: getLocalTimeRange(d.date, d.heure_debut, d.heure_fin),
      title: '3D Brand Audit',
      location: 'Web conferencing details provided upon confirmation',
    })
  })

  return groups
})

// Fonction pour gérer la sélection d'un créneau
function openModal(booking: Disponibilite) {
  selectedSlot.value = booking
}

// Fonction pour gérer la soumission du formulaire
async function submitClientForm(e: Event) {
  e.preventDefault()
  if (!selectedSlot.value) return
  try {
    await $fetch(`${config.public.API_BASE_URL}/clients/register`, {
      method: 'POST',
      body: {
        email: email.value,
        username: name.value,
        id: (selectedSlot.value as any).id
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })
    toast.add({
      title: 'Réservation envoyée !',
      color: 'primary'
    })
    email.value = ''
    name.value = ''
    selectedSlot.value = null
    window.location.reload()
  } catch (err) {
    toast.add({
      title: 'Erreur lors de la réservation',
      color: 'error'
    })
  }
}
</script>

<style scoped>
.i-heroicons-map-pin::before {
    content: '\1F4CD';
    /* 📍 */
    margin-right: 2px;
}
</style>
