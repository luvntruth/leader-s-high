import { describe, expect, it } from 'vitest';

import { getCharacterAvatar } from '../services/characterAvatars';

describe('character avatars', () => {
  it('uses the shared generated avatar path for female scenarios', () => {
    const avatar = getCharacterAvatar('박지민', 'boundaries');

    expect(avatar).toContain('https://api.dicebear.com/7.x/adventurer/svg');
    expect(avatar).not.toContain('/characters/');
  });
});
