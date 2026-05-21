import { describe, expect, it } from 'vitest';
import {
  buildPlanAssistAccessFile,
  parsePlanAssistAccessFile,
} from '../domain/planAssistAccess';

describe('Plan Assist access files', () => {
  it('parses the Vyntax access file format', () => {
    const settings = parsePlanAssistAccessFile(
      JSON.stringify({
        vyntaxPlanAssist: {
          serviceKey: 'public-demo-key',
          model: 'gpt-5.2',
        },
      }),
    );

    expect(settings.apiKey).toBe('public-demo-key');
    expect(settings.model).toBe('gpt-5.2');
  });

  it('builds an importable access file', () => {
    const fileText = buildPlanAssistAccessFile({
      apiKey: 'public-demo-key',
      model: 'gpt-5-mini',
    });

    expect(parsePlanAssistAccessFile(fileText)).toEqual({
      apiKey: 'public-demo-key',
      model: 'gpt-5-mini',
    });
  });

  it('rejects files without access', () => {
    expect(() => parsePlanAssistAccessFile('{}')).toThrow(
      'does not include Plan Assist access',
    );
  });
});
