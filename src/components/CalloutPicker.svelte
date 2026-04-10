<script lang="ts">
  import { onMount } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { CALLOUTS, type CalloutDef } from '../calloutData';
  import { t, type Locale } from '../i18n';
  import type { PluginSettings } from '../types';

  export let settings: PluginSettings;
  export let locale: Locale;
  export let onSelect: (id: string, fold: 'none' | 'open' | 'closed', firstLineAsTitle: boolean) => void;
  export let onClose: () => void;
  export let onSortChange: (mode: 'custom' | 'alpha' | 'frequency') => void;
  export let onReorderCallout: (newOrder: string[]) => void;
  export let hasSelection: boolean = false;
  export let selectionFirstLine: string = '';
  export let selectionSecondLine: string = '';
  export let existingCallout: string | null = null;
  export let existingCalloutTitle: string = '';
  export let existingCalloutFirstLine: string = '';

  $: strings = t(locale);
  let focusedIndex = 0;
  let gridEl: HTMLDivElement;
  let foldState: 'none' | 'open' | 'closed' = 'none';
  let firstLineAsTitle = false;
  let hoveredAlias: string | null = null;
  let sortMode: 'custom' | 'alpha' | 'frequency' = settings.sortMode ?? 'custom';

  // Drag-drop state (svelte-dnd-action)
  const FLIP_DURATION_MS = 200;
  let isDragging = false;
  let dndItems: CalloutDef[] = [];

  // ── Inline Lucide SVG path strings ──────────────────────────────────────
  const ICO_POINTER =
    '<path d="M22 14a8 8 0 0 1-8 8"/>' +
    '<path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/>' +
    '<path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/>' +
    '<path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/>' +
    '<path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>';

  const ICO_ARROW_DOWN_10 =
    '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/>' +
    '<path d="M17 10V4h-2"/><path d="M15 10h4"/>' +
    '<rect x="15" y="14" width="4" height="6" ry="2"/>';

  const ICO_ARROW_DOWN_AZ =
    '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/>' +
    '<path d="M20 8h-5"/>' +
    '<path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10"/>' +
    '<path d="M15 14h5l-5 6h5"/>';

  $: sortIconHtml =
    sortMode === 'custom'    ? ICO_POINTER      :
    sortMode === 'frequency' ? ICO_ARROW_DOWN_10 :
                               ICO_ARROW_DOWN_AZ;

  function getSortedCallouts(mode: typeof sortMode, s: PluginSettings): CalloutDef[] {
    const custom = (s.customCallouts ?? []).map(c => ({
      id: c.id, aliases: c.aliases, color: c.color, icon: '', iconPath: c.iconPath,
    }));
    const all = [...CALLOUTS, ...custom];
    if (mode === 'alpha') return [...all].sort((a, b) => a.id.localeCompare(b.id));
    if (mode === 'frequency') {
      const counts = s.usageCounts ?? {};
      return [...all].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
    }
    const order = s.calloutOrder ?? [];
    if (!order.length) return all;
    const ordered = order.map(id => all.find(c => c.id === id)).filter((c): c is CalloutDef => c !== undefined);
    return [...ordered, ...all.filter(c => !order.includes(c.id))];
  }

  $: sortedCallouts = getSortedCallouts(sortMode, settings);
  $: if (!isDragging) dndItems = sortedCallouts;
  $: count = dndItems.length;
  $: cols = settings.columnCount ?? 3;
  $: focusedCallout = dndItems[focusedIndex] ?? null;

  $: activePreviewId = hoveredAlias ?? focusedCallout?.id ?? null;
  $: ownerCallout = activePreviewId
    ? (dndItems.find(c => c.id === activePreviewId)
       ?? dndItems.find(c => c.aliases.includes(activePreviewId as string))
       ?? focusedCallout)
    : focusedCallout;
  $: previewColor = ownerCallout?.color ?? '#888';

  $: showFirstLineOption = hasSelection;

  $: activeTitleText =
    (showFirstLineOption && firstLineAsTitle && selectionFirstLine) ? selectionFirstLine
    : (ownerCallout && settings.calloutTitles[ownerCallout?.id ?? '']) ? settings.calloutTitles[ownerCallout.id]
    : existingCalloutTitle ? existingCalloutTitle
    : '';

  $: previewLine1 = activePreviewId
    ? `> [!${activePreviewId}]${foldState === 'open' ? '+' : foldState === 'closed' ? '-' : ''}${activeTitleText ? ' ' + activeTitleText : ''}`
    : '';

  $: previewLine2 = (showFirstLineOption && firstLineAsTitle && selectionSecondLine) ? `> ${selectionSecondLine}`
    : existingCalloutFirstLine ? `> ${existingCalloutFirstLine}`
    : selectionSecondLine ? `> ${selectionSecondLine}`
    : `> ${strings.previewContent}`;

  onMount(() => {
    gridEl?.focus();
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); focusedIndex = (focusedIndex + 1) % count; break;
      case 'ArrowLeft':  e.preventDefault(); focusedIndex = (focusedIndex - 1 + count) % count; break;
      case 'ArrowDown':  e.preventDefault(); focusedIndex = Math.min(focusedIndex + cols, count - 1); break;
      case 'ArrowUp':    e.preventDefault(); focusedIndex = Math.max(focusedIndex - cols, 0); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (count > 0) onSelect(dndItems[focusedIndex].id, foldState, firstLineAsTitle);
        break;
      case 'Escape': e.preventDefault(); onClose(); break;
    }
  }

  function handleCardClick(index: number) {
    focusedIndex = index;
    onSelect(dndItems[index].id, foldState, firstLineAsTitle);
  }

  function selectSort(mode: typeof sortMode) {
    sortMode = mode;
    onSortChange(mode);
    gridEl?.focus();
  }

  // svelte-dnd-action handlers
  function handleDndConsider(e: CustomEvent) {
    isDragging = true;
    dndItems = e.detail.items;
  }
  function handleDndFinalize(e: CustomEvent) {
    isDragging = false;
    dndItems = e.detail.items;
    onReorderCallout(dndItems.map((c: CalloutDef) => c.id));
  }
</script>

<!-- ===== ROW 1: Title + hint ===== -->
<div class="cp-header">
  {#if existingCallout}
    <span class="cp-title">{strings.replacingCallout}: [!{existingCallout}]</span>
  {:else}
    <span class="cp-title">{strings.modalTitle}</span>
  {/if}
  <kbd class="cp-hint">↑↓←→ Enter</kbd>
</div>

<hr class="cp-divider" />

<!-- ===== ROW 2: Sort only (right-aligned) ===== -->
<div class="cp-controls">
  <!-- Sort hover dropdown -->
  <div class="cp-sort-wrap">
    <button class="cp-sort-btn" aria-label="Sort">
      <span class="cp-sort-label">Sırala</span>
      <span class="cp-sort-sep">:</span>
      <svg class="cp-sort-icon cp-sort-current" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        {@html sortIconHtml}
      </svg>
    </button>

    <div class="cp-sort-popover" role="listbox">
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <button class="cp-sort-item" class:selected={sortMode === 'custom'}
        role="option" aria-selected={sortMode === 'custom'}
        on:click={() => selectSort('custom')}>
        <svg class="cp-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          {@html ICO_POINTER}
        </svg>
        <span>{strings.sortCustom}</span>
      </button>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <button class="cp-sort-item" class:selected={sortMode === 'frequency'}
        role="option" aria-selected={sortMode === 'frequency'}
        on:click={() => selectSort('frequency')}>
        <svg class="cp-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          {@html ICO_ARROW_DOWN_10}
        </svg>
        <span>{strings.sortFrequency}</span>
      </button>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <button class="cp-sort-item" class:selected={sortMode === 'alpha'}
        role="option" aria-selected={sortMode === 'alpha'}
        on:click={() => selectSort('alpha')}>
        <svg class="cp-sort-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          {@html ICO_ARROW_DOWN_AZ}
        </svg>
        <span>{strings.sortAlpha}</span>
      </button>
    </div>
  </div>
</div>

<!-- ===== CALLOUT GRID ===== -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
  class="cp-grid"
  role="listbox"
  tabindex="0"
  bind:this={gridEl}
  style="--cols: {cols}"
  on:keydown={handleKeydown}
  use:dndzone={{ items: dndItems, flipDurationMs: FLIP_DURATION_MS, disabled: sortMode !== 'custom', dropTargetStyle: {} }}
  on:consider={handleDndConsider}
  on:finalize={handleDndFinalize}
>
  {#each dndItems as callout, i (callout.id)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="cp-card"
      class:cp-card--focused={focusedIndex === i}
      class:cp-card--filled={settings.cardStyle === 'filled'}
      role="option"
      aria-selected={focusedIndex === i}
      tabindex="-1"
      style="--callout-color: {callout.color}"
      title={callout.aliases.length ? callout.aliases.join(', ') : undefined}
      on:click={() => handleCardClick(i)}
      on:mouseenter={() => { focusedIndex = i; hoveredAlias = null; }}
    >
      <div class="cp-card__accent" />
      <div class="cp-card__body">
        <div class="cp-card__header">
          {#if sortMode === 'custom'}
            <span class="cp-drag-grip" title="Drag to reorder">⠿</span>
          {/if}
          <svg
            class="cp-card__icon"
            viewBox="0 0 24 24"
            fill={callout.fillIcon ? 'currentColor' : 'none'}
            stroke={callout.fillIcon ? 'none' : 'currentColor'}
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true"
          >
            {#if callout.iconPath}
              <path d={callout.iconPath} />
            {:else}
              <circle cx="12" cy="12" r="5" />
            {/if}
          </svg>
          <span class="cp-card__name">{callout.id}</span>
        </div>

        {#if callout.aliases.length > 0}
          <div class="cp-card__aliases">
            {#each callout.aliases as alias}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <button
                class="cp-card__alias-chip"
                on:click|stopPropagation={() => onSelect(alias, foldState, firstLineAsTitle)}
                on:mouseenter|stopPropagation={() => (hoveredAlias = alias)}
                on:mouseleave|stopPropagation={() => (hoveredAlias = null)}
                title={alias}
              >{alias}</button>
            {/each}
          </div>
        {/if}

        {#if settings.calloutTitles[callout.id]}
          <span class="cp-card__default-title">"{settings.calloutTitles[callout.id]}"</span>
        {/if}
      </div>
    </div>
  {/each}
</div>

<!-- ===== BOTTOM: divider → checkbox → preview + fold stack ===== -->
<hr class="cp-divider cp-divider--bottom" />

{#if showFirstLineOption}
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label class="cp-first-line">
    <input type="checkbox" bind:checked={firstLineAsTitle} />
    <span>{strings.firstLineAsTitle}</span>
  </label>
{/if}

<div class="cp-preview-row">
  {#if previewLine1}
    <div class="cp-preview" style="--preview-color: {previewColor}">
      <pre class="cp-preview-text">{previewLine1}
{previewLine2}</pre>
    </div>
  {:else}
    <div class="cp-preview cp-preview--empty" />
  {/if}

  <div class="cp-fold-stack">
    <button class="cp-fold-btn" class:active={foldState === 'open'}
      on:click={() => (foldState = 'open')} title={strings.foldOpen}>+</button>
    <button class="cp-fold-btn" class:active={foldState === 'closed'}
      on:click={() => (foldState = 'closed')} title={strings.foldClosed}>−</button>
    <button class="cp-fold-btn" class:active={foldState === 'none'}
      on:click={() => (foldState = 'none')} title={strings.foldDefault}>•</button>
  </div>
</div>

<style>
  /* ── Header ── */
  .cp-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 8px;
  }
  .cp-title {
    font-size: 0.9em; font-weight: 600; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
  }
  .cp-hint {
    font-size: 0.7em; color: var(--text-faint);
    background: var(--background-modifier-hover);
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px; padding: 1px 5px;
    font-family: var(--font-monospace); white-space: nowrap; flex-shrink: 0;
  }

  /* ── Divider ── */
  .cp-divider { border: none; border-top: 1px solid var(--background-modifier-border); margin: 0 0 8px; }
  .cp-divider--bottom { margin: 8px 0; }

  /* ── Controls row: sort only, right-aligned ── */
  .cp-controls {
    display: flex; align-items: center; justify-content: flex-end;
    margin-bottom: 8px;
  }

  /* ── Sort hover dropdown ── */
  .cp-sort-wrap { position: relative; flex-shrink: 0; }

  .cp-sort-btn {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 6px; border: none; border-radius: 4px;
    background: transparent; color: var(--text-faint);
    font-size: 0.8em; cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }
  .cp-sort-wrap:hover .cp-sort-btn { background: var(--background-modifier-hover); color: var(--text-muted); }

  .cp-sort-label { font-size: 0.78em; color: inherit; }
  .cp-sort-sep { color: var(--text-faint); font-size: 0.85em; line-height: 1; }

  .cp-sort-icon {
    width: 14px; height: 14px; flex-shrink: 0;
    overflow: visible;
  }

  /* Popover hidden by default, shown on hover */
  .cp-sort-popover {
    display: none;
    position: absolute; top: 100%; right: 0;
    z-index: 100;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    padding: 4px 0; min-width: 130px;
  }
  .cp-sort-wrap:hover .cp-sort-popover { display: block; }

  .cp-sort-item {
    display: flex; align-items: center; gap: 7px;
    width: 100%; padding: 5px 10px;
    border: none; background: transparent; text-align: left;
    color: var(--text-muted); cursor: pointer; font-size: 0.82em;
    transition: background 0.1s, color 0.1s;
    min-height: unset; height: auto;
  }
  .cp-sort-item:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
  .cp-sort-item.selected { color: var(--interactive-accent); font-weight: 600; }

  /* ── Grid ── */
  .cp-grid {
    display: grid; grid-template-columns: repeat(var(--cols, 3), 1fr);
    gap: 7px; outline: none; margin-bottom: 0;
  }

  /* ── Card ── */
  .cp-card {
    position: relative; display: flex; align-items: stretch;
    border-radius: 6px; border: 2px solid transparent;
    background: var(--background-secondary);
    cursor: pointer; min-height: 40px;
    transition: border-color 0.1s, background 0.1s, opacity 0.1s;
    overflow: hidden;
  }
  .cp-card:hover, .cp-card--focused {
    border-color: var(--callout-color);
    background: var(--background-secondary-alt);
  }
  /* Filled style */
  .cp-card--filled {
    background: color-mix(in srgb, var(--callout-color) 14%, var(--background-secondary));
    border-color: color-mix(in srgb, var(--callout-color) 30%, transparent);
  }
  .cp-card--filled:hover, .cp-card--filled.cp-card--focused {
    background: color-mix(in srgb, var(--callout-color) 24%, var(--background-secondary));
    border-color: var(--callout-color); opacity: 1;
  }
  .cp-card--filled .cp-card__accent {
    background: color-mix(in srgb, var(--callout-color) 60%, transparent);
  }

  .cp-card__accent { width: 5px; flex-shrink: 0; background: var(--callout-color); }
  .cp-card__body {
    display: flex; flex-direction: column; justify-content: flex-start;
    gap: 3px; padding: 6px 9px; flex: 1; overflow: hidden;
  }
  .cp-card__header { display: flex; align-items: center; gap: 5px; }

  .cp-drag-grip {
    font-size: 0.85em; color: var(--text-faint);
    cursor: grab; flex-shrink: 0; line-height: 1;
    opacity: 0; transition: opacity 0.1s;
  }
  .cp-card:hover .cp-drag-grip { opacity: 1; }

  .cp-card__icon { width: 14px; height: 14px; color: var(--callout-color); flex-shrink: 0; }
  .cp-card__name {
    font-size: 0.85em; font-weight: 700; color: var(--text-normal);
    text-transform: capitalize;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
  }

  .cp-card__aliases { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
  .cp-card__alias-chip {
    height: 20px !important;
    min-height: unset !important;
    box-sizing: border-box;
    font-size: 0.65em; padding: 0 4px;
    border-radius: 3px; border: 1px solid var(--background-modifier-border);
    background: var(--background-modifier-hover); color: var(--text-faint);
    cursor: pointer; line-height: 20px;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .cp-card__alias-chip:hover { background: var(--callout-color); color: #fff; border-color: var(--callout-color); }
  .cp-card__default-title {
    font-size: 0.68em; color: var(--callout-color);
    font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* ── First-line checkbox ── */
  .cp-first-line {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.82em; color: var(--text-muted); cursor: pointer;
    white-space: nowrap; margin-bottom: 5px;
  }
  .cp-first-line input[type="checkbox"] { margin: 0; cursor: pointer; }

  /* ── Preview row: preview (flex:1) + fold stack ── */
  .cp-preview-row { display: flex; align-items: stretch; gap: 6px; }

  .cp-preview {
    flex: 1; padding: 6px 12px;
    border-left: 4px solid var(--preview-color, #888);
    background: var(--background-secondary); border-radius: 0 4px 4px 0;
  }
  .cp-preview--empty { min-height: 44px; border-left-color: var(--background-modifier-border); }
  .cp-preview-text {
    font-family: var(--font-monospace); font-size: 0.8em;
    color: var(--text-normal); margin: 0;
    white-space: pre; line-height: 1.7; overflow: hidden; text-overflow: ellipsis;
  }

  /* ── Fold stack: 3 stacked vertical buttons ── */
  .cp-fold-stack { display: flex; flex-direction: column; flex-shrink: 0; }
  .cp-fold-btn {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    padding: 0 10px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary); color: var(--text-muted);
    cursor: pointer; font-size: 0.85em; white-space: nowrap;
    min-height: unset; height: auto;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .cp-fold-btn:first-child { border-radius: 4px 4px 0 0; }
  .cp-fold-btn:last-child  { border-radius: 0 0 4px 4px; }
  .cp-fold-btn:not(:first-child) { margin-top: -1px; }
  .cp-fold-btn.active {
    background: var(--interactive-accent); color: var(--text-on-accent);
    border-color: var(--interactive-accent); z-index: 1; position: relative;
  }
  .cp-fold-btn:hover:not(.active) {
    background: var(--background-secondary-alt);
    color: var(--text-normal);
  }
</style>
