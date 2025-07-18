<script setup lang="ts">
const dispos = ref([])
const typeSelect = ref('...')
const items = ref([
  ['Par selection multiple', 'Par plage']
])
</script>

<template>
  <div class="min-h-screen flex items-center justify-center"
    style="font-family: 'Courier New', Courier, monospace; margin:10px;">
    <div class="flex w-full rounded-3xl overflow-hidden shadow-2xl bg-black mx-4"
      style="border-style: solid;border-width:2px;border-color:#fc789f;">
      <!-- Sidebar -->
      <aside class="w-80 bg-[#f9f6ed] text-gray-900 flex flex-col p-6">
        <h1 class="text-3xl font-bold mb-2 text-center booker-title" style="color: #F9F6ED;">Booker</h1>
        <hr><br>
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

      </aside>

      <!-- Main dashboard -->
      <main class="flex-1 p-8 bg-white rounded-r-3xl" style="
          border-width:1px;
          border-style:inherit;
          /* background-image: url(/image3.png);
          background-color: #C52427;
          background-position: left bottom;
          background-repeat: no-repeat;
          background-size: 500px auto; */
        ">
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
          <div class="basis-2/5 flex flex-col justify-center">
            <form class="space-y-4">
              <h2 class="text-xl font-bold mb-4">Ajouter une/des disponibilité(s)</h2>
              <div
                style="border-radius: 5px;border-width: 2px;border-style: solid;padding: 10px;border-color: #fc789f;">
                <div
                  class="w-3 h-1 rounded-full border border-rose-800 flex items-center justify-center ml-auto bg-[#f9f6ed]"
                  style="border-width: 2px;">
                </div>
                <label class="block text-sm font-medium text-gray-700">Vous pouvez le faire :</label>
                <USelectMenu v-model="typeSelect" :items="items" class="w-48 shadow-2xl"
                  style="margin:10px;width:70%" />
                <div
                  style="border-radius: 5px;border-width: 1px;border-style: solid;padding: 10px;margin:10px;background-color:#f9f6ed;height:260px;"
                  class="shadow-2xl">
                  <UCalendar color="neutral" size="xs" multiple v-model="dispos"
                    v-if="typeSelect == 'Par selection multiple'" />
                  <UCalendar color="neutral" size="xs" range v-model="dispos" v-if="typeSelect == 'Par plage'" />
                  <span v-else class="flex items-center justify-center h-full w-full text-gray-500">...</span>
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Heure</label>
                <input type="time" class="mt-1 block w-full border rounded px-3 py-2" />
              </div>
              <button type="submit" class="bg-black text-white px-4 py-2 rounded">Ajouter</button>
            </form>
          </div>
          <!-- Colonne calendrier (3/5) -->
          <div class="basis-3/5 flex flex-col justify-center">
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
