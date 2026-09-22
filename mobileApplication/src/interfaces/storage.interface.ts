export interface StorageAdapter {
  init: () => Promise<void>;
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
}
