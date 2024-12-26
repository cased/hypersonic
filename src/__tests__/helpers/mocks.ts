// No need to import Octokit since we're just defining types

// Create a more specific type that matches what we actually use
type MockedGitHub = {
  git: {
    getRef: jest.Mock;
    createRef: jest.Mock;
    updateRef: jest.Mock;
  };
  repos: {
    getContent: jest.Mock;
    createOrUpdateFileContents: jest.Mock;
    deleteFile: jest.Mock;
    get: jest.Mock;
  };
  pulls: {
    create: jest.Mock;
    requestReviewers: jest.Mock;
    updateBranch: jest.Mock;
    merge: jest.Mock;
    update: jest.Mock;
  };
  issues: {
    addLabels: jest.Mock;
  };
};

export function createMockOctokit(): MockedGitHub {
  return {
    git: {
      getRef: jest.fn(),
      createRef: jest.fn(),
      updateRef: jest.fn(),
    },
    repos: {
      getContent: jest.fn(),
      createOrUpdateFileContents: jest.fn(),
      deleteFile: jest.fn(),
      get: jest.fn(),
    },
    pulls: {
      create: jest.fn(),
      requestReviewers: jest.fn(),
      updateBranch: jest.fn(),
      merge: jest.fn(),
      update: jest.fn(),
    },
    issues: {
      addLabels: jest.fn(),
    },
  };
}
