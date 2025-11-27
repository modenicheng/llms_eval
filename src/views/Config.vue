<script setup lang="ts">
import platformConfigCard from '../components/platformConfigCard.vue';
</script>

<template>
  <v-container class="w-75">
    <v-row>
      <v-col>
        <platformConfigCard platform="deepseek" />
        <platformConfigCard platform="volcengine" />
        <platformConfigCard platform="google-aistudio" />
      </v-col>
      <v-col>
        <platformConfigCard platform="tongyi" />
        <platformConfigCard platform="moonshot" />
      </v-col>
    </v-row>

  </v-container>
</template>