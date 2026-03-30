import { App, Editor, Modal } from 'obsidian';
import type { SvelteComponent } from 'svelte';
import { detectLocale } from './i18n';
import type { PluginSettings } from './types';
import CalloutPicker from './components/CalloutPicker.svelte';

export class CalloutPickerModal extends Modal {
  private svelteComponent: SvelteComponent | null = null;

  constructor(app: App, private editor: Editor, private settings: PluginSettings) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.modalEl.addClass('callout-picker-modal');

    const locale =
      this.settings.language === 'auto' ? detectLocale() : this.settings.language;

    this.svelteComponent = new CalloutPicker({
      target: contentEl,
      props: {
        settings: this.settings,
        locale,
        onSelect: (calloutId: string) => { this.insertCallout(calloutId); this.close(); },
        onClose: () => { this.close(); },
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

  private insertCallout(calloutId: string) {
    const title = this.settings.calloutTitles[calloutId] ?? '';
    const header = title ? `> [!${calloutId}] ${title}` : `> [!${calloutId}]`;
    const editor = this.editor;
    const selection = editor.getSelection();

    if (selection) {
      const lines = selection.split('\n');
      const wrapped = lines
        .map((line, i) => i === 0 ? `${header}\n> ${line}` : `> ${line}`)
        .join('\n');
      editor.replaceSelection(wrapped);
    } else {
      const cursor = editor.getCursor();
      editor.replaceRange(`${header}\n> `, cursor);
      editor.setCursor({ line: cursor.line + 1, ch: 2 });
    }
  }
}
