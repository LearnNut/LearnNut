export const DISPLAY_NAME_MAX_LENGTH = 80;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

export function normalizeDisplayName(value: string) {
  return value.trim();
}

export function getDisplayNameValidationError(value: string) {
  const normalizedName = normalizeDisplayName(value);

  if (normalizedName.length === 0) {
    return 'Enter the name you’d like us to use.';
  }

  if (Array.from(normalizedName).length > DISPLAY_NAME_MAX_LENGTH) {
    return `Keep your name to ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (CONTROL_CHARACTER_PATTERN.test(normalizedName)) {
    return 'Keep your name on one line.';
  }

  return null;
}

export function getValidDisplayName(value: unknown) {
  if (typeof value !== 'string' || getDisplayNameValidationError(value) !== null) {
    return null;
  }

  return normalizeDisplayName(value);
}

export function getMetadataDisplayName(metadata: unknown) {
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    return null;
  }

  return getValidDisplayName((metadata as Record<string, unknown>).display_name);
}

export function getFirstGivenName(displayName: string | null) {
  if (displayName === null) {
    return null;
  }

  return displayName.split(/\s+/u)[0] ?? null;
}
