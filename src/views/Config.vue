<script setup lang="ts">
import { ref, onMounted } from "vue";
import platformConfigCard from "../components/platformConfigCard.vue";
import { platformConfigStore, platformMetaStore } from "../store";
import type { PlatformMeta } from "../types";

// 平台列表
const platforms = ref<Array<{ id: string; isCustom: boolean }>>([]);
const isLoading = ref(false);

// 添加新平台相关状态
const showAddPlatformDialog = ref(false);
const newPlatformForm = ref({
  id: "",
  name: "",
  defaultUrl: "",
  description: "",
});

// 预定义平台常量（从platformConfigCard.vue复制）
const PREDEFINED_PLATFORMS = [
  { id: "deepseek", name: "DeepSeek", defaultUrl: "https://api.deepseek.com" },
  {
    id: "volcengine",
    name: "火山引擎",
    defaultUrl: "https://ark.cn-beijing.volces.com/api/v3",
  },
  {
    id: "tongyi",
    name: "通义千问",
    defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    id: "moonshot",
    name: "Moonshot",
    defaultUrl: "https://api.moonshot.cn/v1",
  },
  {
    id: "google-aistudio",
    name: "Google AI Studio",
    defaultUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
];

// 初始化预定义平台元数据
const initPredefinedPlatforms = async () => {
  try {
    const existingMetas = await platformMetaStore.getAllPlatformMetas();
    if (existingMetas.length === 0) {
      const platformMetas = PREDEFINED_PLATFORMS.map((platform) => ({
        id: platform.id,
        name: platform.name,
        defaultUrl: platform.defaultUrl,
        predefinedModels: [], // 预定义模型可以在后续添加
      }));
      await platformMetaStore.initPredefinedPlatforms(platformMetas);
      console.log("Predefined platforms initialized");
    }
  } catch (error) {
    console.error("Failed to init predefined platforms:", error);
  }
};

// 获取所有平台配置（包括预定义和自定义）
const loadPlatforms = async () => {
  isLoading.value = true;
  try {
    // 初始化预定义平台元数据
    await initPredefinedPlatforms();

    // 获取所有平台配置
    const configs = await platformConfigStore.getAllConfigs();
    const configPlatforms = Object.keys(configs);

    // 获取所有预定义平台元数据
    const predefinedMetas = await platformMetaStore.getAllPlatformMetas();
    const predefinedPlatforms = predefinedMetas.map((meta) => meta.id);

    // 合并平台列表，去重
    const allPlatforms = Array.from(
      new Set([...predefinedPlatforms, ...configPlatforms])
    );

    // 转换为对象数组，标记是否为自定义平台
    const platformObjects = allPlatforms.map((id) => {
      const isCustom = !predefinedPlatforms.includes(id);
      return { id, isCustom };
    });

    // 排序：预定义平台在前，自定义平台在后，按ID排序
    platformObjects.sort((a, b) => {
      if (a.isCustom && !b.isCustom) return 1;
      if (!a.isCustom && b.isCustom) return -1;
      return a.id.localeCompare(b.id);
    });

    platforms.value = platformObjects;
  } catch (error) {
    console.error("Failed to load platforms:", error);
  } finally {
    isLoading.value = false;
  }
};

// 检查平台ID是否已存在
const isPlatformIdExists = (platformId: string) => {
  return platforms.value.some((p) => p.id === platformId);
};

// 添加新平台
const addNewPlatform = async () => {
  const { id, name, defaultUrl, description } = newPlatformForm.value;

  if (!id.trim() || !name.trim() || !defaultUrl.trim()) {
    alert("平台ID、名称和默认URL为必填项");
    return;
  }

  if (isPlatformIdExists(id)) {
    alert("平台ID已存在，请使用不同的ID");
    return;
  }

  try {
    // 创建新的平台元数据
    const newPlatformMeta: PlatformMeta = {
      id,
      name,
      defaultUrl,
      description: description.trim() || undefined,
      predefinedModels: [], // 自定义平台初始没有预定义模型
    };

    // 保存平台元数据
    await platformMetaStore.savePlatformMeta(newPlatformMeta);

    // 创建空的平台配置
    await platformConfigStore.saveConfig(id, {
      apiKey: "",
      baseURL: defaultUrl,
      models: [],
      custom: true,
      platformName: name,
      description: description.trim() || "",
    });

    // 重新加载平台列表
    await loadPlatforms();

    // 重置表单并关闭对话框
    closeAddPlatformDialog();
  } catch (error) {
    console.error("Failed to add new platform:", error);
    alert("添加平台失败，请重试");
  }
};

// 删除平台
// const deletePlatform = async (platformId: string) => {
//   if (
//     !confirm(
//       `确定要删除平台 "${platformId}" 吗？\n注意：该操作会删除平台的所有配置和数据。`
//     )
//   ) {
//     return;
//   }

//   try {
//     // 删除平台配置
//     await platformConfigStore.deleteConfig(platformId);

//     // 删除平台元数据（如果是自定义平台）
//     await platformMetaStore.deletePlatformMeta(platformId);

//     // 重新加载平台列表
//     await loadPlatforms();
//   } catch (error) {
//     console.error(`Failed to delete platform ${platformId}:`, error);
//     alert("删除平台失败，请重试");
//   }
// };

// 关闭添加平台对话框
const closeAddPlatformDialog = () => {
  showAddPlatformDialog.value = false;
  newPlatformForm.value = {
    id: "",
    name: "",
    defaultUrl: "",
    description: "",
  };
};

// 计算是否是自定义平台
// const isCustomPlatform = computed(() => (platformId: string) => {
//   const platform = platforms.value.find((p) => p.id === platformId);
//   return platform ? platform.isCustom : false;
// });

// 组件挂载时加载平台列表
onMounted(() => {
  loadPlatforms();
});
</script>

<template>
  <v-container fluid>
    <!-- 头部：标题和添加按钮 -->
    <v-row class="mb-4">
      <v-col cols="12">
        <div class="d-flex flex-column flex-md-row justify-space-between align-center align-md-center">
          <h2 class="text-h5 text-md-h4 mb-2 mb-md-0">平台配置</h2>
          <v-btn color="primary" @click="showAddPlatformDialog = true" class="mt-2 mt-md-0">
            <v-icon icon="mdi-plus" class="mr-2"></v-icon>
            添加新平台
          </v-btn>
        </div>
      </v-col>
    </v-row>

    <!-- 加载状态 -->
    <v-row v-if="isLoading">
      <v-col cols="12">
        <div class="text-center">
          <v-progress-circular
            indeterminate
            color="primary"
          ></v-progress-circular>
          <div class="mt-2">加载平台配置中...</div>
        </div>
      </v-col>
    </v-row>

    <!-- 平台配置卡片 -->
    <v-row v-else>
      <v-col v-for="platform in platforms" :key="platform.id" cols="12" md="6" lg="4">
        <platformConfigCard :platform="platform.id" />
      </v-col>

      <!-- 空状态 -->
      <v-col v-if="platforms.length === 0" cols="12">
        <v-card>
          <v-card-text class="text-center py-8">
            <v-icon
              icon="mdi-cloud-off-outline"
              size="x-large"
              class="mb-4"
            ></v-icon>
            <div class="text-h6 mb-2">暂无平台配置</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              点击右上角"添加新平台"按钮来配置您的第一个API平台
            </div>
            <v-btn color="primary" @click="showAddPlatformDialog = true">
              添加新平台
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 添加新平台对话框 -->
    <v-dialog v-model="showAddPlatformDialog" max-width="500" scrollable>
      <v-card>
        <v-card-title class="text-h6 text-sm-h5">添加新平台</v-card-title>
        <v-card-text class="pa-3 pa-sm-4">
          <v-form @submit.prevent="addNewPlatform">
            <!-- 平台ID -->
            <v-text-field
              v-model="newPlatformForm.id"
              label="平台ID"
              placeholder="如: openai, claude"
              required
              variant="outlined"
              density="compact"
              class="mb-3"
              hint="平台唯一标识符，仅支持字母、数字和连字符"
              :rules="[
                (v) => !!v || '平台ID为必填项',
                (v) => /^[a-zA-Z0-9\-]+$/.test(v) || '仅支持字母、数字和连字符',
                (v) => !isPlatformIdExists(v) || '平台ID已存在',
              ]"
            ></v-text-field>

            <!-- 平台名称 -->
            <v-text-field
              v-model="newPlatformForm.name"
              label="平台名称"
              placeholder="如: OpenAI, Claude"
              required
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[(v) => !!v || '平台名称为必填项']"
            ></v-text-field>

            <!-- 默认API URL -->
            <v-text-field
              v-model="newPlatformForm.defaultUrl"
              label="默认API基础URL"
              placeholder="如: https://api.openai.com/v1"
              required
              variant="outlined"
              density="compact"
              class="mb-3"
              :rules="[
                (v) => !!v || 'API基础URL为必填项',
                (v) =>
                  v.startsWith('http://') ||
                  v.startsWith('https://') ||
                  '请输入有效的URL',
              ]"
            ></v-text-field>

            <!-- 平台描述 -->
            <v-textarea
              v-model="newPlatformForm.description"
              label="平台描述"
              variant="outlined"
              density="compact"
              rows="2"
              class="mb-4"
            ></v-textarea>

            <!-- 操作按钮 -->
            <div class="d-flex flex-column flex-sm-row justify-end">
              <v-btn
                variant="text"
                class="mr-sm-2 mb-2 mb-sm-0"
                @click="closeAddPlatformDialog"
              >
                取消
              </v-btn>
              <v-btn type="submit" color="primary"> 添加 </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>
