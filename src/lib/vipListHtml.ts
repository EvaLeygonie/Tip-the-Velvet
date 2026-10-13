import { buildVipSections, type EventDocContext, type VipListItem } from '@/lib/eventDocuments'

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// An A4-formatted HTML document with a real (per-device, not synced) checkbox next to every
// name, for opening in the browser and printing (or "Print to PDF") from its own print dialog.
// Separate on-screen padding/max-width from the print `@page` margin — `@page` only applies
// once actually printing, so without this the file looks cramped and edge-to-edge when just
// viewed (e.g. on an iPad at the door).
export const buildVipListHtml = (ctx: EventDocContext): string => {
  const { t, eventTitle } = ctx
  const section = (title: string, items: VipListItem[]) => {
    if (items.length === 0) return ''
    return `
      <h2>${escapeHtml(title)}</h2>
      <ul>
        ${items
          .map(
            (item) => `
          <li>
            <input type="checkbox" class="checkbox" />
            <span class="name">${escapeHtml(item.name)}</span>
            ${item.email ? `<span class="email">${escapeHtml(item.email)}</span>` : ''}
            ${item.sub ? `<span class="sub">${escapeHtml(item.sub)}</span>` : ''}
          </li>`
          )
          .join('')}
      </ul>`
  }

  return `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(t('VIP-lista', 'VIP list'))} — ${escapeHtml(eventTitle)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body {
  font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a;
  margin: 0; padding: 32px 20px 64px; background: #faf9f7;
  }
  .page { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 18px; }
  h2 {
  font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em;
  border-bottom: 1px solid #999; padding-bottom: 4px;
  margin: 20px 0 8px; break-after: avoid;
  }
  ul { list-style: none; margin: 0; padding: 0; }
  li {
  display: flex; align-items: center; gap: 10px; padding: 6px 2px;
  border-bottom: 1px dotted #ccc; break-inside: avoid; font-size: 13px;
  }
  .checkbox {
  -webkit-appearance: none; appearance: none;
  width: 15px; height: 15px; margin: 0; border: 1.4px solid #333; flex-shrink: 0;
  border-radius: 2px; cursor: pointer;
  }
  .checkbox:checked {
  background: #333;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" stroke="white" stroke-width="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>');
  background-repeat: no-repeat; background-position: center;
  }
  .name { font-weight: 600; }
  .email { color: #777; font-size: 11px; }
  .sub { color: #a67c00; font-size: 11px; font-style: italic; margin-left: auto; }
  @media print {
  body { padding: 0; background: none; }
  .page { max-width: none; margin: 0; }
  }
</style>
</head>
<body>
  <div class="page">
  <h1>${escapeHtml(t('VIP-lista', 'VIP list'))}</h1>
  <div class="subtitle">${escapeHtml(eventTitle)}</div>
  ${buildVipSections(ctx)
    .map((s) => section(s.title, s.items))
    .join('')}
  </div>
</body>
</html>`
}
