/**
 * Slip image generator using Canvas API.
 * Draws the voter slip directly — pixel-perfect, no html2canvas issues.
 */

const THEME_CONFIG = {
    'INC': { primary: '#1e40af', accent: '#3b82f6', secondary: '#eff6ff', gradStart: '#1e40af', gradEnd: '#3b82f6' },
    'CPIM': { primary: '#dc2626', accent: '#ef4444', secondary: '#fef2f2', gradStart: '#dc2626', gradEnd: '#ef4444' },
    'CPI': { primary: '#b91c1c', accent: '#dc2626', secondary: '#fef2f2', gradStart: '#b91c1c', gradEnd: '#ef4444' },
    'IUML': { primary: '#15803d', accent: '#22c55e', secondary: '#f0fdf4', gradStart: '#15803d', gradEnd: '#22c55e' },
    'KCM': { primary: '#ea580c', accent: '#f97316', secondary: '#fff7ed', gradStart: '#ea580c', gradEnd: '#f97316' },
    'KCJ': { primary: '#0369a1', accent: '#0ea5e9', secondary: '#f0f9ff', gradStart: '#0369a1', gradEnd: '#0ea5e9' },
    'RSP': { primary: '#be123c', accent: '#f43f5e', secondary: '#fff1f2', gradStart: '#be123c', gradEnd: '#f43f5e' },
    'PLAIN': { primary: '#475569', accent: '#64748b', secondary: '#f8fafc', gradStart: '#475569', gradEnd: '#64748b' },
};

function getTheme(party) {
    const id = (party?.short_label || party?.name || '').toUpperCase();
    if (id.includes('INC') || id.includes('CONGRESS')) return THEME_CONFIG['INC'];
    if (id.includes('CPIM') || id.includes('CPM')) return THEME_CONFIG['CPIM'];
    if (id.includes('CPI')) return THEME_CONFIG['CPI'];
    if (id.includes('IUML') || id.includes('LEAGUE')) return THEME_CONFIG['IUML'];
    if (id.includes('RSP')) return THEME_CONFIG['RSP'];
    if (id.includes('KCM')) return THEME_CONFIG['KCM'];
    if (id.includes('KCJ')) return THEME_CONFIG['KCJ'];
    return party ? THEME_CONFIG['INC'] : THEME_CONFIG['PLAIN'];
}

/**
 * Loads an image from URL and returns it as an HTMLImageElement.
 */
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/**
 * Draws rounded rectangle on canvas.
 */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * Wraps text to fit within maxWidth, returns array of lines.
 */
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        if (ctx.measureText(testLine).width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

/**
 * Generates voter slip as a Canvas and triggers download.
 */
export async function downloadSlipImage(element, voterName, boothNo, voter, party) {
    try {
        const theme = getTheme(party);

        // Canvas dimensions — optimized for WhatsApp mobile (2:1 ratio)
        const W = 1080;    // Width
        const PAD = 40;    // Padding
        const SYMBOL_W = 240; // Left symbol section width
        const DATA_X = SYMBOL_W + 30; // Where data section starts
        const DATA_W = W - DATA_X - PAD; // Data section width

        // Load party symbol image
        let symbolImg = null;
        if (party?.symbol_image) {
            symbolImg = await loadImage(`/api/party-symbol/${party.symbol_image}`);
        }

        // --- Calculate dynamic height based on content ---
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Measure polling station text
        tempCtx.font = 'bold 28px sans-serif';
        const psLines = wrapText(tempCtx, voter.ps_name || '---', DATA_W - 20);

        // Measure voter name
        tempCtx.font = 'bold 48px sans-serif';
        const nameLines = wrapText(tempCtx, voterName || '', DATA_W - 10);

        // Height — calculated exactly from content, minimal bottom pad
        let H = PAD + 80 + 30 + 24 + nameLines.length * 58 + 50 + 24 + 48 + 68 + 28 + 54 + psLines.length * 38 + 24;
        H = Math.max(H, 530);

        // --- Create actual canvas ---
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // Branding strip (top)
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, theme.gradStart);
        grad.addColorStop(1, theme.gradEnd);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, 5);

        // Card border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        roundRect(ctx, 1, 1, W - 2, H - 2, 16);
        ctx.stroke();

        // --- SYMBOL SECTION (left) ---
        ctx.fillStyle = theme.secondary;
        ctx.fillRect(0, 5, SYMBOL_W, H - 5);

        // Symbol circle
        const circleX = SYMBOL_W / 2;
        const circleY = H / 2 - 30;
        const circleR = 75;

        // Circle shadow
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Circle border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw party symbol
        if (symbolImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(circleX, circleY, circleR - 8, 0, Math.PI * 2);
            ctx.clip();
            const imgSize = (circleR - 8) * 2;
            ctx.drawImage(symbolImg, circleX - imgSize / 2, circleY - imgSize / 2, imgSize, imgSize);
            ctx.restore();
        }

        // Dashed perforation line
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(SYMBOL_W, 5);
        ctx.lineTo(SYMBOL_W, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // "മുറിച്ചു മാറ്റുക" text
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = theme.primary;
        ctx.globalAlpha = 0.7;
        ctx.textAlign = 'center';
        ctx.fillText('മുറിച്ചു മാറ്റുക', circleX, circleY + circleR + 35);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';

        // --- DATA SECTION (right) ---
        let y = PAD;

        // HEADER ROW: Serial Number + Booth
        const headerY = y;
        const headerH = 72;
        const serialW = (DATA_W) * 0.55;
        const boothW = DATA_W - serialW - 8;

        // Serial number box (gradient)
        const serialGrad = ctx.createLinearGradient(DATA_X, headerY, DATA_X + serialW, headerY);
        serialGrad.addColorStop(0, theme.gradStart);
        serialGrad.addColorStop(1, theme.gradEnd);
        roundRect(ctx, DATA_X, headerY, serialW, headerH, 10);
        ctx.fillStyle = serialGrad;
        ctx.fill();

        // Serial: label and number vertically centered
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ക്രമ നമ്പർ', DATA_X + serialW / 2, headerY + 28);
        const numText = String(voter.serial_no || '');
        ctx.font = 'bold 38px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(numText, DATA_X + serialW / 2, headerY + 60);
        ctx.textAlign = 'left';

        // Booth box (light)
        const boothX = DATA_X + serialW + 8;
        roundRect(ctx, boothX, headerY, boothW, headerH, 10);
        ctx.fillStyle = '#f8fafc';
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        roundRect(ctx, boothX, headerY, boothW, headerH, 10);
        ctx.stroke();

        // Booth: label and number vertically centered
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ബൂത്ത്', boothX + boothW / 2, headerY + 28);
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(String(voter.booth_no || '').padStart(3, '0'), boothX + boothW / 2, headerY + 60);
        ctx.textAlign = 'left';

        y += headerH + 30;

        // --- VOTER NAME ---
        ctx.fillStyle = theme.primary;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('വോട്ടറുടെ പേര്', DATA_X, y);
        y += 12;

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 48px sans-serif';
        for (const line of nameLines) {
            y += 58;
            ctx.fillText(line, DATA_X, y);
        }
        y += 50;

        // --- VOTER ID ---
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('വോട്ടർ ഐഡി', DATA_X, y);
        y += 16;

        const epicText = voter.epic_id || '';
        ctx.font = 'bold 32px monospace';
        const epicW = ctx.measureText(epicText).width + 28;
        roundRect(ctx, DATA_X, y, epicW, 44, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        roundRect(ctx, DATA_X, y, epicW, 44, 6);
        ctx.stroke();
        ctx.fillStyle = '#1e293b';
        ctx.fillText(epicText, DATA_X + 14, y + 32);
        y += 68;

        // --- SEPARATOR ---
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(DATA_X, y);
        ctx.lineTo(DATA_X + DATA_W, y);
        ctx.stroke();
        y += 28;

        // --- POLLING STATION ---
        ctx.beginPath();
        ctx.arc(DATA_X + 8, y + 9, 6, 0, Math.PI * 2);
        ctx.fillStyle = theme.accent;
        ctx.fill();

        ctx.fillStyle = theme.primary;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('പോളിംഗ് സ്റ്റേഷൻ', DATA_X + 24, y + 16);
        y += 54;

        ctx.fillStyle = '#334155';
        ctx.font = 'bold 28px sans-serif';
        for (const line of psLines) {
            ctx.fillText(line, DATA_X, y + 6);
            y += 38;
        }

        // --- Download ---
        const safeName = (voterName || 'Voter')
            .replace(/[^a-zA-Z0-9\u0D00-\u0D7F\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 40);
        const filename = `${safeName}_${voter?.booth_no || boothNo}.png`;

        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();

        return true;
    } catch (err) {
        console.error('Failed to generate slip image:', err);
        return false;
    }
}

/**
 * Opens WhatsApp via wa.me — no text, just opens chat with the voter's number.
 * Agent attaches the downloaded slip image manually.
 */
export function openWhatsApp(phoneNo) {
    const cleanPhone = phoneNo.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${fullPhone}`;
    const win = window.open(url, '_blank');
    // If popup was blocked, fall back to same-tab navigation
    if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = url;
    }
}

/**
 * Combined: download slip image, then open WhatsApp with voter's number.
 */
export async function sendSlipViaWhatsApp(element, voter, messageTemplate, party) {
    const downloaded = await downloadSlipImage(null, voter.full_name, voter.booth_no, voter, party);
    if (downloaded) {
        setTimeout(() => {
            openWhatsApp(voter.phone_no);
        }, 800);
    }
}
