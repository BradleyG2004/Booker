<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const config = useRuntimeConfig()
const toast = useToast()

// Variables séparées pour chaque mode
const disposMultiple = ref([])
const disposRange = ref(null) // Suppression du type pour éviter l'erreur UCalendar
const typeSelect = ref('Par selection multiple')
const items = ref(['Par selection multiple', 'Par plage'])

// Nouvelle logique de gestion des créneaux horaires
// Pour chaque date sélectionnée, on gère une liste de créneaux (début/fin)
const slotsByDate = ref<Record<string, Array<{ start: string; end: string }>>>({})

// Générer les options d'heures espacées de 30 minutes
const timeOptions = computed(() => {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push(timeString)
    }
  }
  return options
})

// Variable computed pour déterminer quelle variable utiliser selon le mode
const dispos = computed(() => {
  if (typeSelect.value === 'Par selection multiple') {
    return disposMultiple.value
  } else if (typeSelect.value === 'Par plage') {
    return disposRange.value
  }
  return null
})

// Fonction pour générer toutes les dates entre deux dates
function generateDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dates
}

// Fonction pour vérifier si deux créneaux se chevauchent
function doSlotsOverlap(slot1: { start: string; end: string }, slot2: { start: string; end: string }): boolean {
  return slot1.start < slot2.end && slot2.start < slot1.end
}

// Fonction pour vérifier si un créneau chevauche d'autres créneaux sur la même date
function hasOverlap(date: string, currentSlot: { start: string; end: string }, excludeIndex: number = -1): boolean {
  if (!slotsByDate.value[date]) return false
  return slotsByDate.value[date].some((slot, idx) => {
    if (idx === excludeIndex) return false
    // Ignorer les créneaux vides
    if (!slot.start || !slot.end) return false
    if (!currentSlot.start || !currentSlot.end) return false
    return doSlotsOverlap(currentSlot, slot)
  })
}

// Fonction pour obtenir les options d'heures de début valides pour un créneau (pas de chevauchement)
function getValidStartOptions(date: string, slotIndex: number): string[] {
  const slot = slotsByDate.value[date]?.[slotIndex]
  const endTime = slot?.end
  const slots = slotsByDate.value[date] || []

  // Si c'est le seul créneau de la date, proposer toutes les heures (en respectant la fin si déjà choisie)
  if (slots.length === 1) {
    return timeOptions.value.filter(startTime => {
      if (endTime && startTime >= endTime) return false
      return true
    })
  }

  // Sinon, logique habituelle
  if (!endTime) {
    return timeOptions.value.filter(startTime => {
      const testSlot = { start: startTime, end: '23:59' }
      return !hasOverlap(date, testSlot, slotIndex)
    })
  }
  return timeOptions.value.filter(startTime => {
    if (startTime >= endTime) return false
    const testSlot = { start: startTime, end: endTime }
    return !hasOverlap(date, testSlot, slotIndex)
  })
}

// Fonction pour obtenir les options d'heures de fin valides pour un créneau (pas de chevauchement)
function getValidEndOptions(date: string, slotIndex: number): string[] {
  const slot = slotsByDate.value[date]?.[slotIndex]
  const startTime = slot?.start || '00:00'
  return timeOptions.value.filter(endTime => {
    if (endTime <= startTime) return false
    const testSlot = { start: startTime, end: endTime }
    return !hasOverlap(date, testSlot, slotIndex)
  })
}

// Fonction pour valider et mettre à jour un créneau
function validateAndUpdateSlot(date: string, index: number, field: 'start' | 'end', value: string) {
  if (!slotsByDate.value[date] || !slotsByDate.value[date][index]) return

  const currentSlot = { ...slotsByDate.value[date][index] }
  const oldValue = currentSlot[field]
  currentSlot[field] = value

  // Validation : heure de fin doit être > heure de début
  if (currentSlot.start >= currentSlot.end) {
    // Restaurer l'ancienne valeur si invalide
    currentSlot[field] = oldValue
    return
  }

  // Validation : pas de chevauchement avec d'autres créneaux
  if (hasOverlap(date, currentSlot, index)) {
    // Restaurer l'ancienne valeur si chevauchement
    currentSlot[field] = oldValue
    return
  }

  // Mettre à jour le créneau si tout est valide
  slotsByDate.value[date][index] = currentSlot
}

// Ajouter un créneau pour une date
function addSlot(date: string) {
  if (!slotsByDate.value[date]) {
    slotsByDate.value[date] = []
  }
  // Par défaut, créneau vide
  slotsByDate.value[date].push({ start: '', end: '' })
}

// Supprimer un créneau pour une date
function removeSlot(date: string, index: number) {
  if (slotsByDate.value[date]) {
    slotsByDate.value[date].splice(index, 1)
  }
}

// Mettre à jour un créneau (avec validation simple + chevauchement)
function updateSlot(date: string, index: number, field: 'start' | 'end', value: string) {
  if (!slotsByDate.value[date] || !slotsByDate.value[date][index]) return
  const oldSlot = { ...slotsByDate.value[date][index] }
  const slot = { ...oldSlot }
  slot[field] = value
  // Validation : fin > début
  if (slot.start >= slot.end) return
  // Validation : pas de chevauchement
  if (hasOverlap(date, slot, index)) return
  slotsByDate.value[date][index] = slot
}

// Fonction pour formater une date en string
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Watch pour initialiser les créneaux pour chaque nouvelle date sélectionnée
watch([disposMultiple, disposRange], ([multiple, range]) => {
  let dates: string[] = []
  if (typeSelect.value === 'Par plage' && range && typeof range === 'object' && 'start' in range && 'end' in range) {
    const allDates = generateDatesBetween(new Date(range.start), new Date(range.end))
    dates = allDates.map(d => formatDate(d))
  } else if (typeSelect.value === 'Par selection multiple' && Array.isArray(multiple)) {
    dates = multiple.map(d => formatDate(new Date(d)))
  }
  dates.forEach(dateStr => {
    if (!slotsByDate.value[dateStr]) {
      slotsByDate.value[dateStr] = []
    }
  })
}, { deep: true })

// Soumission du formulaire de disponibilités
async function submitDisponibilites(e: Event) {
  e.preventDefault()
  // Construction du tableau des disponibilités
  const disponibilites: Array<{ date: string; heure_debut: string; heure_fin: string }> = []
  for (const [date, slots] of Object.entries(slotsByDate.value)) {
    for (const slot of slots) {
      // 🕒 Construire un objet Date avec la date + heure locale
      const startUTC = new Date(`${date}T${slot.start}:00`)
      const endUTC = new Date(`${date}T${slot.end}:00`)

      // 👇 Convertir en heure UTC "HH:MM:SS"
      const heure_debut = startUTC.toISOString().split('T')[1].split('.')[0] // HH:MM:SS
      const heure_fin = endUTC.toISOString().split('T')[1].split('.')[0]

      disponibilites.push({
        date,
        heure_debut,
        heure_fin
      })
    }
  }
  // Vérifier si aucune disponibilité n'a été renseignée
  if (disponibilites.length === 0) {
    toast.add({
      title: 'Veuillez renseigner au moins une disponibilité avec un créneau horaire.',
      color: 'error'
    })
    return
  }
  // Récupérer le token
  const token = localStorage.getItem('token')
  if (!token) {
    toast.add({
      title: 'Utilisateur non authentifié',
      color: 'error'
    })
    return
  }
  try {
    const resp = await $fetch(`${config.public.API_BASE_URL}/disponibilities/register`, {
      method: 'POST',
      body: disponibilites,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    console.log(resp)
    toast.add({
      title: 'Disponibilités enregistrées !',
      color: 'primary'
    })
    // Redirection ou reset si besoin
    window.location.reload()
  } catch (err) {
    toast.add({
      title: 'Erreur lors de l\'enregistrement des disponibilités',
      color: 'error'
    })
  }
}

function Logout() {
  localStorage.removeItem('token')
  router.push('/login')
}

// Date locale user-friendly
const todayUserFriendly = computed(() => {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
})

// Filtres de meetings
const activeFilter = ref('all')
const meetingFilters = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'booked', label: 'Booked' },
]

// Créneaux depuis la base de données
const disponibilites = ref<any[]>([])

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

// Fonctions helper pour améliorer la lisibilité
function isAvailableSlot(d: any): boolean {
  return d.available === true && d.reserved_by === null
}

function isBookedSlot(d: any): boolean {
  return d.reserved_by !== null
}

// Créneaux filtrés selon le statut
const filteredMeetings = computed(() => {
  let filtered = disponibilites.value

  // Ajoute ce log ici pour voir la valeur de d.reserved_by
  console.log('Valeurs de reserved_by reçues:', disponibilites.value.map((d: any) => ({ id: d.id, reserved_by: d.reserved_by, type: typeof d.reserved_by })))

  if (activeFilter.value === 'available') {
    filtered = disponibilites.value.filter(isAvailableSlot)
  } else if (activeFilter.value === 'booked') {
    filtered = disponibilites.value.filter(isBookedSlot)
  }
  // 'all' affiche tout

  return filtered.map((d: any) => {
    const fullStartDate = new Date(`${d.date.split('T')[0]}T${d.heure_debut}Z`)
    return {
      id: d.id,
      dayShort: fullStartDate.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNum: fullStartDate.getDate(),
      time: getLocalTimeRange(d.date, d.heure_debut, d.heure_fin),
      title: d.reserved_by ? `Meeting réservé par ${d.client_name || 'Client'}` : 'Créneau disponible',
      location: 'Web conferencing details provided upon confirmation',
      status: d.reserved_by !== null ? 'booked' : 'available',
      hasConflict: false,
      available: d.available,
      reserved_by: d.reserved_by,
      client_name: d.client_name,
      client_email: d.client_email
    }
  })
})

// Actions pour les meetings
const meetingActions = [
  [
    {
      label: 'Reschedule booking',
      icon: 'i-heroicons-clock',
      click: () => console.log('Reschedule')
    },
    {
      label: 'Request reschedule',
      icon: 'i-heroicons-paper-airplane',
      click: () => console.log('Request reschedule')
    },
    {
      label: 'Edit location',
      icon: 'i-heroicons-map-pin',
      click: () => console.log('Edit location')
    },
    {
      label: 'Invite people',
      icon: 'i-heroicons-user-plus',
      click: () => console.log('Invite people')
    }
  ],
  [
    {
      label: 'Cancel event',
      icon: 'i-heroicons-x-mark',
      click: () => console.log('Cancel event')
    }
  ]
]

defineExpose({ todayUserFriendly })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center"
    style="font-family: 'Courier New', Courier, monospace; margin:10px;">
    <div class="flex w-full rounded-3xl overflow-hidden shadow-2xl mx-4">
      <!-- Sidebar -->
      <aside class="w-80 bg-[#f9f6ed] text-gray-900 flex flex-col p-6">
        <h1 class="text-3xl font-bold mb-2 text-center booker-title" style="color: #F9F6ED;">Booker</h1>
        <hr style="color:#fc789f"><br>
        <!-- Profil -->
        <div class="flex items-center mb-8 shadow-2xl"
          style="padding:5px;border-style: solid;border-width:1px;border-color:black;border-radius:5px;color:black;background-color: white;">
          <img src="../assets/image5.png" alt="avatar" class="w-12 h-12 rounded-full mr-4" />
          <div>
            <div class="font-bold">Antonio Larentio</div>
            <div class="text-xs text-gray-500">Profile</div>
          </div>
          <div
            class="w-3 h-1 rounded-full border border-black-800 flex items-center justify-center ml-auto bg-[#f9f6ed]"
            style="box-shadow: inset 0 0 2px 1px rgba(0,0,0,0.25);">
          </div>
        </div>

        <div class="flex items-center mb-8 shadow-2xl"
          style="padding:5px;border-style: solid;border-width:1px;border-radius:5px;border-color:black;background-color: white;">
          <img src="../assets/image3.png" alt="avatar" class="w-12 h-12 rounded-full mr-4" />
          <div>
            <div class="font-bold">Planning</div>
            <div class="text-xs text-gray-500">Rdv's et disponibilités</div>
          </div>
          <div
            class="w-3 h-1 rounded-full border border-black-800 flex items-center justify-center ml-auto bg-[#f9f6ed]"
            style="box-shadow: inset 0 0 2px 1px rgba(0,0,0,0.25);">
          </div>
        </div>

        <div class="flex items-center mb-8 shadow-2xl"
          style="padding:5px;border-style: solid;border-width:1px;border-radius:5px;border-color:black;background-color: white;">
          <img src="../assets/image2.png" alt="avatar" class="w-12 h-12 rounded-full mr-4" />
          <div>
            <div class="font-bold">Rappels</div>
            <div class="text-xs text-gray-500">Contenu , périodicité ...</div>
          </div>
          <div
            class="w-3 h-1 rounded-full border border-black-800 flex items-center justify-center ml-auto bg-[#f9f6ed]"
            style="box-shadow: inset 0 0 2px 1px rgba(0,0,0,0.25);">
          </div>
        </div>
        <button @click="Logout" style="color: #3B25C1;font-weight: bold;font-style: italic;">
          Logout
        </button>
      </aside>

      <!-- Main dashboard -->
      <main class="flex-1 p-8 bg-white rounded-r-3xl" style="border-color:#422ad5;border-width: 2px;">
        <!-- Header calendrier -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <div class="text-2xl font-bold text-black">{{ todayUserFriendly }}</div>
            <div class="text-xs text-gray-500">Date du jour</div>
          </div>
        </div>
        <!-- Calendrier principal (à remplacer par FullCalendar) -->
        <div class=" rounded-2xl shadow-lg p-6 min-h-[600px] flex flex-row gap-6">
          <!-- Colonne formulaire (2/5) -->
          <div class="basis-3/6 flex flex-col justify-center">
            <form class="space-y-4" @submit.prevent="submitDisponibilites">
              <h2 class="text-xl font-bold mb-4">
                <center>Add Time slots👇</center>
              </h2>
              <div
                style="border-radius: 5px;border-width: 2px;border-style: solid;padding: 10px;border-color: #fc789f;">
                <div
                  class="w-3 h-1 rounded-full border border-rose-800 flex items-center justify-center ml-auto bg-[#f9f6ed]"
                  style="border-width: 2px;">
                </div>
                <label class="block text-sm font-medium text-gray-700" style="font-weight: bold;">Vous pouvez le faire
                  :</label>
                <USelectMenu v-model="typeSelect" :items="items" class="w-28 min-h-[40px] shadow-2xl"
                  style="margin:10px;width:70%" />
                <div
                  style="border-radius: 5px;border-width: 1px;border-style: solid;padding: 10px;margin:10px;background-color:#f9f6ed;height:260px;"
                  class="shadow-2xl">
                  <UCalendar color="neutral" size="xs" multiple v-model="disposMultiple"
                    v-if="typeSelect == 'Par selection multiple'" />
                  <UCalendar color="neutral" size="xs" range v-model="disposRange" v-if="typeSelect == 'Par plage'" />
                </div>
              </div>
              <div
                style="border-radius: 5px;border-width: 2px;border-style: solid;padding: 10px;border-color: #fc789f;">
                <div
                  class="w-3 h-1 rounded-full border border-rose-800 flex items-center justify-center ml-auto bg-[#f9f6ed]"
                  style="border-width: 2px;">
                </div>
                <label class="block text-sm font-medium text-gray-700" style="font-weight: bold;">Precisez les plages
                  horaires :</label>
                <div
                  v-if="typeSelect === 'Par selection multiple' && Array.isArray(disposMultiple) && disposMultiple.length > 0">
                  <div v-for="(date, dateIndex) in disposMultiple" :key="dateIndex"
                    class="mb-4 p-3 border rounded-lg bg-gray-50">
                    <div class="font-bold text-sm mb-3">{{ new Date(date).toLocaleDateString('fr-FR') }}</div>
                    <!-- Créneaux existants -->
                    <div v-for="(slot, slotIndex) in (slotsByDate[formatDate(new Date(date))] || [])" :key="slotIndex"
                      class="flex items-center gap-2 mb-2">
                      <USelectMenu v-model="slot.start"
                        :items="getValidStartOptions(formatDate(new Date(date)), slotIndex)"
                        @update:model-value="updateSlot(formatDate(new Date(date)), slotIndex, 'start', $event)"
                        class="w-25 min-h-[30px] shadow-2xl" />
                      <span class="text-gray-500">-</span>
                      <USelectMenu v-model="slot.end" :items="getValidEndOptions(formatDate(new Date(date)), slotIndex)"
                        @update:model-value="updateSlot(formatDate(new Date(date)), slotIndex, 'end', $event)"
                        class="w-25 min-h-[30px] shadow-2xl" />
                      <button @click="removeSlot(formatDate(new Date(date)), slotIndex)"
                        class="text-red-500 hover:text-red-700" type="button">
                        ✕
                      </button>
                    </div>
                    <!-- Bouton pour ajouter un créneau -->
                    <button @click="addSlot(formatDate(new Date(date)))"
                      class="text-blue-500 hover:text-blue-700 text-sm" type="button">
                      + Ajouter un créneau
                    </button>
                  </div>
                </div>
                <div
                  v-else-if="typeSelect === 'Par plage' && disposRange && typeof disposRange === 'object' && 'start' in disposRange && 'end' in disposRange">
                  <div
                    v-for="(date, dateIndex) in generateDatesBetween(new Date(disposRange.start), new Date(disposRange.end))"
                    :key="dateIndex" class="mb-4 p-3 border rounded-lg bg-gray-50">
                    <div class="font-bold text-sm mb-3">{{ date.toLocaleDateString('fr-FR') }}</div>
                    <!-- Créneaux existants -->
                    <div v-for="(slot, slotIndex) in (slotsByDate[formatDate(date)] || [])" :key="slotIndex"
                      class="flex items-center gap-2 mb-2">
                      <USelectMenu v-model="slot.start" :items="timeOptions"
                        @update:model-value="updateSlot(formatDate(date), slotIndex, 'start', $event)"
                        class="w-28 min-h-[40px] shadow-2xl" />
                      <span class="text-gray-500">-</span>
                      <USelectMenu v-model="slot.end" :items="timeOptions"
                        @update:model-value="updateSlot(formatDate(date), slotIndex, 'end', $event)"
                        class="w-28 min-h-[40px] shadow-2xl" />
                      <button @click="removeSlot(formatDate(date), slotIndex)" class="text-red-500 hover:text-red-700"
                        type="button">
                        ✕
                      </button>
                    </div>
                    <!-- Bouton pour ajouter un créneau -->
                    <button @click="addSlot(formatDate(date))" class="text-blue-500 hover:text-blue-700 text-sm"
                      type="button">
                      + Ajouter un créneau
                    </button>
                  </div>
                </div>
                <div v-else class="text-sm text-gray-500">
                  Aucune date sélectionnée
                </div>
              </div>
              <button class="btn btn-primary w-full mb-2" type="submit">Submit</button>
            </form>
          </div>

          <!-- Colonne calendrier (3/5) -->
          <div class="basis-3/6 flex flex-col shadow-2xl"
            style="border-color:#3b25c1;border-width: 2px;border-style: solid;border-radius: 3px;padding:10px;">
            <div
              class="w-3 h-1 rounded-full border border-rose-800 flex items-center justify-center ml-auto bg-[#f9f6ed]"
              style="border-width: 2px;">
            </div>
            <h2 class="text-2xl font-bold mb-1 text-center booker-subtitle">
              <center>
                Meetings & Dispos
              </center>
            </h2>

            <!-- Filtres -->
            <center>
              <div class="flex space-x-1 mb-4 shadow-2xl mx-auto w-fit"
                style="background-color: #F9F6ED;border-color:#fc789f;border-width: 2px;border-style: solid;padding: 5px;margin: 5px;border-radius: 5px;">
                <button class="shadow-2xl" style="color: black;font-weight: bold;" v-for="filter in meetingFilters"
                  :key="filter.id" @click="activeFilter = filter.id" :class="[
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    activeFilter === filter.id
                      ? 'bg-white text-blue-600'
                      : 'text-white hover:bg-white/10'
                  ]">
                  {{ filter.label }}
                </button>
              </div>
            </center>

            <!-- Liste des meetings -->
            <div class="space-y-3 max-h-96 overflow-y-auto" style="overflow-y: scroll;">
              <div v-for="meeting in filteredMeetings" :key="meeting.id"
                class="bg-white rounded-lg p-4 shadow-sm flex items-center space-x-4">
                <!-- Date -->
                <div class="flex flex-col items-center w-16">
                  <span class="text-xs font-bold text-orange-500">{{ meeting.dayShort }}</span>
                  <span class="text-lg font-bold text-orange-500">{{ meeting.dayNum }}</span>
                </div>

                <!-- Infos meeting -->
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <i class="i-heroicons-clock text-gray-400 text-sm"></i>
                    <span class="text-sm font-semibold">{{ meeting.time }}</span>
                    <span v-if="meeting.hasConflict" class="text-orange-500 text-xs">⚠</span>
                  </div>
                  <div class="text-sm font-medium">{{ meeting.title }}</div>
                  <div class="flex items-center text-xs text-gray-400 mt-1">
                    <i class="i-heroicons-map-pin mr-1"></i>
                    <span>{{ meeting.location }}</span>
                  </div>
                  <!-- Informations client pour les créneaux réservés -->
                  <div v-if="meeting.client_name && meeting.client_email" class="text-xs text-blue-600 mt-1">
                    <i class="i-heroicons-user mr-1"></i>
                    <span>🔖{{ meeting.client_name }} ({{ meeting.client_email }})</span>
                  </div>
                </div>

                <!-- Actions -->
                <div class="relative">
                  <UDropdown :items="meetingActions">
                    <UButton color="neutral" variant="outline" size="sm" trailing-icon="i-heroicons-chevron-down">
                      Edit
                    </UButton>
                  </UDropdown>
                </div>
              </div>

              <!-- Message si aucun meeting -->
              <div v-if="filteredMeetings.length === 0" class="text-center text-white/70 py-8">
                Aucun meeting {{ activeFilter === 'upcoming' ? 'à venir' : activeFilter === 'pending' ? 'en attente' :
                  activeFilter === 'recurring' ? 'récurrent' : activeFilter === 'past' ? 'passé' : activeFilter ===
                    'cancelled' ? 'annulé' : '' }}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
