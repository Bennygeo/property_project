import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Promise<boolean> | Observable<boolean>;
}

/**
 * Accidental Navigation Guard for multi-stage forms (e.g. Post Property 7-stage wizard).
 * Prompts the user with an in-app confirmation modal before navigating away with active draft progress.
 */
export const postPropertyLeaveGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (component && typeof component.canDeactivate === 'function') {
    return component.canDeactivate();
  }
  return true;
};
