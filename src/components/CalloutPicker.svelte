<script lang="ts">
  import { onMount } from 'svelte';
  import { CALLOUTS, type CalloutDef } from '../calloutData';
  import { t, type Locale } from '../i18n';
  import type { PluginSettings } from '../types';

  export let settings: PluginSettings;
  export let locale: Locale;
  export let onSelect: (id: string, fold: 'none' | 'open' | 'closed', firstLineAsTitle: boolean) => void;
  export let onClose: () => void;
  export let onSortChange: (mode: 'custom' | 'alpha' | 'frequency') => void;
  export let onReorderCallout: (fromId: string, toId: string) => void;
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

  // Drag-drop state
  let dragSourceIndex: number | null = null;
  let dragOverIndex: number | null = null;

  // Pass sortMode + settings explicitly so Svelte tracks them as reactive deps
  function getSortedCallouts(mode: typeof sortMode, s: PluginSettings): CalloutDef[] {
    const custom = (s.customCallouts ?? []).map(c => ({
      id: c.id, aliases: c.aliases, color: c.color, icon: '', iconPath: c.iconPath,
    }));
    const all = [...CALLOUTS, ...custom];

    if (mode === 'alpha') {
      return [...all].sort((a, b) => a.id.localeCompare(b.id));
    }
    if (mode === 'frequency') {
      const counts = s.usageCounts ?? {};
      return [...all].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
    }
    // custom order
    const order = s.calloutOrder ?? [];
    if (!order.length) return all;
    const ordered = order
      .map(id => all.find(c => c.id === id))
      .filter((c): c is CalloutDef => c !== undefined);
    const remaining = all.filter(c => !order.includes(c.id));
    return [...ordered, ...remaining];
  }

  $: displayCallouts = getSortedCallouts(sortMode, settings);
  $: count = displayCallouts.length;
  $: cols = settings.columnCount ?? 3;
  $: focusedCallout = displayCallouts[focusedIndex] ?? null;

  // Which id to preview: alias hover > focused card
  $: activePreviewId = hoveredAlias ?? focusedCallout?.id ?? null;
  $: ownerCallout = activePreviewId
    ? (displayCallouts.find(c => c.id === activePreviewId)
       ?? displayCallouts.find(c => c.aliases.includes(activePreviewId as string))
       ?? focusedCallout)
    : focusedCallout;
  $: previewColor = ownerCallout?.color ?? '#888';

  // Preview line 1 title: firstLineAsTitle > settings title > existing title
  $: activeTitleText =
    (firstLineAsTitle && selectionFirstLine) ? selectionFirstLine
    : (ownerCallout && settings.calloutTitles[ownerCallout?.id ?? '']) ? settings.calloutTitles[ownerCallout.id]
    : existingCalloutTitle ? existingCalloutTitle
    : '';

  $: previewLine1 = activePreviewId
    ? `> [!${activePreviewId}]${foldState === 'open' ? '+' : foldState === 'closed' ? '-' : ''}${activeTitleText ? ' ' + activeTitleText : ''}`
    : '';

  // Preview line 2: when firstLineAsTitle, show second selection line; else existing content or placeholder
  $: previewLine2 = (firstLineAsTitle && selectionSecondLine) ? `> ${selectionSecondLine}`
    : existingCalloutFirstLine ? `> ${existingCalloutFirstLine}`
    : selectionSecondLine ? `> ${selectionSecondLine}`
    : `> ${strings.previewContent}`;

  onMount(() => { gridEl?.focus(); });

  function handleKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); focusedIndex = (focusedIndex + 1) % count; break;
      case 'ArrowLeft':  e.preventDefault(); focusedIndex = (focusedIndex - 1 + count) % count; break;
      case 'ArrowDown':  e.preventDefault(); focusedIndex = Math.min(focusedIndex + cols, count - 1); break;
      case 'ArrowUp':    e.preventDefault(); focusedIndex = Math.max(focusedIndex - cols, 0); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (count > 0) onSelect(displayCallouts[focusedIndex].id, foldState, firstLineAsTitle);
        break;
      case 'Escape': e.preventDefault(); onClose(); break;
    }
  }

  function handleCardClick(index: number) {
    focusedIndex = index;
    onSelect(displayCallouts[index].id, foldState, firstLineAsTitle);
  }

  function handleSortChange(e: Event) {
    sortMode = (e.target as HTMLSelectElement).value as typeof sortMode;
    onSortChange(sortMode);
  }

  // ── Drag-drop (custom mode only) ──
  function handleDragStart(e: DragEvent, index: number) {
    if (sortMode !== 'custom') return;
    dragSourceIndex = index;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: DragEvent, index: number) {
    if (sortMode !== 'custom' || dragSourceIndex === null) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOverIndex = index;
  }

  function handleDrop(e: DragEvent, index: number) {
    e.preventDefault();
    if (dragSourceIndex !== null && dragSourceIndex !== index) {
      onReorderCallout(displayCallouts[dragSourceIndex].id, displayCallouts[index].id);
    }
    dragSourceIndex = null;
    dragOverIndex = null;
  }

  function handleDragEnd() {
    dragSourceIndex = null;
    dragOverIndex = null;
  }
</script>

<!-- ===== ROW 1: Title + hint ===== -->
<div class="cp-header">
  <div class="cp-header-left">
    {#if existingCallout}
      <span class="cp-title">{strings.replacingCallout}: [!{existingCallout}]</span>
    {:else}
      <span class="cp-title">{strings.modalTitle}</span>
    {/if}
  </div>
  <kbd class="cp-hint">↑↓←→ Enter</kbd>
</div>

<hr class="cp-divider" />

<!-- ===== ROW 2: firstLineAsTitle + fold + sort ===== -->
<div class="cp-controls">
  <div class="cp-controls-left">
    {#if hasSelection}
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <label class="cp-first-line">
        <input type="checkbox" bind:checked={firstLineAsTitle} />
        <span>{strings.firstLineAsTitle}</span>
      </label>
    {/if}
  </div>

  <!-- Fold toggle -->
  <div class="cp-fold">
    <button
      class="cp-fold-btn"
      class:active={foldState === 'none'}
      on:click={() => (foldState = 'none')}
      title={strings.foldDefault}>○</button>
    <button
      class="cp-fold-btn"
      class:active={foldState === 'open'}
      on:click={() => (foldState = 'open')}
      title={strings.foldOpen}>+</button>
    <button
      class="cp-fold-btn"
      class:active={foldState === 'closed'}
      on:click={() => (foldState = 'closed')}
      title={strings.foldClosed}>−</button>
  </div>

  <!-- Sort dropdown -->
  <select class="cp-sort-select" value={sortMode} on:change={handleSortChange}>
    <option value="custom">{strings.sortCustom}</option>
    <option value="alpha">{strings.sortAlpha}</option>
    <option value="frequency">{strings.sortFrequency}</option>
  </select>
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
>
  {#each displayCallouts as callout, i}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="cp-card"
      class:cp-card--focused={focusedIndex === i}
      class:cp-card--filled={settings.cardStyle === 'filled'}
      class:cp-card--drag-over={dragOverIndex === i && dragSourceIndex !== i}
      class:cp-card--dragging={dragSourceIndex === i}
      role="option"
      aria-selected={focusedIndex === i}
      tabindex="-1"
      draggable={sortMode === 'custom'}
      style="--callout-color: {callout.color}"
      title={callout.aliases.length ? callout.aliases.join(', ') : undefined}
      on:click={() => handleCardClick(i)}
      on:mouseenter={() => { focusedIndex = i; hoveredAlias = null; }}
      on:dragstart={(e) => handleDragStart(e, i)}
      on:dragover={(e) => handleDragOver(e, i)}
      on:drop={(e) => handleDrop(e, i)}
      on:dragend={handleDragEnd}
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

<!-- ===== PREVIEW (always visible, 2 lines) ===== -->
{#if previewLine1}
  <div class="cp-preview" style="--preview-color: {previewColor}">
    <pre class="cp-preview-text">{previewLine1}
{previewLine2}</pre>
  </div>
{/if}

<style>
  /* ── Header (Row 1) ── */
  .cp-header {
    display: flex; align-items: center; justify-content: space-between;
    padding-bottom: 8px;
  }
  .cp-header-left { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }

  .cp-title {
    font-size: 0.9em; font-weight: 600;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cp-hint {
    font-size: 0.7em; color: var(--text-faint);
    background: var(--background-modifier-hover);
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px; padding: 1px 5px;
    font-family: var(--font-monospace); white-space: nowrap; flex-shrink: 0;
  }

  /* ── Divider ── */
  .cp-divider {
    border: none;
    border-top: 1px solid var(--background-modifier-border);
    margin: 0 0 8px;
  }

  /* ── Controls row (Row 2) ── */
  .cp-controls {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 10px;
  }
  .cp-controls-left { flex: 1; min-width: 0; }

  /* ── First-line as title ── */
  .cp-first-line {
    display: flex; align-items: center; gap: 5px;
    font-size: 0.82em; color: var(--text-muted); cursor: pointer;
  }
  .cp-first-line input[type="checkbox"] { margin: 0; cursor: pointer; }

  /* ── Sort dropdown ── */
  .cp-sort-select {
    padding: 2px 5px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-secondary); color: var(--text-normal);
    font-size: 0.78em; cursor: pointer; max-width: 140px; flex-shrink: 0;
  }

  /* ── Fold toggle ── */
  .cp-fold { display: flex; gap: 1px; flex-shrink: 0; }
  .cp-fold-btn {
    padding: 2px 7px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary); color: var(--text-muted);
    cursor: pointer; font-size: 0.88em; line-height: 1.5;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .cp-fold-btn:first-child { border-radius: 4px 0 0 4px; }
  .cp-fold-btn:last-child  { border-radius: 0 4px 4px 0; }
  .cp-fold-btn:not(:first-child) { margin-left: -1px; }
  .cp-fold-btn.active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
    z-index: 1; position: relative;
  }

  /* ── Grid ── */
  .cp-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols, 3), 1fr);
    gap: 7px; outline: none;
  }

  /* ── Card ── */
  .cp-card {
    position: relative; display: flex; align-items: stretch;
    border-radius: 6px; border: 2px solid transparent;
    background: var(--background-secondary);
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s, opacity 0.1s;
    overflow: hidden;
  }
  .cp-card:hover, .cp-card--focused {
    border-color: var(--callout-color);
    background: var(--background-secondary-alt);
  }
  /* Drag states */
  .cp-card--dragging { opacity: 0.4; cursor: grabbing; }
  .cp-card--drag-over {
    border-color: var(--callout-color);
    border-style: dashed;
    background: var(--background-secondary-alt);
  }

  /* Filled style — tinted background matching real Obsidian callout look */
  .cp-card--filled {
    background: color-mix(in srgb, var(--callout-color) 14%, var(--background-secondary));
    border-color: color-mix(in srgb, var(--callout-color) 30%, transparent);
  }
  .cp-card--filled:hover, .cp-card--filled.cp-card--focused {
    background: color-mix(in srgb, var(--callout-color) 24%, var(--background-secondary));
    border-color: var(--callout-color);
    opacity: 1;
  }
  .cp-card--filled .cp-card__accent {
    background: color-mix(in srgb, var(--callout-color) 60%, transparent);
  }

  .cp-card__accent { width: 5px; flex-shrink: 0; background: var(--callout-color); }
  .cp-card__body {
    display: flex; flex-direction: column; justify-content: center;
    gap: 3px; padding: 7px 9px; flex: 1; overflow: hidden;
  }
  .cp-card__header { display: flex; align-items: center; gap: 5px; }

  /* Drag grip shown in custom mode */
  .cp-drag-grip {
    font-size: 0.85em; color: var(--text-faint);
    cursor: grab; flex-shrink: 0; line-height: 1;
    opacity: 0; transition: opacity 0.1s;
  }
  .cp-card:hover .cp-drag-grip { opacity: 1; }
  .cp-card--dragging .cp-drag-grip { opacity: 1; cursor: grabbing; }

  .cp-card__icon { width: 14px; height: 14px; color: var(--callout-color); flex-shrink: 0; }
  .cp-card__name {
    font-size: 0.85em; font-weight: 700;
    color: var(--text-normal); text-transform: capitalize;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
  }

  /* Alias chips */
  .cp-card__aliases { display: flex; flex-wrap: wrap; gap: 3px; }
  .cp-card__alias-chip {
    font-size: 0.68em; padding: 1px 5px;
    border-radius: 3px; border: 1px solid var(--background-modifier-border);
    background: var(--background-modifier-hover); color: var(--text-faint);
    cursor: pointer; line-height: 1.4;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .cp-card__alias-chip:hover {
    background: var(--callout-color); color: #fff; border-color: var(--callout-color);
  }
  .cp-card__default-title {
    font-size: 0.68em; color: var(--callout-color);
    font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* ── Preview ── */
  .cp-preview {
    margin-top: 10px;
    padding: 6px 12px;
    border-left: 4px solid var(--preview-color, #888);
    background: var(--background-secondary);
    border-radius: 0 4px 4px 0;
  }
  .cp-preview-text {
    font-family: var(--font-monospace); font-size: 0.8em;
    color: var(--text-normal); margin: 0;
    white-space: pre; line-height: 1.7;
    overflow: hidden; text-overflow: ellipsis;
  }
</style>
