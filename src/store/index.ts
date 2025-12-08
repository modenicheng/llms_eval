import localforage from "localforage";
import type { PlatformConfig, PlatformMeta, EvalSession, ChatSession } from "../types";

const configStore = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "llms_eval",
  storeName: "config",
});

// 存储平台元数据（预定义平台信息）
const platformMetaStorage = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "llms_eval",
  storeName: "platform_meta",
});

// 这个存储模块是用来存储评测会话的
// 这个评测会话中会存储评测时使用的模型及其配置、每个模型对应的聊天会话（建立到聊天会话表的外键）
const evalStore = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "llms_eval",
  storeName: "eval",
});

// 此表是用来存储每个模型对应的聊天会话的
// 每个聊天会话会存储模型ID、聊天记录（JSON字符串）、评测会话ID（外键）
// 还会存有性能相关内容 :TODO:
const chatStore = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "llms_eval",
  storeName: "chat",
});

// Chat session store methods
export const chatSessionStore = {
  // Create a new chat session
  async createSession(
    session: Omit<ChatSession, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const sessionId = Date.now().toString();
      const now = new Date();
      const sessionToSave: ChatSession = {
        ...session,
        id: sessionId,
        createdAt: now,
        updatedAt: now,
      };

      // Serialize for IndexedDB
      const serializedSession = {
        ...sessionToSave,
        createdAt: sessionToSave.createdAt.toISOString(),
        updatedAt: sessionToSave.updatedAt.toISOString(),
        messages: sessionToSave.messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
      };

      await chatStore.setItem(sessionId, serializedSession);
      return sessionId;
    } catch (error) {
      console.error("Failed to create chat session:", error);
      throw error;
    }
  },

  // Update an existing chat session
  async updateSession(
    sessionId: string,
    session: Partial<Omit<ChatSession, "id" | "createdAt">>
  ): Promise<boolean> {
    try {
      const existingSession = (await chatStore.getItem(sessionId)) as
        | any
        | null;
      if (!existingSession) {
        console.error(`Chat session with ID ${sessionId} not found`);
        return false;
      }

      // Serialize arrays for IndexedDB
      const serializedSession = {
        ...session,
        updatedAt: new Date().toISOString(),
      };

      if (session.messages) {
        (serializedSession as any).messages = session.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        }));
      }

      const updatedSession = {
        ...existingSession,
        ...serializedSession,
      };

      await chatStore.setItem(sessionId, updatedSession);
      return true;
    } catch (error) {
      console.error(`Failed to update chat session ${sessionId}:`, error);
      return false;
    }
  },

  // Load a chat session by ID
  async loadSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const session = (await chatStore.getItem(sessionId)) as any | null;
      if (session) {
        // Deserialize from IndexedDB
        return {
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        } as ChatSession;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load chat session ${sessionId}:`, error);
      return null;
    }
  },

  // Get all chat sessions for an evaluation session
  async getSessionsByEvalSession(
    evalSessionId: string
  ): Promise<ChatSession[]> {
    try {
      const keys = await chatStore.keys();
      const sessions: ChatSession[] = [];

      for (const key of keys) {
        const session = (await chatStore.getItem(key)) as any | null;
        if (session && session.evalSessionId === evalSessionId) {
          sessions.push({
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          } as ChatSession);
        }
      }

      return sessions;
    } catch (error) {
      console.error(
        `Failed to load chat sessions for eval session ${evalSessionId}:`,
        error
      );
      return [];
    }
  },

  // Delete a chat session
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await chatStore.removeItem(sessionId);
      return true;
    } catch (error) {
      console.error(`Failed to delete chat session ${sessionId}:`, error);
      return false;
    }
  },
};

// Platform configuration store methods
export const platformConfigStore = {
  // Save platform configuration
  async saveConfig(platform: string, config: Omit<PlatformConfig, "platform">) {
    try {
      // Serialize the config to ensure it can be stored in IndexedDB
      const serializedConfig = {
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        models: config.models ? JSON.parse(JSON.stringify(config.models)) : [],
        custom: config.custom || false,
        platformName: config.platformName || "",
        description: config.description || "",
      };
      await configStore.setItem(platform, serializedConfig);
      return true;
    } catch (error) {
      console.error(`Failed to save config for ${platform}:`, error);
      return false;
    }
  },

  // Load platform configuration
  async loadConfig(platform: string): Promise<PlatformConfig | null> {
    try {
      const config = await configStore.getItem(platform);
      if (config) {
        // Deserialize the config
        const deserializedConfig = {
          platform,
          apiKey: (config as any).apiKey || "",
          baseURL: (config as any).baseURL || "",
          models: (config as any).models || [],
          custom: (config as any).custom || false,
          platformName: (config as any).platformName || "",
          description: (config as any).description || "",
        };
        return deserializedConfig as PlatformConfig;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load config for ${platform}:`, error);
      return null;
    }
  },

  // Get all platform configurations
  async getAllConfigs(): Promise<Record<string, PlatformConfig>> {
    try {
      const keys = await configStore.keys();
      const configs: Record<string, PlatformConfig> = {};

      for (const key of keys) {
        const config = await configStore.getItem(key);
        if (config) {
          configs[key] = {
            platform: key,
            apiKey: (config as any).apiKey || "",
            baseURL: (config as any).baseURL || "",
            models: (config as any).models || [],
            custom: (config as any).custom || false,
            platformName: (config as any).platformName || "",
            description: (config as any).description || "",
          } as PlatformConfig;
        }
      }

      return configs;
    } catch (error) {
      console.error("Failed to load all configs:", error);
      return {};
    }
  },

  // Delete platform configuration
  async deleteConfig(platform: string): Promise<boolean> {
    try {
      await configStore.removeItem(platform);
      return true;
    } catch (error) {
      console.error(`Failed to delete config for ${platform}:`, error);
      return false;
    }
  },
};

// Platform metadata store methods (用于管理预定义平台信息)
export const platformMetaStore = {
  // 初始化预定义平台元数据
  async initPredefinedPlatforms(predefinedPlatforms: PlatformMeta[]) {
    try {
      for (const platform of predefinedPlatforms) {
        await platformMetaStorage.setItem(platform.id, platform);
      }
      return true;
    } catch (error) {
      console.error("Failed to init predefined platforms:", error);
      return false;
    }
  },

  // 保存平台元数据
  async savePlatformMeta(platformMeta: PlatformMeta): Promise<boolean> {
    try {
      await platformMetaStorage.setItem(platformMeta.id, platformMeta);
      return true;
    } catch (error) {
      console.error(`Failed to save platform meta for ${platformMeta.id}:`, error);
      return false;
    }
  },

  // 获取平台元数据
  async getPlatformMeta(platformId: string): Promise<PlatformMeta | null> {
    try {
      const meta = await platformMetaStorage.getItem(platformId);
      return meta as PlatformMeta | null;
    } catch (error) {
      console.error(`Failed to get platform meta for ${platformId}:`, error);
      return null;
    }
  },

  // 获取所有平台元数据
  async getAllPlatformMetas(): Promise<PlatformMeta[]> {
    try {
      const keys = await platformMetaStorage.keys();
      const metas: PlatformMeta[] = [];

      for (const key of keys) {
        const meta = await platformMetaStorage.getItem(key);
        if (meta) {
          metas.push(meta as PlatformMeta);
        }
      }

      return metas;
    } catch (error) {
      console.error("Failed to load all platform metas:", error);
      return [];
    }
  },

  // 删除平台元数据
  async deletePlatformMeta(platformId: string): Promise<boolean> {
    try {
      await platformMetaStorage.removeItem(platformId);
      return true;
    } catch (error) {
      console.error(`Failed to delete platform meta for ${platformId}:`, error);
      return false;
    }
  },
};

// Evaluation session store methods
export const evalSessionStore = {
  // Create a new evaluation session
  async createSession(
    session: Omit<EvalSession, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    try {
      const sessionId = Date.now().toString(); // Simple ID generation
      const now = new Date();
      const sessionToSave: EvalSession = {
        ...session,
        id: sessionId,
        createdAt: now,
        updatedAt: now,
      };

      // Serialize for IndexedDB
      const serializedSession = {
        ...sessionToSave,
        createdAt: sessionToSave.createdAt.toISOString(),
        updatedAt: sessionToSave.updatedAt.toISOString(),
        chatCards: JSON.parse(JSON.stringify(sessionToSave.chatCards)),
        chatSessionIds: JSON.parse(JSON.stringify(sessionToSave.chatSessionIds)),
      };

      await evalStore.setItem(sessionId, serializedSession);
      return sessionId;
    } catch (error) {
      console.error("Failed to create evaluation session:", error);
      throw error;
    }
  },

  // Update an existing evaluation session
  async updateSession(
    sessionId: string,
    session: Partial<Omit<EvalSession, "id" | "createdAt">>
  ): Promise<boolean> {
    try {
      const existingSession = (await evalStore.getItem(sessionId)) as
        | any
        | null;
      if (!existingSession) {
        console.error(`Session with ID ${sessionId} not found`);
        return false;
      }

      // Serialize arrays for IndexedDB
      const serializedSession = {
        ...session,
        updatedAt: new Date().toISOString(),
      };

      if (session.chatCards) {
        (serializedSession as any).chatCards = JSON.parse(JSON.stringify(session.chatCards));
      }
      if (session.chatSessionIds) {
        (serializedSession as any).chatSessionIds = JSON.parse(JSON.stringify(session.chatSessionIds));
      }

      const updatedSession = {
        ...existingSession,
        ...serializedSession,
      };

      await evalStore.setItem(sessionId, updatedSession);
      return true;
    } catch (error) {
      console.error(`Failed to update session ${sessionId}:`, error);
      return false;
    }
  },

  // Load an evaluation session by ID
  async loadSession(sessionId: string): Promise<EvalSession | null> {
    try {
      const session = (await evalStore.getItem(sessionId)) as any | null;
      if (session) {
        // Deserialize from IndexedDB
        return {
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          chatCards: session.chatCards || [],
          chatSessionIds: session.chatSessionIds || [],
        } as EvalSession;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load session ${sessionId}:`, error);
      return null;
    }
  },

  // Get all evaluation sessions
  async getAllSessions(): Promise<EvalSession[]> {
    try {
      const keys = await evalStore.keys();
      const sessions: EvalSession[] = [];

      for (const key of keys) {
        const session = (await evalStore.getItem(key)) as any | null;
        if (session) {
          sessions.push({
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            chatCards: session.chatCards || [],
            chatSessionIds: session.chatSessionIds || [],
          } as EvalSession);
        }
      }

      return sessions;
    } catch (error) {
      console.error("Failed to load all sessions:", error);
      return [];
    }
  },

  // Rename an evaluation session
  async renameSession(sessionId: string, newName: string): Promise<boolean> {
    try {
      const existingSession = (await evalStore.getItem(sessionId)) as
        | any
        | null;
      if (!existingSession) {
        console.error(`Session with ID ${sessionId} not found`);
        return false;
      }

      const updatedSession = {
        ...existingSession,
        name: newName,
        updatedAt: new Date().toISOString(),
      };

      await evalStore.setItem(sessionId, updatedSession);
      return true;
    } catch (error) {
      console.error(`Failed to rename session ${sessionId}:`, error);
      return false;
    }
  },

  // Delete an evaluation session
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await evalStore.removeItem(sessionId);
      return true;
    } catch (error) {
      console.error(`Failed to delete session ${sessionId}:`, error);
      return false;
    }
  },
};
