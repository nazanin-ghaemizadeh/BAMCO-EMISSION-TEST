/* Plain vertical arrows move the typing caret while a test is being edited. */
(() => {
  'use strict';

  const dialog = document.getElementById('testDialog');
  const body = document.getElementById('dialogBody');
  const registerField = '#vehiclePreset, input[data-key], select[data-key], textarea[data-key]';
  const gridField = '#main .fieldgrid [data-cell]';
  let lastField = null;

  function canEnter(field) {
    return !field.matches(':disabled, [readonly], [type="hidden"]') && !field.closest('[hidden], [inert]');
  }

  body?.addEventListener('focusin', event => {
    if (event.target.matches(registerField)) lastField = event.target;
  });

  // Clicking the padding around a value should place the caret in that box.
  body?.addEventListener('click', event => {
    if (event.target.matches('.field-table td')) {
      event.target.querySelector(registerField)?.focus();
    }
  });

  function focusField(field, viewport) {
    field.focus({ preventScroll: true });
    if (document.activeElement !== field) return;
    if (field.matches('textarea') || field.type === 'text') {
      field.setSelectionRange(field.value.length, field.value.length);
    }
    const rect = field.getBoundingClientRect();
    if (viewport) {
      const bounds = viewport.getBoundingClientRect();
      if (rect.top < bounds.top) viewport.scrollTop += rect.top - bounds.top;
      else if (rect.bottom > bounds.bottom) viewport.scrollTop += rect.bottom - bounds.bottom;
    } else if (rect.top < 0 || rect.bottom > document.documentElement.clientHeight) {
      field.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function registerStep(target, direction) {
    const fields = [...body.querySelectorAll(registerField)];
    if (direction < 0) fields.reverse();
    const current = target.matches(registerField) ? target : lastField;
    const next = fields.slice(fields.indexOf(current) + 1).find(canEnter);
    if (next) focusField(next, body);
  }

  // The R83 worksheet can show several measurement columns on a wide screen.
  function worksheetStep(current, direction) {
    const start = current.getBoundingClientRect();
    const fields = [...document.querySelectorAll(gridField)];
    if (direction < 0) fields.reverse();
    const next = fields.slice(fields.indexOf(current) + 1).find(field => {
      if (!canEnter(field) || field.closest('details:not([open])')) return false;
      const rect = field.getBoundingClientRect();
      return (rect.top - start.top) * direction > 1 &&
        Math.min(rect.right, start.right) > Math.max(rect.left, start.left);
    });
    if (next) focusField(next, null);
  }

  window.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey ||
        event.metaKey || event.shiftKey) return;

    const target = event.target instanceof Element ? event.target : document.activeElement;
    if (!target) return;
    const key = event.key && event.key !== 'Unidentified' ? event.key :
      event.code || ({ 38: 'ArrowUp', 40: 'ArrowDown' })[event.keyCode];
    const down = key === 'ArrowDown' || key === 'Down';
    const arrow = down || key === 'ArrowUp' || key === 'Up';
    if (!arrow && key !== 'PageDown' && key !== 'PageUp') return;
    const direction = down || key === 'PageDown' ? 1 : -1;

    if (arrow) {
      if (target.matches('select') && window.CSS?.supports('selector(select:open)') &&
          target.matches(':open')) return;
      if (target.matches(gridField)) {
        event.preventDefault();
        worksheetStep(target, direction);
        return;
      }
      if (dialog?.open && !document.getElementById('discardDialog')?.open &&
          body.querySelector(registerField)) {
        event.preventDefault();
        registerStep(target, direction);
        return;
      }
    }

    // Page navigation on the original register remains available outside editing.
    if (!dialog || target.closest('textarea,select,input[type="range"],input[type="date"],input[type="time"],[role="combobox"],[role="listbox"],[role="slider"]') ||
        target.isContentEditable) return;
    const openDialog = [...document.querySelectorAll('dialog[open]')].at(-1);
    const surface = openDialog ? openDialog.querySelector('.dialog-body') || openDialog : document.scrollingElement;
    if (!surface || surface.scrollHeight <= surface.clientHeight) return;
    event.preventDefault();
    surface.scrollBy({top: direction * (arrow ? 64 : Math.max(48, surface.clientHeight * .8)), behavior:'auto'});
  }, true);
})();
