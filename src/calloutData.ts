export interface CalloutDef {
  id: string;
  aliases: string[];
  color: string;
  icon: string;
  iconPath: string;
  fillIcon?: boolean; // true = use fill="currentColor" instead of stroke (for filled shape icons)
}

export const CALLOUTS: CalloutDef[] = [
  { id: 'note', aliases: [], color: '#448aff', icon: 'pencil',
    iconPath: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z M15 5l4 4' },
  { id: 'abstract', aliases: ['summary', 'tldr'], color: '#00b0ff', icon: 'clipboard-list',
    iconPath: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M9 12h6 M9 16h6 M9 8h2' },
  { id: 'info', aliases: [], color: '#00b0ff', icon: 'info',
    iconPath: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 16v-4 M12 8h.01' },
  { id: 'todo', aliases: [], color: '#448aff', icon: 'check-circle-2',
    iconPath: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M9 12l2 2 4-4' },
  { id: 'tip', aliases: ['hint', 'important'], color: '#00bcd4', icon: 'flame',
    iconPath: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z' },
  { id: 'success', aliases: ['check', 'done'], color: '#00c853', icon: 'check',
    iconPath: 'M20 6 9 17l-5-5' },
  { id: 'question', aliases: ['help', 'faq'], color: '#64dd17', icon: 'help-circle',
    iconPath: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01' },
  { id: 'warning', aliases: ['caution', 'attention'], color: '#ff9100', icon: 'alert-triangle',
    iconPath: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3 M12 9v4 M12 17h.01' },
  { id: 'failure', aliases: ['fail', 'missing'], color: '#ff5252', icon: 'x',
    iconPath: 'M18 6 6 18 M6 6l12 12' },
  { id: 'danger', aliases: ['error'], color: '#ff1744', icon: 'zap',
    iconPath: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z' },
  { id: 'bug', aliases: [], color: '#f50057', icon: 'bug',
    iconPath: 'm8 2 1.88 1.88 M14.12 3.88 16 2 M9 7.13v-1a3.003 3.003 0 1 1 6 0v1 M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6 M12 20v-9 M6.53 9C4.6 8.8 3 7.1 3 5 M6 13H2 M3 21c0-3 1.5-6 4-8 M20.47 9C22.4 8.8 24 7.1 24 5 M22 13h-4 M21 21c0-3-1.5-6-4-8' },
  { id: 'example', aliases: [], color: '#7c4dff', icon: 'list',
    iconPath: 'M3 12h.01 M3 18h.01 M3 6h.01 M8 12h13 M8 18h13 M8 6h13' },
  { id: 'quote', aliases: ['cite'], color: '#9e9e9e', icon: 'quote',
    iconPath: 'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z' },
];
