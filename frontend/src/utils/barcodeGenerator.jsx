// Code128B SVG Generator (Zero-Cost, No External Library)
const CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112"                                // 100-106 (104=StartB, 106=Stop)
];

export function generateCode128Svg(text, { height = 40, barWidth = 1.6, showText = false } = {}) {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text.trim();
    if (!cleanText) return null;

    // Code128B start code is 104
    const codes = [104];
    let checkSum = 104;

    for (let i = 0; i < cleanText.length; i++) {
        const charCode = cleanText.charCodeAt(i);
        const code = charCode - 32;
        if (code >= 0 && code <= 95) {
            codes.push(code);
            checkSum += code * (i + 1);
        }
    }

    // Check code
    const checkDigit = checkSum % 103;
    codes.push(checkDigit);
    // Stop code is 106
    codes.push(106);

    let patternString = "";
    for (const code of codes) {
        patternString += CODE128_PATTERNS[code] || "";
    }

    let isBar = true;
    let currentX = 0;
    const rects = [];

    for (let i = 0; i < patternString.length; i++) {
        const widthUnits = parseInt(patternString[i], 10);
        const w = widthUnits * barWidth;
        if (isBar) {
            rects.push({ x: currentX, width: w });
        }
        currentX += w;
        isBar = !isBar;
    }

    const totalWidth = currentX;
    const totalHeight = height + (showText ? 14 : 0);

    return (
        <svg
            viewBox={`0 0 ${totalWidth} ${totalHeight}`}
            style={{ width: '100%', maxWidth: `${Math.min(totalWidth, 260)}px`, height: `${totalHeight}px`, display: 'block', margin: '0 auto' }}
        >
            {rects.map((r, idx) => (
                <rect key={idx} x={r.x} y={0} width={r.width} height={height} fill="#000000" />
            ))}
            {showText && (
                <text
                    x={totalWidth / 2}
                    y={totalHeight - 2}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    fill="#000000"
                >
                    {cleanText}
                </text>
            )}
        </svg>
    );
}
