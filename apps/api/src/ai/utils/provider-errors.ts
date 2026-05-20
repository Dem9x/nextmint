export class ProviderError extends Error {
  constructor(
    public code: string,
    message: string,
    public retryable = false,
    public statusCode?: number
  ) {
    super(message);
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(message = "Provider rate limit reached") {
    super("PROVIDER_RATE_LIMITED", message, true, 429);
  }
}

export class ProviderConfigurationError extends ProviderError {
  constructor(message: string) {
    super("PROVIDER_NOT_CONFIGURED", message, false, 500);
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(message = "Provider request timed out") {
    super("PROVIDER_TIMEOUT", message, true, 504);
  }
}

export class FreeTierLimitError extends ProviderError {
  constructor(message = "Daily free AI generation limit reached. Try again later or configure a paid provider key.") {
    super("FREE_TIER_LIMIT_REACHED", message, false, 402);
  }
}

export function normalizeProviderError(error: unknown) {
  if (error instanceof ProviderError) return error;
  if (error instanceof Error) return new ProviderError("PROVIDER_ERROR", error.message, true);
  return new ProviderError("PROVIDER_ERROR", "Unknown provider error", true);
}
