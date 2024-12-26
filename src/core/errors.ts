export class HypersonicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HypersonicError';
  }
}

export class GitHubError extends HypersonicError {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class DiffError extends HypersonicError {
  constructor(message: string) {
    super(message);
    this.name = 'DiffError';
  }
}

export class ConfigError extends HypersonicError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export class LLMError extends HypersonicError {
  constructor(message: string) {
    super(message);
    this.name = 'LLMError';
  }
}

export class GitError extends HypersonicError {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}
