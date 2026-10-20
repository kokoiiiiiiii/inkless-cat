import { MAX_RESUME_TEXT_LENGTH, MAX_SECTION_ITEMS } from '@shared/lib/limits';
import { isErr } from '@shared/lib/result';
import { describe, expect, it } from 'vitest';

import { RESUME_SCHEMA_VERSION } from '../schema/resume';
import { migrateResume } from './resume';

describe('migrateResume', () => {
  it('migrates legacy resume payloads into the canonical schema', () => {
    const result = migrateResume({
      personal: {
        fullName: 'Legacy User',
      },
      projects: [
        {
          name: 'Legacy Project',
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemaVersion).toBe(RESUME_SCHEMA_VERSION);
      expect(result.value.projects[0]?.id).toBeTruthy();
      expect(result.value.projects[0]?.highlights).toEqual([]);
      expect(result.value.customSections).toEqual([]);
    }
  });

  it('rejects invalid resume payloads', () => {
    const result = migrateResume({
      personal: 'invalid',
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_RESUME');
    }
  });

  it('rejects oversized fields and collection counts', () => {
    const longName = migrateResume({
      personal: { fullName: 'x'.repeat(MAX_RESUME_TEXT_LENGTH + 1) },
    });
    const oversizedCollection = migrateResume({
      personal: {},
      projects: Array.from({ length: MAX_SECTION_ITEMS + 1 }, (_, index) => ({
        name: `p${index}`,
      })),
    });

    expect(isErr(longName)).toBe(true);
    expect(isErr(oversizedCollection)).toBe(true);
  });
});
