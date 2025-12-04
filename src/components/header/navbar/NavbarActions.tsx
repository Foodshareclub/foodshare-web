/**
 * NavbarActions - Backwards Compatibility Export
 *
 * This file re-exports the new refactored NavbarActions from organisms/
 * to maintain backwards compatibility with existing imports.
 *
 * @deprecated Import directly from organisms instead:
 * import { NavbarActions } from '@/components/header/navbar/organisms';
 */

export { NavbarActions as default, NavbarActions } from "./organisms/NavbarActions";
export type { NavbarActionsProps } from "./organisms/NavbarActions";
