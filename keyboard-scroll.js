/* Navigate the record fields vertically and scroll the page outside data entry. */
(() => {
  'use strict';

  const fieldSelector = '#vehiclePreset, input[data-key], select[data-key], textarea[data-key]';

  document.addEventListener('keydown', event => {
    const { key, target } = event;
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey ||
        event.metaKey || event.shiftKey || !(target instanceof Element)) return;

    const arrow = key === 'ArrowDown' || key === 'ArrowUp';
    if (!arrow && key !== 'PageDown' && key !== 'PageUp') return;
    const direction = key.endsWith('Down') ? 1 : -1;

    const formBody = target.closest('#testDialog[open] #dialogBody');
    if (arrow && formBody && target.matches(fieldSelector)) {
      // An expanded native menu uses the arrows to choose an option.
      if (target.matches('select') && window.CSS?.supports('selector(select:open)') &&
          target.matches(':open')) return;

      const fields = [...formBody.querySelectorAll(fieldSelector)];
      let index = fields.indexOf(target) + direction;
      event.preventDefault();
      while (index >= 0 && index < fields.length) {
        const field = fields[index];
        if (!field.matches(':disabled, [readonly], [type="hidden"]') && !field.closest('[hidden], [inert]')) {
          field.focus();
          break;
        }
        index += direction;
      }
      return;
    }

    if (target.closest('textarea,select,input[type="range"],input[type="date"],input[type="time"],[role="combobox"],[role="listbox"],[role="slider"]') ||
        target.isContentEditable) return;
    const dialog = [...document.querySelectorAll('dialog[open]')].at(-1);
    const surface = dialog ? dialog.querySelector('.dialog-body') || dialog : document.scrollingElement;
    if (!surface || surface.scrollHeight <= surface.clientHeight) return;
    const step = arrow ? 64 : Math.max(48, surface.clientHeight * .8);
    event.preventDefault();
    surface.scrollBy({ top: step * direction, behavior: 'auto' });
  });
})();
