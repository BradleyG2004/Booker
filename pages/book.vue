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
                    class="bg-white rounded-xl border border-gray-100 shadow-sm flex items-center px-4 py-3 mb-3 relative"
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
                        <UModal title="Modal without overlay">
                            <UButton class="btn btn-primary w-full mb-2" type="submit" label="Book it" />
                            <template #body>
                                <Placeholder class="h-48" />
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

// Récupération des disponibilités depuis l'API
const disponibilites = ref([])
onMounted(async () => {
    try {
        const token = localStorage.getItem('token')
        const res = await $fetch(`${config.public.API_BASE_URL}/disponibilities`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        disponibilites.value = Array.isArray(res) ? res : []
    } catch (e) {
        disponibilites.value = []
    }
})

// Regrouper les disponibilités par mois pour l'affichage
const groupedBookings = computed(() => {
    const groups: Array<{ label: string, items: any[] }> = []
    let lastMonth = ''
    disponibilites.value.forEach(d => {
        const dateObj = new Date(d.date)
        const month = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })
        if (lastMonth !== month) {
            groups.push({ label: month, items: [] })
            lastMonth = month
        }
        groups[groups.length - 1].items.push({
            ...d,
            dayShort: dateObj.toLocaleString('default', { weekday: 'short' }),
            dayNum: dateObj.getDate(),
            time: `${d.heure_debut?.slice(0, 5)} - ${d.heure_fin?.slice(0, 5)}`,
            title: 'Disponibilité',
            location: 'Web conferencing details provided upon confirmation',
        })
    })
    return groups
})
</script>

<style scoped>
.i-heroicons-map-pin::before {
    content: '\1F4CD';
    /* 📍 */
    margin-right: 2px;
}
</style>
