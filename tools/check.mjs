// 語法檢查：把每個 HTML 裡的 <script> 抽出來跑 node --check。
// 用法：node tools/check.mjs          （檢查全部頁面）
//       node tools/check.mjs prep.html （只檢查一頁）
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const files = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync('.').filter(f => f.endsWith('.html'));
const dir = mkdtempSync(join(tmpdir(), 'chk-'));
let bad = 0;
for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
    let m, i = 0;
    while ((m = re.exec(html))) {
        const line = html.slice(0, m.index).split('\n').length;
        const out = join(dir, `${f}.${i++}.${/module/.test(m[1]) ? 'mjs' : 'js'}`);
        writeFileSync(out, m[2]);
        try { execFileSync(process.execPath, ['--check', out], { stdio: 'pipe' }); }
        catch (e) { bad++; console.log(`✗ ${f}（<script> 起始於第 ${line} 行）\n${String(e.stderr).split('\n').slice(0, 6).join('\n')}`); }
    }
    console.log(`✓ ${f}：${i} 段 script 已檢查`);
}
process.exit(bad ? 1 : 0);
