/*
 * The browser has no Node 'crypto'. The only user is the reader for Madara's "protected" chapters
 * (core/staticParse.ts protectedChapterImages), which catches the error and simply finds no pages that way.
 * None of the web version's sites use it.
 */
const unsupported = (): never => {
  throw new Error('not available on the web')
}
export const createHash = unsupported
export const createDecipheriv = unsupported
export default { createHash, createDecipheriv }
