<script setup lang="ts">
import { RouterView } from "vue-router";
import routes from "./router/routes";
import type { RouteItem } from "./types";
import { computed, ref } from "vue";
import { useDisplay } from "vuetify";

// 使用 vuetify 的响应式显示工具
const { mobile } = useDisplay();

// 抽屉状态
const drawer = ref(!mobile.value);

// 创建计算属性，过滤可见路由
const visibleRoutes = computed(
  () => routes.filter((route) => route.meta?.visible) as RouteItem[]
);

// 切换抽屉状态
const toggleDrawer = () => {
  drawer.value = !drawer.value;
};
</script>

<template>
  <v-layout class="rounded rounded-md border">
    <v-app-bar title="LLMs Eval">
      <template v-slot:prepend>
        <v-app-bar-nav-icon
          v-if="mobile"
          @click="toggleDrawer"
        ></v-app-bar-nav-icon>
      </template>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :permanent="!mobile"
      :temporary="mobile"
    >
      <v-list nav>
        <v-list-item
          v-for="route in visibleRoutes"
          :key="route.name"
          link
          :to="route.path"
          @click="mobile && (drawer = false)"
        >
          <v-icon :icon="route.meta.icon"></v-icon>
          <span class="font-weight-medium ml-2">{{ route.meta?.title }}</span>
        </v-list-item>
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
