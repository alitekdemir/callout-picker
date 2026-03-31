import { App, Editor, Modal } from 'obsidian';
import type { SvelteComponent } from 'svelte';
import { detectLocale } from './i18n';
import type { PluginSettings } from './types';
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
    const selectionWordCount = this.getSelectionWordCount();
    const hasMultipleParagraphs = this.checkMultipleParagraphs();

    this.svelteComponent = new CalloutPicker({
      target: contentEl,
      props: {
        settings: this.settings,
        locale,
        existingCallout: existingInfo?.id ?? null,
        existingCalloutTitle: existingInfo?.title ?? '',
        existingCalloutFirstLine: existingInfo?.content ?? '',
        selectionWordCount,
        hasMultipleParagraphs,
        onSelect: async (
          calloutId: string,
          fold: 'none' | 'open' | 'closed',
          firstParaAsTitle: boolean,
        ) => {
          if (existingInfo !== null) {
            this.replaceCalloutType(calloutId, fold);
          } else {
            this.insertCallout(calloutId, fold, firstParaAsTitle);
          }
          await this.updateUsage(calloutId);
          this.close();
        },
        onClose: () => { this.close(); },
        onSortChange: async (mode: 'custom' | 'alpha' | 'frequency') => {
          this.settings.sortMode = mode;
          await this.saveSettings();
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

  // Detect existing callout on cursor line; return id, title text, and first content line
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

  private getSelectionWordCount(): number {
    const selection = this.editor.getSelection();
    if (!selection.trim()) return 0;
    return selection.trim().split(/\s+/).length;
  }

  private checkMultipleParagraphs(): boolean {
    const selection = this.editor.getSelection();
    if (!selection.trim()) return false;
    return selection.split(/\n\n+/).length > 1;
  }

  // Expand the current selection to include complete first and last lines
  private expandSelectionToFullLines() {
    const editor = this.editor;
    const anchor = editor.getCursor('anchor');
    const head = editor.getCursor('head');
    const fromLine = Math.min(anchor.line, head.line);
    const toLine = Math.max(anchor.line, head.line);
    const toLineLength = editor.getLine(toLine).length;
    // Preserve direction so undo works naturally
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
    firstParaAsTitle: boolean,
  ) {
    const rawTitle = this.settings.calloutTitles[calloutId] ?? '';
    const foldSuffix = fold === 'open' ? '+' : fold === 'closed' ? '-' : '';
    const editor = this.editor;

    if (editor.getSelection()) {
      // Expand to full lines before inserting
      this.expandSelectionToFullLines();
    }

    const selection = editor.getSelection();

    if (selection) {
      const paragraphs = selection.split(/\n\n+/);

      if (paragraphs.length > 1 && firstParaAsTitle) {
        const titleText = this.expandTitle(paragraphs[0].trim());
        const header = `> [!${calloutId}]${foldSuffix} ${titleText}`;
        const bodyParas = paragraphs.slice(1).map(para =>
          para.split('\n').map(l => `> ${l}`).join('\n'),
        );
        editor.replaceSelection(`${header}\n${bodyParas.join('\n>\n')}`);
      } else if (paragraphs.length > 1) {
        const title = this.expandTitle(rawTitle);
        const header = title
          ? `> [!${calloutId}]${foldSuffix} ${title}`
          : `> [!${calloutId}]${foldSuffix}`;
        const wrappedParas = paragraphs.map(para =>
          para.split('\n').map(l => `> ${l}`).join('\n'),
        );
        editor.replaceSelection(`${header}\n${wrappedParas.join('\n>\n')}`);
      } else {
        const title = this.expandTitle(rawTitle);
        const header = title
          ? `> [!${calloutId}]${foldSuffix} ${title}`
          : `> [!${calloutId}]${foldSuffix}`;
        const wrapped = `${header}\n` + selection.split('\n').map(l => `> ${l}`).join('\n');
        editor.replaceSelection(wrapped);
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
