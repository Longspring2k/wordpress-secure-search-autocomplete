import { createAutocompleteController } from '/autocomplete.mjs';

const input = document.querySelector('#search');
const list = document.querySelector('#results');
const status = document.querySelector('#status');
const selection = document.querySelector('#selection');
const previewSelection = (url) => { selection.textContent = `Selected destination: ${url}`; };

const controller = createAutocompleteController({
  async search(query, { signal }) {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) throw new Error('Search request failed');
    return response.json();
  },
  render(view) {
    list.replaceChildren();
    view.items.forEach((item, index) => {
      const option = document.createElement('li');
      option.id = `result-${index}`;
      option.role = 'option';
      option.ariaSelected = String(index === view.activeIndex);
      option.textContent = item.title;
      option.addEventListener('mousedown', (event) => event.preventDefault());
      option.addEventListener('click', () => { controller.key('Escape'); previewSelection(item.url); });
      list.append(option);
    });
    input.ariaExpanded = String(view.open);
    input.setAttribute('aria-activedescendant', view.activeIndex >= 0 ? `result-${view.activeIndex}` : '');
    status.textContent = ({ idle: 'Type at least 2 characters.', invalid: 'Query must be 2–40 characters.', loading: 'Searching…', ready: `${view.items.length} result${view.items.length === 1 ? '' : 's'}.`, empty: 'No public products found.', error: 'Search unavailable.', closed: 'Suggestions closed.' })[view.status];
  },
  navigate: previewSelection,
  minLength: 2,
  maxLength: 40,
});

input.addEventListener('input', () => controller.setQuery(input.value));
input.addEventListener('keydown', (event) => {
  if (controller.key(event.key)) event.preventDefault();
});
addEventListener('pagehide', () => controller.dispose(), { once: true });
