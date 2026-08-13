import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@learnnut/saved-sources/v1';
const STORAGE_VERSION = 1 as const;

export const SOURCE_LIMITS = {
  url: 2048,
  label: 100,
  folder: 100,
} as const;

export type SavedSource = Readonly<{
  id: string;
  url: string;
  label: string;
  folder?: string;
  createdAt: string;
}>;

export type NewSavedSource = Readonly<Pick<SavedSource, 'url' | 'label' | 'folder'>>;

type StoredSources = Readonly<{
  version: typeof STORAGE_VERSION;
  sources: SavedSource[];
}>;

type SourceStorageErrorCode =
  | 'corrupt-data'
  | 'invalid-source'
  | 'read-failed'
  | 'write-failed';

export class SourceStorageError extends Error {
  readonly code: SourceStorageErrorCode;

  constructor(code: SourceStorageErrorCode, message: string) {
    super(message);
    this.name = 'SourceStorageError';
    this.code = code;
  }
}

let operationQueue: Promise<void> = Promise.resolve();

function runInOrder<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationQueue.then(operation);

  operationQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidSourceUrl(value: string) {
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }

  try {
    const parsedUrl = new URL(value);

    return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && Boolean(parsedUrl.hostname);
  } catch {
    return false;
  }
}

function isIsoDate(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isSavedSource(value: unknown): value is SavedSource {
  if (!isRecord(value)) {
    return false;
  }

  const { createdAt, folder, id, label, url } = value;

  return (
    typeof id === 'string' &&
    id === id.trim() &&
    id.trim().length > 0 &&
    typeof url === 'string' &&
    url === url.trim() &&
    isValidSourceUrl(url) &&
    url.length <= SOURCE_LIMITS.url &&
    typeof label === 'string' &&
    label === label.trim() &&
    label.length > 0 &&
    label.length <= SOURCE_LIMITS.label &&
    (folder === undefined ||
      (typeof folder === 'string' &&
        folder === folder.trim() &&
        folder.length > 0 &&
        folder.length <= SOURCE_LIMITS.folder)) &&
    typeof createdAt === 'string' &&
    isIsoDate(createdAt)
  );
}

async function readStoredSources(): Promise<SavedSource[]> {
  let storedValue: string | null;

  try {
    storedValue = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    throw new SourceStorageError('read-failed', 'The local Library could not be read.');
  }

  if (storedValue === null) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(storedValue) as unknown;
  } catch {
    throw new SourceStorageError('corrupt-data', 'The local Library data is not valid JSON.');
  }

  if (
    !isRecord(parsedValue) ||
    parsedValue.version !== STORAGE_VERSION ||
    !Array.isArray(parsedValue.sources) ||
    !parsedValue.sources.every(isSavedSource)
  ) {
    throw new SourceStorageError('corrupt-data', 'The local Library data has an unexpected format.');
  }

  const sourceIds = parsedValue.sources.map((source) => source.id);

  if (new Set(sourceIds).size !== sourceIds.length) {
    throw new SourceStorageError('corrupt-data', 'The local Library contains duplicate source IDs.');
  }

  return parsedValue.sources.map((source) => ({ ...source }));
}

async function writeStoredSources(sources: SavedSource[]) {
  const storedValue: StoredSources = {
    version: STORAGE_VERSION,
    sources,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedValue));
  } catch {
    throw new SourceStorageError('write-failed', 'The local Library could not be updated.');
  }
}

function newestFirst(sources: SavedSource[]) {
  return [...sources].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
}

function createSourceId(existingSources: SavedSource[]) {
  const existingIds = new Set(existingSources.map((source) => source.id));
  const baseId = `source_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  let sourceId = baseId;
  let suffix = 1;

  while (existingIds.has(sourceId)) {
    sourceId = `${baseId}_${suffix}`;
    suffix += 1;
  }

  return sourceId;
}

export function getSavedSources(): Promise<SavedSource[]> {
  return runInOrder(async () => newestFirst(await readStoredSources()));
}

export function saveSource(input: NewSavedSource): Promise<SavedSource> {
  return runInOrder(async () => {
    if (
      !isRecord(input) ||
      typeof input.url !== 'string' ||
      typeof input.label !== 'string' ||
      (input.folder !== undefined && typeof input.folder !== 'string')
    ) {
      throw new SourceStorageError('invalid-source', 'A valid URL and label are required.');
    }

    const url = input.url.trim();
    const label = input.label.trim();
    const folder = input.folder?.trim();

    if (
      !isValidSourceUrl(url) ||
      url.length > SOURCE_LIMITS.url ||
      label.length === 0 ||
      label.length > SOURCE_LIMITS.label ||
      (folder !== undefined && folder.length > SOURCE_LIMITS.folder)
    ) {
      throw new SourceStorageError('invalid-source', 'A valid URL and label are required.');
    }

    const existingSources = await readStoredSources();
    const source: SavedSource = {
      id: createSourceId(existingSources),
      url,
      label,
      ...(folder ? { folder } : {}),
      createdAt: new Date().toISOString(),
    };

    await writeStoredSources([source, ...existingSources]);

    return source;
  });
}

export function deleteSource(id: string): Promise<void> {
  return runInOrder(async () => {
    const existingSources = await readStoredSources();
    const remainingSources = existingSources.filter((source) => source.id !== id);

    if (remainingSources.length === existingSources.length) {
      return;
    }

    await writeStoredSources(remainingSources);
  });
}
