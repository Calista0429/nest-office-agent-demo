import {readFile,writeFile,access} from 'node:fs/promises';
const manifest=JSON.parse(await readFile('docs/screenshots/capture-manifest.json','utf8'));
for(const item of manifest.captures)await access(`docs/screenshots/${item.file}`);
for(const locale of ['ja','en']){
 const path=`docs/USE_CASES.${locale}.md`;
 let source=await readFile(path,'utf8');
 const status=locale==='ja'?`実際のUIを操作して撮影しました。撮影日時: ${manifest.capturedAt}。ブラウザー: ${manifest.browser}。テスト専用の一時SQLiteを使用しています。`:`Captured from real UI interactions on ${manifest.capturedAt}, using Chromium ${manifest.browser} and an isolated temporary SQLite database.`;
 source=source.replace(/<!-- capture-status:start -->[\s\S]*?<!-- capture-status:end -->/,`<!-- capture-status:start -->\n${status}\n<!-- capture-status:end -->`);
 for(const item of manifest.captures){
  const start=`<!-- capture:${item.file}:start -->`,end=`<!-- capture:${item.file}:end -->`;
  const a=source.indexOf(start),b=source.indexOf(end,a);
  if(a>=0&&b>a)source=source.slice(0,a)+`${start}\n![${item.title}](screenshots/${item.file})\n`+source.slice(b);
 }
 await writeFile(path,source);
 const readme=locale==='ja'?'README.md':'README.en.md';
 let body=await readFile(readme,'utf8');
 body=body.replace(locale==='ja'?/\*\*現時点の撮影状況:\*\*[^\n]+/:/\*\*Current capture status:\*\*[^\n]+/,locale==='ja'?`**現時点の撮影状況:** ${manifest.captures.length}枚の実操作スクリーンショットを保存しました。[ギャラリー](docs/USE_CASES.ja.md)をご覧ください。`:`**Current capture status:** ${manifest.captures.length} real UI screenshots are available in the [gallery](docs/USE_CASES.en.md).`);
 await writeFile(readme,body);
}
