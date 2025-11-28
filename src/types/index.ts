type PlatformConfig = {
  platform: string;
  apiKey: string;
  baseURL: string;
  models: Models[];
};

type Models = {
  value: string;
  label: string;
};

// 聊天消息类型
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoningContent?: string; // 推理内容
  timestamp: Date;
  tokens?: number;
};

// 使用量统计类型
type UsageStats = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
};

// 聊天会话类型
type ChatSession = {
  id: string;
  evalSessionId: string;
  chatCardId: string;
  messages: ChatMessage[];
  usage: UsageStats;
  modelConfig: {
    platform: string;
    model: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

// 评测会话类型
type EvalSession = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  chatCards: ChatCardConfig[];
  chatSessionIds: string[]; // 关联的聊天会话ID列表
};

// 聊天卡片配置类型
type ChatCardConfig = {
  id: string;
  platform: string;
  model: string;
  chatSessionId?: string; // 当前关联的聊天会话ID
};

export type {
  PlatformConfig,
  Models,
  EvalSession,
  ChatCardConfig,
  ChatSession,
  ChatMessage,
  UsageStats,
};
