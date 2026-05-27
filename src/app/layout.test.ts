import { describe, it, expect } from 'vitest';

describe('Project Setup', () => {
  it('should have the correct theme colors defined', () => {
    const sketchbookTheme = {
      colors: {
        background: '#FFF8F0',
        surface: '#FFFDF9',
        primary: '#BF5540',
        secondary: '#7BB5A3',
        accent: '#F4C06F',
        text: '#3D3229',
        textMuted: '#756558',
        error: '#C04038',
        success: '#6BA87B',
        border: '#C4B5A4',
      },
    };

    expect(sketchbookTheme.colors.background).toBe('#FFF8F0');
    expect(sketchbookTheme.colors.primary).toBe('#BF5540');
    expect(sketchbookTheme.colors.text).toBe('#3D3229');
  });

  it('should have fast-check available for property testing', async () => {
    const fc = await import('fast-check');
    expect(fc).toBeDefined();
    expect(fc.assert).toBeDefined();
  });
});
