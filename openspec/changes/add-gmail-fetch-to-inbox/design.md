# Design

## Context

動機は proposal.md の Why を参照。要件は specs/ の4つの機能（`fetch-cycle`、`message-inbox`、`gmail-source`、`quill-status`）を参照。

### 変更前の振る舞い（スペックアウト）

ステップ0で作った土台だけがある。取得・保存の仕組みはまだない。

| ファイル | 変更前の振る舞い |
|---|---|
| `src/main/index.ts` | 透明・枠なし・最前面のウィンドウを1つ開いて `dist/renderer/index.html` を読み込む。それ以外は何もしない |
| `src/preload/index.ts` | 空。renderer に何も公開していない |
| `src/renderer/index.ts` | 6つの状態ボタンを作り、押されたボタンに対応する SVG を表示する。起動時は `idle` |
| `src/renderer/quill-assets.ts` | 状態名の一覧 `QUILL_STATES` と、状態名から SVG ファイル名への対応 `assetFileFor` |
| `src/renderer/quill-assets.test.ts` | 6状態と SVG の対応、SVG ファイルの存在を確かめるテスト |
| `src/renderer/index.html`, `style.css` | クイルの画像と、ボタンを並べる領域 |
| `package.json` / `tsconfig.*.json` | main と preload は CommonJS、renderer は ES モジュールで、別々の設定でビルドする |

### 影響箇所

- `src/main/index.ts`：取得の仕組みの組み込み、状態の送信、終了時の後片付けを足す
- `src/preload/index.ts`：状態を受け取る口（`onStatus`）を公開する
- `src/renderer/index.ts`、`index.html`、`style.css`：仮のボタンを外し、通知された状態を表示する
- `src/renderer/quill-assets.ts`：変更しない（状態名の判定に `QUILL_STATES` を使う）
- `package.json`：`better-sqlite3` と `zod` を足す。`pnpm-workspace.yaml` を足す
- `tsconfig.main.json`：変更しない見込み（`src/main` の下に足すファイルは今の設定で含まれる）

### 制約

- スパイクで確認したこと：`after:` は日付単位、モデルの書き写しは壊れる、`claude -p` は既定で会話を記録する、`better-sqlite3` は作り直し不要（`docs/spike/`）
- この PC の `claude` は winget で入れた `claude.exe`。npm で入れた場合は `claude.cmd` になる

## Goals / Non-Goals

**Goals:**

- Claude CLI の呼び出しを境界で差し替えられるようにし、単体テストでは本物を呼ばない
- 取得の判断（対象期間・タブ・送信済み・手順の検証）をすべてコードで行い、テストで固める
- 本文がログ・リポジトリ・Claude の会話記録に残らないようにする

**Non-Goals:**

- 取得元を Slack に広げるための共通化は、`MessageSource` のインターフェースを切るところまで。Slack 固有の作り込みはしない
- 設定ファイルの読み込み。間隔などは定数として持つ

## Decisions

### D1. Claude CLI の呼び出しは `ClaudeRunner` の境界の向こうに置く

- `src/main/claude/claude-runner.ts` に、インターフェース `ClaudeRunner` を置く。引数の一覧と標準入力の文字列を受け取り、標準出力の行・終了コード・所要時間を返す。
- 本物の実装 `SpawnClaudeRunner` は、`child_process.spawn` で起動する唯一の場所にする。テストでは、記録済みの stream-json を返す偽物に差し替える。
- **依頼文（プロンプト）は引数ではなく標準入力で渡す。** 引数を固定の短い値だけにでき、空白や引用符の扱いが OS やシェルで変わる問題を避けられる。標準入力で渡した依頼文が受け付けられることは確認済み（2026-11-22、Windows）。
- 作業フォルダ（`cwd`）は `userData` の下の決まったフォルダにする。`--no-session-persistence` を付けると、`~/.claude/projects/` に空の `memory` フォルダはできるが、会話の記録（`.jsonl`）は作られないことを確認済み（2026-11-22、Windows）。
- **実行ファイルの決め方**：PATH から `claude` を探す（Windows では PATHEXT の順に `.exe` → `.cmd`）。
  - `.exe` や Mac / Linux の実行ファイルは、`shell: false` でそのまま起動する。
  - `.cmd` は Node が直接起動できないため、`cmd.exe /d /s /c` を通して起動する。引数は固定の値だけで、利用者の入力は標準入力で渡すので、コマンド注入の余地はない。
- 制限時間（既定5分）を過ぎたらプロセスを止める。`.cmd` 経由のときは子プロセスまで止める必要がある（R4）。
- 代替案：Claude Agent SDK を使う。依存が増え、CLAUDE.md の「`claude -p` を使う」という決定から外れるので採らない。

### D2. 起動する引数を固定する

`GmailSource` が組み立てる引数は次のとおり。組み立ては純粋関数にして、テストで中身を固める（`gmail-source` の「読み取り専用の呼び出し」「会話の記録を残さない」の Scenario に対応）。

- `-p`、`--model haiku`、`--output-format stream-json`、`--verbose`（stream-json に必要）
- `--no-session-persistence`
- `--max-turns 40`
- `--allowedTools`：`mcp__claude_ai_Gmail__search_threads`、`mcp__claude_ai_Gmail__get_thread`
- `--disallowedTools`：スパイクで確認した書き込み系24個すべて（`docs/spike/1a-gmail.md`）
- `--dangerously-skip-permissions` は付けない

`get_message` は今回の手順で使わないので、許可しない。

### D3. stream-json から tool_use と tool_result を取り出す

- `src/main/claude/stream-json.ts`：標準出力の各行を JSON として読む。
  - `assistant` メッセージの `tool_use`（id・name・input）
  - `user` メッセージの `tool_result`（tool_use_id・本文テキスト）
  - 最後の `result`（is_error・duration_ms・num_turns・usage）
- JSON として読めない行が混ざったら、その回を失敗にする。
- tool_result のテキストを JSON として読み、zod で検証するのは、Gmail のツール（`search_threads`・`get_thread`）への tool_use に対応する結果だけにする（D5）。それ以外の結果は読まずに無視する。スパイクでは、Haiku が最初に `ToolSearch` を呼び、その結果はテキストのない `tool_reference` だけだった。
- テスト用の偽データは、実際の流れと同じ形にする（最初に `ToolSearch`、続けて Gmail のツール）。

### D4. 検索は日付単位で広めにかけ、絞り込みはコードで行う

- 対象期間の始まり `windowStart` を、カーソル − 10分（初回は 取得開始 − 24時間）とする。
- 検索条件は `in:inbox category:primary after:YYYY/MM/DD`。日付は、`windowStart` のローカル日付の **1日前**。`after:` の日付の境界がどのタイムゾーンか分からないので、1日余分に取る。
- 依頼文では、この検索条件をそのまま `search_threads` に渡すこと、`view` は `THREAD_VIEW_IDS_ONLY`、`pageSize` は50、続きのページがあれば `pageToken` で取ること、見つかったスレッドをすべて `get_thread`（`messageFormat: PLAIN_TEXT`）で読むことを指示する。最終出力は使わないので、短い完了報告だけを求める。
- Gmail の取得元の中での絞り込み（`gmail-source` の「取得範囲」「自分が送ったメッセージの除外」）：
  - `labelIds` に `INBOX` がある
  - `labelIds` に `SENT` がない
  - `labelIds` に `CATEGORY_SOCIAL` / `CATEGORY_PROMOTIONS` / `CATEGORY_UPDATES` / `CATEGORY_FORUMS` がない
- 受信時刻での絞り込み（`fetch-cycle` の「取得の対象期間」）は、取得元によらない処理なので `fetch-cycle` 側で行う。取得元は受信時刻（Gmail では `internalDate`）を `receivedAt` として返し、`fetch-cycle` が `receivedAt ≥ windowStart` のものだけを保存する。Slack を足したときも同じ判定を使える。
- 検索条件の `category:primary` で範囲を絞ったうえで、返り値もラベルで確かめる。モデルが指定外の検索を追加したときに、ほかのタブのメッセージが混ざらないようにするため。判定は「ほかのタブのラベルがない」で行い、`CATEGORY_PERSONAL` の有無には頼らない。

### D5. 手順と返り値の検証

`gmail-source` の「取得手順の検証」「ツールの返り値の検証」に対応する。

- 指定した検索条件と `query` が完全に一致する `search_threads` の呼び出しが、1回以上ある。
- その結果に出てきたスレッド ID がすべて、`messageFormat` が `PLAIN_TEXT`（または省略）の `get_thread` で読まれ、その返り値が検証に通っている。
- その結果に続きのページの印（`nextPageToken`。OQ1）があるときは、その `pageToken` を使った `search_threads` がある。
- `get_thread` の返り値の zod スキーマ：`id`、`messages[]` の `id`・`threadId`・`internalDate`（数字の文字列）・`labelIds` を必須にする。`sender`・`subject`・`plaintextBody` は任意で、ないときは空文字で保存する（HTML だけのメールなど）。
- 空の返り値 `{}` は「0件」として扱う（ツールの説明どおり）。
- 指定外の検索や、指定外のスレッドの読み取りは許す。ただしそのメッセージも、D4 の絞り込みは通す。
- **メッセージの値は、本文つきの読み取り（`messageFormat` が `PLAIN_TEXT` または省略）の結果からだけ取る。** `METADATA_ONLY` などの結果は、値の取り出しにも完全性の判定にも使わない。同じメッセージを両方の形式で読んだときに、本文が空で保存されるのを防ぐため。
- エラーとして記録するのは、エラーの種類（列挙値）と、zod の issue の `code` と `path` だけにする。zod のメッセージ文には、受け取った値が入ることがあるため使わない。

### D6. 受信箱とカーソルは SQLite に置き、1つのトランザクションで更新する

- `src/main/inbox/inbox-store.ts` にインターフェース `InboxStore`、`sqlite-inbox-store.ts` に `better-sqlite3` の実装を置く。
- DB は `app.getPath('userData')/quill.db`。WAL を使う。テストでは `:memory:` を使う。
- テーブル：
  - `messages(source, external_id, thread_id, sender, subject, received_at, body, fetched_at, PRIMARY KEY (source, external_id))`
  - `cursors(source PRIMARY KEY, cursor_at)`
  - 時刻はすべて UNIX ミリ秒の整数
- `saveBatch(source, messages, cursorAt)`：`INSERT OR IGNORE` で入れ、カーソルを更新する。全体を1つのトランザクションで行い、新しく入った件数を返す（`message-inbox` の Scenario に対応）。
- 代替案：JSON ファイル。作者と相談し、SQLite に決めた（`docs/spike/1b-sqlite.md`）。

### D7. 取得の1回分と、スケジューラを分ける

- `src/main/fetch/fetch-window.ts`：カーソルと現在時刻から `windowStart` を出す純粋関数。
- `src/main/fetch/fetch-cycle.ts`：1回分を実行する。
  1. 状態 `fetching` を通知する
  2. `MessageSource.fetch(windowStart)` を呼ぶ
  3. 成功したら、`receivedAt ≥ windowStart` のものだけを残して `saveBatch` を呼ぶ
  4. 呼び出しを記録する
  5. 状態 `idle` か `error` を通知する

  時計・取得元・受信箱・ログ・通知先は、すべて引数で受け取る。
- `src/main/fetch/scheduler.ts`：起動時に1回、その後は前回の開始から間隔ごとに `runCycle` を呼ぶ。実行中なら見送り、見送ったことを記録する。タイマーは差し替えられるようにし、テストでは Vitest の偽タイマーを使う。
- カーソルに入れる値は、その回の取得を始めた時刻 S。取得中に届いたメッセージは、次の回の重ね時間で拾う。

### D8. 呼び出しログは JSON Lines で、決まった項目だけを書く

- `app.getPath('userData')/logs/calls.jsonl` に、1行1件で追記する。
- 書き込む型を、決まった項目（取得元、開始時刻、所要時間、トークン4種、ターン数、取得件数、保存件数、結果、エラーの種類、zod の issue の code と path、見送りの記録）だけにする。自由な文字列の項目を作らないことで、本文が紛れ込まないようにする。
- テスト：本文・件名・送信者に目印の文字列を入れた偽の返り値で1回分を回し、ログの全文にその目印がないことを確かめる。

### D9. 状態の通知

- `src/main/status/quill-status.ts`：取得の出来事（開始・成功・失敗）から状態を決める純粋関数（CLAUDE.md「状態の決定ロジックは main 側の純粋関数」）。
- main は `webContents.send('quill:status', state)` で送る。preload は `contextBridge` で `quill.onStatus(callback)` だけを公開する。
- renderer は、受け取った値が `QUILL_STATES` に含まれるときだけ表示を変える。
- 状態名の一覧は、main 側にも定義する。renderer の `QUILL_STATES` と一致することをテストで確かめる。main と renderer はモジュール形式（CommonJS と ES モジュール）もビルド設定も別なので、ファイルを共有するとビルド設定が複雑になるため。
- ウィンドウの読み込みが終わる前の通知は、読み込み完了時に最新の状態を送り直して取りこぼさないようにする。

### D10. 仮のボタンを外す

ステップ0の仮画面のボタンは、状態を手で切り替えるためのものだった。通知で表示が変わるようになるので外す。

## Risks / Trade-offs

- **[R1] Haiku が手順どおりに動かない**（スパイクでは、検索条件を変えたり `METADATA_ONLY` で読んだりした）→ D5 の検証で失敗として扱い、`error` にする。カーソルは進まないので、次の回で取り直す。失敗が続くようなら、依頼文を見直す。
- **[R2] 1回あたりの費用**：スパイクでは 0.013 USD・14ターン。30分間隔なら1日48回で約 0.6 USD。キャッシュ作成のトークンが大きい → 呼び出しログで実績を見て、間隔を見直す。
- **[R3] 続きのページの印の名前が未確認**（OQ1）→ 違っていると、ページ送りの検証が働かない。実データで確認するまでは、指定した検索の1ページの件数が `pageSize`（50）ちょうどで、次のページを取得していないときも失敗にする、という安全側の判定を足す。`resultCountEstimate` は推定値なので判定には使わない。
- **[R4] Windows の `.cmd` 経由の起動では、制限時間で止めるときに子プロセスが残ることがある** → `.cmd` のときは `taskkill /T /F` で、子プロセスごと止める。この PC は `.exe` なので、`.cmd` の経路は未確認として残す。
- **[R5] `better-sqlite3` の Mac での動作が未確認** → 実装に入る前に、作者が Mac で再現手順を実行する（Workflow follow-up）。
- **[R6] `after:` の日付のタイムゾーン** → 1日余分に取り、コードで絞るので、取りこぼしは起きない。重なりは一意制約で除く。
- **[R7] 変更の大きさ**：KICKOFF で決めた範囲どおりだが、1〜2日を超えるかもしれない → 超えそうなら、タスク群の 1〜4（受信箱・取得の1回分）と 5〜7（Gmail の取得元・スケジューラ・画面）の間で、変更提案を2つに分けることを作者に相談する。
- **[R8] 送信者の値**：返り値の `sender` は、メールアドレスだけのことがある（スパイクで観測）。表示名は `addressDisplayNames` にある。この変更では `sender` をそのまま保存する。

## Migration Plan

新しく作るだけなので、移行はない。DB とログは `userData` の下に新しく作られる。元に戻すときは、この変更のコードを外し、`userData` の `quill.db` と `logs/` を消す。

## Open Questions

- **OQ1**：`search_threads` の続きのページの印の項目名（`nextPageToken` と思われるが、スパイクでは観測できなかった）。実装時に、件数の多い検索で確認する。判定の場所が1か所変わるだけで、仕様は変わらない。
- **OQ2**：本文のない（HTML だけの）メールで、`plaintextBody` が空なのか、項目ごとないのか。どちらでも空文字で保存するので、仕様は変わらない。
