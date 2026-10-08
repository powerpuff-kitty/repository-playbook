import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { HOME, loadModel } from '../src/model.mjs';
import { localLinks, snapshot } from '../src/scan.mjs';

const command = process.argv[2] ?? 'validate';
const { rules, profiles } = await loadModel();
const readmeFile = path.join(HOME, 'README.md');
const start = '<!-- RULES:START -->', end = '<!-- RULES:END -->';
function ruleTable() {
  return `**${rules.length} rules · ${profiles.length} profiles.** Presence checks are not content-quality certification.\n\n| Rule | Guidance | Priority | Verification |\n|---|---|---|---|\n` + rules.map(r => `| ${r.id} | [${r.title}](${r.guide}) | ${r.priority} | ${r.check} |`).join('\n');
}
function replaceTable(readme) {
  if (readme.split(start).length !== 2 || readme.split(end).length !== 2 || readme.indexOf(start) > readme.indexOf(end)) throw new Error('Exactly one ordered README rule marker pair is required');
  return readme.slice(0, readme.indexOf(start) + start.length) + '\n' + ruleTable() + '\n' + readme.slice(readme.indexOf(end));
}
async function expected() {
  return new Map([
    ['README.md', replaceTable(await readFile(readmeFile, 'utf8'))],
    ['generated/profile-matrix.md', '# Profile matrix\n\nGenerated from the canonical rule catalogue. Do not edit.\n\n| Rule | ' + profiles.map(p => p.id).join(' | ') + ' |\n|---|' + profiles.map(() => '---').join('|') + '|\n' + rules.map(r => `| ${r.id} | ${profiles.map(p => r.profiles.includes(p.id) ? 'selected' : 'not applicable').join(' | ')} |`).join('\n') + '\n']
  ]);
}
if (command === 'validate') {
  for (const rule of rules) await access(path.join(HOME, rule.guide));
  const scan = await snapshot(HOME);
  const { broken } = localLinks(scan.files);
  if (broken.length) throw new Error(broken.join('\n'));
  const pkg = JSON.parse(await readFile(path.join(HOME, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(path.join(HOME, 'package-lock.json'), 'utf8'));
  if (pkg.version !== lock.version || pkg.version !== lock.packages[''].version) throw new Error('Package/lock version mismatch');
  console.log(`Validated ${rules.length} rules, ${profiles.length} profiles, guide references and supported local Markdown targets.`);
} else if (['generate', 'check'].includes(command)) {
  for (const [file, content] of await expected()) {
    const target = path.join(HOME, file);
    if (command === 'generate') { await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); }
    else if (await readFile(target, 'utf8').catch(() => '') !== content) throw new Error(`Stale generated output: ${file}. Run npm run generate.`);
  }
  console.log(command === 'generate' ? 'Generated profile matrix and README table.' : 'Generated outputs are current.');
} else if (command === 'site') {
  const data = JSON.stringify(rules).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Evidence-backed repository guidance, profiles and read-only audit rules."><title>Repository Playbook — Rule explorer</title>
<style>:root{font-family:system-ui,sans-serif;color:#192c32;background:#fafbf8}*{box-sizing:border-box}body{max-width:1100px;margin:auto;padding:clamp(18px,4vw,56px)}header{border-bottom:1px solid #b9c5c2;padding-bottom:28px}h1{font-size:clamp(2rem,5vw,4rem);letter-spacing:-.04em;margin:12px 0}p{line-height:1.65}a{color:#155e54}.filters{display:flex;flex-wrap:wrap;gap:16px;margin:32px 0}label{display:grid;gap:6px;flex:1;min-width:170px}input,select{font:inherit;padding:12px;border:1px solid #889b94;border-radius:4px;background:white}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:18px}article{background:white;border:1px solid #d4ddd8;border-radius:6px;padding:22px}small{display:block;color:#425c57}h2{font-size:1.12rem;line-height:1.4;margin:12px 0}footer{margin-top:36px;border-top:1px solid #d4ddd8}a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #a35b20;outline-offset:3px}@media(prefers-color-scheme:dark){:root{color:#e8efea;background:#13211f}article,input,select{color:inherit;background:#1c302b;border-color:#4c6760}small{color:#b1c8c0}a{color:#9edcc9}}</style></head>
<body><header><small>REPOSITORY PLAYBOOK / v0.4.0</small><h1>Useful repositories.<br>Verifiable claims.</h1><p>Explore ${rules.length} guidance rules for documentation, catalogues, libraries and applications. A passing presence check is not a security certificate.</p><a href="https://github.com/powerpuff-kitty/repository-playbook">Read the handbook and run an audit</a></header>
<main><div class="filters"><label>Search<input id="query" type="search" placeholder="README, badges, security…"></label><label>Profile<select id="profile"><option value="">All profiles</option>${profiles.map(p => `<option>${p.id}</option>`).join('')}</select></label><label>Priority<select id="priority"><option value="">All priorities</option><option>high</option><option>medium</option><option>low</option></select></label></div><p id="count" role="status" aria-live="polite"></p><div id="rules" class="grid"></div><noscript><p>JavaScript is needed for this local filter. The full rule table is available in the repository README.</p></noscript></main><footer><p>No accounts, analytics or remote fonts. Rules are editorial policies with linked references, not universal platform mandates.</p></footer>
<script type="application/json" id="data">${data}</script><script>
const data=JSON.parse(document.getElementById('data').textContent);const q=document.getElementById('query'),p=document.getElementById('profile'),pr=document.getElementById('priority'),list=document.getElementById('rules');
function render(){const text=q.value.toLowerCase();const rules=data.filter(r=>(!p.value||r.profiles.includes(p.value))&&(!pr.value||r.priority===pr.value)&&[r.id,r.title,r.category,r.review].join(' ').toLowerCase().includes(text));list.replaceChildren();for(const r of rules){const card=document.createElement('article'),meta=document.createElement('small'),title=document.createElement('h2'),body=document.createElement('p'),link=document.createElement('a');meta.textContent=r.id+' · '+r.priority+' · '+r.check;title.textContent=r.title;body.textContent=r.review;link.textContent='Read guidance';link.href='https://github.com/powerpuff-kitty/repository-playbook/blob/main/'+r.guide;card.append(meta,title,body,link);list.append(card)}document.getElementById('count').textContent=rules.length+' rules shown';}for(const el of[q,p,pr])el.addEventListener('input',render);render();
</script></body></html>`;
  await mkdir(path.join(HOME, 'dist'), { recursive: true });
  await writeFile(path.join(HOME, 'dist/index.html'), html);
  console.log('Built dist/index.html (standalone, offline-capable rule explorer). Not deployed.');
} else throw new Error(`Unknown maintenance command: ${command}`);
