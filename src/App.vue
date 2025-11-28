<script setup lang="ts">
import { RouterView } from "vue-router";
import routes from "./router/routes";
</script>

<template>
  <v-layout class="rounded rounded-md border">
    <v-app-bar title="LLMs Eval"></v-app-bar>

    <v-navigation-drawer>
      <v-list nav>
        <v-list-item
          v-for="route in routes"
          :key="route.name"
          :title="route.meta?.title"
          link
          :to="route.path"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="d-flex align-center justify-center">
      <v-container>
        <RouterView />
      </v-container>
    </v-main>
  </v-layout>
</template>

<style scoped></style>
