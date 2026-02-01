import * as error from './error';

export function generateDiff(): string {
  const result = {
    modifiedText: {},
  } as { modifiedText: { [key: string]: string } };
  for (let [k, v] of Object.entries(editJournal['modifiedText'])) {
    result['modifiedText'][k] = v.innerText;
  }
  return JSON.stringify(result);
}

function mutation(mutations: MutationRecord[], observer: MutationObserver) {
  for (let m of mutations) {
    if (m.type === 'characterData') {
      const node = m.target.parentNode as HTMLElement;
      const path = node.getAttribute('data-odr-path');
      if (path) {
        editJournal['modifiedText'][path] = node;
      }
    }
  }
}

const editJournal = {
  modifiedText: {} as { [key: string]: HTMLElement },
};

const observer = new MutationObserver(mutation);
const config = {
  attributes: false,
  childList: true,
  subtree: true,
  characterData: true,
};
observer.observe(document.body, config);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    error.onError(error.error_illegal_edit_new_line.code, error.error_illegal_edit_new_line.message);
  }
});
