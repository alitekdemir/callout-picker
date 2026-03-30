<script lang="ts">
  import { onMount } from 'svelte';
  import { CALLOUTS } from '../calloutData';
  import { t, type Locale } from '../i18n';
  import type { PluginSettings } from '../types';

  export let settings: PluginSettings;
  export let locale: Locale;
  export let onSelect: (id: string) => void;
  export let onClose: () => void;

  $: strings = t(locale);
  let focusedIndex = 0;
  let gridEl: HTMLDivElement;

  onMount(() => { gridEl?.focus(); });

  function handleKeydown(event: KeyboardEvent) {
    const cols = 3;
    const count = CALLOUTS.length;
    switch (event.key) {
      case 'ArrowRight': event.preventDefault(); focusedIndex = (focusedIndex + 1) % count; break;
      case 'ArrowLeft':  event.preventDefault(); focusedIndex = (focusedIndex - 1 + count) % count; break;
      case 'ArrowDown':  event.preventDefault(); focusedIndex = Math.min(focusedIndex + cols, count - 1); break;
      case 'ArrowUp':    event.preventDefault(); focusedIndex = Math.max(focusedIndex - cols, 0); break;
      case 'Enter':
      case ' ':          event.preventDefault(); onSelect(CALLOUTS[focusedIndex].id); break;
      case 'Escape':     event.preventDefault(); onClose(); break;
    }
  }

  function handleCardClick(index: number) {
    focusedIndex = index;
    onSelect(CALLOUTS[index].id);
  }
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div class="cp-header" role="banner">
  <span class="cp-title">{strings.modalTitle}</span>
  <kbd class="cp-hint">↑↓←→ · Enter</kbd>
</div>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div class="cp-grid" role="listbox" tabindex="0" bind:this={gridEl} on:keydown={handleKeydown}>
  {#each CALLOUTS as callout, i}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="cp-card"
      class:cp-card--focused={focusedIndex === i}
      role="option"
      aria-selected={focusedIndex === i}
      tabindex="-1"
      style="--callout-color: {callout.color}"
      on:click={() => handleCardClick(i)}
      on:mouseenter={() => (focusedIndex = i)}
    >
      <div class="cp-card__accent" />
      <div class="cp-card__body">
        <svg class="cp-card__icon" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" aria-hidden="true">
          <path d={callout.iconPath} />
        </svg>
        <span class="cp-card__name">{callout.id}</span>
        {#if callout.aliases.length > 0}
          <span class="cp-card__aliases">{callout.aliases.join(', ')}</span>
        {/if}
        {#if settings.calloutTitles[callout.id]}
          <span class="cp-card__default-title">"{settings.calloutTitles[callout.id]}"</span>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .cp-header { display:flex; align-items:center; justify-content:space-between; padding:0 4px 10px; border-bottom:1px solid var(--background-modifier-border); margin-bottom:12px; }
  .cp-title { font-size:0.9em; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; }
  .cp-hint { font-size:0.75em; color:var(--text-faint); background:var(--background-modifier-hover); border:1px solid var(--background-modifier-border); border-radius:4px; padding:1px 5px; font-family:var(--font-monospace); }
  .cp-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; outline:none; }
  .cp-card { position:relative; display:flex; align-items:stretch; border-radius:6px; border:2px solid transparent; background:var(--background-secondary); cursor:pointer; transition:border-color 0.1s, background 0.1s; overflow:hidden; min-height:70px; }
  .cp-card:hover, .cp-card--focused { border-color:var(--callout-color); background:var(--background-secondary-alt); }
  .cp-card__accent { width:4px; flex-shrink:0; background:var(--callout-color); }
  .cp-card__body { display:flex; flex-direction:column; justify-content:center; gap:2px; padding:8px 10px; flex:1; overflow:hidden; }
  .cp-card__icon { width:16px; height:16px; color:var(--callout-color); flex-shrink:0; margin-bottom:2px; }
  .cp-card__name { font-size:0.85em; font-weight:600; color:var(--text-normal); text-transform:capitalize; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cp-card__aliases { font-size:0.7em; color:var(--text-faint); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .cp-card__default-title { font-size:0.7em; color:var(--callout-color); font-style:italic; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
</style>
