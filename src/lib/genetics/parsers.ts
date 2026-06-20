/**
 * Consumer DNA file parsers.
 *
 * PR 2 of the genetics roadmap. Pure parsers — no I/O, no DOM, no
 * Supabase. Take a decompressed file as text, return a typed
 * { format, variants, provenance } bundle the upload flow (PR 4) can
 * pass straight to the persistence layer.
 *
 * Why pure: the upload pipeline encrypts in the browser before anything
 * is uploaded. The parser runs on plaintext for ~5-10 ms per file and
 * the result feeds the encrypt step. Decoupling parse from I/O lets the
 * unit tests run against fixture strings instead of mocking File / Blob.
 *
 * Supported formats (this PR):
 *   - 23andme       (tab-delimited, `# ` header comments)
 *   - ancestrydna   (tab-delimited, `# ` header comments, allele1/allele2 cols)
 *   - myheritage    (CSV, quoted, header row "RSID,CHROMOSOME,POSITION,RESULT")
 *   - familytree    (CSV, similar to MyHeritage)
 *
 * VCF / CRAM / BAM are deferred to a follow-up PR — they need a real
 * spec-conformant parser, not regex.
 */

import type {
    ConfidenceLevel,
    GeneticFormat,
    ParsedVariant,
} from './types';

// ─── Errors ──────────────────────────────────────────────────────────────────

export class GeneticParseError extends Error {
    constructor(message: string, public readonly format?: GeneticFormat) {
        super(message);
        this.name = 'GeneticParseError';
    }
}

// ─── Format detection ────────────────────────────────────────────────────────

/**
 * Sniff the format from the first ~4 KB of content. Each provider stamps
 * an unambiguous signature in the leading bytes:
 *   - 23andMe: header includes "23andMe" and rsid/chromosome/position/genotype
 *   - AncestryDNA: header includes "AncestryDNA" and allele1/allele2 columns
 *   - MyHeritage: CSV header literally "RSID,CHROMOSOME,POSITION,RESULT"
 *     and the body is quoted CSV
 *   - FamilyTreeDNA: header line "RSID,CHROMOSOME,POSITION,RESULT" but
 *     a different sentinel in the comments
 *
 * Returns null if the file doesn't look like any supported consumer
 * format (caller surfaces a friendly error).
 */
export function detectFormat(text: string): GeneticFormat | null {
    const head = text.slice(0, 4096);

    // VCF starts with ##fileformat= line
    if (/^##fileformat=VCFv/m.test(head)) return 'vcf';

    if (/23andMe/i.test(head)) return '23andme';

    if (/AncestryDNA/i.test(head)) return 'ancestrydna';

    // MyHeritage exports include their name in a header comment, but their
    // raw CSV from a few years back doesn't. The most reliable sniff is
    // the quoted CSV header + .csv-like body.
    if (/MyHeritage/i.test(head)) return 'myheritage';

    if (/FamilyTreeDNA|FamilyFinder/i.test(head)) return 'familytree';

    // Last-ditch: tab-delimited body with the 4-column 23andMe-ish shape.
    // We pick 23andme as the default tab-format only if a header confirms
    // exactly four columns (rsid/chromosome/position/genotype).
    if (/^rsid\tchromosome\tposition\tgenotype/im.test(head)) return '23andme';
    if (/"RSID","CHROMOSOME","POSITION","RESULT"/i.test(head)) return 'myheritage';

    return null;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Strip BOM + CRLF and split into lines. */
function toLines(text: string): string[] {
    let stripped = text;
    if (stripped.charCodeAt(0) === 0xfeff) stripped = stripped.slice(1);
    return stripped.replace(/\r\n?/g, '\n').split('\n');
}

/**
 * Normalize a genotype call to the canonical "AB" / "--" form.
 * Different providers use different no-call markers:
 *   23andMe        '--'
 *   AncestryDNA    '00' or '--'
 *   MyHeritage     "--" (in quotes)
 *
 * Returns null if the input isn't a recognizable diploid call.
 */
function normalizeGenotype(raw: string): string | null {
    const trimmed = raw.replace(/[\s"']/g, '').toUpperCase();
    if (trimmed === '' || trimmed === '--' || trimmed === '00' || trimmed === 'NN') {
        return '--';
    }
    if (/^[ACGTID]{1,2}$/.test(trimmed)) {
        // Single letter (X/Y/MT hemizygous) → double it for consistency.
        return trimmed.length === 1 ? trimmed + trimmed : trimmed;
    }
    return null;
}

function normalizeChromosome(raw: string): string | null {
    const t = raw.trim().replace(/^chr/i, '');
    if (!t) return null;
    if (/^[0-9]+$/.test(t)) {
        const n = parseInt(t, 10);
        if (n >= 1 && n <= 22) return String(n);
    }
    if (/^(X|Y|MT|M)$/i.test(t)) {
        const up = t.toUpperCase();
        return up === 'M' ? 'MT' : up;
    }
    return null;
}

function genotypeConfidence(genotype: string): ConfidenceLevel {
    return genotype === '--' ? 'no_call' : 'high';
}

// ─── Format-specific parsers ─────────────────────────────────────────────────

interface RawParse {
    variants: ParsedVariant[];
    /** Provider self-describes its chip version in header comments. */
    chip_version: string | null;
    /** Lines skipped because they couldn't be parsed. Useful for diagnostics. */
    skipped: number;
}

function parse23andMeLike(text: string, sep: string, format: GeneticFormat): RawParse {
    const variants: ParsedVariant[] = [];
    let skipped = 0;
    let chip_version: string | null = null;

    for (const rawLine of toLines(text)) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line.startsWith('#')) {
            // Try to extract the chip version from common header patterns.
            const m = line.match(/(v\d+(\.\d+)?)/i);
            if (m && !chip_version) chip_version = m[1].toLowerCase();
            continue;
        }

        // Skip header row even when it's not commented out.
        if (/^rsid[\s,;]/i.test(line) || /^"RSID"/i.test(line)) continue;

        const parts = line.split(sep);
        if (parts.length < 4) {
            skipped += 1;
            continue;
        }

        const rsid = parts[0].replace(/"/g, '').trim();
        const chromosome = normalizeChromosome(parts[1]);
        const position = Number(parts[2].replace(/"/g, '').trim());
        // AncestryDNA splits the genotype across two columns; everything else
        // ships it concatenated. parts[3] is "AB" for 23andMe, "A" for
        // AncestryDNA in which case parts[4] is "B".
        const genotypeRaw =
            format === 'ancestrydna' && parts.length >= 5
                ? `${parts[3]}${parts[4]}`
                : parts[3];

        if (!rsid || !chromosome || !Number.isFinite(position)) {
            skipped += 1;
            continue;
        }

        const genotype = normalizeGenotype(genotypeRaw);
        if (genotype === null) {
            skipped += 1;
            continue;
        }

        variants.push({
            rsid,
            chromosome,
            position,
            genotype,
            confidence: genotypeConfidence(genotype),
        });
    }

    return { variants, chip_version, skipped };
}

function parse23andMe(text: string): RawParse {
    return parse23andMeLike(text, '\t', '23andme');
}

function parseAncestryDNA(text: string): RawParse {
    return parse23andMeLike(text, '\t', 'ancestrydna');
}

function parseMyHeritage(text: string): RawParse {
    // MyHeritage's CSV is fully quoted, no embedded commas in the fields,
    // so a regex split is safe. If they ever introduce embedded commas
    // we'd switch to a CSV lib — but right now they don't, and this keeps
    // the parser dependency-free.
    return parse23andMeLike(text.replace(/"/g, ''), ',', 'myheritage');
}

function parseFamilyTree(text: string): RawParse {
    // Same shape as MyHeritage at the row level.
    return parse23andMeLike(text.replace(/"/g, ''), ',', 'familytree');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ParseResult {
    format: GeneticFormat;
    chip_version: string | null;
    variants: ParsedVariant[];
    /** Count of body rows the parser couldn't interpret — for diagnostics. */
    skipped: number;
    /** True iff every body row parsed without issue. */
    clean: boolean;
}

/**
 * Top-level entry point used by the upload flow. Sniffs the format,
 * delegates to the right per-format parser, and returns the bundle
 * the persistence layer expects.
 *
 * Throws GeneticParseError on:
 *   - empty / whitespace-only input
 *   - unrecognized format
 *   - <100 successfully parsed variants (consumer files always have
 *     hundreds of thousands; less means the file is corrupted or it
 *     was the wrong type to begin with)
 */
export function parseGeneticFile(text: string): ParseResult {
    if (!text || !text.trim()) {
        throw new GeneticParseError('Input file is empty.');
    }

    const format = detectFormat(text);
    if (!format) {
        throw new GeneticParseError(
            'File does not look like a recognized consumer DNA export.',
        );
    }

    let raw: RawParse;
    switch (format) {
        case '23andme':
            raw = parse23andMe(text);
            break;
        case 'ancestrydna':
            raw = parseAncestryDNA(text);
            break;
        case 'myheritage':
            raw = parseMyHeritage(text);
            break;
        case 'familytree':
            raw = parseFamilyTree(text);
            break;
        default:
            throw new GeneticParseError(
                `Format ${format} is recognized but not yet supported by this parser.`,
                format,
            );
    }

    if (raw.variants.length < 100) {
        throw new GeneticParseError(
            `Parsed only ${raw.variants.length} variants — file looks corrupted or empty.`,
            format,
        );
    }

    return {
        format,
        chip_version: raw.chip_version,
        variants: raw.variants,
        skipped: raw.skipped,
        clean: raw.skipped === 0,
    };
}
