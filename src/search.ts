// from https://github.com/marcelblanarik/js-keyword-highlighter/blob/dd69436bee06f8c658abe1e12e2abb35d3bf250b/index.js

import Mark from "mark.js";

const content = document.body;
const instance = new Mark(content);
const className = " current";
let currentIndex: number = NaN;
let results: HTMLCollectionOf<HTMLElement>;
let isNext: boolean;

export function search(keyword: string) {
  instance.unmark();
  instance.mark(keyword, {
    element: "mark",
    className: "highlight",
    diacritics: true
  });
  currentIndex = 0;
  results = content.getElementsByTagName("mark");
  results[0] ? (results[0].className += className) : null;
}

export function searchNext() {
  if (!isNaN(currentIndex) && results.length > 0) {
    isNext = true;
    currentIndex++;
    jumpTo();
  }
}

export function searchPrevious() {
  if (!isNaN(currentIndex) && results.length > 0) {
    isNext = false;
    --currentIndex;
    jumpTo();
  }
}

function jumpTo() {
  let prevIndex = results[currentIndex - 1];
  let nextIndex = results[currentIndex + 1];

  if (isNext) {
    prevIndex.className = prevIndex.className.replace(className, "");
    if (currentIndex > results.length - 1) {
      currentIndex = 0;
    }
    results[currentIndex].className += className;
    window.scroll(0, findPos(results[currentIndex]));
  } else {
    nextIndex.className = nextIndex.className.replace(className, "");
    if (currentIndex < 0) {
      currentIndex = results.length - 1;
    }
    results[currentIndex].className += className;
    window.scroll(0, findPos(results[currentIndex]));
  }
}

export function resetSearch() {
  instance.unmark();
}

function findPos(obj: HTMLElement): number {
  let curTop = 0;
  while (obj.offsetParent !== null) {
    curTop += obj.offsetTop;
    obj = obj.offsetParent as HTMLElement;
  }
  return curTop;
}
