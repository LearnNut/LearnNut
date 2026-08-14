import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@learnnut/saved-sources/v1';
const STORAGE_VERSION = 1 as const;

export const SOURCE_LIMITS = {
  url: 2048,
  label: 100,
  folder: 100,
} as const;

export type ReviewOutcome = 'remembered' | 'revisit';

export type SourceReview = Readonly<{
  readyAt: string;
  dueAt: string;
  lastReviewedAt?: string;
  lastOutcome?: ReviewOutcome;
}>;

export const SOURCE_REVIEW_INTERVAL_DAYS = {
  remembered: 7,
  revisit: 1,
} as const satisfies Readonly<Record<ReviewOutcome, number>>;

export type SavedSource = Readonly<{
  id: string;
  url: string;
  label: string;
  folder?: string;
  createdAt: string;
  review?: SourceReview;
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

function isReviewOutcome(value: unknown): value is ReviewOutcome {
  return value === 'remembered' || value === 'revisit';
}

function getScheduledReviewDueAt(reviewedAt: string, outcome: ReviewOutcome) {
  const reviewedAtTimestamp = Date.parse(reviewedAt);
  const dueAtTimestamp =
    reviewedAtTimestamp + SOURCE_REVIEW_INTERVAL_DAYS[outcome] * 24 * 60 * 60 * 1000;

  if (!Number.isFinite(dueAtTimestamp)) {
    return null;
  }

  try {
    return new Date(dueAtTimestamp).toISOString();
  } catch {
    return null;
  }
}

function isSourceReview(value: unknown): value is SourceReview {
  if (!isRecord(value)) {
    return false;
  }

  const allowedKeys = new Set(['readyAt', 'dueAt', 'lastReviewedAt', 'lastOutcome']);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    return false;
  }

  const { dueAt, lastOutcome, lastReviewedAt, readyAt } = value;

  if (
    typeof readyAt !== 'string' ||
    !isIsoDate(readyAt) ||
    typeof dueAt !== 'string' ||
    !isIsoDate(dueAt)
  ) {
    return false;
  }

  const hasLastReviewedAt = lastReviewedAt !== undefined;
  const hasLastOutcome = lastOutcome !== undefined;

  if (hasLastReviewedAt !== hasLastOutcome) {
    return false;
  }

  if (!hasLastReviewedAt) {
    return dueAt === readyAt;
  }

  return (
    typeof lastReviewedAt === 'string' &&
    isIsoDate(lastReviewedAt) &&
    isReviewOutcome(lastOutcome) &&
    dueAt === getScheduledReviewDueAt(lastReviewedAt, lastOutcome)
  );
}

function isSavedSource(value: unknown): value is SavedSource {
  if (!isRecord(value)) {
    return false;
  }

  const { createdAt, folder, id, label, review, url } = value;

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
    isIsoDate(createdAt) &&
    (review === undefined || isSourceReview(review))
  );
}

function cloneSavedSource(source: SavedSource): SavedSource {
  return {
    ...source,
    ...(source.review === undefined ? {} : { review: { ...source.review } }),
  };
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

  return parsedValue.sources.map(cloneSavedSource);
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

export function getSavedSource(id: string): Promise<SavedSource | null> {
  return runInOrder(async () => {
    if (typeof id !== 'string' || id.length === 0 || id !== id.trim()) {
      return null;
    }

    const sources = await readStoredSources();

    return sources.find((source) => source.id === id) ?? null;
  });
}

export function isSourceReviewDue(source: SavedSource, now: Date = new Date()) {
  if (!isSourceReview(source.review)) {
    return false;
  }

  const nowTimestamp = now.getTime();

  return Number.isFinite(nowTimestamp) && Date.parse(source.review.dueAt) <= nowTimestamp;
}

export function getDueReviewSources(
  sources: readonly SavedSource[],
  now: Date = new Date(),
): SavedSource[] {
  return sources
    .filter((source) => isSourceReviewDue(source, now))
    .map(cloneSavedSource)
    .sort((left, right) => {
      const dueAtDifference =
        Date.parse(left.review?.dueAt ?? '') - Date.parse(right.review?.dueAt ?? '');

      if (dueAtDifference !== 0) {
        return dueAtDifference;
      }

      const createdAtDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);

      if (createdAtDifference !== 0) {
        return createdAtDifference;
      }

      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
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

export function markSourceReadyForReview(id: string): Promise<SavedSource | null> {
  return runInOrder(async () => {
    if (typeof id !== 'string' || id.length === 0 || id !== id.trim()) {
      throw new SourceStorageError('invalid-source', 'A valid source ID is required.');
    }

    const existingSources = await readStoredSources();
    const sourceIndex = existingSources.findIndex((source) => source.id === id);

    if (sourceIndex === -1) {
      return null;
    }

    const source = existingSources[sourceIndex];

    if (source.review !== undefined) {
      return cloneSavedSource(source);
    }

    const readyAt = new Date().toISOString();
    const updatedSource: SavedSource = {
      ...source,
      review: {
        readyAt,
        dueAt: readyAt,
      },
    };
    const updatedSources = [...existingSources];
    updatedSources[sourceIndex] = updatedSource;

    await writeStoredSources(updatedSources);

    return cloneSavedSource(updatedSource);
  });
}

export function recordSourceReviewOutcome(
  id: string,
  outcome: ReviewOutcome,
): Promise<SavedSource | null> {
  return runInOrder(async () => {
    if (typeof id !== 'string' || id.length === 0 || id !== id.trim()) {
      throw new SourceStorageError('invalid-source', 'A valid source ID is required.');
    }

    if (!isReviewOutcome(outcome)) {
      throw new SourceStorageError('invalid-source', 'A valid review outcome is required.');
    }

    const existingSources = await readStoredSources();
    const sourceIndex = existingSources.findIndex((source) => source.id === id);

    if (sourceIndex === -1) {
      return null;
    }

    const source = existingSources[sourceIndex];

    if (source.review === undefined) {
      throw new SourceStorageError('invalid-source', 'This source is not ready for review.');
    }

    const reviewedAtDate = new Date();

    if (!isSourceReviewDue(source, reviewedAtDate)) {
      throw new SourceStorageError('invalid-source', 'This source is not due for review yet.');
    }

    const lastReviewedAt = reviewedAtDate.toISOString();
    const dueAt = getScheduledReviewDueAt(lastReviewedAt, outcome);

    if (dueAt === null) {
      throw new SourceStorageError('invalid-source', 'The next review date could not be scheduled.');
    }

    const updatedSource: SavedSource = {
      ...source,
      review: {
        readyAt: source.review.readyAt,
        dueAt,
        lastReviewedAt,
        lastOutcome: outcome,
      },
    };
    const updatedSources = [...existingSources];
    updatedSources[sourceIndex] = updatedSource;

    await writeStoredSources(updatedSources);

    return cloneSavedSource(updatedSource);
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
