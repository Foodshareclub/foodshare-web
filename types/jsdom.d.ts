/**
 * Ambient declarations for `jsdom`.
 *
 * `jsdom` ships no types of its own, and the rich-text test imports it to
 * give DOMPurify a window it will actually sanitise against. Without these
 * declarations the import does not type-check:
 *
 *     error TS7016: Could not find a declaration file for module 'jsdom'.
 *
 * The test needs two things from it — a window, and a way to close that
 * window afterwards — and the window has to satisfy DOMPurify's `WindowLike`,
 * which asks for a particular set of constructors rather than for the DOM
 * `Window` interface as a whole. The declaration below gives the window the
 * `Window & typeof globalThis` type, which is what `WindowLike` is built
 * from.
 *
 * This is the same kind of file as `bun-modules.d.ts` beside it: a
 * hand-written declaration for a module whose types are not otherwise
 * available, so that the checker can see the whole tree.
 */
declare module "jsdom" {
  export interface JSDOMOptions {
    url?: string;
    referrer?: string;
    contentType?: string;
    pretendToBeVisual?: boolean;
  }

  export class JSDOM {
    constructor(html?: string, options?: JSDOMOptions);
    readonly window: Window & typeof globalThis;
    serialize(): string;
  }
}
