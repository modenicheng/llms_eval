type PlatformConfig = {
  platform: string;
  apiKey: string;
  baseURL: string;
  models: Models[];
  // 新增字段用于区分平台类型
  custom?: boolean; // 是否为自定义平台
  platformName?: string; // 平台显示名称（自定义平台需要）
  description?: string; // 平台描述
};

// 平台元数据类型（用于预定义平台）
type PlatformMeta = {
  id: string; // 平台标识符，与PlatformConfig.platform对应
  name: string; // 平台显示名称
  defaultUrl: string; // 默认API基础URL
  description?: string; // 平台描述
  predefinedModels: Models[]; // 预定义模型列表
};

type Models = {
  value: string;
  label: string;
  apiPath?: string; // 自定义API端点路径，默认为/chat/completions
  tags?: string[]; // 模型标签，如["推理型", "代码型", "多模态"]
  description?: string; // 模型描述
  version?: string; // 模型版本
  custom?: boolean; // 是否为用户自定义模型
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

interface RouteMeta {
  title?: string;
  visible?: boolean;
  icon?: string;
}

interface RouteItem {
  path: string;
  name?: string;
  meta: RouteMeta;
}

export type {
  PlatformConfig,
  PlatformMeta,
  Models,
  EvalSession,
  ChatCardConfig,
  ChatSession,
  ChatMessage,
  UsageStats,
  RouteMeta,
  RouteItem,
};
