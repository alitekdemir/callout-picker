import { App, Editor, Modal } from 'obsidian';
import type { SvelteComponent } from 'svelte';
import { detectLocale } from './i18n';
import type { PluginSettings } from './types';
import { CALLOUTS } from './calloutData';
import CalloutPicker from './components/CalloutPicker.svelte';

export class CalloutPickerModal extends Modal {
  private svelteComponent: SvelteComponent | null = null;

  constructor(
    app: App,
    private editor: Editor,
    private settings: PluginSettings,
    private saveSettings: () => Promise<void>,
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass('callout-picker-modal');

    const locale =
      this.settings.language === 'auto' ? detectLocale() : this.settings.language;

    const existingInfo = this.detectExistingCallout();
    const [selectionFirstLine, selectionSecondLine] = this.getSelectionLines();
    const hasSelection = selectionFirstLine.length > 0 || this.editor.getSelection().trim().length > 0;

    this.svelteComponent = new CalloutPicker({
      target: contentEl,
      props: {
        settings: this.settings,
        locale,
        existingCallout: existingInfo?.id ?? null,
        existingCalloutTitle: existingInfo?.title ?? '',
        existingCalloutFirstLine: existingInfo?.content ?? '',
        hasSelection,
        selectionFirstLine,
        selectionSecondLine,
        onSelect: async (
          calloutId: string,
          fold: 'none' | 'open' | 'closed',
          firstLineAsTitle: boolean,
        ) => {
          if (existingInfo !== null) {
            this.replaceCalloutType(calloutId, fold);
          } else {
            this.insertCallout(calloutId, fold, firstLineAsTitle);
          }
          await this.updateUsage(calloutId);
          this.close();
        },
        onClose: () => { this.close(); },
        onSortChange: async (mode: 'custom' | 'alpha' | 'frequency') => {
          this.settings.sortMode = mode;
          await this.saveSettings();
        },
        onMoveCallout: async (calloutId: string, direction: 'up' | 'down') => {
          // Build the current ordered ID list
          const allIds = [
            ...CALLOUTS,
            ...(this.settings.customCallouts ?? []),
          ].map(c => c.id);
          const order = this.settings.calloutOrder?.length
            ? [...this.settings.calloutOrder]
            : allIds;

          const idx = order.indexOf(calloutId);
          if (idx < 0) return;
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= order.length) return;

          [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];
          this.settings.calloutOrder = order;
          await this.saveSettings();

          // Push updated settings back into the Svelte component
          if (this.svelteComponent) {
            this.svelteComponent.$set({ settings: { ...this.settings } });
          }
        },
      },
    });
  }

  onClose() {
    if (this.svelteComponent) {
      this.svelteComponent.$destroy();
      this.svelteComponent = null;
    }
    this.contentEl.empty();
  }

  // Detect existing callout on cursor line; return id, title text, first content line
  private detectExistingCallout(): { id: string; title: string; content: string } | null {
    const cursor = this.editor.getCursor();
    const line = this.editor.getLine(cursor.line);
    const match = line.match(/^>\s*\[!([^\]]+?)([+-]?)]\s*(.*)?$/);
    if (!match) return null;
    const id = match[1].toLowerCase();
    const title = (match[3] ?? '').trim();
    const nextLine = this.editor.getLine(cursor.line + 1) ?? '';
    const contentMatch = nextLine.match(/^>\s*(.*)/);
    const content = contentMatch ? contentMatch[1].trim() : '';
    return { id, title, content };
  }

  // Return first two non-empty lines of the current selection
  private getSelectionLines(): [string, string] {
    const sel = this.editor.getSelection().trim();
    if (!sel) return ['', ''];
    const lines = sel.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return [lines[0] ?? '', lines[1] ?? ''];
  }

  // Expand the selection to include complete first and last lines
  private expandSelectionToFullLines() {
    const editor = this.editor;
    const anchor = editor.getCursor('anchor');
    const head = editor.getCursor('head');
    const fromLine = Math.min(anchor.line, head.line);
    const toLine = Math.max(anchor.line, head.line);
    const toLineLength = editor.getLine(toLine).length;
    if (anchor.line <= head.line) {
      editor.setSelection({ line: fromLine, ch: 0 }, { line: toLine, ch: toLineLength });
    } else {
      editor.setSelection({ line: toLine, ch: toLineLength }, { line: fromLine, ch: 0 });
    }
  }

  // Expand {date} and {time} templates in titles
  private expandTitle(title: string): string {
    if (!title.includes('{')) return title;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    return title.replace(/\{date\}/g, date).replace(/\{time\}/g, time);
  }

  private async updateUsage(calloutId: string) {
    if (!this.settings.usageCounts) this.settings.usageCounts = {};
    this.settings.usageCounts[calloutId] = (this.settings.usageCounts[calloutId] ?? 0) + 1;
    await this.saveSettings();
  }

  private replaceCalloutType(newId: string, fold: 'none' | 'open' | 'closed') {
    const cursor = this.editor.getCursor();
    const line = this.editor.getLine(cursor.line);
    const foldSuffix = fold === 'open' ? '+' : fold === 'closed' ? '-' : '';
    const newLine = line.replace(
      /^(>\s*\[!)([^\]]+?)([+-]?)(\])/,
      `$1${newId}${foldSuffix}$4`,
    );
    this.editor.setLine(cursor.line, newLine);
  }

  private insertCallout(
    calloutId: string,
    fold: 'none' | 'open' | 'closed',
    firstLineAsTitle: boolean,
  ) {
    const rawTitle = this.settings.calloutTitles[calloutId] ?? '';
    const foldSuffix = fold === 'open' ? '+' : fold === 'closed' ? '-' : '';
    const editor = this.editor;

    if (editor.getSelection()) {
      this.expandSelectionToFullLines();
    }

    const selection = editor.getSelection();

    if (selection) {
      const nonEmptyLines = selection.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (firstLineAsTitle && nonEmptyLines.length > 0) {
        // First non-empty line → title; rest → body
        const titleText = this.expandTitle(nonEmptyLines[0]);
        const header = `> [!${calloutId}]${foldSuffix} ${titleText}`;
        // Wrap all lines (body lines after first), keeping blank-line paragraph separation
        const allLines = selection.split('\n');
        // Skip lines until past the first non-empty line, then wrap the rest
        let pastFirst = false;
        const bodyLines: string[] = [];
        for (const line of allLines) {
          if (!pastFirst && line.trim() === nonEmptyLines[0]) {
            pastFirst = true;
            continue;
          }
          if (pastFirst) bodyLines.push(`> ${line}`);
        }
        const body = bodyLines.length > 0 ? bodyLines.join('\n') : '> ';
        editor.replaceSelection(`${header}\n${body}`);
      } else {
        // Wrap all selected lines
        const paragraphs = selection.split(/\n\n+/);
        const title = this.expandTitle(rawTitle);
        const header = title
          ? `> [!${calloutId}]${foldSuffix} ${title}`
          : `> [!${calloutId}]${foldSuffix}`;
        if (paragraphs.length > 1) {
          const wrappedParas = paragraphs.map(para =>
            para.split('\n').map(l => `> ${l}`).join('\n'),
          );
          editor.replaceSelection(`${header}\n${wrappedParas.join('\n>\n')}`);
        } else {
          const wrapped = `${header}\n` + selection.split('\n').map(l => `> ${l}`).join('\n');
          editor.replaceSelection(wrapped);
        }
      }
    } else {
      const title = this.expandTitle(rawTitle);
      const header = title
        ? `> [!${calloutId}]${foldSuffix} ${title}`
        : `> [!${calloutId}]${foldSuffix}`;
      const cursor = editor.getCursor();
      editor.replaceRange(`${header}\n> `, cursor);
      editor.setCursor({ line: cursor.line + 1, ch: 2 });
    }
  }
}
