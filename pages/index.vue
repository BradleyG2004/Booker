<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const config = useRuntimeConfig()

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
    alert('Veuillez renseigner au moins une disponibilité avec un créneau horaire.')
    return
  }
  // Récupérer le token
  const token = localStorage.getItem('token')
  if (!token) {
    alert('Utilisateur non authentifié')
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
    alert('Disponibilités enregistrées !')
    // Redirection ou reset si besoin
    window.location.reload()
  } catch (err) {
    alert('Erreur lors de l\'enregistrement des disponibilités')
  }
}

function Logout() {
  localStorage.removeItem('token')
  router.push('/login')
}
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
        <button @click="Logout">
          Logout
        </button>
      </aside>

      <!-- Main dashboard -->
      <main class="flex-1 p-8 bg-white rounded-r-3xl" style="border-color:#422ad5;border-width: 2px;">
        <!-- Header calendrier -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <div class="text-2xl font-bold text-black">JJ/MM/YY</div>
            <div class="text-xs text-gray-500">Date du jour</div>
          </div>
        </div>
        <!-- Calendrier principal (à remplacer par FullCalendar) -->
        <div class=" rounded-2xl shadow-lg p-6 min-h-[600px] flex flex-row gap-6">
          <!-- Colonne formulaire (2/5) -->
          <div class="basis-3/6 flex flex-col justify-center">
            <form class="space-y-4" @submit.prevent="submitDisponibilites">
              <h2 class="text-xl font-bold mb-4">Ajouter une/des disponibilité(s)</h2>
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
          <div class="basis-3/6 flex flex-col justify-center">
            <div class="h-full w-full flex items-center justify-center">
              <span class="text-gray-400">Calendrier interactif à intégrer ici</span>
              <!-- <FullCalendar ... /> -->
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
