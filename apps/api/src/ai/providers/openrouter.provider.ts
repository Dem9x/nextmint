import { aiConfig } from "../../config/ai.config.js";
import type { TextGenerationInput, TextGenerationResult } from "../types/ai.types.js";
import { withTimeout } from "../utils/image-utils.js";
import { ProviderConfigurationError, ProviderError, ProviderRateLimitError, ProviderTimeoutError } from "../utils/provider-errors.js";
import type { BaseAIProvider } from "./base.provider.js";

type OpenRouterResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string; code?: string };
};

export class OpenRouterProvider implements BaseAIProvider {
  name = "openrouter" as const;
  capabilities = ["text", "prompt_enhancement", "metadata", "traits"] as const;

  isConfigured() {
    return Boolean(aiConfig.openRouter.apiKey);
  }

  async generateText(input: TextGenerationInput): Promise<TextGenerationResult> {
    if (!aiConfig.openRouter.apiKey) throw new ProviderConfigurationError("Missing OPENROUTER_API_KEY");
    const model = input.model ?? aiConfig.openRouter.defaultModel;
    const response = await withTimeout(
      fetch(`${aiConfig.openRouter.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiConfig.openRouter.apiKey}`,
          "HTTP-Referer": aiConfig.openRouter.siteUrl,
          "X-Title": aiConfig.openRouter.appName,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
            { role: "user", content: input.prompt }
          ],
          temperature: input.temperature ?? 0.7,
          max_tokens: input.maxTokens ?? 700
        })
      }),
      aiConfig.defaults.requestTimeoutMs,
      "OpenRouter request timeout"
    ).catch((error) => {
      if (error instanceof Error && error.message.includes("timeout")) throw new ProviderTimeoutError("OpenRouter request timeout");
      throw error;
    });

    if (response.status === 401) throw new ProviderConfigurationError("OpenRouter API key is invalid");
    if (response.status === 402) throw new ProviderError("OPENROUTER_PAYMENT_REQUIRED", "OpenRouter credits or payment are required", false, 402);
    if (response.status === 429) throw new ProviderRateLimitError("OpenRouter rate limit reached");
    if (response.status >= 500) throw new ProviderError("OPENROUTER_PROVIDER_ERROR", `OpenRouter provider error ${response.status}`, true, response.status);
    if (!response.ok) throw new ProviderError("OPENROUTER_REQUEST_FAILED", `OpenRouter request failed with ${response.status}`, false, response.status);

    const data = (await response.json()) as OpenRouterResponse;
    if (data.error) throw new ProviderError(data.error.code ?? "OPENROUTER_ERROR", data.error.message ?? "OpenRouter error", false);
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ProviderError("OPENROUTER_EMPTY_RESPONSE", "OpenRouter returned an empty response", true);
    return {
      provider: this.name,
      model,
      text,
      raw: data,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      }
    };
  }

  enhancePrompt(input: TextGenerationInput) {
    return this.generateText({
      ...input,
      systemPrompt:
        input.systemPrompt ??
        "You are an expert NFT art director. Return concise production-ready prompt text and, when useful, a negative prompt. Avoid copyrighted character names and unsafe sexual content."
    });
  }
}
