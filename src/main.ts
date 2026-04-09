import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, type PluginSettings } from './types';
import { detectLocale, t } from './i18n';
import { CalloutPickerModal } from './CalloutPickerModal';
import { CalloutPickerSettingsTab } from './SettingsTab';

export default class CalloutPickerPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'open',
      name: 'Open callout picker',
      editorCallback: (editor) => {
        new CalloutPickerModal(this.app, editor, this.settings, () => this.saveSettings()).open();
      },
    });

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu, editor) => {
        const locale =
          this.settings.language === 'auto' ? detectLocale() : this.settings.language;
        const strings = t(locale);

        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const onCalloutLine = /^>\s*\[!/.test(line);

        menu.addItem((item) => {
          item
            .setTitle(onCalloutLine ? strings.contextMenuReplaceLabel : strings.contextMenuLabel)
            .setIcon('quote-glyph')
            .onClick(() =>
              new CalloutPickerModal(this.app, editor, this.settings, () => this.saveSettings()).open(),
            );
        });
      }),
    );

    this.addSettingTab(new CalloutPickerSettingsTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
