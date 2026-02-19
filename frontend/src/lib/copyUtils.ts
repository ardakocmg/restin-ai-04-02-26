/**
 * Smart Copy Utility for AI Messages
 * Strips markdown formatting and preserves table structure for clean clipboard output.
 */

/**
 * Converts raw markdown text to clean, beautifully formatted plain text.
 * - Removes ** / * / __ / _ bold/italic markers
 * - Preserves table structure with aligned columns
 * - Cleans up emoji spacing
 * - Removes HTML tags
 */
export function markdownToCleanText(md: string): string {
    if (!md) return '';

    const lines = md.split('\n');
    const result: string[] = [];
    let inTable = false;
    const tableRows: string[][] = [];

    const flushTable = (): void => {
        if (tableRows.length === 0) return;

        // Calculate max width for each column
        const colCount = Math.max(...tableRows.map(r => r.length));
        const colWidths: number[] = Array(colCount).fill(0);
        for (const row of tableRows) {
            row.forEach((cell, i) => {
                colWidths[i] = Math.max(colWidths[i] || 0, cell.trim().length);
            });
        }

        // Format each row with padding
        for (let ri = 0; ri < tableRows.length; ri++) {
            const row = tableRows[ri];
            // Skip separator rows (---|----|---)
            if (row.every(c => /^[-:]+$/.test(c.trim()))) continue;

            const formatted = row
                .map((cell, ci) => cell.trim().padEnd(colWidths[ci] || 0))
                .join('  │  ');
            result.push(formatted);

            // Add separator after header
            if (ri === 0) {
                const sep = colWidths.map(w => '─'.repeat(w)).join('──┼──');
                result.push(sep);
            }
        }
        tableRows.length = 0;
        inTable = false;
    };

    for (const line of lines) {
        // Table detection
        if (line.includes('|') && line.trim().startsWith('|')) {
            if (!inTable) inTable = true;
            const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
            tableRows.push(cells.map(c => cleanInline(c)));
            continue;
        }

        if (inTable) flushTable();

        // Headers: remove # markers
        const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
            result.push(cleanInline(headerMatch[2]).toUpperCase());
            result.push('');
            continue;
        }

        // List items: preserve bullet
        const listMatch = line.match(/^(\s*)[*\-+]\s+(.*)$/);
        if (listMatch) {
            result.push(`${listMatch[1]}• ${cleanInline(listMatch[2])}`);
            continue;
        }

        // Numbered list
        const numMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
        if (numMatch) {
            result.push(`${numMatch[1]}${cleanInline(numMatch[2])}`);
            continue;
        }

        // Regular line
        result.push(cleanInline(line));
    }

    if (inTable) flushTable();

    return result.join('\n').trim();
}

/**
 * Clean inline markdown: remove bold/italic/code markers, HTML tags
 */
function cleanInline(text: string): string {
    return text
        .replace(/\*\*\*(.*?)\*\*\*/g, '$1')   // ***bold italic***
        .replace(/\*\*(.*?)\*\*/g, '$1')         // **bold**
        .replace(/__(.*?)__/g, '$1')             // __bold__
        .replace(/\*(.*?)\*/g, '$1')             // *italic*
        .replace(/_(.*?)_/g, '$1')               // _italic_
        .replace(/`(.*?)`/g, '$1')               // `code`
        .replace(/~~(.*?)~~/g, '$1')             // ~~strikethrough~~
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url) → link
        .replace(/<[^>]+>/g, '')                 // HTML tags
        .trim();
}

/**
 * Copy text to clipboard with a rich HTML version for apps that support it.
 * Falls back to plain text for simple paste targets.
 */
export async function smartCopy(markdown: string): Promise<void> {
    const plainText = markdownToCleanText(markdown);

    try {
        // Try rich copy (HTML + plain text)
        const htmlContent = markdownToHtml(markdown);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });

        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html': blob,
                'text/plain': textBlob,
            }),
        ]);
    } catch {
        // Fallback: plain text only
        await navigator.clipboard.writeText(plainText);
    }
}

/**
 * Simple markdown → HTML for rich clipboard paste
 */
function markdownToHtml(md: string): string {
    let html = md
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br/>');

    // Tables
    if (html.includes('|')) {
        const lines = md.split('\n');
        let tableHtml = '<table style="border-collapse:collapse;font-size:13px;">';
        let inTable = false;
        let isHeader = true;

        for (const line of lines) {
            if (line.includes('|') && line.trim().startsWith('|')) {
                if (!inTable) { inTable = true; isHeader = true; }
                const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
                if (cells.every(c => /^[-:]+$/.test(c.trim()))) { isHeader = false; continue; }

                const tag = isHeader ? 'th' : 'td';
                const style = isHeader
                    ? 'padding:4px 8px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;'
                    : 'padding:4px 8px;border:1px solid #ddd;';
                tableHtml += `<tr>${cells.map(c => `<${tag} style="${style}">${cleanInline(c)}</${tag}>`).join('')}</tr>`;
            }
        }
        tableHtml += '</table>';
        if (inTable) html = tableHtml;
    }

    return html;
}
