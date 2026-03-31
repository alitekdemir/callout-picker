import { App, PluginSettingTab, Setting } from 'obsidian';
import { CALLOUTS } from './calloutData';
import { detectLocale, t, type Locale } from './i18n';
import type { CustomCalloutDef } from './types';
import type CalloutPickerPlugin from './main';

export class CalloutPickerSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: CalloutPickerPlugin) {
    super(app, plugin);
  }

  // Returns the current ordered list of all callout IDs
  private getOrder(): string[] {
    const stored = this.plugin.settings.calloutOrder ?? [];
    if (stored.length > 0) return [...stored];
    const custom = this.plugin.settings.customCallouts ?? [];
    return [...CALLOUTS, ...custom].map(c => c.id);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const locale: Locale =
      this.plugin.settings.language === 'auto' ? detectLocale() : this.plugin.settings.language;
    const strings = t(locale);

    containerEl.createEl('h2', { text: strings.settingsTitle });
    containerEl.createEl('p', { text: strings.settingsDesc, cls: 'setting-item-description' });

    // ── Language ──
    new Setting(containerEl)
      .setName(strings.settingsLanguageLabel)
      .setDesc(strings.settingsLanguageDesc)
      .addDropdown((dropdown) => {
        dropdown
          .addOption('auto', strings.langAuto)
          .addOption('tr', strings.langTr)
          .addOption('en', strings.langEn)
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value as 'auto' | Locale;
            await this.plugin.saveSettings();
            this.display();
          });
      });

    // ── Column Count (F6) ──
    new Setting(containerEl)
      .setName(strings.settingsColumnCount)
      .setDesc(strings.settingsColumnCountDesc)
      .addDropdown((d) => {
        d.addOption('2', '2')
          .addOption('3', '3')
          .addOption('4', '4')
          .setValue(String(this.plugin.settings.columnCount ?? 3))
          .onChange(async (v) => {
            this.plugin.settings.columnCount = parseInt(v) as 2 | 3 | 4;
            await this.plugin.saveSettings();
          });
      });

    // ── Card Style (F11) ──
    new Setting(containerEl)
      .setName(strings.settingsCardStyle)
      .setDesc(strings.settingsCardStyleDesc)
      .addDropdown((d) => {
        d.addOption('minimal', strings.settingsCardStyleMinimal)
          .addOption('filled', strings.settingsCardStyleFilled)
          .setValue(this.plugin.settings.cardStyle ?? 'minimal')
          .onChange(async (v) => {
            this.plugin.settings.cardStyle = v as 'minimal' | 'filled';
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl('hr');

    // ── Callout Order + Default Titles (F10 + existing) ──
    containerEl.createEl('h3', { text: strings.settingsOrder });
    containerEl.createEl('p', { text: strings.settingsOrderDesc, cls: 'setting-item-description' });

    const customCallouts = this.plugin.settings.customCallouts ?? [];
    const allCallouts = [
      ...CALLOUTS,
      ...customCallouts.map(c => ({ ...c, icon: '', fillIcon: false as const })),
    ];

    const order = this.getOrder();
    const orderedCallouts = [
      ...order.map(id => allCallouts.find(c => c.id === id)).filter(
        (c): c is (typeof allCallouts)[number] => c !== undefined,
      ),
      ...allCallouts.filter(c => !order.includes(c.id)),
    ];

    for (let idx = 0; idx < orderedCallouts.length; idx++) {
      const callout = orderedCallouts[idx];
      const aliases = callout.aliases.length
        ? `  —  ${strings.aliasesLabel}: ${callout.aliases.join(', ')}`
        : '';

      new Setting(containerEl)
        .setName(callout.id.charAt(0).toUpperCase() + callout.id.slice(1))
        .setDesc(`[!${callout.id}]${aliases}`)
        .addText((text) => {
          text
            .setPlaceholder(strings.settingsPlaceholder)
            .setValue(this.plugin.settings.calloutTitles[callout.id] ?? '')
            .onChange(async (value) => {
              if (value.trim()) {
                this.plugin.settings.calloutTitles[callout.id] = value.trim();
              } else {
                delete this.plugin.settings.calloutTitles[callout.id];
              }
              await this.plugin.saveSettings();
            });
          // F12: template hint
          text.inputEl.title = strings.settingsTitleTemplateHint;
        })
        .addExtraButton((btn) =>
          btn
            .setIcon('arrow-up')
            .setTooltip('Move up')
            .onClick(async () => {
              const cur = this.getOrder();
              const i = cur.indexOf(callout.id);
              if (i <= 0) return;
              [cur[i - 1], cur[i]] = [cur[i], cur[i - 1]];
              this.plugin.settings.calloutOrder = cur;
              await this.plugin.saveSettings();
              this.display();
            }),
        )
        .addExtraButton((btn) =>
          btn
            .setIcon('arrow-down')
            .setTooltip('Move down')
            .onClick(async () => {
              const cur = this.getOrder();
              const i = cur.indexOf(callout.id);
              if (i < 0 || i >= cur.length - 1) return;
              [cur[i], cur[i + 1]] = [cur[i + 1], cur[i]];
              this.plugin.settings.calloutOrder = cur;
              await this.plugin.saveSettings();
              this.display();
            }),
        );
    }

    containerEl.createEl('hr');

    // ── Custom Callouts (F4) ──
    containerEl.createEl('h3', { text: strings.settingsCustomCallouts });
    containerEl.createEl('p', { text: strings.settingsCustomDesc, cls: 'setting-item-description' });

    for (const custom of customCallouts) {
      new Setting(containerEl)
        .setName(custom.id)
        .setDesc(`color: ${custom.color}${custom.aliases.length ? ' · ' + custom.aliases.join(', ') : ''}`)
        .addExtraButton((btn) =>
          btn
            .setIcon('trash')
            .setTooltip(strings.settingsCustomRemove)
            .onClick(async () => {
              this.plugin.settings.customCallouts = customCallouts.filter(
                (c) => c.id !== custom.id,
              );
              // Also remove from order
              this.plugin.settings.calloutOrder = (
                this.plugin.settings.calloutOrder ?? []
              ).filter((id) => id !== custom.id);
              await this.plugin.saveSettings();
              this.display();
            }),
        );
    }

    // Add custom callout form
    containerEl.createEl('h4', { text: strings.settingsAddCustom });

    let newId = '';
    let newColor = '#888888';
    let newAliases = '';

    new Setting(containerEl)
      .setName(strings.settingsCustomId)
      .addText((t) => t.setPlaceholder('my-callout').onChange((v) => (newId = v.trim())));

    new Setting(containerEl)
      .setName(strings.settingsCustomColor)
      .addColorPicker((c) => c.setValue(newColor).onChange((v) => (newColor = v)));

    new Setting(containerEl)
      .setName(strings.settingsCustomAliases)
      .addText((t) =>
        t.setPlaceholder(strings.settingsCustomAliasesPlaceholder).onChange((v) => (newAliases = v)),
      );

    new Setting(containerEl).addButton((btn) =>
      btn
        .setButtonText(strings.settingsCustomAdd)
        .setCta()
        .onClick(async () => {
          if (!newId) return;
          if (!this.plugin.settings.customCallouts) this.plugin.settings.customCallouts = [];
          const newCustom: CustomCalloutDef = {
            id: newId,
            aliases: newAliases
              .split(',')
              .map((a) => a.trim())
              .filter(Boolean),
            color: newColor,
            iconPath: '',
          };
          this.plugin.settings.customCallouts.push(newCustom);
          await this.plugin.saveSettings();
          this.display();
        }),
    );
  }
}
