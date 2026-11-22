/* Navigate the record fields vertically and scroll the page outside data entry. */
(() => {
  'use strict';

  const fieldSelector = '#vehiclePreset, input[data-key], select[data-key], textarea[data-key]';

  function canEnter(field) {
    return !field.matches(':disabled, [readonly], [type="hidden"]') && !field.closest('[hidden], [inert]');
  }

  function focusField(field) {
    field.focus({ preventScroll: true });
    if (field.matches('input[type="text"], textarea')) {
      field.setSelectionRange(field.value.length, field.value.length);
    }
    field.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  document.addEventListener('keydown', event => {
    const { target } = event;
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey ||
        event.metaKey || event.shiftKey || !(target instanceof Element)) return;

    const key = event.key && event.key !== 'Unidentified' ? event.key : event.code;
    const arrow = key === 'ArrowDown' || key === 'ArrowUp';
    if (!arrow && key !== 'PageDown' && key !== 'PageUp') return;
    const direction = key.endsWith('Down') ? 1 : -1;

    const formBody = target.closest('#testDialog[open] #dialogBody');
    if (arrow && formBody && (target === formBody || target.matches(fieldSelector))) {
      // An expanded native menu uses the arrows to choose an option.
      if (target.matches('select') && window.CSS?.supports('selector(select:open)') &&
          target.matches(':open')) return;

      const fields = [...formBody.querySelectorAll(fieldSelector)];
      if (fields.length) {
        event.preventDefault();
        const ordered = direction > 0 ? fields : fields.reverse();
        if (target === formBody) {
          const bounds = formBody.getBoundingClientRect();
          const visible = ordered.find(field => {
            const rect = field.getBoundingClientRect();
            return canEnter(field) && rect.bottom > bounds.top && rect.top < bounds.bottom;
          });
          const next = visible || ordered.find(canEnter);
          if (next) focusField(next);
        } else {
          const next = ordered.slice(ordered.indexOf(target) + 1).find(canEnter);
          if (next) focusField(next);
        }
        return;
      }
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
