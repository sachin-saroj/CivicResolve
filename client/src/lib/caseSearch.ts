export function nextSuggestionIndex(currentIndex: number, itemCount: number) {
  if (itemCount <= 0) return -1;
  return (currentIndex + 1) % itemCount;
}

export function previousSuggestionIndex(currentIndex: number, itemCount: number) {
  if (itemCount <= 0) return -1;
  return currentIndex <= 0 ? itemCount - 1 : currentIndex - 1;
}

export function shouldSelectSuggestion(key: string, activeIndex: number) {
  return key === "Enter" && activeIndex >= 0;
}
