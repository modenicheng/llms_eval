<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ChatCard from "../components/chatCard.vue";
import { evalSessionStore, chatSessionStore } from "../store";

import type { EvalSession, ChatCardConfig } from "../types";

// 路由
const route = useRoute();
const router = useRouter();

// 当前评测会话
const currentSession = ref<EvalSession | null>(null);
// 聊天卡片列表
const chatCards = ref<
  Array<{
    id: string;
    config: ChatCardConfig;
    userPrompt: string;
  }>
>([]);
// 统一输入框内容
const globalPrompt = ref("");

// 创建新的评测会话，返回会话ID
const createNewSession = async (): Promise<string> => {
  try {
    const sessionId = await evalSessionStore.createSession({
      name: `评测会话 ${new Date().toLocaleString()}`,
      chatCards: [],
      chatSessionIds: [],
    });
    return sessionId;
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }
};

// 加载评测会话
const loadSession = async (sessionId: string) => {
  const session = await evalSessionStore.loadSession(sessionId);
  if (session) {
    currentSession.value = session;

    // 根据会话配置创建聊天卡片
    chatCards.value = session.chatCards.map((cardConfig) => ({
      id: cardConfig.id,
      config: cardConfig,
      userPrompt: "",
    }));
  }
};

// 保存会话到存储
const saveSession = async () => {
  if (!currentSession.value) return;

  try {
    await evalSessionStore.updateSession(currentSession.value.id, {
      name: currentSession.value.name,
      chatCards: currentSession.value.chatCards,
      chatSessionIds: currentSession.value.chatSessionIds,
    });
  } catch (error) {
    console.error("Failed to save session:", error);
  }
};

// 添加新的聊天卡片
const addChatCard = async () => {
  let sessionId: string;

  if (!currentSession.value) {
    // 如果没有当前会话，先创建新会话
    try {
      sessionId = await createNewSession();

      const newCardId = Date.now().toString();
      const newCardConfig: ChatCardConfig = {
        id: newCardId,
        platform: "",
        model: "",
      };

      // 创建对应的聊天会话
      const chatSessionId = await chatSessionStore.createSession({
        evalSessionId: sessionId,
        chatCardId: newCardId,
        messages: [],
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        modelConfig: {
          platform: "",
          model: "",
        },
      });

      // 更新卡片配置
      newCardConfig.chatSessionId = chatSessionId;

      // 创建初始会话数据
      const newSession: EvalSession = {
        id: sessionId,
        name: `评测会话 ${new Date().toLocaleString()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        chatCards: [newCardConfig],
        chatSessionIds: [chatSessionId],
      };

      // 保存新会话到store
      await evalSessionStore.updateSession(sessionId, {
        name: newSession.name,
        chatCards: newSession.chatCards,
        chatSessionIds: newSession.chatSessionIds,
      });

      // 跳转到新会话的路由
      router.push(`/chat/${sessionId}`);
      return;
    } catch (error) {
      console.error("Failed to add chat card with new session:", error);
      return;
    }
  } else {
    // 有当前会话，继续原有逻辑
    sessionId = currentSession.value.id;

    const newCardId = Date.now().toString();
    const newCardConfig: ChatCardConfig = {
      id: newCardId,
      platform: "",
      model: "",
    };

    // 创建对应的聊天会话
    const chatSessionId = await chatSessionStore.createSession({
      evalSessionId: sessionId,
      chatCardId: newCardId,
      messages: [],
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      modelConfig: {
        platform: "",
        model: "",
      },
    });

    // 更新卡片配置
    newCardConfig.chatSessionId = chatSessionId;

    // 添加到当前会话
    currentSession.value.chatCards.push(newCardConfig);
    currentSession.value.chatSessionIds.push(chatSessionId);

    // 添加到本地状态
    chatCards.value.push({
      id: newCardId,
      config: newCardConfig,
      userPrompt: "",
    });

    // 保存会话
    saveSession();
  }
};

// 删除聊天卡片
const deleteChatCard = async (cardId: string) => {
  if (!currentSession.value) return;

  // 找到要删除的卡片配置
  const cardConfig = currentSession.value.chatCards.find(
    (card) => card.id === cardId
  );

  // 删除对应的聊天会话
  if (cardConfig?.chatSessionId) {
    await chatSessionStore.deleteSession(cardConfig.chatSessionId);
  }

  // 从当前会话中移除
  currentSession.value.chatCards = currentSession.value.chatCards.filter(
    (card) => card.id !== cardId
  );
  currentSession.value.chatSessionIds =
    currentSession.value.chatSessionIds.filter(
      (sessionId) => sessionId !== cardConfig?.chatSessionId
    );

  // 从本地状态中移除
  chatCards.value = chatCards.value.filter((card) => card.id !== cardId);

  // 保存会话
  saveSession();
};

// 更新聊天卡片配置
const updateChatCardConfig = async (
  cardId: string,
  platform: string,
  model: string
) => {
  if (!currentSession.value) return;

  // 更新会话中的配置
  const cardConfig = currentSession.value.chatCards.find(
    (card) => card.id === cardId
  );
  if (cardConfig) {
    cardConfig.platform = platform;
    cardConfig.model = model;

    // 更新对应的聊天会话配置
    if (cardConfig.chatSessionId) {
      await chatSessionStore.updateSession(cardConfig.chatSessionId, {
        modelConfig: {
          platform,
          model,
        },
      });
    }
  }

  // 保存会话
  saveSession();
};


// 发送统一prompt给所有卡片
const sendGlobalPrompt = () => {
  if (!globalPrompt.value.trim()) return;

  // 设置所有卡片的userPrompt，触发发送
  chatCards.value.forEach((card) => {
    card.userPrompt = globalPrompt.value;
  });

  // 清空输入框
  globalPrompt.value = "";
};

// 处理键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    sendGlobalPrompt();
  }
};

// 监听卡片消息发送
const handleMessageSent = (message: string) => {
  console.log(`发送消息: ${message}`);
};

// 监听卡片模型选择
const handleModelSelect = (platform: string, model: string) => {
  console.log(`选择了服务商: ${platform}, 模型: ${model}`);
};

// 根据路由参数加载或清空会话
const handleRouteChange = async () => {
  const sessionId = route.params.sessionId as string;
  if (sessionId) {
    // 如果路由中有sessionId参数，则加载该会话
    await loadSession(sessionId);
  } else {
    // 否则清空当前会话，显示空白状态
    currentSession.value = null;
    chatCards.value = [];
  }
};

// 组件挂载时加载会话
onMounted(async () => {
  await handleRouteChange();
});

// 监听路由参数变化，重新加载会话
watch(() => route.params.sessionId, async () => {
  await handleRouteChange();
});

// 监听会话变化，自动保存
watch(
  currentSession,
  () => {
    if (currentSession.value) {
      saveSession();
    }
  },
  { deep: true }
);
</script>

<template>
  <v-container>
    <!-- 顶部输入区域 -->
    <v-card class="mb-4" elevation="2">
      <v-card-text>
        <v-textarea
          v-model="globalPrompt"
          label="输入prompt (Ctrl+Enter发送)"
          variant="outlined"
          rows="3"
          auto-grow
          hide-details
          @keydown="handleKeydown"
        ></v-textarea>
        <v-btn
          prepend-icon="mdi-send"
          color="primary"
          @click="sendGlobalPrompt"
          :disabled="!globalPrompt.trim() || chatCards.length === 0"
          class="mt-2"
        >
          发送
        </v-btn>
        <v-btn prepend-icon="mdi-plus" class="mt-2 ml-2" color="primary" @click="addChatCard">
          添加模型
        </v-btn>
      </v-card-text>
    </v-card>

    <!-- 聊天卡片区域 -->
    <v-row>
      <v-col
        v-for="card in chatCards"
        :key="card.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <ChatCard
          :userPrompt="card.userPrompt"
          :chatSessionId="card.config.chatSessionId"
          :modelConfig="card.config"
          :onDelete="() => deleteChatCard(card.id)"
          :onModelSelect="
            (platform: string, model: string) => updateChatCardConfig(card.id, platform, model)
          "
          :onSendMessage="handleMessageSent"
          @modelSelected="handleModelSelect"
          @messageSent="handleMessageSent"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
