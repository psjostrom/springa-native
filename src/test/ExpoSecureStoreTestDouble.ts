const storage = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return storage.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  storage.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  storage.delete(key);
}

export async function isAvailableAsync(): Promise<boolean> {
  return true;
}
