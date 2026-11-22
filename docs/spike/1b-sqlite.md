# スパイク 1-B：SQLite のネイティブモジュール

- 実施日：2026-11-22
- 実施環境：Windows 11（win32-x64）、Node 24.15.0、pnpm 11.0.8、Electron 45.4.1、Vitest 5.1.1
- 実施場所：リポジトリ外の使い捨てプロジェクト（本リポジトリの依存には追加していない）
- Mac：**未確認**

## 確かめたこと

各ランタイムで次を実行し、すべて満たせば OK とした。

1. DB ファイルを開く（Electron では `app.getPath('userData')` 配下）
2. `PRAGMA journal_mode = WAL` が効く
3. `PRIMARY KEY (channel_id, ts)` のテーブルを作る
4. 同じ `(channel_id, ts)` を `INSERT OR IGNORE` で2回入れると、2回目は `changes = 0` で行数は1のまま
5. 素の `INSERT` で重複させると UNIQUE 制約エラーになる

ランタイムは次の3つ。

- Node（Vitest が動く環境）
- Electron の main プロセス（アプリ本体が動く環境）
- Vitest のテストとして実行（簡易版：`:memory:` の DB で 4 だけを確認。ファイル DB・WAL・5 は未確認）

## 結果

| 方式 | Node 24.15.0 | Electron 45.4.1 main | Vitest（簡易版） | 追加の手順 |
|---|---|---|---|---|
| `better-sqlite3` 13.2.0 | OK | OK（作り直しなし） | OK | `allowBuilds` に `false` を書く（後述） |
| `node:sqlite`（Node 標準） | OK | OK | OK | なし |
| `@electron/rebuild` 4.2.1 で作り直し | — | 失敗（Visual Studio が見つからない） | — | 不要と判断 |

各ランタイムに内蔵された値：

| ランタイム | 内部の Node | `process.versions.modules` | `node:sqlite` の SQLite |
|---|---|---|---|
| Node 24.15.0 | 24.15.0 | 137 | 3.51.3 |
| Electron 45.4.1 | 24.22.3 | 150 | 3.54.1 |

`better-sqlite3` 13.2.0 が使う SQLite は、どのランタイムでも 3.54.1 だった（パッケージに同梱）。

Node と Electron の実行では、警告（ExperimentalWarning など）は出なかった。Vitest 実行時の警告は記録していない。

## わかったこと

### `better-sqlite3` は Electron 向けの作り直しが不要になっていた

- 13.x は Node-API（`NAPI_VERSION=10`）で書かれている。Node-API は Node のバージョンに依存しないので、Node（modules 137）向けと Electron（modules 150）向けで同じバイナリが使える。
- パッケージには、次の OS 向けのビルド済みバイナリが最初から入っている：`darwin-arm64`、`darwin-x64`、`win32-x64`、`win32-arm64`、`linux-x64`、`linux-arm64`、`linuxmusl-*`
- `package.json` が `"gypfile": false` なので、インストール時にコンパイルしない。C++ のビルド環境（Visual Studio Build Tools、Xcode CLT）も要らない。
- 当初心配していた「Electron 向けに作り直すと Vitest から読めなくなる」問題は起きない。
- `@electron/rebuild` で強制的に作り直そうとすると、ソースからのコンパイルになり、ビルド環境のないこの PC では失敗した。作り直す理由がないので、`@electron/rebuild` は導入しない。

### pnpm 11 では、ビルドの可否を明示しないと install が失敗する

- `better-sqlite3` に `binding.gyp` があるため、pnpm は「ビルド処理のある依存」とみなす。
- 何も設定しないと、`pnpm install` が `ERR_PNPM_IGNORED_BUILDS` を出し、**終了コード 1** で終わる。ファイル自体は入るので、動作には影響しない。
- `pnpm-workspace.yaml` に次を書くと、終了コード 0 になり、動作も変わらない。

  ```yaml
  allowBuilds:
    better-sqlite3: false
  ```

- `true`（ビルドを許可）にする理由はない。ビルド済みバイナリを使うので、`false` のほうが余計な処理が走らない。

### `node:sqlite` も問題なく使える

- 追加のパッケージも設定も要らない。
- ただし、テスト（Node 24.15.0、SQLite 3.51.3）とアプリ本体（Electron 内の Node 24.22.3、SQLite 3.54.1）で、**SQLite のバージョンが違う**。テストで通ったことが本番の動作と完全には一致しない可能性がある。
- API の安定度（Node のドキュメント上の Stability）は、今回は確認していない。

## 比較

| 観点 | `better-sqlite3` | `node:sqlite` |
|---|---|---|
| 追加の依存 | 1つ | なし |
| pnpm の設定 | `allowBuilds` に1行 | なし |
| ビルド環境 | 不要（ビルド済みを同梱） | 不要 |
| テストと本体の SQLite | 同じ（3.54.1） | 違う（3.51.3 / 3.54.1） |
| API の成熟度 | 長く使われていて、資料が多い | 比較的新しい |
| Mac | ビルド済みあり。動作は未確認 | 未確認 |

## 提案

**`better-sqlite3` を採用する方向で進める**（CLAUDE.md の第一候補のまま）。Windows では確認済み。CLAUDE.md の「採用前に Mac / Windows のビルドを確認する」に従い、**Mac で同じ確認をしてから採用を確定する。** Mac 向けのビルド済みバイナリは同梱されているので、リスクは低いと見ている。

- 心配だったネイティブビルドの問題は、13.x で解消されていた。
- テストと本体で同じ SQLite が動くので、TDD の結果を信用しやすい。

`node:sqlite` は、`better-sqlite3` に問題が出たときの代替案として残す。

### 補足：JSON ファイルとの比較（2026-11-22、作者と相談）

扱う量は少ない（メンションと DM が1日に数件〜数十件）ので、JSON ファイルでも足りるかを検討した。結論は、**SQLite のままにする**。

- 導入コストは、依存1つと設定1行だけだった。
- 重複除外と、壊れない書き込みが手書きにならない。
- 「保存」と「カーソルを進める」を、まとめて成功・まとめて失敗にできる。

保存処理はインターフェース（`InboxStore` など）で包み、後から入れ替えられるようにする。

## 設計への影響

- CLAUDE.md の技術スタックにある「`@electron/rebuild` が必要」は、現状に合わない。「ビルド済みバイナリを使うので作り直しは不要。pnpm では `allowBuilds` に `false` を書く」に直すのがよい。
- アーキテクチャ（①〜④の流れ）を変える必要はない。

## 未確認

- Mac（Apple Silicon / Intel）での3ランタイムの動作
- Linux
- 配布用にパッケージングした場合の asar まわりの扱い。当面は配布物を作らない方針なので対象外。

## Mac での再現手順

リポジトリの外に空のフォルダを作り、次の4ファイルを置いて実行する。

`package.json`

```json
{
  "name": "sqlite-spike",
  "private": true,
  "type": "commonjs",
  "devDependencies": { "electron": "45.4.1", "vitest": "5.1.1" },
  "dependencies": { "better-sqlite3": "13.2.0" }
}
```

`pnpm-workspace.yaml`

```yaml
allowBuilds:
  better-sqlite3: false
```

`t/better.test.ts`

```ts
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';

it('better-sqlite3 works under vitest with (channel_id, ts) uniqueness', () => {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE inbox (channel_id TEXT NOT NULL, ts TEXT NOT NULL, PRIMARY KEY (channel_id, ts))');
  const ins = db.prepare('INSERT OR IGNORE INTO inbox (channel_id, ts) VALUES (?, ?)');
  expect(ins.run('C1', '1.0').changes).toBe(1);
  expect(ins.run('C1', '1.0').changes).toBe(0);
});
```

`check.cjs`

```js
// Spike: open a SQLite DB, enforce (channel_id, ts) uniqueness, report runtime info.
// Usage: node check.cjs <driver>   |   electron check.cjs <driver>
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const driver = process.argv.find((a) => a === 'node-sqlite' || a === 'better-sqlite3');
const isElectron = Boolean(process.versions.electron);

function openDb(file) {
  if (driver === 'node-sqlite') {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(file);
    return { exec: (s) => db.exec(s), run: (s, ...p) => db.prepare(s).run(...p), get: (s) => db.prepare(s).get(), close: () => db.close() };
  }
  const Database = require('better-sqlite3');
  const db = new Database(file);
  return { exec: (s) => db.exec(s), run: (s, ...p) => db.prepare(s).run(...p), get: (s) => db.prepare(s).get(), close: () => db.close() };
}

function run(baseDir) {
  const out = { driver, runtime: isElectron ? `electron ${process.versions.electron}` : 'node', node: process.versions.node, modules: process.versions.modules, platform: `${process.platform}-${process.arch}` };
  try {
    fs.mkdirSync(baseDir, { recursive: true });
    const file = path.join(baseDir, `spike-${driver}.db`);
    fs.rmSync(file, { force: true });
    const db = openDb(file);
    out.journal = db.get('PRAGMA journal_mode = WAL');
    db.exec('CREATE TABLE inbox (channel_id TEXT NOT NULL, ts TEXT NOT NULL, PRIMARY KEY (channel_id, ts))');
    const a = db.run('INSERT OR IGNORE INTO inbox (channel_id, ts) VALUES (?, ?)', 'C1', '1700000000.000100');
    const b = db.run('INSERT OR IGNORE INTO inbox (channel_id, ts) VALUES (?, ?)', 'C1', '1700000000.000100');
    let strictRejected = false;
    try { db.run('INSERT INTO inbox (channel_id, ts) VALUES (?, ?)', 'C1', '1700000000.000100'); } catch (e) { strictRejected = /UNIQUE/.test(String(e.message)); }
    out.changes = [Number(a.changes), Number(b.changes)];
    out.strictDuplicateRejected = strictRejected;
    out.rows = Number(db.get('SELECT COUNT(*) AS n FROM inbox').n);
    out.sqliteVersion = db.get('SELECT sqlite_version() AS v').v;
    db.close();
    out.file = file.replace(os.homedir(), '~');
    out.ok = out.rows === 1 && out.changes[1] === 0 && strictRejected;
  } catch (e) {
    out.ok = false;
    out.error = String(e && e.message).split('\n')[0];
  }
  return out;
}

if (isElectron) {
  const { app } = require('electron');
  const warnings = [];
  process.on('warning', (w) => warnings.push(`${w.name}: ${w.message}`));
  app.whenReady().then(() => {
    const r = run(path.join(app.getPath('userData'), 'spike'));
    r.warnings = warnings;
    console.log('RESULT ' + JSON.stringify(r));
    app.quit();
  });
} else {
  const warnings = [];
  process.on('warning', (w) => warnings.push(`${w.name}: ${w.message}`));
  const r = run(path.join(os.tmpdir(), 'quill-sqlite-spike'));
  setImmediate(() => { r.warnings = warnings; console.log('RESULT ' + JSON.stringify(r)); });
}
```

実行するコマンド：

```sh
pnpm install
node check.cjs better-sqlite3
npx electron check.cjs better-sqlite3
node check.cjs node-sqlite
npx electron check.cjs node-sqlite
npx vitest run
```

各行の `RESULT` に `"ok":true` が出て、Vitest が通れば合格。初回の `npx electron` は Electron 本体をダウンロードするので、ネットワークが必要。
