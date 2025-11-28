<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { platformConfigStore, chatSessionStore } from "../store";
import { chatService } from "../services/chatService";
import type { PlatformConfig, ChatSession, ChatMessage } from "../types";
import MarkdownIt from "markdown-it";

// 展开的推理消息ID
const expandedReasoningIds = ref<Set<string>>(new Set());

// 聊天消息容器引用

// 创建 markdown 渲染器实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

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
  // 新增：父组件主动设置的模型配置
  modelConfig: {
    type: Object as () => { platform: string; model: string },
    default: () => ({ platform: "", model: "" }),
  },
});

const emit = defineEmits<{
  modelSelected: [platform: string, model: string];
  messageSent: [message: string];
}>();

const state = ref({
  platformConfigs: {} as Record<string, PlatformConfig>,
  selectedPlatform: "",
  selectedModel: "",
  currentChatSession: null as ChatSession | null,
  isLoading: false,
});

// 计算属性
const selectedPlatformConfig = computed(() => {
  const { selectedPlatform, platformConfigs } = state.value;
  return selectedPlatform && platformConfigs[selectedPlatform]
    ? platformConfigs[selectedPlatform]
    : null;
});

const messages = computed(() => {
  return state.value.currentChatSession?.messages || [];
});

// 核心方法
const loadPlatformConfigs = async (autoSelectDefault = true) => {
  try {
    const configs = await platformConfigStore.getAllConfigs();
    state.value.platformConfigs = configs;

    // 只有在需要时才自动选择默认值
    if (autoSelectDefault) {
      const platforms = Object.keys(configs);
      if (platforms[0]) {
        state.value.selectedPlatform = platforms[0];
        const firstModel = configs[platforms[0]]?.models?.[0];
        if (firstModel) {
          state.value.selectedModel = firstModel.value;
          handleModelSelect();
        }
      }
    }
  } catch (error) {
    console.error("Failed to load platform configs:", error);
  }
};

const loadChatSession = async () => {
  if (!props.chatSessionId) return;

  try {
    const session = await chatSessionStore.loadSession(props.chatSessionId);
    if (session) {
      state.value.currentChatSession = session;

      // 恢复会话中的模型配置
      if (session.modelConfig.platform && session.modelConfig.model) {
        state.value.selectedPlatform = session.modelConfig.platform;
        state.value.selectedModel = session.modelConfig.model;
      }
    }
  } catch (error) {
    console.error("Failed to load chat session:", error);
  }
};

const handleModelSelect = () => {
  const { selectedPlatform, selectedModel } = state.value;
  if (selectedPlatform && selectedModel) {
    emit("modelSelected", selectedPlatform, selectedModel);
    props.onModelSelect(selectedPlatform, selectedModel);
    updateChatSessionConfig();
  }
};

const updateChatSessionConfig = async () => {
  const { currentChatSession, selectedPlatform, selectedModel } = state.value;
  if (!currentChatSession || !selectedPlatform || !selectedModel) return;

  try {
    await chatSessionStore.updateSession(currentChatSession.id, {
      modelConfig: {
        platform: selectedPlatform,
        model: selectedModel,
      },
    });
  } catch (error) {
    console.error("Failed to update chat session config:", error);
  }
};

// 简化的流式消息发送
const sendMessage = async (message: string) => {
  const { selectedPlatform, selectedModel, currentChatSession } = state.value;

  if (!selectedPlatform || !selectedModel || !currentChatSession) {
    console.error("No platform, model, or chat session selected");
    return;
  }

  state.value.isLoading = true;

  try {
    // 创建用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    // 创建空的AI消息用于流式更新
    const aiMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    // 更新会话消息
    const updatedMessages = [...messages.value, userMessage, aiMessage];
    await chatSessionStore.updateSession(currentChatSession.id, {
      messages: updatedMessages,
    });

    // 重新加载会话以获取最新状态
    await loadChatSession();

    // 通知父组件
    emit("messageSent", message);
    props.onSendMessage(message);

    // 转换消息格式（排除空的AI消息）
    const messagesForAPI = updatedMessages.slice(0, -1);
    const openAIMessages = chatService.convertToOpenAIMessages(
      messagesForAPI.map((msg) => ({
        type: msg.role,
        content: msg.content,
      }))
    );

    // 发送流式请求
    const fullResponse = await chatService.sendChatRequest(
      selectedPlatformConfig.value!,
      selectedModel,
      openAIMessages,
      (chunk, reasoningChunk) => {
        // 直接更新当前会话中的AI消息内容
        if (state.value.currentChatSession) {
          const messages = [...state.value.currentChatSession.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            // 更新内容或推理内容
            if (chunk) {
              lastMessage.content += chunk;
            }
            if (reasoningChunk) {
              lastMessage.reasoningContent =
                (lastMessage.reasoningContent || "") + reasoningChunk;
            }
            // 触发响应式更新
            state.value.currentChatSession.messages = [...messages];
            // 在流式输出时滚动到底部
            scrollToBottom();
          }
        }
      }
    );

    // 流式完成后更新最终内容
    if (state.value.currentChatSession) {
      const messages = [...state.value.currentChatSession.messages];
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        lastMessage.content = fullResponse;
        await chatSessionStore.updateSession(currentChatSession.id, {
          messages: messages,
        });
      }
    }
  } catch (error) {
    console.error("Failed to send message:", error);

    // 处理错误情况
    if (state.value.currentChatSession) {
      const messages = [...state.value.currentChatSession.messages];
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        lastMessage.content = "抱歉，请求失败，请稍后重试。";
        await chatSessionStore.updateSession(currentChatSession.id, {
          messages: messages,
        });
        // 重新加载以更新UI
        await loadChatSession();
      }
    }
  } finally {
    state.value.isLoading = false;
  }
};

const handleDelete = () => {
  props.onDelete();
};

// 切换推理内容的展开/折叠
const toggleReasoning = (messageId: string) => {
  if (expandedReasoningIds.value.has(messageId)) {
    expandedReasoningIds.value.delete(messageId);
  } else {
    expandedReasoningIds.value.add(messageId);
  }
};

// 检查消息是否包含推理内容
const hasReasoningContent = (message: ChatMessage) => {
  return message.reasoningContent && message.reasoningContent.trim().length > 0;
};

// 检查推理内容是否已展开
const isReasoningExpanded = (messageId: string) => {
  return expandedReasoningIds.value.has(messageId);
};

// 选择模型的方法
const selectModel = (platform: string, model: string) => {
  state.value.selectedPlatform = platform;
  state.value.selectedModel = model;
  handleModelSelect();
};

// 滚动到底部
const chatMessagesRef = ref<HTMLDivElement | null>(null);

const scrollToBottom = () => {
  nextTick(() => {
    if (
      chatMessagesRef.value &&
      chatMessagesRef.value.scrollHeight -
        chatMessagesRef.value.scrollTop -
        chatMessagesRef.value?.clientHeight <
        150
    ) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
    }
  });
};

// 监听器
watch(
  () => props.userPrompt,
  (newPrompt) => {
    if (newPrompt?.trim()) {
      sendMessage(newPrompt.trim());
    }
  }
);

watch(
  () => props.chatSessionId,
  (newSessionId) => {
    if (newSessionId) {
      loadChatSession();
    }
  }
);

// 监听父组件传递的模型配置变化
watch(
  () => props.modelConfig,
  (newConfig) => {
    if (newConfig.platform && newConfig.model) {
      // 只有当配置有效时才更新
      state.value.selectedPlatform = newConfig.platform;
      state.value.selectedModel = newConfig.model;
      // 触发模型选择事件
      handleModelSelect();
    }
  },
  { deep: true }
);

// 组件挂载
onMounted(async () => {
  // 先加载平台配置，但不自动选择默认值
  await loadPlatformConfigs(false);
  if (props.chatSessionId) {
    await loadChatSession();
  }
});
</script>

<template>
  <v-card elevation="2" :loading="state.isLoading">
    <!-- 卡片头部 -->
    <v-card-title class="d-flex justify-space-between align-center">
      <v-btn color="primary" variant="outlined" size="small">
        {{ state.selectedModel || "选择模型" }}
        <v-menu activator="parent">
          <v-list>
            <v-list-item
              v-for="platform in Object.keys(state.platformConfigs)"
              :key="platform"
              link
              :active="state.selectedPlatform === platform"
            >
              <v-list-item-title>{{ platform }}</v-list-item-title>
              <template v-slot:append>
                <v-icon icon="mdi-menu-right" size="x-small"></v-icon>
              </template>

              <v-menu
                :open-on-focus="false"
                activator="parent"
                open-on-hover
                submenu
              >
                <v-list>
                  <v-list-item
                    v-for="model in state.platformConfigs[platform]?.models ||
                    []"
                    :key="model.value"
                    link
                    :active="state.selectedModel === model.value"
                    @click="selectModel(platform, model.value)"
                  >
                    <v-list-item-title>{{ model.label }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-btn>
      <v-btn color="error" variant="text" size="small" @click="handleDelete">
        移除
      </v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <!-- 聊天消息区域 -->
    <v-card-text>
      <div
        ref="chatMessagesRef"
        id="chatMessagesRef"
        class="chat-messages"
        style="height: 30rem; overflow-y: auto"
      >
        <div
          v-if="messages.length === 0"
          class="d-flex flex-column justify-center align-center ga-4"
        >
          <v-icon
            icon="mdi-message-outline"
            :size="60"
            class="opacity-70"
          ></v-icon>
          <div class="text-center opacity-80">暂无对话</div>
        </div>
        <div
          v-for="(message, _index) in messages"
          :key="message.id"
          :class="[
            'message-bubble',
            message.role === 'user' ? 'user-message' : 'assistant-message',
          ]"
        >
          <!-- 推理内容显示 -->
          <div
            v-if="message.role === 'assistant' && hasReasoningContent(message)"
            class="reasoning-section"
          >
            <div
              class="reasoning-preview"
              :class="{ expanded: isReasoningExpanded(message.id) }"
              @click="toggleReasoning(message.id)"
            >
              <div class="reasoning-header">
                <span class="reasoning-label">思考过程</span>
                <v-icon size="small">
                  {{
                    isReasoningExpanded(message.id)
                      ? "mdi-chevron-up"
                      : "mdi-chevron-down"
                  }}
                </v-icon>
              </div>
              <div
                class="reasoning-content"
                :class="{ expanded: isReasoningExpanded(message.id) }"
              >
                <div
                  v-if="isReasoningExpanded(message.id)"
                  v-html="md.render(message.reasoningContent || '')"
                ></div>
              </div>
            </div>
          </div>

          <!-- 主要消息内容 -->
          <div
            class="message-content"
            v-html="
              message.role === 'assistant'
                ? md.render(message.content)
                : message.content
            "
          ></div>
          <div class="message-time" v-if="message.role == 'assistant'">
            {{ new Date(message.timestamp).toLocaleTimeString() }}
          </div>
        </div>
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
  background-color: #e3f2fd;
  margin-left: auto;
  text-align: right;
}

.assistant-message {
  padding: 0;
  margin-right: auto;
  text-align: left;
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

/* 推理内容样式 */
.reasoning-section {
  margin-bottom: 8px;
}

.reasoning-preview {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reasoning-preview:hover {
  background-color: #f1f3f4;
}

.reasoning-preview.expanded {
  background-color: #f1f3f4;
}

.reasoning-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 0.75rem;
  color: #5f6368;
}

.reasoning-label {
  font-weight: 600;
}

.reasoning-content {
  padding: 0 12px;
  max-height: auto;
  overflow: auto;
  transition: max-height 0.3s ease;
}

.reasoning-content.expanded {
  /* max-height: 500px; */
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
}
</style>

<style>
/* Markdown 渲染样式 */
.message-content h1,
.message-content h2,
.message-content h3,
.message-content h4,
.message-content h5,
.message-content h6 {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.message-content h1 {
  font-size: 1.5em;
}

.message-content h2 {
  font-size: 1.3em;
}

.message-content h3 {
  font-size: 1.1em;
}

.message-content p {
  margin: 0.5em 0;
  line-height: 1.3;
}

.message-content ul,
.message-content ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.message-content li {
  margin: 0.25em 0;
}

.message-content blockquote {
  margin: 0.5em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #ddd;
  background-color: #f9f9f9;
  font-style: italic;
}

.message-content code {
  padding: 0.2em 0.4em;
  background-color: #f1f1f1;
  border-radius: 3px;
  font-family: "Courier New", monospace;
  font-size: 0.9em;
}

.message-content pre {
  margin: 0.5em 0;
  padding: 0.8em;
  background-color: #f8f8f8;
  border-radius: 4px;
  overflow-x: auto;
  border: 1px solid #e1e1e1;
}

.message-content pre code {
  padding: 0;
  background-color: transparent;
  border-radius: 0;
}

.message-content table {
  border-collapse: collapse;
  margin: 0.5em 0;
  width: 100%;
}

.message-content th,
.message-content td {
  padding: 0.5em;
  border: 1px solid #ddd;
  text-align: left;
}

.message-content th {
  background-color: #f5f5f5;
  font-weight: 600;
}

.message-content a {
  color: #1976d2;
  text-decoration: none;
}

.message-content a:hover {
  text-decoration: underline;
}

.message-content img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}
</style>
