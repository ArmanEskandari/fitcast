import type { Garment } from '@/domain/types';

/** Emoji + short label for each garment, for the advice-card chips. */
export const GARMENT_DISPLAY: Record<Garment, { emoji: string; label: string }> = {
  tshirt: { emoji: '👕', label: 'T-shirt' },
  longSleeve: { emoji: '👚', label: 'Long sleeve' },
  coat: { emoji: '🧥', label: 'Coat' },
  heavyCoat: { emoji: '🧥', label: 'Heavy coat' },
  raincoat: { emoji: '🧥', label: 'Raincoat' },
  scarf: { emoji: '🧣', label: 'Scarf' },
  gloves: { emoji: '🧤', label: 'Gloves' },
  hat: { emoji: '🧢', label: 'Hat' },
  sunhat: { emoji: '👒', label: 'Sun hat' },
  sunglasses: { emoji: '🕶️', label: 'Sunglasses' },
  umbrella: { emoji: '☂️', label: 'Umbrella' },
  shorts: { emoji: '🩳', label: 'Shorts' },
  pants: { emoji: '👖', label: 'Pants' },
  boots: { emoji: '🥾', label: 'Boots' },
  sneakers: { emoji: '👟', label: 'Sneakers' },
};
