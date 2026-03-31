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

    const existingCallout = this.detectExistingCallout();
    const selectionWordCount = this.getSelectionWordCount();
    const hasMultipleParagraphs = this.checkMultipleParagraphs();

    this.svelteComponent = new CalloutPicker({
      target: contentEl,
      props: {
        settings: this.settings,
        locale,
        existingCallout,
        selectionWordCount,
        hasMultipleParagraphs,
        onSelect: async (
          calloutId: string,
          fold: 'none' | 'open' | 'closed',
          firstParaAsTitle: boolean,
        ) => {
          if (existingCallout !== null) {
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

  // F9: detect if cursor is inside an existing callout header line
  private detectExistingCallout(): string | null {
    const cursor = this.editor.getCursor();
    const line = this.editor.getLine(cursor.line);
    const match = line.match(/^>\s*\[!([^\]]+)\]/);
    return match ? match[1].toLowerCase() : null;
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

  // F12: expand {date} and {time} templates in titles
  private expandTitle(title: string): string {
    if (!title.includes('{')) return title;
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 5);   // HH:MM
    return title.replace(/\{date\}/g, date).replace(/\{time\}/g, time);
  }

  // Increment usage count for frequency sort
  private async updateUsage(calloutId: string) {
    if (!this.settings.usageCounts) this.settings.usageCounts = {};
    this.settings.usageCounts[calloutId] = (this.settings.usageCounts[calloutId] ?? 0) + 1;
    await this.saveSettings();
  }

  // F9: replace existing callout type on current line
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

  // Insert callout with fold state, multi-paragraph support, and firstParaAsTitle
  private insertCallout(
    calloutId: string,
    fold: 'none' | 'open' | 'closed',
    firstParaAsTitle: boolean,
  ) {
    const rawTitle = this.settings.calloutTitles[calloutId] ?? '';
    const foldSuffix = fold === 'open' ? '+' : fold === 'closed' ? '-' : '';
    const editor = this.editor;
    const selection = editor.getSelection();

    if (selection) {
      const paragraphs = selection.split(/\n\n+/);

      if (paragraphs.length > 1 && firstParaAsTitle) {
        // First paragraph becomes the callout title
        const titleText = this.expandTitle(paragraphs[0].trim());
        const header = `> [!${calloutId}]${foldSuffix} ${titleText}`;
        const bodyParas = paragraphs.slice(1).map(para =>
          para.split('\n').map(line => `> ${line}`).join('\n'),
        );
        const wrapped = `${header}\n${bodyParas.join('\n>\n')}`;
        editor.replaceSelection(wrapped);
      } else if (paragraphs.length > 1) {
        // Each paragraph as a separate block inside the callout
        const title = this.expandTitle(rawTitle);
        const header = title
          ? `> [!${calloutId}]${foldSuffix} ${title}`
          : `> [!${calloutId}]${foldSuffix}`;
        const wrappedParas = paragraphs.map(para =>
          para.split('\n').map(line => `> ${line}`).join('\n'),
        );
        const wrapped = `${header}\n${wrappedParas.join('\n>\n')}`;
        editor.replaceSelection(wrapped);
      } else {
        const title = this.expandTitle(rawTitle);
        const header = title
          ? `> [!${calloutId}]${foldSuffix} ${title}`
          : `> [!${calloutId}]${foldSuffix}`;
        const lines = selection.split('\n');
        const wrapped = `${header}\n` + lines.map(line => `> ${line}`).join('\n');
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
