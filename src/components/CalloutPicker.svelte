<script lang="ts">
  import { onMount } from 'svelte';
  import { CALLOUTS, type CalloutDef } from '../calloutData';
  import { t, type Locale } from '../i18n';
  import type { PluginSettings } from '../types';

  export let settings: PluginSettings;
  export let locale: Locale;
  export let onSelect: (id: string, fold: 'none' | 'open' | 'closed', firstParaAsTitle: boolean) => void;
  export let onClose: () => void;
  export let onSortChange: (mode: 'custom' | 'alpha' | 'frequency') => void;
  export let selectionWordCount: number = 0;
  export let hasMultipleParagraphs: boolean = false;
  export let existingCallout: string | null = null;

  $: strings = t(locale);
  let focusedIndex = 0;
  let gridEl: HTMLDivElement;
  let foldState: 'none' | 'open' | 'closed' = 'none';
  let firstParaAsTitle = false;
  let previewOpen = false;
  let contextMenu: { x: number; y: number; callout: CalloutDef } | null = null;
  let sortMode: 'custom' | 'alpha' | 'frequency' = settings.sortMode ?? 'custom';

  function getSortedCallouts(): CalloutDef[] {
    const custom = (settings.customCallouts ?? []).map(c => ({
      id: c.id, aliases: c.aliases, color: c.color, icon: '', iconPath: c.iconPath,
    }));
    const all = [...CALLOUTS, ...custom];

    if (sortMode === 'alpha') {
      return [...all].sort((a, b) => a.id.localeCompare(b.id));
    }
    if (sortMode === 'frequency') {
      const counts = settings.usageCounts ?? {};
      return [...all].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
    }
    // custom order
    const order = settings.calloutOrder ?? [];
    if (!order.length) return all;
    const ordered = order
      .map(id => all.find(c => c.id === id))
      .filter((c): c is CalloutDef => c !== undefined);
    const remaining = all.filter(c => !order.includes(c.id));
    return [...ordered, ...remaining];
  }

  $: displayCallouts = getSortedCallouts();
  $: count = displayCallouts.length;
  $: cols = settings.columnCount ?? 3;

  $: focusedCallout = displayCallouts[focusedIndex] ?? null;
  $: previewText = focusedCallout
    ? `> [!${focusedCallout.id}]${foldState === 'open' ? '+' : foldState === 'closed' ? '-' : ''}${
        settings.calloutTitles[focusedCallout.id] ? ' ' + settings.calloutTitles[focusedCallout.id] : ''
      }\n> ${strings.previewContent}`
    : '';

  onMount(() => { gridEl?.focus(); });

  function handleKeydown(e: KeyboardEvent) {
    if (contextMenu !== null) {
      if (e.key === 'Escape') { e.preventDefault(); closeContextMenu(); }
      return;
    }
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); focusedIndex = (focusedIndex + 1) % count; break;
      case 'ArrowLeft':  e.preventDefault(); focusedIndex = (focusedIndex - 1 + count) % count; break;
      case 'ArrowDown':  e.preventDefault(); focusedIndex = Math.min(focusedIndex + cols, count - 1); break;
      case 'ArrowUp':    e.preventDefault(); focusedIndex = Math.max(focusedIndex - cols, 0); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (count > 0) onSelect(displayCallouts[focusedIndex].id, foldState, firstParaAsTitle);
        break;
      case 'Escape': e.preventDefault(); onClose(); break;
    }
  }

  function handleCardClick(index: number) {
    focusedIndex = index;
    onSelect(displayCallouts[index].id, foldState, firstParaAsTitle);
  }

  function handleContextMenu(e: MouseEvent, index: number) {
    const callout = displayCallouts[index];
    if (callout.aliases.length === 0) return;
    e.preventDefault();
    contextMenu = { x: e.clientX, y: e.clientY, callout };
  }

  function closeContextMenu() {
    contextMenu = null;
    gridEl?.focus();
  }

  function handleSortChange(e: Event) {
    sortMode = (e.target as HTMLSelectElement).value as typeof sortMode;
    onSortChange(sortMode);
  }
</script>

<!-- ===== HEADER ===== -->
<div class="cp-header">
  {#if existingCallout}
    <span class="cp-title">{strings.replacingCallout}: [!{existingCallout}]</span>
  {:else}
    <span class="cp-title">{strings.modalTitle}</span>
  {/if}
  {#if selectionWordCount > 0}
    <span class="cp-badge">{strings.wrapping}: {selectionWordCount}</span>
  {/if}
  <kbd class="cp-hint">↑↓←→ · Enter</kbd>
</div>

<!-- ===== TOP CONTROLS: SORT + FOLD ===== -->
<div class="cp-controls">
  <div class="cp-sort-wrap">
    <label class="cp-sort-label" for="cp-sort">{strings.sortLabel}</label>
    <select id="cp-sort" class="cp-sort-select" value={sortMode} on:change={handleSortChange}>
      <option value="custom">{strings.sortCustom}</option>
      <option value="alpha">{strings.sortAlpha}</option>
      <option value="frequency">{strings.sortFrequency}</option>
    </select>
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
</div>

<!-- ===== FIRST-PARA-AS-TITLE CHECKBOX (multi-paragraph only) ===== -->
{#if hasMultipleParagraphs}
  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label class="cp-first-para">
    <input type="checkbox" bind:checked={firstParaAsTitle} />
    <span>{strings.firstParaAsTitle}</span>
  </label>
{/if}

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
      role="option"
      aria-selected={focusedIndex === i}
      tabindex="-1"
      style="--callout-color: {callout.color}"
      title={callout.aliases.length ? callout.aliases.join(', ') : undefined}
      on:click={() => handleCardClick(i)}
      on:contextmenu={(e) => handleContextMenu(e, i)}
      on:mouseenter={() => (focusedIndex = i)}
    >
      <div class="cp-card__accent" />
      <div class="cp-card__body">
        <!-- Icon + name in same row -->
        <div class="cp-card__header">
          <svg
            class="cp-card__icon"
            viewBox="0 0 24 24"
            fill={callout.fillIcon ? 'currentColor' : 'none'}
            stroke={callout.fillIcon ? 'none' : 'currentColor'}
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
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
        <!-- Alias chips -->
        {#if callout.aliases.length > 0}
          <div class="cp-card__aliases">
            {#each callout.aliases as alias}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <button
                class="cp-card__alias-chip"
                on:click|stopPropagation={() => onSelect(alias, foldState, firstParaAsTitle)}
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

<!-- ===== PREVIEW (collapsable) ===== -->
{#if focusedCallout}
  <div class="cp-preview-wrap">
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="cp-preview-toggle"
      on:click={() => (previewOpen = !previewOpen)}
    >
      <span>{strings.previewLabel}</span>
      <svg
        class="cp-chevron"
        class:cp-chevron--open={previewOpen}
        viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </div>
    {#if previewOpen}
      <div class="cp-preview" style="border-left-color: {focusedCallout.color}">
        <pre class="cp-preview-text">{previewText}</pre>
      </div>
    {/if}
  </div>
{/if}

<!-- ===== CONTEXT MENU (right-click alias selector) ===== -->
{#if contextMenu !== null}
  {@const cc = contextMenu.callout}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="cp-ctx-backdrop" on:click={closeContextMenu} />
  <div
    class="cp-context-menu"
    style="left:{contextMenu.x}px; top:{contextMenu.y}px; --ctx-color: {cc.color}"
  >
    <!-- Main callout entry -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <button
      class="cp-ctx-item cp-ctx-main"
      on:click={() => { onSelect(cc.id, foldState, firstParaAsTitle); closeContextMenu(); }}
    >
      <svg
        class="cp-ctx-icon"
        viewBox="0 0 24 24"
        fill={cc.fillIcon ? 'currentColor' : 'none'}
        stroke={cc.fillIcon ? 'none' : 'currentColor'}
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true"
      >
        {#if cc.iconPath}
          <path d={cc.iconPath} />
        {:else}
          <circle cx="12" cy="12" r="5" />
        {/if}
      </svg>
      <span>{cc.id}</span>
    </button>
    <!-- Alias sub-items -->
    {#each cc.aliases as alias}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <button
        class="cp-ctx-item cp-ctx-alias"
        on:click={() => { onSelect(alias, foldState, firstParaAsTitle); closeContextMenu(); }}
      >
        <span class="cp-ctx-arrow">↳</span>
        <span>{alias}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  /* ── Header ── */
  .cp-header {
    display: flex; align-items: center; gap: 6px;
    padding: 0 4px 10px;
    border-bottom: 1px solid var(--background-modifier-border);
    margin-bottom: 10px;
  }
  .cp-title {
    font-size: 0.9em; font-weight: 600;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
    flex: 1;
  }
  .cp-badge {
    font-size: 0.72em; color: var(--text-on-accent);
    background: var(--interactive-accent);
    border-radius: 10px; padding: 1px 7px; white-space: nowrap;
  }
  .cp-hint {
    font-size: 0.72em; color: var(--text-faint);
    background: var(--background-modifier-hover);
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px; padding: 1px 5px;
    font-family: var(--font-monospace);
  }

  /* ── Controls row ── */
  .cp-controls { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .cp-sort-wrap { display: flex; align-items: center; gap: 5px; flex: 1; }
  .cp-sort-label { font-size: 0.8em; color: var(--text-muted); white-space: nowrap; }
  .cp-sort-select {
    flex: 1; padding: 3px 6px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-secondary); color: var(--text-normal);
    font-size: 0.85em; cursor: pointer;
  }
  .cp-fold { display: flex; gap: 2px; }
  .cp-fold-btn {
    padding: 3px 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-secondary); color: var(--text-muted);
    cursor: pointer; font-size: 0.88em; line-height: 1;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .cp-fold-btn.active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
  }

  /* ── First para as title ── */
  .cp-first-para {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.82em; color: var(--text-muted);
    margin-bottom: 8px; cursor: pointer;
  }
  .cp-first-para input[type="checkbox"] { margin: 0; cursor: pointer; }

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
    transition: border-color 0.1s, background 0.1s;
    overflow: hidden;
  }
  .cp-card:hover, .cp-card--focused {
    border-color: var(--callout-color);
    background: var(--background-secondary-alt);
  }

  /* Filled style */
  .cp-card--filled { background: var(--callout-color); border-color: transparent; }
  .cp-card--filled:hover, .cp-card--filled.cp-card--focused {
    opacity: 0.88; border-color: transparent;
  }
  .cp-card--filled .cp-card__icon { color: rgba(255,255,255,0.95); }
  .cp-card--filled .cp-card__name { color: rgba(255,255,255,0.95); }
  .cp-card--filled .cp-card__alias-chip {
    background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.88);
    border-color: rgba(255,255,255,0.3);
  }
  .cp-card--filled .cp-card__alias-chip:hover {
    background: rgba(255,255,255,0.35); color: #fff;
  }
  .cp-card--filled .cp-card__default-title { color: rgba(255,255,255,0.7); }
  .cp-card--filled .cp-card__accent { background: rgba(0,0,0,0.18); }

  .cp-card__accent { width: 5px; flex-shrink: 0; background: var(--callout-color); }

  .cp-card__body {
    display: flex; flex-direction: column; justify-content: center;
    gap: 3px; padding: 7px 9px; flex: 1; overflow: hidden;
  }

  /* Icon + name in same row */
  .cp-card__header { display: flex; align-items: center; gap: 5px; }
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

  /* ── Preview (collapsable) ── */
  .cp-preview-wrap { margin-top: 10px; }
  .cp-preview-toggle {
    display: flex; align-items: center; justify-content: space-between;
    padding: 4px 10px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px; background: var(--background-secondary);
    cursor: pointer; font-size: 0.8em; color: var(--text-muted);
    user-select: none;
    transition: background 0.1s;
  }
  .cp-preview-toggle:hover { background: var(--background-secondary-alt); }
  .cp-chevron {
    width: 14px; height: 14px;
    transition: transform 0.15s;
  }
  .cp-chevron--open { transform: rotate(180deg); }
  .cp-preview {
    max-height: 90px; overflow-y: auto;
    padding: 8px 12px;
    border-left: 4px solid #888;
    background: var(--background-secondary);
    border-radius: 0 0 4px 4px;
    margin-top: 1px;
  }
  .cp-preview-text {
    font-family: var(--font-monospace); font-size: 0.78em;
    color: var(--text-normal); margin: 0; white-space: pre-wrap;
    line-height: 1.6;
  }

  /* ── Context menu ── */
  .cp-ctx-backdrop { position: fixed; inset: 0; z-index: 100; }
  .cp-context-menu {
    position: fixed; z-index: 101;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.22);
    padding: 4px; min-width: 170px;
  }
  .cp-ctx-item {
    display: flex; align-items: center; gap: 8px;
    width: 100%; text-align: left;
    padding: 6px 10px; border: none; background: none;
    color: var(--text-normal); cursor: pointer;
    border-radius: 4px; font-size: 0.9em;
    transition: background 0.1s, color 0.1s;
  }
  /* Main item: colored icon, colored hover */
  .cp-ctx-main:hover {
    background: var(--ctx-color);
    color: #fff;
  }
  .cp-ctx-main:hover .cp-ctx-icon { color: #fff; }
  /* Alias sub-items: indented, lighter colored hover */
  .cp-ctx-alias { padding-left: 18px; font-size: 0.85em; color: var(--text-muted); }
  .cp-ctx-alias:hover {
    background: var(--ctx-color);
    color: #fff;
  }
  .cp-ctx-alias:hover .cp-ctx-arrow { color: rgba(255,255,255,0.7); }
  .cp-ctx-icon {
    width: 14px; height: 14px; flex-shrink: 0;
    color: var(--ctx-color);
    transition: color 0.1s;
  }
  .cp-ctx-arrow {
    font-size: 0.85em; color: var(--text-faint);
    flex-shrink: 0; width: 14px; text-align: center;
  }
</style>
