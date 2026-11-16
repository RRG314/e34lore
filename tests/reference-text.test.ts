import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LinkedText,referenceTextSegments} from '../src/components/LinkedText';
describe('member reference links',()=>{
 it('keeps punctuation and every original character while linking an official business website',()=>{const text='Official website: https://kormanautoworks.com/.\nReference (https://example.org/repair).';const parts=referenceTextSegments(text);expect(parts.map(p=>p.text).join('')).toBe(text);expect(parts.filter(p=>p.href).map(p=>p.href)).toEqual(['https://kormanautoworks.com/','https://example.org/repair']);});
 it('does not turn HTML, credential URLs, script schemes or loopback addresses into executable content',()=>{const text='<img src=x onerror=alert(1)> javascript:alert(1) https://user:password@example.org/path http://127.0.0.1/private';const html=renderToStaticMarkup(createElement(LinkedText,{text}));expect(html).not.toContain('<img');expect(html).not.toContain('<a');expect(html).toContain('&lt;img');});
 it('preserves balanced parentheses and labels the full destination without an embed',()=>{const html=renderToStaticMarkup(createElement(LinkedText,{text:'https://example.org/parts_(BMW)'}));expect(html).toContain('href="https://example.org/parts_(BMW)"');expect(html).toContain('ugc nofollow noopener noreferrer');expect(html).not.toContain('<iframe');});
 it('bounds link rendering and rejects oversized URL candidates without losing the text',()=>{const text=Array.from({length:70},(_,i)=>'https://example.org/'+i).join(' ');expect(referenceTextSegments(text).filter(p=>p.href)).toHaveLength(50);const long='https://example.org/'+('a'.repeat(2100));expect(referenceTextSegments(long).some(p=>p.href)).toBe(false);expect(referenceTextSegments(long).map(p=>p.text).join('')).toBe(long);});
});
