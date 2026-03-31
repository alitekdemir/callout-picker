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
  export let existingCalloutTitle: string = '';
  export let existingCalloutFirstLine: string = '';

  $: strings = t(locale);
  let focusedIndex = 0;
  let gridEl: HTMLDivElement;
  let foldState: 'none' | 'open' | 'closed' = 'none';
  let firstParaAsTitle = false;
  // Track which alias is being hovered for preview update
  let hoveredAlias: string | null = null;
  // Sort mode — reactive local var, passed explicitly to getSortedCallouts to fix Svelte tracking
  let sortMode: 'custom' | 'alpha' | 'frequency' = settings.sortMode ?? 'custom';

  // Pass sortMode and settings explicitly so Svelte's reactive system tracks them as dependencies
  function getSortedCallouts(
    mode: 'custom' | 'alpha' | 'frequency',
    s: PluginSettings,
  ): CalloutDef[] {
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
    // custom: apply user-defined order
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

  // The ID to show in preview: alias hover > focused card
  $: activePreviewId = hoveredAlias ?? focusedCallout?.id ?? null;
  // Find the owning callout definition (alias hover points to its parent card)
  $: ownerCallout = activePreviewId
    ? (displayCallouts.find(c => c.id === activePreviewId)
      ?? displayCallouts.find(c => c.aliases.includes(activePreviewId as string))
      ?? focusedCallout)
    : focusedCallout;
  $: previewColor = ownerCallout?.color ?? '#888';
  // Title: calloutTitles[owner] or existing title when replacing
  $: previewTitle = activePreviewId
    ? (settings.calloutTitles[ownerCallout?.id ?? ''] || existingCalloutTitle)
    : '';
  $: previewLine1 = activePreviewId
    ? `> [!${activePreviewId}]${foldState === 'open' ? '+' : foldState === 'closed' ? '-' : ''}${previewTitle ? ' ' + previewTitle : ''}`
    : '';
  // Content line: existing callout content when replacing, otherwise placeholder
  $: previewLine2 = existingCalloutFirstLine
    ? `> ${existingCalloutFirstLine}`
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
        if (count > 0) onSelect(displayCallouts[focusedIndex].id, foldState, firstParaAsTitle);
        break;
      case 'Escape': e.preventDefault(); onClose(); break;
    }
  }

  function handleCardClick(index: number) {
    focusedIndex = index;
    onSelect(displayCallouts[index].id, foldState, firstParaAsTitle);
  }

  function setSort(mode: typeof sortMode) {
    sortMode = mode;
    onSortChange(mode);
  }
</script>

<!-- ===== HEADER: title + sort buttons + fold toggle ===== -->
<div class="cp-header">
  <div class="cp-header-left">
    {#if existingCallout}
      <span class="cp-title">{strings.replacingCallout}: [!{existingCallout}]</span>
    {:else}
      <span class="cp-title">{strings.modalTitle}</span>
    {/if}
    {#if selectionWordCount > 0}
      <span class="cp-badge">{strings.wrapping}: {selectionWordCount}</span>
    {/if}
  </div>

  <div class="cp-header-right">
    <!-- Sort buttons: ≡  A-Z  ↕ -->
    <div class="cp-sort-btns">
      <button
        class="cp-sort-btn"
        class:active={sortMode === 'custom'}
        on:click={() => setSort('custom')}
        title={strings.sortCustom}>≡</button>
      <button
        class="cp-sort-btn"
        class:active={sortMode === 'alpha'}
        on:click={() => setSort('alpha')}
        title={strings.sortAlpha}>A-Z</button>
      <button
        class="cp-sort-btn"
        class:active={sortMode === 'frequency'}
        on:click={() => setSort('frequency')}
        title={strings.sortFrequency}>↕</button>
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

    <kbd class="cp-hint">↑↓←→ Enter</kbd>
  </div>
</div>

<!-- ===== FIRST-PARA-AS-TITLE CHECKBOX (only when multi-paragraph selected) ===== -->
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
      on:mouseenter={() => { focusedIndex = i; hoveredAlias = null; }}
    >
      <div class="cp-card__accent" />
      <div class="cp-card__body">
        <div class="cp-card__header">
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
                on:click|stopPropagation={() => onSelect(alias, foldState, firstParaAsTitle)}
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
  /* ── Header ── */
  .cp-header {
    display: flex; align-items: center; justify-content: space-between; gap: 6px;
    padding: 0 4px 10px;
    border-bottom: 1px solid var(--background-modifier-border);
    margin-bottom: 10px;
  }
  .cp-header-left { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
  .cp-header-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  .cp-title {
    font-size: 0.9em; font-weight: 600;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cp-badge {
    font-size: 0.72em; color: var(--text-on-accent);
    background: var(--interactive-accent);
    border-radius: 10px; padding: 1px 7px; white-space: nowrap; flex-shrink: 0;
  }
  .cp-hint {
    font-size: 0.7em; color: var(--text-faint);
    background: var(--background-modifier-hover);
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px; padding: 1px 5px;
    font-family: var(--font-monospace); white-space: nowrap;
  }

  /* ── Sort buttons ── */
  .cp-sort-btns { display: flex; gap: 1px; }
  .cp-sort-btn {
    padding: 2px 6px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary); color: var(--text-faint);
    cursor: pointer; font-size: 0.78em; line-height: 1.5;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .cp-sort-btn:first-child { border-radius: 4px 0 0 4px; }
  .cp-sort-btn:last-child { border-radius: 0 4px 4px 0; }
  .cp-sort-btn:not(:first-child) { margin-left: -1px; }
  .cp-sort-btn.active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
    z-index: 1; position: relative;
  }
  .cp-sort-btn:hover:not(.active) { background: var(--background-secondary-alt); color: var(--text-normal); }

  /* ── Fold toggle ── */
  .cp-fold { display: flex; gap: 1px; }
  .cp-fold-btn {
    padding: 2px 7px;
    border: 1px solid var(--background-modifier-border);
    background: var(--background-secondary); color: var(--text-muted);
    cursor: pointer; font-size: 0.88em; line-height: 1.5;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }
  .cp-fold-btn:first-child { border-radius: 4px 0 0 4px; }
  .cp-fold-btn:last-child { border-radius: 0 4px 4px 0; }
  .cp-fold-btn:not(:first-child) { margin-left: -1px; }
  .cp-fold-btn.active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
    z-index: 1; position: relative;
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

  /* ── Preview (always visible, 2 lines) ── */
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
