<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { platformConfigStore } from "../store";
import type { Models } from "../types";

const MODEL_TYPES = {
  deepseek: {
    name: "DeepSeek",
    defaultUrl: "https://api.deepseek.com",
    models: [
      { value: "deepseek-chat", label: "DeepSeek Chat" },
      { value: "deepseek-reasoner", label: "DeepSeek Reasonor" },
    ],
  },
  volcengine: {
    name: "火山引擎",
    defaultUrl: "https://ark.cn-beijing.volces.com/api/v3",
    models: [
      { value: "doubao-seed-1-6-251015", label: "豆包 Seed 1.6" },
      { value: "doubao-seed-1-6-lite-251015", label: "豆包 Seed 1.6 Lite" },
      { value: "doubao-seed-1-6-flash-250828", label: "豆包 Seed 1.6 Flash" },
      {
        value: "doubao-seed-1-6-thinking-250715",
        label: "豆包 Seed 1.6 Thinking",
      },
      { value: "doubao-seed-1-6-vision-250815", label: "豆包 Seed 1.6 Vision" },
      // { value: "deepseek-v3-1-terminus", label: "DeepSeek V3.1 Terminus" },
    ],
  },
  tongyi: {
    name: "通义千问",
    defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      // Qwen3 系列模型
      // { value: "qwen3", label: "通义千问 3" },
      { value: "qwen3-12b", label: "通义千问 3 12B" },
      { value: "qwen3-72b", label: "通义千问 3 72B" },
      // { value: "qwen3-plus", label: "通义千问 3 Plus" },
      { value: "qwen3-max", label: "通义千问 3 Max" },
      // { value: "qwen3-turbo", label: "通义千问 3 Turbo" },
      // { value: "qwen3-code", label: "通义千问 3 代码" },
      // { value: "qwen3-math", label: "通义千问 3 数学" },
      // { value: "qwen3-reasoning", label: "通义千问 3 推理" },
      // { value: "qwen3-longcontext", label: "通义千问 3 长上下文" },

      // Qwen3 多模态模型
      // { value: "qwen3-vl", label: "通义千问 3 视觉" },
      // { value: "qwen3-vl-plus", label: "通义千问 3 视觉 Plus" },
      // { value: "qwen3-vl-max", label: "通义千问 3 视觉 Max" },
      // { value: "qwen3-audio", label: "通义千问 3 音频" },
      // { value: "qwen3-video", label: "通义千问 3 视频" },

      // 文本生成模型
      { value: "qwen-plus", label: "通义千问 Plus" },
      { value: "qwen-turbo", label: "通义千问 Turbo" },
      { value: "qwen-max", label: "通义千问 Max" },
      { value: "qwen-longcontext", label: "通义千问 长上下文" },
      { value: "qwen-code", label: "通义千问 代码" },
      { value: "qwen-math", label: "通义千问 数学" },
      { value: "qwen-reasoning", label: "通义千问 推理" },

      // 多模态模型
      { value: "qwen-vl-plus", label: "通义千问 视觉 Plus" },
      { value: "qwen-vl-max", label: "通义千问 视觉 Max" },
      { value: "qwen-audio", label: "通义千问 音频" },
      { value: "qwen-video", label: "通义千问 视频" },

      // 专项模型
      { value: "qwen-zhishiku", label: "通义千问 知识库" },
      { value: "qwen-agent", label: "通义千问 智能体" },
      { value: "qwen-tool", label: "通义千问 工具调用" },

      // 语音相关模型
      { value: "qwen-tts", label: "通义千问 语音合成" },
      { value: "qwen-asr", label: "通义千问 语音识别" },
      { value: "qwen-st", label: "通义千问 语音翻译" },

      // 图像生成模型
      { value: "qwen-vl-diffusion", label: "通义千问 图像生成" },
      { value: "qwen-vl-edit", label: "通义千问 图像编辑" },

      // 向量化模型
      { value: "qwen-vector", label: "通义千问 文本向量化" },
      { value: "qwen-multimodal-vector", label: "通义千问 多模态向量化" },
    ],
  },
  moonshot: {
    name: "Moonshot",
    defaultUrl: "https://api.moonshot.cn/v1",
    models: [
      // Kimi K2 系列模型
      { value: "kimi-k2-0905-preview", label: "Kimi K2 0905 Preview (256k)" },
      { value: "kimi-k2-0711-preview", label: "Kimi K2 0711 Preview (128k)" },
      { value: "kimi-k2-turbo-preview", label: "Kimi K2 Turbo Preview (256k)" },
      { value: "kimi-k2-thinking", label: "Kimi K2 Thinking (256k)" },
      {
        value: "kimi-k2-thinking-turbo",
        label: "Kimi K2 Thinking Turbo (256k)",
      },

      // Moonshot V1 系列模型
      { value: "moonshot-v1-8k", label: "Moonshot V1 8k" },
      { value: "moonshot-v1-32k", label: "Moonshot V1 32k" },
      { value: "moonshot-v1-128k", label: "Moonshot V1 128k" },

      // Moonshot V1 视觉模型
      {
        value: "moonshot-v1-8k-vision-preview",
        label: "Moonshot V1 8k Vision Preview",
      },
      {
        value: "moonshot-v1-32k-vision-preview",
        label: "Moonshot V1 32k Vision Preview",
      },
      {
        value: "moonshot-v1-128k-vision-preview",
        label: "Moonshot V1 128k Vision Preview",
      },

      // Kimi Latest 模型
      { value: "kimi-latest", label: "Kimi Latest (128k Vision)" },
    ],
  },
  "google-aistudio": {
    name: "Google AI Studio",
    defaultUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: [
      // Gemini 3 系列模型
      { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
      {
        value: "gemini-3-pro-image-preview",
        label: "Gemini 3 Pro Image Preview",
      },

      // Gemini 2.5 及以下系列模型
      { value: "gemini-pro", label: "Gemini Pro" },
      { value: "gemini-pro-vision", label: "Gemini Pro Vision" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro Latest" },
      { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash Latest" },
    ],
  },
};

const props = defineProps({
  platform: {
    type: String,
    default: "OpenAI",
  },
});

const config = ref({
  apiKey: "",
  baseURL: "",
  platformName: "",
  description: "",
});

const isSaving = ref(false);
const saveStatus = ref("");

// 自定义模型管理
const customModels = ref<Models[]>([]);
const editingModel = ref<Models | null>(null);
const isEditingModel = ref(false);
const modelForm = ref({
  value: "",
  label: "",
  apiPath: "",
  tags: [] as string[],
  description: "",
  version: "",
});
const tagInput = ref("");

// Get platform configuration
const platformConfig = ref(
  MODEL_TYPES[props.platform as keyof typeof MODEL_TYPES] || {
    name: props.platform,
    defaultUrl: "",
    models: [],
  }
);

// 预定义模型列表
const predefinedModels = computed(() => {
  return MODEL_TYPES[props.platform as keyof typeof MODEL_TYPES]?.models || [];
});

// 判断是否是自定义平台
const isCustomPlatform = computed(() => {
  return !(props.platform in MODEL_TYPES);
});

// Load configuration when component mounts or platform changes
const loadConfig = async () => {
  try {
    const savedConfig = await platformConfigStore.loadConfig(props.platform);
    if (savedConfig) {
      config.value = {
        apiKey: savedConfig.apiKey || "",
        baseURL: savedConfig.baseURL || platformConfig.value.defaultUrl,
        platformName: savedConfig.platformName || "",
        description: savedConfig.description || "",
      };

      // 分离预定义模型和自定义模型
      const loadedModels = savedConfig.models || [];
      customModels.value = loadedModels.filter(model => model.custom === true);

      // 合并预定义模型和自定义模型，自定义模型在后面
      platformConfig.value.models = [
        ...(predefinedModels.value || []),
        ...customModels.value
      ];
    } else {
      // Set default values
      config.value = {
        apiKey: "",
        baseURL: platformConfig.value.defaultUrl,
        platformName: "",
        description: "",
      };
      customModels.value = [];
      platformConfig.value.models = [...(predefinedModels.value || [])];
    }
  } catch (error) {
    console.error("Failed to load config:", error);
    config.value = {
      apiKey: "",
      baseURL: platformConfig.value.defaultUrl,
      platformName: "",
      description: "",
    };
    customModels.value = [];
    platformConfig.value.models = [...(predefinedModels.value || [])];
  }
};

// Save configuration
const saveConfig = async () => {
  isSaving.value = true;
  saveStatus.value = "保存中...";

  try {
    // 清理预定义模型，确保没有custom字段
    const cleanedPredefinedModels = (predefinedModels.value || []).map(model => ({
      value: model.value,
      label: model.label
    }));

    // 合并预定义模型和自定义模型
    const allModels = [
      ...cleanedPredefinedModels,
      ...customModels.value
    ];

    // 判断是否是自定义平台
    const isPredefined = props.platform in MODEL_TYPES;
    const platformName = isPredefined ? MODEL_TYPES[props.platform as keyof typeof MODEL_TYPES].name : config.value.platformName;
    const description = config.value.description;

    const success = await platformConfigStore.saveConfig(props.platform, {
      apiKey: config.value.apiKey,
      baseURL: config.value.baseURL,
      models: allModels,
      custom: !isPredefined,
      platformName,
      description,
    });

    if (success) {
      saveStatus.value = "保存成功！";
      // 更新显示模型列表
      platformConfig.value.models = allModels;
    } else {
      saveStatus.value = "保存失败，请重试";
    }
  } catch (error) {
    console.error("Failed to save config:", error);
    saveStatus.value = "保存失败，请重试";
  } finally {
    isSaving.value = false;
    setTimeout(() => {
      saveStatus.value = "";
    }, 3000);
  }
};

// 自定义模型管理函数
const addTag = () => {
  if (tagInput.value.trim() && !modelForm.value.tags.includes(tagInput.value.trim())) {
    modelForm.value.tags.push(tagInput.value.trim());
    tagInput.value = "";
  }
};

const removeTag = (tag: string) => {
  modelForm.value.tags = modelForm.value.tags.filter(t => t !== tag);
};

const openAddModelDialog = () => {
  editingModel.value = null;
  isEditingModel.value = true;
  modelForm.value = {
    value: "",
    label: "",
    apiPath: "",
    tags: [],
    description: "",
    version: "",
  };
};

const openEditModelDialog = (model: Models) => {
  editingModel.value = model;
  isEditingModel.value = true;
  modelForm.value = {
    value: model.value,
    label: model.label,
    apiPath: model.apiPath || "",
    tags: model.tags || [],
    description: model.description || "",
    version: model.version || "",
  };
};

const saveModel = () => {
  if (!modelForm.value.value.trim() || !modelForm.value.label.trim()) {
    alert("模型ID和显示名称为必填项");
    return;
  }

  // 检查模型ID是否已存在
  const existingModel = customModels.value.find(
    model => model.value === modelForm.value.value && model !== editingModel.value
  );
  if (existingModel) {
    alert("模型ID已存在，请使用不同的ID");
    return;
  }

  const modelData: Models = {
    value: modelForm.value.value.trim(),
    label: modelForm.value.label.trim(),
    apiPath: modelForm.value.apiPath.trim() || undefined,
    tags: modelForm.value.tags.length > 0 ? modelForm.value.tags : undefined,
    description: modelForm.value.description.trim() || undefined,
    version: modelForm.value.version.trim() || undefined,
    custom: true,
  };

  if (editingModel.value) {
    // 更新现有模型
    const index = customModels.value.findIndex(m => m === editingModel.value);
    if (index !== -1) {
      customModels.value[index] = modelData;
    }
  } else {
    // 添加新模型
    customModels.value.push(modelData);
  }

  closeModelDialog();
  // 自动保存配置
  saveConfig();
};

const deleteModel = (model: Models) => {
  if (confirm(`确定要删除自定义模型 "${model.label}" 吗？`)) {
    customModels.value = customModels.value.filter(m => m !== model);
    // 自动保存配置
    saveConfig();
  }
};

const closeModelDialog = () => {
  isEditingModel.value = false;
  editingModel.value = null;
  modelForm.value = {
    value: "",
    label: "",
    apiPath: "",
    tags: [],
    description: "",
    version: "",
  };
  tagInput.value = "";
};


// Watch for platform changes
watch(
  () => props.platform,
  () => {
    platformConfig.value = MODEL_TYPES[
      props.platform as keyof typeof MODEL_TYPES
    ] || {
      name: props.platform,
      defaultUrl: "",
      models: [],
    };
    loadConfig();
  }
);

onMounted(() => {
  loadConfig();
});
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title>{{ isCustomPlatform ? config.platformName || props.platform : platformConfig.name }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="saveConfig">
          <!-- API Key -->
          <v-text-field
            v-model="config.apiKey"
            label="API Key"
            type="password"
            placeholder="请输入API Key"
            :disabled="isSaving"
            variant="outlined"
            class="mb-4"
            density="compact"
            clearable
              hide-details="auto"
          ></v-text-field>

          <!-- Base URL -->
          <v-text-field
            v-model="config.baseURL"
            label="Base URL"
            placeholder="请输入API基础URL"
            :disabled="isSaving"
            variant="outlined"
            density="compact"
            class="mb-4"
              hide-details="auto"
          ></v-text-field>

          <!-- 自定义平台字段 -->
          <template v-if="isCustomPlatform">
            <!-- 平台名称 -->
            <v-text-field
              v-model="config.platformName"
              label="平台名称"
              placeholder="请输入平台显示名称"
              :disabled="isSaving"
              variant="outlined"
              hide-details="auto"
              density="compact"
              class="mb-4"
              required
            ></v-text-field>

            <!-- 平台描述 -->
            <v-textarea
              v-model="config.description"
              label="平台描述"
              :disabled="isSaving"
              variant="outlined"
              density="compact"
              rows="2"
              class="mb-4"
              hide-details="auto"
            ></v-textarea>
          </template>

          <!-- Available Models -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1 d-flex justify-space-between align-center">
              <span>可用模型</span>
              <v-btn
                size="small"
                variant="outlined"
                color="primary"
                @click="openAddModelDialog"
              >
                <v-icon icon="mdi-plus" size="small"></v-icon>
                添加自定义模型
              </v-btn>
            </v-card-title>
            <v-card-text style="max-height: 10rem; overflow-y: auto;">
              <!-- 预定义模型 -->
              <div v-if="predefinedModels.length > 0" class="mb-4">
                <div class="text-caption text-medium-emphasis mb-2">预定义模型</div>
                <v-chip
                  v-for="model in predefinedModels"
                  :key="model.value"
                  class="ma-1"
                  color="primary"
                  variant="outlined"
                  density="compact"
                >
                  {{ model.label }}
                </v-chip>
              </div>

              <!-- 自定义模型 -->
              <div v-if="customModels.length > 0" class="mt-4">
                <div class="text-caption text-medium-emphasis mb-2">自定义模型</div>
                <v-chip
                  v-for="model in customModels"
                  :key="model.value"
                  class="ma-1"
                  color="secondary"
                  variant="outlined"
                  density="compact"
                >
                  {{ model.label }}
                  <template #append>
                    <v-icon
                      icon="mdi-pencil"
                      size="x-small"
                      class="ml-1"
                      @click.stop="openEditModelDialog(model)"
                    ></v-icon>
                    <v-icon
                      icon="mdi-delete"
                      size="x-small"
                      class="ml-1"
                      @click.stop="deleteModel(model)"
                    ></v-icon>
                  </template>
                </v-chip>
              </div>

              <div v-if="predefinedModels.length === 0 && customModels.length === 0" class="text-caption text-medium-emphasis">
                暂无可用模型
              </div>
            </v-card-text>
          </v-card>

          <!-- Save Button and Status -->
          <div class="d-flex align-center">
            <v-btn
              type="submit"
              color="primary"
              :loading="isSaving"
              :disabled="isSaving"
              class="mr-4"
            >
              保存配置
            </v-btn>
            <span
              v-if="saveStatus"
              :class="
                saveStatus.includes('成功') ? 'text-success' : 'text-error'
              "
            >
              {{ saveStatus }}
            </span>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- 自定义模型编辑对话框 -->
    <v-dialog v-model="isEditingModel" max-width="600">
      <v-card>
        <v-card-title>
          {{ editingModel ? '编辑自定义模型' : '添加自定义模型' }}
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveModel">
            <!-- 模型ID -->
            <v-text-field
              v-model="modelForm.value"
              label="模型ID"
              placeholder="如: my-custom-model"
              required
              variant="outlined"
              density="compact"
              class="mb-3"
            ></v-text-field>

            <!-- 显示名称 -->
            <v-text-field
              v-model="modelForm.label"
              label="显示名称"
              placeholder="如: 我的自定义模型"
              required
              variant="outlined"
              density="compact"
              class="mb-3"
            ></v-text-field>

            <!-- API路径 -->
            <v-text-field
              v-model="modelForm.apiPath"
              label="API路径 (可选)"
              placeholder="如: /v1/chat/completions (默认为/chat/completions)"
              variant="outlined"
              density="compact"
              class="mb-3"
            ></v-text-field>

            <!-- 版本 -->
            <v-text-field
              v-model="modelForm.version"
              label="版本号 (可选)"
              placeholder="如: 1.0.0"
              variant="outlined"
              density="compact"
              class="mb-3"
            ></v-text-field>

            <!-- 标签 -->
            <v-card variant="outlined" class="mb-3">
              <v-card-title class="text-subtitle-1">标签 (可选)</v-card-title>
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <v-text-field
                    v-model="tagInput"
                    label="添加标签"
                    placeholder="输入标签后按回车"
                    variant="outlined"
                    density="compact"
                    hide-details="auto"
                    @keydown.enter.prevent="addTag"
                    class="mr-2"
                  ></v-text-field>
                  <v-btn @click="addTag" :disabled="!tagInput" variant="tonal">添加</v-btn>
                </div>
                <div v-if="modelForm.tags.length > 0" class="mt-2">
                  <v-chip
                    v-for="tag in modelForm.tags"
                    :key="tag"
                    class="ma-1"
                    closable
                    @click:close="removeTag(tag)"
                    variant="outlined"
                    density="compact"
                  >
                    {{ tag }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>

            <!-- 描述 -->
            <v-textarea
              v-model="modelForm.description"
              label="描述 (可选)"
              variant="outlined"
              density="compact"
              rows="2"
              class="mb-4"
            ></v-textarea>

            <!-- 操作按钮 -->
            <div class="d-flex justify-end">
              <v-btn
                variant="text"
                class="mr-2"
                @click="closeModelDialog"
              >
                取消
              </v-btn>
              <v-btn
                type="submit"
                color="primary"
              >
                保存
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>
