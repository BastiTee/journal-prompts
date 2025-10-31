/**
 * Utility functions for DOM manipulation and browser-specific fixes
 */

/**
 * Forces Safari iOS to re-apply text centering after DOM changes.
 * This works around Safari's issue where it doesn't re-apply text centering
 * after dynamic content updates.
 *
 * @param element - The select element that needs centering refresh
 */
export function forceSafariCenteringRefresh(element: HTMLSelectElement): void {
  // Force Safari iOS to re-apply text centering by temporarily changing and restoring styles
  const originalDisplay = element.style.display;
  element.style.display = 'none';

  // Force a reflow
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  element.offsetHeight;

  // Restore display and trigger another reflow
  element.style.display = originalDisplay;

  // Additional Safari iOS specific fix: temporarily change text-align
  const originalTextAlign = element.style.textAlign;
  element.style.textAlign = 'left';

  // Force another reflow
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  element.offsetHeight;

  // Restore text-align to center (or remove to use CSS)
  element.style.textAlign = originalTextAlign || '';

  // Final reflow to ensure changes are applied
  setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    element.offsetHeight;
  }, 0);
}

/**
 * Validates that a DOM element exists and throws a descriptive error if not.
 *
 * @param element - The element to validate
 * @param elementName - A descriptive name for the element (used in error message)
 * @throws Error if element is null or undefined
 */
export function validateElement<T extends Element>(element: T | null, elementName: string): T {
  if (!element) {
    throw new Error(`${elementName} element not found`);
  }
  return element;
}

/**
 * Validates multiple DOM elements at once.
 *
 * @param elements - Array of [element, name] tuples to validate
 * @throws Error if any element is null or undefined
 */
export function validateElements(elements: Array<[Element | null, string]>): void {
  for (const [element, name] of elements) {
    validateElement(element, name);
  }
}

/**
 * Safely gets an element by ID with type assertion.
 *
 * @param id - The element ID
 * @param elementName - Descriptive name for error messages
 * @returns The element cast to the specified type
 */
export function getElementById<T extends HTMLElement>(id: string, elementName?: string): T {
  const element = document.getElementById(id) as T | null;
  return validateElement(element, elementName || `Element with ID '${id}'`);
}

/**
 * Safely gets an element by query selector with type assertion.
 *
 * @param selector - The CSS selector
 * @param elementName - Descriptive name for error messages
 * @returns The element cast to the specified type
 */
export function querySelector<T extends Element>(selector: string, elementName?: string): T {
  const element = document.querySelector(selector);
  return validateElement(element as T | null, elementName || `Element with selector '${selector}'`);
}