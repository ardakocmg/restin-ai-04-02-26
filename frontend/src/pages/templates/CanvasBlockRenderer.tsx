// @ts-nocheck
/**
 * CanvasBlockRenderer — renders a block preview on the template canvas.
 * Extracted from TemplateEditor.tsx → renderBlockOnCanvas helper.
 */
import React from 'react';
import {
    Bookmark, QrCode, Barcode, Shield, Image, Type,
} from 'lucide-react';

interface CanvasBlockRendererProps {
    block: Record<string, unknown>;
}

export default function CanvasBlockRenderer({ block }: CanvasBlockRendererProps) {
    const tp = block.text_props as Record<string, unknown> | undefined;
    const ip = block.image_props as Record<string, unknown> | undefined;
    const tbp = block.table_props as Record<string, unknown> | undefined;
    const dp = block.divider_props as Record<string, unknown> | undefined;
    const bp = block.barcode_props as Record<string, unknown> | undefined;
    const qp = block.qr_props as Record<string, unknown> | undefined;
    const type = block.type as string;

    switch (type) {
        case 'logo':
            return (
                <div className="ts-row" style={{ justifyContent: 'center', padding: '12px 0' }}>
                    <div style={{ width: 60, height: 60, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bookmark style={{ width: 28, height: 28, color: '#aaa' }} />
                    </div>
                </div>
            );
        case 'venue_info':
        case 'document_title':
        case 'text':
        case 'notes':
        case 'thank_you':
        case 'legal_footer':
        case 'signature_line':
            return (
                <div style={{
                    fontSize: `${tp?.font_size || 12}px`,
                    fontWeight: (tp?.bold) ? 'bold' : 'normal',
                    fontStyle: (tp?.italic) ? 'italic' : 'normal',
                    textDecoration: (tp?.underline) ? 'underline' : 'none',
                    textAlign: (tp?.alignment as 'left' | 'center' | 'right') || 'left',
                    whiteSpace: 'pre-wrap'
                }}>
                    {(tp?.variable as string) || (tp?.content as string) || 'Empty'}
                </div>
            );
        case 'items_list':
        case 'grouped_items':
        case 'table':
        case 'discounts_charges':
        case 'payment_summary':
            return (
                <div style={{ padding: '4px 0' }}>
                    {Boolean(tbp?.show_header) && (
                        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ccc', paddingBottom: 2, marginBottom: 4 }}>
                            {((tbp?.columns as Array<Record<string, string>>) || []).map((c, i) => (
                                <div key={i} style={{ flex: 1, fontSize: 10, fontWeight: 600, textAlign: (c.align as 'left' | 'center' | 'right') || 'left', color: '#666' }}>{c.label}</div>
                            ))}
                        </div>
                    )}
                    <div style={{ fontSize: 11, color: '#888', padding: '4px 0' }}>
                        {type === 'items_list' ? '← Items from order.items →' :
                            type === 'grouped_items' ? '← Grouped by category →' :
                                type === 'payment_summary' ? '← Payment totals →' :
                                    type === 'discounts_charges' ? '← Discounts & charges →' : '← Table data →'}
                    </div>
                </div>
            );
        case 'divider':
            return <hr style={{ borderStyle: (dp?.style as string) || 'solid', borderColor: '#333', borderWidth: `${dp?.thickness || 1}px`, margin: '4px 0' }} />;
        case 'qr_barcode':
        case 'barcode':
            {
                const fmt = (bp?.format as string) || 'CODE128';
                const isQr = fmt === 'QR';
                return (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        {isQr
                            ? <QrCode style={{ width: 48, height: 48, margin: '0 auto', color: '#555' }} />
                            : <Barcode style={{ width: 48, height: 24, margin: '0 auto', color: '#555' }} />}
                        {Boolean(bp?.show_text) && (
                            <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{(bp?.data_source as string) || 'order.id'}</div>
                        )}
                        <div style={{ fontSize: 8, color: '#aaa', marginTop: 1 }}>{fmt}</div>
                    </div>
                );
            }
        case 'qr':
            return (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <QrCode style={{ width: 40, height: 40, margin: '0 auto', color: '#555' }} />
                    <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{(qp?.label as string) || 'QR Code'}</div>
                </div>
            );
        case 'image':
            return (
                <div style={{ textAlign: (ip?.alignment as 'left' | 'center' | 'right') || 'center', padding: '8px 0' }}>
                    <div style={{ display: 'inline-block', width: Number(ip?.width || 180), height: 60, background: '#f5f5f5', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                        <Image style={{ width: 24, height: 24, color: '#ccc', margin: '0 auto', display: 'block', paddingTop: 18 }} />
                    </div>
                </div>
            );
        case 'fiscal':
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 4 }}>
                    <Shield style={{ width: 14, height: 14, color: '#d97706' }} />
                    <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>Fiscal Block</span>
                </div>
            );
        default:
            return <div style={{ fontSize: 11, color: '#999' }}>[{type}]</div>;
    }
}
