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

    // Inject drag-drop styles once
    if (!containerEl.ownerDocument.getElementById('cp-order-styles')) {
      const style = containerEl.ownerDocument.createElement('style');
      style.id = 'cp-order-styles';
      style.textContent = `
        .cp-order-list { display: flex; flex-direction: column; gap: 3px; margin-bottom: 8px; }
        .cp-order-item {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 8px; border-radius: 5px;
          border: 1px solid var(--background-modifier-border);
          background: var(--background-secondary);
          cursor: default;
        }
        .cp-order-item.cp-drag-over {
          border-color: var(--item-color, var(--interactive-accent));
          background: color-mix(in srgb, var(--item-color, var(--interactive-accent)) 10%, var(--background-secondary));
        }
        .cp-order-item.cp-dragging { opacity: 0.4; }
        .cp-order-grip {
          font-size: 1em; color: var(--text-faint);
          cursor: grab; flex-shrink: 0; user-select: none;
        }
        .cp-order-icon {
          width: 16px; height: 16px; flex-shrink: 0;
        }
        .cp-order-label {
          flex: 1; font-size: 0.85em; color: var(--text-muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .cp-order-label strong { color: var(--text-normal); }
        .cp-order-title {
          width: 140px; flex-shrink: 0;
          font-size: 0.82em; padding: 2px 6px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px; background: var(--background-primary);
          color: var(--text-normal);
        }
      `;
      containerEl.ownerDocument.head.appendChild(style);
    }

    const listEl = containerEl.createDiv({ cls: 'cp-order-list' });
    let dragSrcId: string | null = null;

    const buildRows = () => {
      listEl.empty();
      const cur = this.getOrder();
      const curCallouts = [
        ...cur.map(id => allCallouts.find(c => c.id === id)).filter(
          (c): c is (typeof allCallouts)[number] => c !== undefined,
        ),
        ...allCallouts.filter(c => !cur.includes(c.id)),
      ];

      for (const callout of curCallouts) {
        const row = listEl.createDiv({ cls: 'cp-order-item' });
        row.setAttribute('draggable', 'true');
        row.dataset.id = callout.id;

        row.style.setProperty('--item-color', callout.color);

        const grip = row.createSpan({ cls: 'cp-order-grip', text: '⠿' });
        grip.title = 'Drag to reorder';

        // Colored SVG icon
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = row.createSvg('svg', {
          cls: 'cp-order-icon',
          attr: {
            viewBox: '0 0 24 24',
            fill: (callout as any).fillIcon ? callout.color : 'none',
            stroke: (callout as any).fillIcon ? 'none' : callout.color,
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          },
        });
        if ((callout as any).iconPath) {
          const path = document.createElementNS(svgNS, 'path');
          path.setAttribute('d', (callout as any).iconPath);
          svg.appendChild(path);
        } else {
          const circle = document.createElementNS(svgNS, 'circle');
          circle.setAttribute('cx', '12');
          circle.setAttribute('cy', '12');
          circle.setAttribute('r', '5');
          svg.appendChild(circle);
        }

        const label = row.createSpan({ cls: 'cp-order-label' });
        label.innerHTML = `<strong style="color:${callout.color}">${callout.id}</strong>`;
        if (callout.aliases.length) {
          label.innerHTML += `  —  <span style="color:var(--text-faint)">${callout.aliases.join(', ')}</span>`;
        }

        const titleInput = row.createEl('input', { cls: 'cp-order-title' }) as HTMLInputElement;
        titleInput.type = 'text';
        titleInput.placeholder = strings.settingsPlaceholder;
        titleInput.title = strings.settingsTitleTemplateHint;
        titleInput.value = this.plugin.settings.calloutTitles[callout.id] ?? '';
        titleInput.addEventListener('change', async () => {
          const val = titleInput.value.trim();
          if (val) {
            this.plugin.settings.calloutTitles[callout.id] = val;
          } else {
            delete this.plugin.settings.calloutTitles[callout.id];
          }
          await this.plugin.saveSettings();
        });

        row.addEventListener('dragstart', (e) => {
          dragSrcId = callout.id;
          row.addClass('cp-dragging');
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', () => {
          dragSrcId = null;
          row.removeClass('cp-dragging');
          listEl.querySelectorAll('.cp-drag-over').forEach(el => el.removeClass('cp-drag-over'));
        });
        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (dragSrcId && dragSrcId !== callout.id) {
            row.addClass('cp-drag-over');
          }
        });
        row.addEventListener('dragleave', () => row.removeClass('cp-drag-over'));
        row.addEventListener('drop', async (e) => {
          e.preventDefault();
          row.removeClass('cp-drag-over');
          if (!dragSrcId || dragSrcId === callout.id) return;
          const o = this.getOrder();
          const fromIdx = o.indexOf(dragSrcId);
          const toIdx = o.indexOf(callout.id);
          if (fromIdx < 0 || toIdx < 0) return;
          o.splice(fromIdx, 1);
          o.splice(toIdx, 0, dragSrcId);
          this.plugin.settings.calloutOrder = o;
          await this.plugin.saveSettings();
          buildRows();
        });
      }
    };

    buildRows();

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
