/** Narrow, non-executing presentation and completeness checks.
 * These prove only syntax/content presence in supported Markdown, never UI quality.
 */
import { stripCode } from './scan.mjs';

const finding = (status, summary, evidence = []) => ({ status, summary, evidence });
const E = (location, observation) => ({ location, observation });
const README_PATHS = ['.github/README.md', 'README.md', 'readme.md', 'docs/README.md'];
const readme = files => README_PATHS.find(file => typeof files.get(file) === 'string');
const limited = value => String(value).replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 180);

/** Visible heading and intro near the top, NOT a content-quality/legibility score. */
export function readmeFirstScreen(scan) {
  const name = readme(scan.files);
  if (!name) return finding('unknown', 'No readable supported Markdown README was available for first-screen inspection.');
  const lines = stripCode(scan.files.get(name)).split(/\r?\n/);
  const visible = lines.slice(0, 70);
  const headingIndex = visible.findIndex(line => /^ {0,3}#\s+\S/.test(line));
  if (headingIndex < 0) return finding('manual-review', 'No ATX H1 in the first 70 lines. Setext/HTML headings or unconventional layouts may be intentional.', [E(name, 'Heading heuristic; no rendered screenshot inspected.')]);
  const nextSection = visible.findIndex((line, i) => i > headingIndex && /^ {0,3}#{1,6}\s+\S/.test(line));
  const limit = nextSection < 0 ? visible.length : nextSection;
  const preamble = visible.slice(headingIndex + 1, limit);
  const meaningful = preamble.find(line => {
    const s = line.trim().replace(/^>\s*/, '').trim();
    if (!s || /^(?:\[!?\[|!\[|<|\|?|[-*+]\s|---+|___+|\*\*\*+|\[.+\]\([^)]*\)\s*(?:[·|•].*)?)$/.test(s)) return false;
    // Don't confuse a Shields badge or bare navigation link with introductory prose.
    if (/shields\.io|badge\.svg|img\.shields|^\[[^\]]+\]\([^)]*\)(?:\s*[·|•]\s*\[[^\]]+\]\([^)]*\))*$/.test(s)) return false;
    return s.replace(/\[[^\]]+\]\([^)]*\)/g, '').split(/\s+/).filter(Boolean).length >= 4;
  });
  if (!meaningful) return finding('manual-review', 'H1 observed, but no plain-language introduction before the next heading in the first 70 lines. Review rendered HTML, non-English and nonstandard layouts.', [E(name, limited(visible[headingIndex]))]);
  const badgeCount = (preamble.join('\n').match(/!\[[^\]]*\]\([^)]*(?:shields\.io|badge\.svg)[^)]*\)/gi) ?? []).length;
  return finding('pass', 'A leading heading and introductory prose were observed. Clarity, visual hierarchy and actual rendering still require review.', [E(name, `Title: ${limited(visible[headingIndex])}`), E(name, `Intro: ${limited(meaningful)}`), ...(badgeCount >= 10 ? [E(name, `${badgeCount} badge images before next heading; assess visual density manually.`)] : [])]);
}

/** Badge images are excluded: absence of non-badge images is not a defect. */
export function imagePresentation(scan) {
  const records = [];
  const uncertain = [];
  const skippedDocs = scan.skipped.some(s => /\.md$/i.test(s.path));
  for (const [name, raw] of scan.files) {
    if (!/\.md$/i.test(name) || /^(?:templates|examples|generated|case-studies|tests)\//.test(name)) continue;
    if (typeof raw !== 'string') { uncertain.push(E(name, 'Markdown file was not readable.')); continue; }
    const clean = stripCode(raw);
    for (const match of clean.matchAll(/!\[([^\]]*)\]\(([^\n)]*)\)/g)) {
      if (/(?:shields\.io|badgen\.net|badge\.svg|github\.com\/[^/]+\/[^/]+\/actions\/workflows\/[^/]+\/badge\.svg)/i.test(match[2])) continue;
      records.push({ name, alt: match[1], src: match[2], type: 'Markdown image' });
      if (records.length >= 100) break;
    }
    for (const match of clean.matchAll(/<img\b[^>]*>/gi)) {
      const alt = match[0].match(/\balt\s*=\s*(['"])(.*?)\1/i)?.[2];
      const src = match[0].match(/\bsrc\s*=\s*(['"])(.*?)\1/i)?.[2] ?? '';
      if (/shields\.io|badgen\.net|badge\.svg/i.test(src)) continue;
      records.push({ name, alt, src, type: 'HTML image' });
      if (records.length >= 100) break;
    }
    if (records.length >= 100) { uncertain.push(E(name, 'Image inspection capped at 100 tags.')); break; }
  }
  if (!records.length) return finding(uncertain.length || skippedDocs ? 'unknown' : 'not-applicable', 'No non-badge images found in supported documentation. Screenshots, logos and social previews are not universally required.', uncertain);
  const review = records.filter(r => !r.alt?.trim());
  const evidence = [E('Documentation', `${records.length} non-badge image tag(s) inspected; images were not downloaded or rendered.`), ...review.slice(0, 12).map(r => E(r.name, `${r.type} has an empty or missing alt attribute. Decorative images may legitimately use empty alt text.`)), ...uncertain];
  if (review.length || uncertain.length || skippedDocs) return finding('manual-review', 'Image accessibility or scan coverage needs review; an empty alt attribute may indicate intentional decoration.', evidence);
  return finding('pass', 'All supported non-badge image tags have nonempty alternative text. Meaningfulness, aesthetics and actual image availability are not verified.', evidence);
}

/** Explicit placeholders are review signals, not defects or proof of missing features. */
export function placeholderReview(scan) {
  const name = readme(scan.files);
  if (!name) return finding('unknown', 'No supported readable README could be checked for unfinished placeholders.');
  const lines = stripCode(scan.files.get(name)).split(/\r?\n/);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    // Limit to explicit editorial placeholders rather than the word "TODO" in prose.
    if (/\b(?:TODO\s*[:\-]|TBD\b|lorem\s+ipsum\b|REPLACE_ME\b|YOUR_PROJECT_NAME\b|INSERT_[A-Z0-9_]+_HERE\b)/i.test(lines[i]) || /<\s*(?:your|insert)[-\w ]+\s*>/i.test(lines[i])) {
      found.push(E(`${name}:${i + 1}`, limited(lines[i])));
      if (found.length === 12) break;
    }
  }
  if (found.length) return finding('manual-review', 'Possible unfinished README placeholders were observed; examples and deliberate roadmap notes may be valid.', found);
  return finding('pass', 'No explicit placeholder markers found in the supported README text. This does not imply feature completeness or accuracy.', [E(name, 'Only narrow editorial placeholder patterns checked, not code or runtime behavior.')]);
}
