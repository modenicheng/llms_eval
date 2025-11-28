<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { evalSessionStore, chatSessionStore } from "../store";
import type { EvalSession, ChatSession, ChatMessage } from "../types";
import MarkdownIt from "markdown-it";

// 路由
const router = useRouter();

// 创建 markdown 渲染器实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

// 状态管理
const evalSessions = ref<EvalSession[]>([]);
const selectedSession = ref<EvalSession | null>(null);
const chatSessions = ref<ChatSession[]>([]);
const isLoading = ref(false);
const expandedSessions = ref<Set<string>>(new Set());
const expandedReasoningIds = ref<Set<string>>(new Set());

// 计算属性
const hasSelectedSession = computed(() => selectedSession.value !== null);
const totalMessages = computed(() => {
  return chatSessions.value.reduce((total, session) => {
    return total + session.messages.length;
  }, 0);
});


// 加载评测会话列表
const loadEvalSessions = async () => {
  isLoading.value = true;
  try {
    evalSessions.value = await evalSessionStore.getAllSessions();
    // 按创建时间倒序排列
    evalSessions.value.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Failed to load evaluation sessions:", error);
  } finally {
    isLoading.value = false;
  }
};

// 选择评测会话
const selectSession = async (session: EvalSession) => {
  selectedSession.value = session;
  await loadChatSessions(session.id);
};

// 加载聊天会话
const loadChatSessions = async (evalSessionId: string) => {
  isLoading.value = true;
  try {
    chatSessions.value = await chatSessionStore.getSessionsByEvalSession(
      evalSessionId
    );
    // 按创建时间排序
    chatSessions.value.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  } catch (error) {
    console.error("Failed to load chat sessions:", error);
  } finally {
    isLoading.value = false;
  }
};

// 切换会话展开状态
const toggleSessionExpansion = (sessionId: string) => {
  if (expandedSessions.value.has(sessionId)) {
    expandedSessions.value.delete(sessionId);
  } else {
    expandedSessions.value.add(sessionId);
  }
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

// 导出为CSV
const exportToCSV = () => {
  if (!selectedSession.value) return;

  const csvData = [];

  // 添加表头
  csvData.push(
    [
      "评测会话ID",
      "评测会话名称",
      "聊天会话ID",
      "模型平台",
      "模型名称",
      "消息角色",
      "消息内容",
      "推理内容",
      "时间戳",
      "提示令牌",
      "完成令牌",
      "总令牌数",
      "成本",
    ].join(",")
  );

  // 添加数据行
  chatSessions.value.forEach((chatSession) => {
    chatSession.messages.forEach((message) => {
      const row = [
        selectedSession.value!.id,
        selectedSession.value!.name,
        chatSession.id,
        chatSession.modelConfig.platform,
        chatSession.modelConfig.model,
        message.role,
        `"${message.content.replace(/"/g, '""')}"`, // 转义引号
        message.reasoningContent
          ? `"${message.reasoningContent.replace(/"/g, '""')}"`
          : "",
        message.timestamp.toISOString(),
        chatSession.usage.promptTokens,
        chatSession.usage.completionTokens,
        chatSession.usage.totalTokens,
        chatSession.usage.cost || 0,
      ];
      csvData.push(row.join(","));
    });
  });

  // 创建并下载CSV文件
  const csvContent = csvData.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `eval_session_${selectedSession.value.id}_${new Date().getTime()}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 删除评测会话
const deleteSession = async (sessionId: string, event?: Event) => {
  if (event) {
    event.stopPropagation();
  }

  if (confirm("确定要删除这个评测会话吗？此操作不可恢复。")) {
    try {
      // 先删除关联的聊天会话
      const chatSessionsToDelete =
        await chatSessionStore.getSessionsByEvalSession(sessionId);
      for (const chatSession of chatSessionsToDelete) {
        await chatSessionStore.deleteSession(chatSession.id);
      }

      // 删除评测会话
      await evalSessionStore.deleteSession(sessionId);

      // 如果删除的是当前选中的会话，清除选中状态
      if (selectedSession.value && selectedSession.value.id === sessionId) {
        selectedSession.value = null;
        chatSessions.value = [];
      }

      // 重新加载会话列表
      await loadEvalSessions();
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("删除失败，请重试");
    }
  }
};

// 恢复会话到聊天界面
const restoreSession = (sessionId: string) => {
  router.push(`/chat/${sessionId}`);
};

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleString("zh-CN");
};

// 组件挂载
onMounted(() => {
  loadEvalSessions();
});
</script>

<template>
  <v-container>
    <v-row>
      <!-- 左侧：评测会话列表 -->
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title class="d-flex justify-space-between align-center">
            <span>评测会话历史</span>
            <v-btn
              icon
              @click="loadEvalSessions"
              :loading="isLoading"
              size="small"
            >
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <v-card-text class="pa-0">
            <v-list>
              <v-list-item
                v-for="session in evalSessions"
                :key="session.id"
                @click="selectSession(session)"
                :active="selectedSession?.id === session.id"
                class="session-item"
              >
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-chat-processing</v-icon>
                </template>

                <v-list-item-title class="text-body-1">
                  {{ session.name }}
                </v-list-item-title>

                <v-list-item-subtitle class="text-caption">
                  {{ formatDate(session.createdAt) }}
                </v-list-item-subtitle>

                <template v-slot:append>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    @click="deleteSession(session.id, $event)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>

              <v-list-item v-if="evalSessions.length === 0 && !isLoading">
                <v-list-item-title class="text-center text-grey">
                  暂无评测会话记录
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- 右侧：会话详情 -->
      <v-col cols="12" md="8">
        <v-card v-if="hasSelectedSession">
          <v-card-title class="d-flex justify-space-between align-center">
            <div>
              <span>{{ selectedSession?.name }}</span>
              <v-chip size="small" class="ml-2" color="primary">
                {{ chatSessions.length }} 个聊天会话
              </v-chip>
            </div>

            <div>
              <v-btn
                color="success"
                @click="restoreSession(selectedSession!.id)"
                class="mr-2"
              >
                <v-icon start>mdi-restore</v-icon>
                恢复会话
              </v-btn>
              <v-btn
                color="primary"
                @click="exportToCSV"
                :disabled="chatSessions.length === 0"
                class="mr-2"
              >
                <v-icon start>mdi-download</v-icon>
                导出CSV
              </v-btn>
            </div>
          </v-card-title>

          <v-card-subtitle>
            创建时间:
            {{ selectedSession ? formatDate(selectedSession.createdAt) : "" }}
          </v-card-subtitle>

          <v-divider></v-divider>

          <v-card-text>
            <!-- 统计信息 -->
            <v-row class="mb-4">
              <v-col cols="8" sm="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center">
                    <div class="text-h6">{{ chatSessions.length }}</div>
                    <div class="text-caption text-grey">聊天会话</div>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="8" sm="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center">
                    <div class="text-h6">{{ totalMessages }}</div>
                    <div class="text-caption text-grey">总消息数</div>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="8" sm="4">
                <v-card variant="outlined">
                  <v-card-text class="text-center">
                    <div class="text-h6">
                      {{ selectedSession?.chatCards.length || 0 }}
                    </div>
                    <div class="text-caption text-grey">模型配置</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- 聊天会话列表 -->
            <v-expansion-panels v-if="chatSessions.length > 0">
              <v-expansion-panel
                v-for="chatSession in chatSessions"
                :key="chatSession.id"
                @click="toggleSessionExpansion(chatSession.id)"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100">
                    <div>
                      <span class="font-weight-medium">
                        {{ chatSession.modelConfig.platform }} -
                        {{ chatSession.modelConfig.model }}
                      </span>
                      <v-chip size="small" class="ml-2" color="secondary">
                        {{ chatSession.messages.length }} 条消息
                      </v-chip>
                    </div>
                    <div class="text-caption text-grey">
                      {{ formatDate(chatSession.createdAt) }}
                    </div>
                  </div>
                </v-expansion-panel-title>

                <v-expansion-panel-text>
                  <!-- 聊天消息显示 -->
                  <div class="chat-messages-preview">
                    <div
                      v-for="message in chatSession.messages"
                      :key="message.id"
                      :class="[
                        'message-preview',
                        message.role === 'user'
                          ? 'user-message'
                          : 'assistant-message',
                      ]"
                    >
                      <div class="message-role">
                        {{ message.role === "user" ? "用户" : "AI助手" }}
                      </div>

                      <!-- 推理内容显示（仅对助手消息） -->
                      <div
                        v-if="
                          message.role === 'assistant' &&
                          hasReasoningContent(message)
                        "
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
                            :class="{
                              expanded: isReasoningExpanded(message.id),
                            }"
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
                        v-if="message.role === 'user'"
                        style="white-space: pre-wrap"
                      >
                        {{ message.content }}
                      </div>
                      <div
                        class="message-content"
                        v-else
                        v-html="md.render(message.content)"
                      ></div>
                      <div class="message-time text-caption text-grey">
                        {{ formatDate(message.timestamp) }}
                      </div>
                    </div>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>

            <v-alert v-else type="info" variant="outlined" class="mt-4">
              该评测会话暂无聊天记录
            </v-alert>
          </v-card-text>
        </v-card>

        <v-card v-else>
          <v-card-text class="text-center py-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4"
              >mdi-history</v-icon
            >
            <div class="text-h6 text-grey">选择评测会话查看详情</div>
            <div class="text-body-2 text-grey mt-2">
              从左侧列表中选择一个评测会话来查看详细的聊天记录和统计数据
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.session-item {
  border-bottom: 1px solid #e0e0e0;
}

.session-item:last-child {
  border-bottom: none;
}

.chat-messages-preview {
  max-height: 400px;
  overflow-y: auto;
}

.message-preview {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 8px;
}

.user-message {
  background-color: #e3f2fd;
  border-left: 4px solid #1976d2;
}

.assistant-message {
  background-color: #f5f5f5;
  border-left: 4px solid #4caf50;
}

.message-role {
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
  margin-bottom: 4px;
}

.message-content {
  font-size: 0.875rem;
  line-height: 1.4;
}

.message-time {
  font-size: 0.7rem;
  margin-top: 4px;
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
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.reasoning-content.expanded {
  max-height: 500px;
  padding: 8px 12px;
  border-top: 1px solid #e0e0e0;
}

.reasoning-preview-text {
  font-size: 0.875rem;
  color: #5f6368;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

/* 滚动条样式 */
.chat-messages-preview::-webkit-scrollbar {
  width: 6px;
}

.chat-messages-preview::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.chat-messages-preview::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.chat-messages-preview::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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
