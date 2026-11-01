import { validateHandle, type HandleValidation } from '@love-it/shared';

/** Handle chosen at signup (email, Apple, or the edit-page claim). */
export function handleForSignup(raw: string): HandleValidation {
  return validateHandle(raw);
}
