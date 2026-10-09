const formatError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const logger = {
  warn: (message: string, error?: unknown): void => {
    console.warn(error === undefined ? message : `${message}: ${formatError(error)}`);
  },
  error: (message: string, error?: unknown): void => {
    console.error(error === undefined ? message : `${message}: ${formatError(error)}`);
  }
};
