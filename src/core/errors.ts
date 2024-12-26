export class HypersonicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HypersonicError';
  }
}

export class GitHubError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GitHubError';
    this.status = status;
  }
}

export class GitError extends HypersonicError {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}
