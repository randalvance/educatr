export class AIConfigError extends Error {
  override name = 'AIConfigError';
}

export class AIStreamError extends Error {
  override name = 'AIStreamError';
}

export class AIValidationError extends Error {
  override name = 'AIValidationError';
  constructor(
    message: string,
    public readonly rawOutput: string,
    public readonly issues?: unknown,
  ) {
    super(message);
  }
}
