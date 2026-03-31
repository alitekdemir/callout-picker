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
    const hasSelection = this.editor.getSelection().trim().length > 0;

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
        // Drag-drop reorder: move fromId to the position of toId
        onReorderCallout: async (fromId: string, toId: string) => {
          const allIds = [
            ...CALLOUTS,
            ...(this.settings.customCallouts ?? []),
          ].map(c => c.id);
          const order = this.settings.calloutOrder?.length
            ? [...this.settings.calloutOrder]
            : [...allIds];

          const fromIdx = order.indexOf(fromId);
          const toIdx = order.indexOf(toId);
          if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

          order.splice(fromIdx, 1);
          order.splice(toIdx, 0, fromId);

          this.settings.calloutOrder = order;
          await this.saveSettings();

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

  // Strip one level of blockquote + optional callout marker from a line
  private stripQuotePrefix(line: string): string {
    return line
      .replace(/^>\s*\[![^\]]+\][+\-]?\s*/, '') // strip "> [!type]+ "
      .replace(/^>\s*/, '');                      // strip remaining "> "
  }

  // Returns [full first editor line (cleaned), second non-empty selection line (cleaned)]
  private getSelectionLines(): [string, string] {
    const sel = this.editor.getSelection().trim();
    if (!sel) return ['', ''];
    const anchor = this.editor.getCursor('anchor');
    const head = this.editor.getCursor('head');
    const fromLine = Math.min(anchor.line, head.line);
    const firstFullLine = this.stripQuotePrefix(this.editor.getLine(fromLine).trim());
    const lines = sel.split('\n')
      .map(l => this.stripQuotePrefix(l.trim()))
      .filter(l => l.length > 0);
    return [firstFullLine || (lines[0] ?? ''), lines[1] ?? ''];
  }

  // Expand selection to complete first and last lines before inserting
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
      // Normalize: strip one level of "> " blockquote prefix before re-wrapping,
      // so selections from within existing callouts don't produce doubled "> >"
      const stripOne = (l: string) => l.replace(/^>\s*/, '');
      const nonEmptyLines = selection.split('\n')
        .map(l => this.stripQuotePrefix(l.trim()))
        .filter(l => l.length > 0);

      if (firstLineAsTitle && nonEmptyLines.length > 0) {
        const titleText = this.expandTitle(nonEmptyLines[0]);
        const header = `> [!${calloutId}]${foldSuffix} ${titleText}`;
        // Wrap remaining lines, skipping the first non-empty line
        const allLines = selection.split('\n');
        let pastFirst = false;
        const bodyLines: string[] = [];
        for (const line of allLines) {
          const clean = this.stripQuotePrefix(line.trim());
          if (!pastFirst && clean === nonEmptyLines[0]) {
            pastFirst = true;
            continue;
          }
          if (pastFirst) bodyLines.push(`> ${stripOne(line)}`);
        }
        const body = bodyLines.filter(l => l !== '> ').length > 0
          ? bodyLines.join('\n')
          : '> ';
        editor.replaceSelection(`${header}\n${body}`);
      } else {
        const paragraphs = selection.split(/\n\n+/);
        const title = this.expandTitle(rawTitle);
        const header = title
          ? `> [!${calloutId}]${foldSuffix} ${title}`
          : `> [!${calloutId}]${foldSuffix}`;
        if (paragraphs.length > 1) {
          const wrappedParas = paragraphs.map(para =>
            para.split('\n').map(l => `> ${stripOne(l)}`).join('\n'),
          );
          editor.replaceSelection(`${header}\n${wrappedParas.join('\n>\n')}`);
        } else {
          const wrapped = `${header}\n` + selection.split('\n').map(l => `> ${stripOne(l)}`).join('\n');
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
