"use strict";
/**
 * Structural table extractor for maintenance plan PDFs.
 * Uses text layout analysis (not LLM) to recover table structure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTableStructural = extractTableStructural;
/**
 * Extract table structure by analyzing text layout within interval blocks.
 * This is a POC for recovering missing points 3-9 from fragmented table data.
 */
function extractTableStructural(rawText) {
    var rows = [];
    // Split by interval sections to handle fragmented tables
    var intervalSections = extractIntervalSections(rawText);
    for (var _i = 0, intervalSections_1 = intervalSections; _i < intervalSections_1.length; _i++) {
        var section = intervalSections_1[_i];
        var structuredRows = parseIntervalSection(section.interval, section.text);
        rows.push.apply(rows, structuredRows);
    }
    return rows;
}
/**
 * Split text into sections by interval headers
 */
function extractIntervalSections(rawText) {
    var sections = [];
    // Pattern: "Toutes les X heures..." or similar interval headers
    var intervalPattern = /(Toutes les\s+(\d+)\s*heures?[^]*?)(?=Toutes les|Le cas échéant|$)/gi;
    var match;
    while ((match = intervalPattern.exec(rawText)) !== null) {
        var fullText = match[1];
        var intervalNum = match[2];
        sections.push({
            interval: "".concat(intervalNum, "h"),
            text: fullText,
        });
    }
    // Handle "Le cas échéant" section separately
    var asNeededMatch = rawText.match(/(Le cas échéant[^]*?)(?=$|\n9\.|Page)/i);
    if (asNeededMatch) {
        sections.push({
            interval: 'as-needed',
            text: asNeededMatch[1],
        });
    }
    return sections;
}
/**
 * Parse a single interval section to extract point-component pairs.
 * Uses structural analysis: collect numbers and bullets, match by position.
 */
function parseIntervalSection(interval, sectionText) {
    var rows = [];
    // Extract all standalone numbers (service points)
    var numberLines = sectionText
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) { return /^\d+$/.test(line) && line.length <= 2; });
    // Extract all component names (lines starting with bullet or "Point/Vérin/Charnières")
    var componentLines = sectionText
        .split('\n')
        .map(function (line) { return line.trim(); })
        .filter(function (line) {
        return line.match(/^[▪•\-*]/) ||
            line.match(/^(Point|Vérin|Charnières|Paliers|Pivot)/);
    })
        .map(function (line) { return cleanComponentName(line); });
    // Structural matching: assume numbers and components appear in order
    // If we have N numbers and M components, match first M numbers with M components
    var matchCount = Math.min(numberLines.length, componentLines.length);
    for (var i = 0; i < matchCount; i++) {
        var pointNum = numberLines[i];
        var component = componentLines[i];
        if (component && component.length > 2) {
            rows.push({
                service_point: pointNum,
                component: component,
                interval: interval,
                page: '1', // Assuming single page for now
            });
        }
    }
    return rows;
}
/**
 * Clean component name from extracted text
 */
function cleanComponentName(text) {
    return text
        .replace(/^[▪•\-*]\s*/, '') // Remove leading bullet
        .replace(/\s*\d+\s*$/, '') // Remove trailing numbers
        .replace(/[,:;()]/g, '') // Remove punctuation
        .replace(/\ben option\b/i, '') // Remove "en option"
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
}
