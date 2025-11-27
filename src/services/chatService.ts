import axios from "axios";
import type { PlatformConfig } from "../types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

class ChatService {
  async sendChatRequest(
    platformConfig: PlatformConfig,
    model: string,
    messages: ChatMessage[],
    onStreamChunk?: (content: string) => void
  ): Promise<string> {
    const requestData: ChatCompletionRequest = {
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2048,
      stream: !!onStreamChunk,
      frequency_penalty: 0,
      presence_penalty: 0,
    };

    try {
      if (onStreamChunk) {
        // 流式请求
        return await this.sendStreamRequest(
          platformConfig,
          requestData,
          onStreamChunk
        );
      } else {
        // 普通请求
        return await this.sendNormalRequest(platformConfig, requestData);
      }
    } catch (error) {
      console.error("Chat request failed:", error);
      throw new Error(
        `Chat request failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async sendNormalRequest(
    platformConfig: PlatformConfig,
    requestData: ChatCompletionRequest
  ): Promise<string> {
    const response = await axios.post<ChatCompletionResponse>(
      `${platformConfig.baseURL}/chat/completions`,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${platformConfig.apiKey}`,
        },
      }
    );

    return response.data.choices[0]?.message?.content || "";
  }

  private async sendStreamRequest(
    platformConfig: PlatformConfig,
    requestData: ChatCompletionRequest,
    onChunk: (content: string) => void
  ): Promise<string> {
    const response = await fetch(`${platformConfig.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${platformConfig.apiKey}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              return fullContent;
            }

            try {
              const parsed: StreamChunk = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;

              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (error) {
              // 忽略解析错误，继续处理其他数据
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  // 将聊天记录转换为OpenAI格式的消息
  convertToOpenAIMessages(
    messages: Array<{ type: "user" | "assistant"; content: string }>
  ): ChatMessage[] {
    return messages.map((msg) => ({
      role: msg.type === "user" ? "user" : "assistant",
      content: msg.content,
    }));
  }
}

export const chatService = new ChatService();
