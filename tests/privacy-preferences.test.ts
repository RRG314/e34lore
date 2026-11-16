import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UsageAnalytics, UsageConsent } from '../src/components/UsageAnalytics';
import { CommercialConsent } from '../src/components/Commercial';
describe('quiet public analytics and explicit privacy choices', () => { it('renders no analytics controls in the background recorder', () => { expect(renderToStaticMarkup(createElement(UsageAnalytics, { path: '/workshop' }))).toBe(''); }); it('keeps both optional count settings disabled in server-rendered privacy preferences', () => { for (const component of [createElement(UsageConsent, { key: 'usage' }), createElement(CommercialConsent, { key: 'retail' })]) {
    const html = renderToStaticMarkup(component);
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('checked=');
} }); });
