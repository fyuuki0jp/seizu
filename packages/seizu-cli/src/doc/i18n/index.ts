import { en } from './en';
import { ja } from './ja';
import type { Locale, Messages } from './types';

export type { Locale, Messages } from './types';

const locales: Record<Locale, Messages> = { en, ja };

export function getMessages(locale: Locale = 'en'): Messages {
  return locales[locale];
}
