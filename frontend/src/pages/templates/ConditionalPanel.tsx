/**
 * ConditionalPanel — renders the conditional visibility editor for blocks.
 * Extracted from TemplateEditor.tsx → renderConditionalPanel helper.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConditionalPanelProps {
    selectedBlock: Record<string, unknown> | null;
}

export default function ConditionalPanel({ selectedBlock }: ConditionalPanelProps) {
    const { t } = useTranslation();

    if (!selectedBlock) {
        return <div className="ts-props-empty"><p style={{ fontSize: 13 }}>{t('Select a block first')}</p></div>;
    }

    return (
        <div style={{ animation: 'ts-fadeIn 0.2s ease-out' }}>
            <div className="ts-field">
                <div className="ts-checkbox-row">
                    <input type="checkbox" id="ts-gated" />
                    <label htmlFor="ts-gated" style={{ fontWeight: 600 }}>{t('Gated')}</label>
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted-foreground)', marginTop: 4 }}>
                    {t('Show this block only when conditions are met')}
                </p>
            </div>

            <div className="ts-condition-row">
                <div>
                    <div className="ts-condition-label">{t('Field')}</div>
                    <select title={t('Field')} className="ts-select" style={{ fontSize: 11 }}>
                        <option value="">Select...</option>
                        <option value="order.type">Order Type</option>
                        <option value="order.total">Order Total</option>
                        <option value="order.channel">Channel</option>
                        <option value="fiscal.enabled">Fiscal Enabled</option>
                    </select>
                </div>
                <div>
                    <div className="ts-condition-label">{t('Op')}</div>
                    <select title={t('Operator')} className="ts-select" style={{ fontSize: 11 }}>
                        <option value="eq">=</option>
                        <option value="ne">≠</option>
                        <option value="gt">&gt;</option>
                        <option value="lt">&lt;</option>
                        <option value="exists">exists</option>
                    </select>
                </div>
                <div>
                    <div className="ts-condition-label">{t('Value')}</div>
                    <input type="text" className="ts-input" style={{ fontSize: 11 }} placeholder="..." />
                </div>
            </div>

            <div className="ts-row" style={{ marginTop: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Sz 24 V</span>
            </div>
        </div>
    );
}
