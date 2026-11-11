/* Arrow keys scroll the active surface while editable controls retain native keyboard behavior. */
(()=>{'use strict';
 document.addEventListener('keydown',event=>{
  if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||!['ArrowDown','ArrowUp','PageDown','PageUp'].includes(event.key))return;
  const target=event.target;
  if(target instanceof Element&&(target.closest('input,textarea,select,[role="combobox"],[role="listbox"],[role="slider"],[role="spinbutton"]')||target.isContentEditable))return;
  const dialogs=[...document.querySelectorAll('dialog[open]')],dialog=dialogs.at(-1);
  const surface=dialog?dialog.querySelector('.dialog-body')||dialog:document.scrollingElement;
  if(!surface||surface.scrollHeight<=surface.clientHeight)return;
  const direction=event.key.endsWith('Down')?1:-1,step=event.key.startsWith('Page')?Math.max(48,surface.clientHeight*.8):64;
  event.preventDefault();surface.scrollBy({top:step*direction,behavior:'auto'});
 });
})();
