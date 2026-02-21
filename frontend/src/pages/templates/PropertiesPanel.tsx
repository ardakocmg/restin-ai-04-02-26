/**
 * PropertiesPanel — renders block properties editor sidebar.
 * Extracted from TemplateEditor.tsx → renderPropertiesPanel helper.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';

interface PropertiesPanelProps {
    selectedBlock: Record<string, unknown> | null;
    updateProp: (bid: string, pk: string, f: string, v: unknown) => void;
    setBlocks: React.Dispatch<React.SetStateAction<Record<string, unknown>[]>>;
}

export default function PropertiesPanel({ selectedBlock, updateProp, setBlocks }: PropertiesPanelProps) {
    const { t } = useTranslation();

    if (!selectedBlock) {
        return (
            <div className="ts-props-empty">
                <Settings2 className="icon" />
                <p style={{ fontSize: 13 }}>{t('Select a block to edit its properties')}</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
            </div>
        );
    }

    const bid = selectedBlock.id as string;
    const type = selectedBlock.type as string;
    const tp = selectedBlock.text_props as Record<string, unknown> | undefined;
    const tbp = selectedBlock.table_props as Record<string, unknown> | undefined;
    const dp = selectedBlock.divider_props as Record<string, unknown> | undefined;
    const bp = selectedBlock.barcode_props as Record<string, unknown> | undefined;
    const ip = selectedBlock.image_props as Record<string, unknown> | undefined;

    const isTextType = ['text', 'venue_info', 'document_title', 'notes', 'thank_you', 'legal_footer', 'signature_line'].includes(type);
    const isTableType = ['items_list', 'grouped_items', 'table', 'discounts_charges', 'payment_summary'].includes(type);

    return (
        <div style={{ animation: 'ts-fadeIn 0.2s ease-out' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
            {/* Block Type Chip */}
            <div className="ts-row" style={{ marginBottom: 16, gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <span className="ts-type-chip active-chip">{(selectedBlock.label as string) || type}</span>
                <span className="ts-type-chip normal" style={{ marginLeft: 'auto' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    {isTextType ? 'Normal' : isTableType ? 'Data' : type}
                </span>
            </div>

            {/* Block Width Control */}
            <div className="ts-field">
                <label className="ts-label">{t('Block Width')}</label>
                <div className="ts-width-buttons">
                    {[25, 50, 75, 100].map(w => (
                        <button
                            key={w}
                            className={`ts-width-btn ${Number(selectedBlock.block_width || 100) === w ? 'active' : ''}`}
                            onClick={() => setBlocks(prev => prev.map(b => b.id === bid ? { ...b, block_width: w } : b))}
                        >
                            {w}%
                        </button>
                    ))}
                </div>
            </div>

            {/* Section selector */}
            <div className="ts-field">
                <label className="ts-label" htmlFor="ts-section">{t('Section')}</label>
                <select aria-label="Input"
                    id="ts-section"
                    title={t('Section')}
                    className="ts-select"
                    value={(selectedBlock.section as string) || 'body'}
                    onChange={e => setBlocks(prev => prev.map(b => b.id === bid ? { ...b, section: e.target.value } : b))}
                >
                    <option value="header">Header</option>
                    <option value="body">Body</option>
                    <option value="footer">Footer</option>
                </select>
            </div>

            {/* Text-based block properties */}
            {isTextType && (
                <>
                    <div className="ts-field">
                        <label className="ts-label" htmlFor="ts-content">{t('Content')}</label>
                        <textarea aria-label="Input"
                            id="ts-content"
                            className="ts-textarea"
                            rows={3}
                            value={(tp?.content as string) || ''}
                            onChange={e => updateProp(bid, 'text_props', 'content', e.target.value)}
                            placeholder={t('Enter text content...')}
                        />
                    </div>
                    <div className="ts-grid-2">
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-size">{t('Size')}</label>
                            <input aria-label="Input"
                                id="ts-size"
                                type="number" min={6} max={48}
                                className="ts-input"
                                value={Number(tp?.font_size || 12)}
                                onChange={e => updateProp(bid, 'text_props', 'font_size', Number(e.target.value))}
                            />
                        </div>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-align">{t('Alignment')}</label>
                            <select aria-label="Input"
                                id="ts-align"
                                title={t('Alignment')}
                                className="ts-select"
                                value={(tp?.alignment as string) || 'left'}
                                onChange={e => updateProp(bid, 'text_props', 'alignment', e.target.value)}
                            >
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                            </select>
                        </div>
                    </div>
                    <div className="ts-field">
                        <label className="ts-label">{t('Style')}</label>
                        <div className="ts-row" style={{ gap: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            {(['bold', 'italic', 'underline'] as const).map(s => (
                                <label key={s} className="ts-checkbox-row" style={{ fontSize: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <input aria-label="Input"
                                        type="checkbox"
                                        checked={Boolean(tp?.[s])}
                                        onChange={e => updateProp(bid, 'text_props', s, e.target.checked)}
                                    />
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="ts-field">
                        <label className="ts-label" htmlFor="ts-variable">{t('Variable')}</label>
                        <input aria-label="Input"
                            id="ts-variable"
                            type="text"
                            className="ts-input"
                            value={(tp?.variable as string) || ''}
                            onChange={e => updateProp(bid, 'text_props', 'variable', e.target.value || null)}
                            placeholder="{{venue.name}}"
                            style={{ fontFamily: 'monospace' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                        />
                    </div>
                    {/* Advanced text options */}
                    <div className="ts-field">
                        <div className="ts-checkbox-row">
                            <input aria-label="Ts Show Modifiers" type="checkbox" id="ts-show-modifiers" />
                            <label htmlFor="ts-show-modifiers">{t('Show modifiers')}</label>
                        </div>
                        <div className="ts-checkbox-row">
                            <input aria-label="Ts Show Notes" type="checkbox" id="ts-show-notes" />
                            <label htmlFor="ts-show-notes">{t('Show notes')}</label>
                        </div>
                        <div className="ts-checkbox-row">
                            <input aria-label="Ts Hide Prices" type="checkbox" id="ts-hide-prices" />
                            <label htmlFor="ts-hide-prices">{t('Hide prices')}</label>
                        </div>
                        <div className="ts-checkbox-row">
                            <input aria-label="Ts Compact" type="checkbox" id="ts-compact" />
                            <label htmlFor="ts-compact">{t('Compact mode')}</label>
                        </div>
                    </div>
                </>
            )}

            {/* Table-based block properties */}
            {isTableType && (
                <>
                    <div className="ts-field">
                        <label className="ts-label" htmlFor="ts-datasource">{t('Data Source')}</label>
                        <input aria-label="Input"
                            id="ts-datasource"
                            type="text"
                            className="ts-input"
                            value={(tbp?.data_source as string) || ''}
                            onChange={e => updateProp(bid, 'table_props', 'data_source', e.target.value)}
                            placeholder="order.items"
                            style={{ fontFamily: 'monospace' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                        />
                    </div>
                    <div className="ts-field">
                        <label className="ts-label" htmlFor="ts-groupby">{t('Group by')}</label>
                        <select aria-label="Input"
                            id="ts-groupby"
                            title={t('Group by')}
                            className="ts-select"
                            value={(tbp?.group_by as string) || 'none'}
                            onChange={e => updateProp(bid, 'table_props', 'group_by', e.target.value)}
                        >
                            <option value="none">None</option>
                            <option value="category">Category</option>
                            <option value="course">Course</option>
                            <option value="seat">Seat</option>
                        </select>
                    </div>
                    <div className="ts-checkbox-row">
                        <input aria-label="Ts Show Header" type="checkbox" id="ts-show-header" checked={Boolean(tbp?.show_header)} onChange={e => updateProp(bid, 'table_props', 'show_header', e.target.checked)} />
                        <label htmlFor="ts-show-header">{t('Show header')}</label>
                    </div>
                    <div className="ts-checkbox-row">
                        <input aria-label="Ts Show Totals" type="checkbox" id="ts-show-totals" checked={Boolean(tbp?.show_totals)} onChange={e => updateProp(bid, 'table_props', 'show_totals', e.target.checked)} />
                        <label htmlFor="ts-show-totals">{t('Show totals')}</label>
                    </div>
                    <div className="ts-field">
                        <label className="ts-label">{t('Max chars per line')}</label>
                        <select title={t('Max chars per line')} className="ts-select">
                            <option value="auto">Auto</option>
                            <option value="32">32</option>
                            <option value="42">42</option>
                            <option value="48">48</option>
                        </select>
                    </div>
                    <div className="ts-checkbox-row">
                        <input aria-label="Ts Divider Line" type="checkbox" id="ts-divider-line" />
                        <label htmlFor="ts-divider-line">{t('Divider line')}</label>
                    </div>
                </>
            )}

            {/* Divider */}
            {type === 'divider' && (
                <div className="ts-field">
                    <label className="ts-label" htmlFor="ts-div-style">{t('Style')}</label>
                    <select aria-label="Input"
                        id="ts-div-style"
                        title={t('Divider style')}
                        className="ts-select"
                        value={(dp?.style as string) || 'solid'}
                        onChange={e => updateProp(bid, 'divider_props', 'style', e.target.value)}
                    >
                        <option value="solid">Solid ─────</option>
                        <option value="dashed">Dashed - - - -</option>
                        <option value="dotted">Dotted · · · · ·</option>
                        <option value="double">Double ═════</option>
                    </select>
                </div>
            )}

            {/* Barcode / QR */}
            {(type === 'qr_barcode' || type === 'barcode') && (
                <>
                    <div className="ts-field">
                        <label className="ts-label" htmlFor="ts-bc-src">{t('Data Source')}</label>
                        <input aria-label="Ts Bc Src" id="ts-bc-src" type="text" className="ts-input" style={{ fontFamily: 'monospace' }} value={(bp?.data_source as string) || ''} onChange={e => updateProp(bid, 'barcode_props', 'data_source', e.target.value)} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    </div>
                    <div className="ts-field">
                        <label className="ts-label" htmlFor="ts-bc-format">{t('Format')}</label>
                        <select id="ts-bc-format" title={t('Barcode format')} className="ts-select" value={(bp?.format as string) || 'CODE128'} onChange={e => updateProp(bid, 'barcode_props', 'format', e.target.value)}>
                            <option value="CODE128">CODE128</option>
                            <option value="QR">QR Code</option>
                            <option value="EAN13">EAN-13</option>
                            <option value="UPC">UPC-A</option>
                        </select>
                    </div>
                    <div className="ts-grid-2">
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-bc-h">{t('Height')}</label>
                            <input aria-label="Ts Bc H" id="ts-bc-h" type="number" min={20} max={200} className="ts-input" value={Number(bp?.height || 60)} onChange={e => updateProp(bid, 'barcode_props', 'height', Number(e.target.value))} />
                        </div>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-bc-w">{t('Width')}</label>
                            <input aria-label="Ts Bc W" id="ts-bc-w" type="number" min={1} max={5} className="ts-input" value={Number(bp?.width || 2)} onChange={e => updateProp(bid, 'barcode_props', 'width', Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="ts-checkbox-row">
                        <input aria-label="Ts Bc Text" type="checkbox" id="ts-bc-text" checked={Boolean(bp?.show_text)} onChange={e => updateProp(bid, 'barcode_props', 'show_text', e.target.checked)} />
                        <label htmlFor="ts-bc-text">{t('Show text label')}</label>
                    </div>
                </>
            )}

            {/* Image */}
            {(type === 'image' || type === 'logo') && (
                <>
                    <div className="ts-field">
                        <label className="ts-label" htmlFor="ts-img-url">{t('Image URL')}</label>
                        <input aria-label="Ts Img Url" id="ts-img-url" type="text" className="ts-input" value={(ip?.url as string) || ''} onChange={e => updateProp(bid, 'image_props', 'url', e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="ts-grid-2">
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-img-w">{t('Width')}</label>
                            <input aria-label="Ts Img W" id="ts-img-w" type="number" min={20} max={576} className="ts-input" value={Number(ip?.width || 180)} onChange={e => updateProp(bid, 'image_props', 'width', Number(e.target.value))} />
                        </div>
                        <div className="ts-field">
                            <label className="ts-label" htmlFor="ts-img-align">{t('Align')}</label>
                            <select id="ts-img-align" title={t('Alignment')} className="ts-select" value={(ip?.alignment as string) || 'center'} onChange={e => updateProp(bid, 'image_props', 'alignment', e.target.value)}>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                            </select>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
