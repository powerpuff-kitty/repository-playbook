/** Bounded, conservative static-policy checks. No target code or YAML is evaluated. */
import path from 'node:path';

const finding = (status, summary, evidence = []) => ({ status, summary, evidence });
const evidence = (location, observation) => ({ location, observation });
const workflowPath = name => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(name);
const dependabotPath = name => /^\.github\/dependabot\.ya?ml$/.test(name);
const dirname = name => { const d = path.posix.dirname(name); return d === '.' ? '/' : '/' + d; };
const toScalar = raw => String(raw ?? '').trim().replace(/\s+#.*$/, '').trim().replace(/^(?:"([^"]*)"|'([^']*)')$/, (_m, a, b) => a ?? b);

/** Retain only easily recognised YAML mapping/list lines outside comments and literal blocks. */
export function yamlLines(source) {
  if (typeof source !== 'string') return { lines: [], ambiguous: true };
  let blockIndent = null;
  let ambiguous = false;
  const lines = [];
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    if (/^\s*$/.test(raw)) continue;
    if (/\t/.test(raw.slice(0, raw.length - raw.trimStart().length))) { ambiguous = true; continue; }
    const indent = (raw.match(/^ */) ?? [''])[0].length;
    if (blockIndent !== null && indent > blockIndent) continue;
    blockIndent = null;
    if (/^\s*#/.test(raw)) continue;
    const clean = raw.trimEnd().replace(/\s+#.*$/, '');
    // YAML scalar blocks include scripts that can themselves contain "uses:" or "permissions:".
    if (/^\s*(?:-\s+)?[A-Za-z_-][\w-]*:\s*[>|][+-]?\s*$/.test(clean)) { blockIndent = indent; continue; }
    if (/^\s*(?:<<\s*:|!|&|\*\S)/.test(clean)) ambiguous = true;
    lines.push({ line: index + 1, indent, text: clean.trim() });
  }
  return { lines, ambiguous };
}

const actionUses = line => line.text.match(/^(?:-\s+)?uses:\s*(.+)$/);
const externalAction = value => /^(?!\.\/|docker:\/\/)[^@\s]+\/[^@\s]+(?:\/[^@\s]+)*@[^\s]+$/.test(value);
const immutableAction = value => /@[0-9a-f]{40}$/i.test(value);

export function workflowSecurity(scan) {
  const paths = [...scan.files.keys()].filter(workflowPath).sort();
  if (!paths.length) return finding(scan.skipped.some(item => workflowPath(item.path) || item.path === '.github/workflows') ? 'unknown' : 'not-applicable', 'No GitHub Actions workflow files observed.');
  const problems = [], uncertain = [], checked = [];
  for (const file of paths) {
    const raw = scan.files.get(file);
    if (typeof raw !== 'string') { uncertain.push(evidence(file, 'Workflow was not readable.')); continue; }
    const { lines, ambiguous } = yamlLines(raw);
    if (ambiguous) uncertain.push(evidence(file, 'YAML syntax beyond the supported static subset needs review.'));
    let permissionDeclaration = false;
    for (const line of lines) {
      const location = `${file}:${line.line}`;
      if (/^(?:-\s+)?permissions:\s*/.test(line.text)) {
        permissionDeclaration = true;
        if (/^permissions:\s*['"]?write-all['"]?\s*$/.test(line.text)) problems.push(evidence(location, 'Explicit write-all token permissions.'));
        if (/^permissions:\s*(?:\*|&|\$\{\{)/.test(line.text)) uncertain.push(evidence(location, 'Dynamic or aliased permissions need review.'));
      }
      if (/^pull_request_target\s*:|^on:\s*\[.*pull_request_target/.test(line.text) || /^on:\s*pull_request_target/.test(line.text)) {
        uncertain.push(evidence(location, 'Privileged pull_request_target event: inspect checkout, artifacts and untrusted interpolation.'));
      }
      const m = actionUses(line);
      if (!m) continue;
      const action = toScalar(m[1]);
      if (action.startsWith('./')) continue;
      if (action.startsWith('docker://')) {
        if (!/@sha256:[0-9a-f]{64}$/i.test(action)) uncertain.push(evidence(location, 'Docker Action reference is not visibly pinned to a digest.'));
        else checked.push(evidence(location, 'Docker image referenced by sha256 digest; image behaviour not reviewed.'));
        continue;
      }
      if (action.includes('${{') || /^[*&]/.test(action)) { uncertain.push(evidence(location, 'Dynamic or aliased uses reference needs review.')); continue; }
      if (!externalAction(action)) { uncertain.push(evidence(location, 'Unrecognised Action reference syntax.')); continue; }
      if (!immutableAction(action)) problems.push(evidence(location, `Mutable external Action reference: ${action.slice(0, 160)}.`));
      else checked.push(evidence(location, 'External Action is SHA-pinned (SHA authenticity not verified).'));
    }
    if (!permissionDeclaration) uncertain.push(evidence(file, 'No explicit workflow-level or job-level permissions were recognised; token defaults require review.'));
  }
  if (problems.length) return finding('fail', `${problems.length} explicit mutable Action or write-all permission problem(s) detected. This is a narrow static policy check, not full workflow validation.`, [...problems, ...uncertain].slice(0, 50));
  if (uncertain.length || scan.skipped.some(s => workflowPath(s.path))) return finding('manual-review', 'No definite high-risk pattern found; permissions, YAML constructs or privileged contexts require review.', [...uncertain, ...checked].slice(0, 50));
  return finding('pass', 'No mutable remote Action refs or write-all permissions detected in the supported YAML subset; other workflow threats are not checked.', checked.slice(0, 50));
}

function hasNpmRemoteDependency(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].some(key =>
      data[key] && typeof data[key] === 'object' && !Array.isArray(data[key]) &&
      Object.values(data[key]).some(v => typeof v === 'string' && !/^(?:file:|link:|workspace:|\.\.?\/)/.test(v)));
  } catch { return null; }
}
function tomlHasDependencies(raw, language) {
  if (typeof raw !== 'string') return null;
  const lines = raw.split(/\r?\n/);
  let section = '';
  let has = false, ambiguous = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1];
      if (language === 'cargo' && /^(?:(?:target\.[^.]+\.)?)(?:dev-|build-)?dependencies\.[^.]+$/.test(section)) has = true;
      if (language === 'cargo' && section.includes('dependencies') && !/^(?:(?:target\.[^.]+\.)?)(?:dev-|build-)?dependencies(?:\.[^.]+)?$/.test(section)) ambiguous = true;
      continue;
    }
    if (language === 'cargo') {
      if (/^(?:(?:target\.[^.]+\.)?)(?:dev-|build-)?dependencies$/.test(section) &&
          /^['"\w.-]+\s*=/.test(line) && !/\bpath\s*=/.test(line)) has = true;
    } else if (language === 'pip') {
      if (/^tool\.poetry\.(?:(?:group\.[^.]+\.)?dependencies)$/.test(section) && /^['"\w.-]+\s*=/.test(line) && !/^python\s*=/.test(line)) has = true;
      if ((section === 'project' || section.startsWith('project.optional-dependencies') || section === 'dependency-groups') && /^(?:dependencies|['"\w.-]+)\s*=\s*\[/.test(line)) {
        const fragment = lines.slice(i, Math.min(i + 20, lines.length)).join('\n').split(']')[0];
        if (/['"][A-Za-z0-9]/.test(fragment)) has = true;
        else if (i + 20 < lines.length && !lines.slice(i, i + 20).join('\n').includes(']')) return null;
      }
    }
  }
  return has ? true : ambiguous ? null : false;
}

/** Detect manifest *directories* with observable externally versioned dependencies. */
export function dependencyManifests(scan) {
  const manifests = [], uncertainty = [];
  for (const [file, raw] of scan.files) {
    let ecosystem = null, has = false;
    if (file === 'package.json' || /\/package\.json$/.test(file)) {
      ecosystem = 'npm'; has = hasNpmRemoteDependency(raw);
    } else if (/(?:^|\/)requirements(?:[-\w.]*)?\.txt$/i.test(file)) {
      ecosystem = 'pip'; has = typeof raw === 'string' ? raw.split(/\r?\n/).some(line => /^\s*(?!#|$)(?!-r\b|--requirement\b|--index-url\b|--extra-index-url\b)[\w.\-]+\s*(?:[!<>=~\[]|$)/.test(line)) : null;
    } else if (/(?:^|\/)pyproject\.toml$/i.test(file)) {
      ecosystem = 'pip'; has = tomlHasDependencies(raw, 'pip');
    } else if (/(?:^|\/)Cargo\.toml$/.test(file)) {
      ecosystem = 'cargo'; has = tomlHasDependencies(raw, 'cargo');
    } else if (/(?:^|\/)go\.mod$/.test(file)) {
      ecosystem = 'gomod'; has = typeof raw === 'string' ? /^\s*require\s*(?:\(|\S)/m.test(raw) : null;
    } else if (/(?:^|\/)composer\.json$/.test(file)) {
      ecosystem = 'composer'; try { const j = JSON.parse(raw); has = ['require','require-dev'].some(k => Object.keys(j[k] ?? {}).some(n => !/^php$|^ext-|^lib-/.test(n))); } catch { has = null; }
    } else if (/(?:^|\/)Gemfile$/.test(file)) {
      ecosystem = 'bundler'; has = typeof raw === 'string' ? /^\s*gem\s+["']/m.test(raw) : null;
    }
    if (ecosystem && has === true) manifests.push({ ecosystem, directory: dirname(file), file });
    else if (ecosystem && has === null) uncertainty.push(evidence(file, 'Dependency manifest unreadable or unsupported syntax.'));
  }
  const workflows = [...scan.files].filter(([name, raw]) => workflowPath(name) && typeof raw === 'string');
  if (workflows.some(([, raw]) => yamlLines(raw).lines.some(line => {
    const m = actionUses(line); return m && !toScalar(m[1]).startsWith('./');
  }))) manifests.push({ ecosystem: 'github-actions', directory: '/', file: '.github/workflows/' });
  return { manifests, uncertainty };
}

function yamlDirectory(value) {
  const d = toScalar(value);
  if (!d.startsWith('/') || d.includes('..') || d.includes('*') || /[!\[\]{}]/.test(d)) return null;
  return d === '/' ? d : d.replace(/\/+$/, '');
}

/** Minimal Dependabot version 2 structure reader; unknown YAML constructs are never silently treated as coverage. */
export function parseDependabot(raw) {
  const { lines, ambiguous } = yamlLines(raw);
  let uncertain = ambiguous, version = false, inUpdates = false, current = null, listIndent = -1;
  const updates = [];
  for (const line of lines) {
    const t = line.text;
    if (line.indent === 0 && /^version:\s*['"]?2['"]?$/.test(t)) version = true;
    if (line.indent === 0 && /^updates:\s*$/.test(t)) { inUpdates = true; continue; }
    if (line.indent === 0 && !/^updates:/.test(t)) { inUpdates = false; current = null; }
    if (!inUpdates) continue;
    const start = t.match(/^-\s+package-ecosystem:\s*(.+)$/);
    if (start) {
      current = { ecosystem: toScalar(start[1]), directories: [], hasSchedule: false, interval: false, disabled: false }; updates.push(current); listIndent = -1; continue;
    }
    if (!current) { uncertain = true; continue; }
    if (/^schedule:\s*$/.test(t)) { current.hasSchedule = true; continue; }
    if (/^interval:\s*['\"]?(?:daily|weekly|monthly|quarterly|semiannually|yearly)['\"]?$/.test(t)) { current.interval = true; continue; }
    if (/^open-pull-requests-limit:\s*0(?:\s|$)/.test(t)) { current.disabled = true; continue; }
    const single = t.match(/^directory:\s*(.+)$/);
    if (single) { const d = yamlDirectory(single[1]); if (d) current.directories.push(d); else uncertain = true; continue; }
    const inline = t.match(/^directories:\s*\[(.*)\]\s*$/);
    if (inline) {
      for (const part of inline[1].split(',')) { const d = yamlDirectory(part); if (d) current.directories.push(d); else uncertain = true; }
      continue;
    }
    if (/^directories:\s*$/.test(t)) { listIndent = line.indent; continue; }
    if (listIndent >= 0 && line.indent > listIndent && /^-\s+/.test(t)) {
      const d = yamlDirectory(t.replace(/^-\s+/, '')); if (d) current.directories.push(d); else uncertain = true;
      continue;
    }
    if (listIndent >= 0 && line.indent <= listIndent) listIndent = -1;
    if (/^package-ecosystem:/.test(t) || /^directory:/.test(t) || /^directories:/.test(t)) uncertain = true;
  }
  if (!version || !updates.length || updates.some(u => !u.directories.length || !u.hasSchedule || !u.interval)) uncertain = true;
  return { updates, uncertain };
}

export function dependencyCoverage(scan) {
  const { files, skipped } = scan;
  const { manifests, uncertainty } = dependencyManifests(scan);
  const configs = [...files].filter(([name]) => dependabotPath(name));
  if (!manifests.length && !uncertainty.length) return finding(skipped.some(s => /(?:^|\/)(?:package\.json|Cargo\.toml|go\.mod|pyproject\.toml|Gemfile|composer\.json|requirements[^/]*\.txt)$/.test(s.path)) ? 'manual-review' : 'not-applicable', 'No supported externally versioned dependency manifests observed. Other ecosystems may need review.');
  const examples = manifests.map(m => evidence(m.file, `${m.ecosystem} dependency at ${m.directory}.`));
  if (!configs.length) return finding('manual-review', 'No Dependabot version-update file observed; Renovate or another updater may cover these manifests. Verify actual maintenance strategy.', examples.concat(uncertainty).slice(0, 50));
  if (configs.length > 1) return finding('manual-review', 'Multiple Dependabot files detected; verify effective configuration.', configs.map(c => evidence(c[0], 'Competing config paths.')));
  const [name, raw] = configs[0];
  if (typeof raw !== 'string') return finding('unknown', 'Dependabot configuration could not be read.', [evidence(name, 'Unreadable file.')]);
  const parsed = parseDependabot(raw);
  const missing = manifests.filter(m => !parsed.updates.some(u => u.ecosystem === m.ecosystem && !u.disabled && u.directories.includes(m.directory)));
  const supported = manifests.length - missing.length;
  const details = [evidence(name, `Detected ${parsed.updates.length} update definition(s); ${supported}/${manifests.length} relevant locations covered in the supported YAML subset.`), ...missing.map(m => evidence(m.file, `No matching ${m.ecosystem} update entry for ${m.directory}.`))];
  if (parsed.uncertain || uncertainty.length || skipped.some(s => /(?:^|\/)(?:package\.json|Cargo\.toml|go\.mod|pyproject\.toml|Gemfile|composer\.json|requirements[^/]*\.txt|dependabot\.ya?ml)$/.test(s.path))) {
    return finding('manual-review', 'Manifest or Dependabot syntax/scan limits prevent a complete conclusion; check apparent gaps manually.', details.concat(uncertainty).slice(0, 50));
  }
  if (missing.length) return finding('fail', `${missing.length} observed dependency location(s) lack a matching checked-in Dependabot updater. An external updater could provide coverage and should be reviewed.`, details.slice(0, 50));
  return finding('pass', `All ${manifests.length} detected externally versioned dependency locations have matching Dependabot definitions. Update execution is not verified.`, details.slice(0, 50));
}
