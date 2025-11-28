<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { platformConfigStore } from "../store";

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
      { value: "deepseek-v3-1-terminus", label: "DeepSeek V3.1 Terminus" },
    ],
  },
  tongyi: {
    name: "通义千问",
    defaultUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      // Qwen3 系列模型
      { value: "qwen3", label: "通义千问 3" },
      { value: "qwen3-12b", label: "通义千问 3 12B" },
      { value: "qwen3-72b", label: "通义千问 3 72B" },
      { value: "qwen3-plus", label: "通义千问 3 Plus" },
      { value: "qwen3-max", label: "通义千问 3 Max" },
      { value: "qwen3-turbo", label: "通义千问 3 Turbo" },
      { value: "qwen3-code", label: "通义千问 3 代码" },
      { value: "qwen3-math", label: "通义千问 3 数学" },
      { value: "qwen3-reasoning", label: "通义千问 3 推理" },
      { value: "qwen3-longcontext", label: "通义千问 3 长上下文" },

      // Qwen3 多模态模型
      { value: "qwen3-vl", label: "通义千问 3 视觉" },
      { value: "qwen3-vl-plus", label: "通义千问 3 视觉 Plus" },
      { value: "qwen3-vl-max", label: "通义千问 3 视觉 Max" },
      { value: "qwen3-audio", label: "通义千问 3 音频" },
      { value: "qwen3-video", label: "通义千问 3 视频" },

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
});

const isSaving = ref(false);
const saveStatus = ref("");

// Get platform configuration
const platformConfig = ref(
  MODEL_TYPES[props.platform as keyof typeof MODEL_TYPES] || {
    name: props.platform,
    defaultUrl: "",
    models: [],
  }
);

// Load configuration when component mounts or platform changes
const loadConfig = async () => {
  try {
    const savedConfig = await platformConfigStore.loadConfig(props.platform);
    if (savedConfig) {
      config.value = {
        apiKey: savedConfig.apiKey || "",
        baseURL: savedConfig.baseURL || platformConfig.value.defaultUrl,
      };
    } else {
      // Set default values
      config.value = {
        apiKey: "",
        baseURL: platformConfig.value.defaultUrl,
      };
    }
  } catch (error) {
    console.error("Failed to load config:", error);
    config.value = {
      apiKey: "",
      baseURL: platformConfig.value.defaultUrl,
    };
  }
};

// Save configuration
const saveConfig = async () => {
  isSaving.value = true;
  saveStatus.value = "保存中...";

  try {
    const success = await platformConfigStore.saveConfig(props.platform, {
      apiKey: config.value.apiKey,
      baseURL: config.value.baseURL,
      models: platformConfig.value.models,
    });

    if (success) {
      saveStatus.value = "保存成功！";
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
      <v-card-title>{{ platformConfig.name }}</v-card-title>
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
          ></v-text-field>

          <!-- Available Models -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-subtitle-1">可用模型</v-card-title>
            <v-card-text>
              <v-chip
                v-for="model in platformConfig.models"
                :key="model.value"
                class="ma-1"
                color="primary"
                variant="outlined"
                density="compact"
              >
                {{ model.label }}
              </v-chip>
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
  </v-container>
</template>
