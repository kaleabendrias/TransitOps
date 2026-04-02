import { describe, it, expect } from 'vitest';
import { renderTemplate } from '@domain/models/notification';

describe('Dual-format template interpolation', () => {
  it('replaces {{double-brace}} variables', () => {
    expect(renderTemplate('Hi {{name}}!', { name: 'Alice' })).toBe('Hi Alice!');
  });

  it('replaces {single-brace} variables (prompt format)', () => {
    expect(renderTemplate('Trip {tripId} scored {score}', { tripId: 'T42', score: '95' }))
      .toBe('Trip T42 scored 95');
  });

  it('handles mixed formats in one template', () => {
    expect(renderTemplate('{{greeting}} {name}, your score is {{score}}', { greeting: 'Hello', name: 'Bob', score: '80' }))
      .toBe('Hello Bob, your score is 80');
  });

  it('leaves unknown {{double}} placeholders intact', () => {
    expect(renderTemplate('{{unknown}}', {})).toBe('{{unknown}}');
  });

  it('leaves unknown {single} placeholders intact', () => {
    expect(renderTemplate('{missing}', {})).toBe('{missing}');
  });

  it('does not double-process {{braces}} as {braces}', () => {
    // {{name}} should be replaced, not turned into {name} and then processed
    expect(renderTemplate('{{name}}', { name: 'OK' })).toBe('OK');
  });

  it('handles empty variables map', () => {
    expect(renderTemplate('Hi {name} {{role}}', {})).toBe('Hi {name} {{role}}');
  });

  it('handles template with no placeholders', () => {
    expect(renderTemplate('Plain text', { name: 'X' })).toBe('Plain text');
  });
});
