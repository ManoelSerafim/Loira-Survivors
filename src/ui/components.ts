import { formatNumber } from '../core/format';
import type { Rarity } from '../core/types';

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function attrs(data: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== false && value !== '')
    .map(([key, value]) => `data-${key}="${esc(String(value))}"`)
    .join(' ');
}

export function spriteImg(path: string, alt: string, className = '', emoji = ''): string {
  return `<span class="sprite ${className}"><img src="./${esc(path)}" alt="${esc(alt)}" loading="lazy" draggable="false" onerror="this.style.display='none';this.parentElement?.classList.add('is-missing')"><span class="sprite-fallback" aria-hidden="true">${esc(emoji)}</span></span>`;
}

export function regionArt(path: string, alt: string, className = ''): string {
  return `<img class="region-art ${className}" src="./${esc(path)}" alt="${esc(alt)}" loading="lazy" draggable="false">`;
}

export interface ActionButtonOptions {
  action: string;
  className?: string;
  data?: Record<string, string | number | boolean | undefined>;
  disabled?: boolean;
  icon?: string;
  title?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}

export function actionButton(label: string, options: ActionButtonOptions): string {
  const classes = ['btn', options.className ?? 'btn-primary'].filter(Boolean).join(' ');
  const disabled = options.disabled ? 'disabled aria-disabled="true"' : '';
  return `<button type="${options.type ?? 'button'}" class="${classes}" data-action="${esc(options.action)}" ${attrs(options.data ?? {})} ${disabled} ${options.title ? `title="${esc(options.title)}"` : ''} ${options.ariaLabel ? `aria-label="${esc(options.ariaLabel)}"` : ''}>${options.icon ? `<span class="btn-icon" aria-hidden="true">${options.icon}</span>` : ''}<span>${label}</span></button>`;
}

export function linkButton(label: string, screen: string, className = 'btn-ghost', icon = ''): string {
  return actionButton(label, { action: 'goto', data: { screen }, className, icon });
}

export function coinPill(amount: number, label = 'permanentes'): string {
  return `<span class="coin-pill" title="${formatNumber(amount)} moedas ${esc(label)}"><span class="coin-dot" aria-hidden="true"></span><strong>${formatNumber(amount)}</strong><small>${esc(label)}</small></span>`;
}

export function tag(label: string, className = ''): string {
  return `<span class="tag ${className}">${label}</span>`;
}

export function progressBar(value: number, max: number, className = '', showLabel = false): string {
  const ratio = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return `<span class="progress ${className}" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.round(value)}"><span class="progress-fill" style="width:${(ratio * 100).toFixed(2)}%"></span>${showLabel ? `<span class="progress-label">${formatNumber(value)} / ${formatNumber(max)}</span>` : ''}</span>`;
}

export function equippedDots(count: number, total = 2): string {
  return `<span class="equipped-dots" aria-label="${count} de ${total} armas equipadas">${Array.from({ length: total }, (_, index) => `<span class="${index < count ? 'is-on' : ''}"></span>`).join('')}</span>`;
}

export function rarityClass(rarity: Rarity): string {
  return `rarity-${rarity}`;
}

export function topBar(saveCoins: number, title: string, subtitle = '', muted = false): string {
  return `<header class="top-bar">
    <button class="icon-btn back-btn" data-action="back" aria-label="Voltar">←</button>
    <div class="top-bar-title">${subtitle ? `<span class="eyebrow">${esc(subtitle)}</span>` : ''}<strong>${esc(title)}</strong></div>
    <div class="top-bar-tools">${coinPill(saveCoins)}<button class="icon-btn sound-btn ${muted ? 'is-muted' : ''}" data-action="toggle-mute" aria-label="${muted ? 'Ativar som' : 'Silenciar'}" title="${muted ? 'Ativar som' : 'Silenciar'}">${muted ? '🔇' : '🔊'}</button></div>
  </header>`;
}

export function pageHeader(eyebrow: string, title: string, subtitle: string, actions = ''): string {
  return `<div class="page-header">
    <div>
      <span class="eyebrow">${esc(eyebrow)}</span>
      <h1>${esc(title)}</h1>
      <p>${esc(subtitle)}</p>
    </div>
    ${actions ? `<div class="page-actions">${actions}</div>` : ''}
  </div>`;
}

export function statRow(label: string, value: string, emoji = ''): string {
  return `<div class="stat-row"><span>${emoji ? `<span aria-hidden="true">${emoji}</span> ` : ''}${esc(label)}</span><strong>${value}</strong></div>`;
}

export function sectionHeading(title: string, hint = ''): string {
  return `<div class="section-heading"><h2>${esc(title)}</h2>${hint ? `<p>${esc(hint)}</p>` : ''}</div>`;
}

export function emptyState(emoji: string, title: string, description: string): string {
  return `<div class="empty-state"><span aria-hidden="true">${emoji}</span><h3>${esc(title)}</h3><p>${esc(description)}</p></div>`;
}

export function assetPath(file: string): string {
  return `./${file.replace(/^\.?\//, '')}`;
}
