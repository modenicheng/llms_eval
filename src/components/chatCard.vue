<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { platformConfigStore, chatSessionStore } from "../store";
import { chatService } from "../services/chatService";
import type { PlatformConfig, ChatSession } from "../types";

const props = defineProps({
  onDelete: {
    type: Function,
    default: () => {},
  },
  userPrompt: {
    type: String,
    default: "",
  },
  onModelSelect: {
    type: Function,
    default: () => {},
  },
  onSendMessage: {
    type: Function,
    default: () => {},
  },
  chatSessionId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits<{
  modelSelected: [platform: string, model: string];
  messageSent: [message: string];
}>();

// 已配置的服务商列表
const platformConfigs = ref<Record<string, PlatformConfig>>({});
// 选中的服务商
const selectedPlatform = ref("");
// 选中的模型
const selectedModel = ref("");
const selectedPlatformConfig = computed(() => {
  if (selectedPlatform.value && platformConfigs.value[selectedPlatform.value]) {
    return platformConfigs.value[selectedPlatform.value];
  }
  return null;
});
// 当前服务商可用的模型列表
const availableModels = computed(() => {
  if (selectedPlatformConfig.value) {
    return selectedPlatformConfig.value.models || [];
  }
  return [];
});

// 当前聊天会话
const currentChatSession = ref<ChatSession | null>(null);
const isLoading = ref(false);

// 加载已配置的服务商
const loadPlatformConfigs = async () => {
  try {
    const configs = await platformConfigStore.getAllConfigs();
    platformConfigs.value = configs;

    // 如果有配置的服务商，默认选择第一个
    const platforms = Object.keys(configs);
    if (platforms.length > 0 && platforms[0]) {
      selectedPlatform.value = platforms[0];
      const platformConfig = configs[platforms[0]];
      if (platformConfig && platformConfig.models[0]) {
        selectedModel.value = platformConfig.models[0].value;
        handleModelSelect();
      }
    }
  } catch (error) {
    console.error("Failed to load platform configs:", error);
  }
};

// 加载聊天会话
const loadChatSession = async () => {
  if (!props.chatSessionId) return;
  
  try {
    const session = await chatSessionStore.loadSession(props.chatSessionId);
    if (session) {
      currentChatSession.value = session;
      
      // 如果会话中有模型配置，更新本地状态
      if (session.modelConfig.platform && session.modelConfig.model) {
        selectedPlatform.value = session.modelConfig.platform;
        selectedModel.value = session.modelConfig.model;
      }
    }
  } catch (error) {
    console.error("Failed to load chat session:", error);
  }
};

// 处理服务商选择变化
const handlePlatformChange = () => {
  selectedModel.value = "";
  if (selectedPlatform.value && availableModels.value[0]) {
    selectedModel.value = availableModels.value[0].value;
  }
  handleModelSelect();
};

// 处理模型选择变化
const handleModelChange = () => {
  handleModelSelect();
};

// 通知父组件模型选择
const handleModelSelect = () => {
  if (selectedPlatform.value && selectedModel.value) {
    emit("modelSelected", selectedPlatform.value, selectedModel.value);
    props.onModelSelect(selectedPlatform.value, selectedModel.value);
    
    // 更新聊天会话配置
    updateChatSessionConfig();
  }
};

// 更新聊天会话配置
const updateChatSessionConfig = async () => {
  if (!currentChatSession.value || !selectedPlatform.value || !selectedModel.value) return;
  
  try {
    await chatSessionStore.updateSession(currentChatSession.value.id, {
      modelConfig: {
        platform: selectedPlatform.value,
        model: selectedModel.value,
      },
    });
  } catch (error) {
    console.error("Failed to update chat session config:", error);
  }
};

// 发送消息给AI
const sendMessage = async (message: string) => {
  if (!selectedPlatformConfig.value || !selectedModel.value || !currentChatSession.value) {
    console.error("No platform, model, or chat session selected");
    return;
  }

  // 开始加载状态
  isLoading.value = true;

  try {
    // 创建用户消息
    const userMessage = {
      id: Date.now().toString(),
      role: "user" as const,
      content: message,
      timestamp: new Date(),
    };

    // 更新聊天会话
    const updatedMessages = [...(currentChatSession.value.messages || []), userMessage];
    await chatSessionStore.updateSession(currentChatSession.value.id, {
      messages: updatedMessages,
    });

    // 通知父组件
    emit("messageSent", message);
    props.onSendMessage(message);

    // 创建空的AI消息用于流式更新
    const aiMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant" as const,
      content: "",
      timestamp: new Date(),
    };

    const messagesWithAI = [...updatedMessages, aiMessage];
    await chatSessionStore.updateSession(currentChatSession.value.id, {
      messages: messagesWithAI,
    });

    // 转换消息格式
    const openAIMessages = chatService.convertToOpenAIMessages(
      updatedMessages.map(msg => ({
        type: msg.role,
        content: msg.content,
      }))
    );

    // 发送流式请求
    await chatService.sendChatRequest(
      selectedPlatformConfig.value,
      selectedModel.value,
      openAIMessages,
      async (chunk) => {
        // 流式更新AI回复
        const currentSession = await chatSessionStore.loadSession(currentChatSession.value!.id);
        if (currentSession) {
          const updatedMessages = [...currentSession.messages];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content += chunk;
            await chatSessionStore.updateSession(currentChatSession.value!.id, {
              messages: updatedMessages,
            });
          }
        }
      }
    );

    // 更新使用量统计（这里需要从API响应中获取实际使用量）
    // const currentSession = await chatSessionStore.loadSession(currentChatSession.value.id);
    // if (currentSession) {
    //   // 这里应该从API响应中获取实际的token使用量
    //   // 暂时使用估算值
    //   const estimatedTokens = Math.ceil(message.length / 4) + Math.ceil(currentSession.messages[currentSession.messages.length - 1].content.length / 4);
      
    //   await chatSessionStore.updateSession(currentChatSession.value.id, {
    //     usage: {
    //       promptTokens: currentSession.usage.promptTokens + Math.ceil(message.length / 4),
    //       completionTokens: currentSession.usage.completionTokens + Math.ceil(currentSession.messages[currentSession.messages.length - 1].content.length / 4),
    //       totalTokens: currentSession.usage.totalTokens + estimatedTokens,
    //     },
    //   });
    // }

  } catch (error) {
    console.error("Failed to send message:", error);
    
    // 更新错误消息
    const currentSession = await chatSessionStore.loadSession(currentChatSession.value!.id);
    if (currentSession && currentSession.messages.length > 0) {
      const updatedMessages = [...currentSession.messages];
      const lastMessage = updatedMessages[updatedMessages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        lastMessage.content = "抱歉，请求失败，请稍后重试。";
        await chatSessionStore.updateSession(currentChatSession.value!.id, {
          messages: updatedMessages,
        });
      }
    }
  } finally {
    isLoading.value = false;
  }
};

// 监听父组件传入的prompt
watch(
  () => props.userPrompt,
  (newPrompt) => {
    if (newPrompt && newPrompt.trim()) {
      sendMessage(newPrompt.trim());
    }
  }
);

// 监听聊天会话ID变化
watch(
  () => props.chatSessionId,
  (newSessionId) => {
    if (newSessionId) {
      loadChatSession();
    }
  }
);

const handleDelete = () => {
  props.onDelete();
};

// 计算属性：显示的消息列表
const displayMessages = computed(() => {
  if (!currentChatSession.value) return [];
  
  return currentChatSession.value.messages.map((msg) => ({
    ...msg,
    time: new Date(msg.timestamp).toLocaleTimeString(),
  }));
});

// 计算属性：使用量统计
const usageStats = computed(() => {
  if (!currentChatSession.value) return null;
  
  return currentChatSession.value.usage;
});

// 组件挂载时加载配置
onMounted(async () => {
  await loadPlatformConfigs();
  if (props.chatSessionId) {
    await loadChatSession();
  }
});
</script>

<template>
  <v-card elevation="2">
    <!-- 卡片头部 -->
    <v-card-title class="d-flex justify-space-between align-center">
      <span>{{ selectedPlatformConfig?.platform || "未选择服务商" }}</span>
      <v-btn color="error" variant="text" size="small" @click="handleDelete">
        移除
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <!-- 服务商和模型选择 -->
    <v-card-text class="pb-0">
      <v-select
        v-model="selectedPlatform"
        :items="
          Object.keys(platformConfigs).map((key) => ({
            title: key,
            value: key,
          }))
        "
        item-title="title"
        item-value="value"
        label="选择服务商"
        density="compact"
        variant="outlined"
        @update:model-value="handlePlatformChange"
      ></v-select>
      <v-select
        v-model="selectedModel"
        :items="availableModels"
        item-title="label"
        item-value="value"
        label="选择模型"
        density="compact"
        variant="outlined"
        :disabled="!selectedPlatform"
        @update:model-value="handleModelChange"
      ></v-select>
    </v-card-text>

    <!-- 使用量统计 -->
    <v-card-text v-if="usageStats" class="py-1">
      <div class="text-caption text-grey">
        使用量: {{ usageStats.promptTokens }} / {{ usageStats.completionTokens }} / {{ usageStats.totalTokens }}
      </div>
    </v-card-text>

    <!-- 聊天消息区域 -->
    <v-card-text class="chat-messages" style="height: 300px; overflow-y: auto">
      <div
        v-for="(message, index) in displayMessages"
        :key="index"
        :class="[
          'message-bubble',
          message.role === 'user' ? 'user-message' : '',
        ]"
      >
        <div class="message-content">
          {{ message.content }}
        </div>
        <div class="message-time">
          {{ message.time }}
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-indicator">
        <v-progress-circular
          indeterminate
          color="primary"
          size="20"
          width="2"
        ></v-progress-circular>
        <span class="ml-2">AI 正在思考...</span>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>

.chat-messages {
  padding: 12px;
}

.message-bubble {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 0.6rem;
  border-bottom-right-radius: 0;
}

.user-message {
  background-color: #e0e0e0;
  margin-left: auto;
  text-align: right;
}

.message-content {
  word-wrap: break-word;
}

.message-time {
  font-size: 0.75rem;
  opacity: 0.7;
  margin-top: 4px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  color: #666;
}
</style>
