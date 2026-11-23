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

### 改訂（2026-11-23）：全タブ化と1日ずつの取得

タスク 1〜9.1 を実装したあとで、取得範囲と取得のしかたを変えた。理由は proposal.md の Why と、次の確認結果（本文は読まず、件数と受信時刻だけを見た）。

- `after:<UNIX 秒>` は、範囲によらず空の `{}` を返した（スパイクに続いて2回目）
- `in:inbox after:2026/11/20` に、日本時間 11/20 08:37（UTC 11/19 23:37）のメッセージは入らず、09:58（UTC 11/20 00:58）のメッセージは入った。日付は UTC の0時付近で区切られている
- `after:D before:D+1` で1日分だけを検索でき、11/20 と 11/21 の件数は UTC で区切った場合と合った。ただし 11/19 だけの検索は2スレッドを返し、受信時刻を確かめた範囲では1スレッドしか当てはまらなかった（説明がついていない）
- 日付なしの `in:inbox` は、50件と `resultCountEstimate: "715"` を返した。続きのページの印の項目はなかった。0件のときは推定値の項目もなかった
- `pageSize` に100や500を渡すと、コネクタは `page_size must be greater than 0 and less than or equal to 50` というエラーを返した。上限50はコネクタの返り値で確定した。`pageSize` を付けないと20件が返った
- `--settings` で渡した PreToolUse hook で `search_threads` の `pageSize` を5から50に書き換えると、50件が返った。`--include-hook-events` を付けると、hook の開始と応答（`system` の `hook_started` / `hook_response`。応答の `output` に hook の標準出力）が stream-json に出た。一方、`assistant` の `tool_use` の `input` は、モデルが指定した書き換え前の値（5）のままだった。作者のユーザー設定の SessionStart hook も、この呼び出しの中で動いていた
- `get_thread` を含むツールを56回呼ぶ依頼（`--max-turns 40`）で、結果の `num_turns` は58だったが、失敗にはならなかった

**変更前の振る舞い（実装済みのコード）**

| ファイル・関数 | 変更前の振る舞い |
|---|---|
| `gmail-query.ts` の `buildGmailQuery` | `in:inbox category:primary after:<windowStart のローカル日付の前日>` を返す |
| `gmail-query.ts` の `buildGmailPrompt` | 続きのページを `pageToken` で取るよう指示する |
| `gmail-procedure.ts` の `verifyGmailProcedure` | `nextPageToken` を使った検索がないとき、または50件ちょうどで `nextPageToken` がないときに失敗にする |
| `gmail-schemas.ts` の `searchThreadsResultSchema` | `threads` と `nextPageToken` を読む。`resultCountEstimate` は読まない |
| `gmail-source.ts` の `isPrimaryInboxReceived` | ほかのタブのラベルがあるメッセージを除く |
| `gmail-source.ts` の `GmailSource.fetch` | `windowStart` を受け取り、`claude -p` を1回呼んで、全メッセージを1つの結果で返す |
| `gmail-args.ts` | `--max-turns 40` |
| `message-source.ts` の `MessageSource` | `fetch(windowStart)` が1つの結果を返す |
| `fetch-cycle.ts` の `runFetchCycle` | 結果を1回で保存し、カーソルを開始時刻 S にする。ログは1回の取得につき1件 |
| `call-log.ts` の `FetchLogEntry` | 区切りの項目がない |
| `create-fetch-app.ts` | `GmailSource` に `timeZone` を渡す |

**影響箇所**

- 上の表のファイルすべてと、それぞれのテスト・偽データ（`gmail-stream.ts`、`fake-source.ts`）
- `fetch-window.ts`、`sqlite-inbox-store.ts`、`scheduler.ts`、状態の通知、画面は変えない

### 制約

- スパイクで確認したこと：`after:` は日付単位、モデルの書き写しは壊れる、`claude -p` は既定で会話を記録する、`better-sqlite3` は作り直し不要（`docs/spike/`）
- この PC の `claude` は winget で入れた `claude.exe`。npm で入れた場合は `claude.cmd` になる

## Goals / Non-Goals

**Goals:**

- Claude CLI の呼び出しを境界で差し替えられるようにし、単体テストでは本物を呼ばない
- 取得の判断（対象期間・日の区切り・受信トレイ・送信済み・手順の検証）をすべてコードで行い、テストで固める
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
- `--max-turns 60`（1日に50スレッドあると、ツールの呼び出しは50回を超える。`--max-turns 40` の確認で、結果の `num_turns` が58でも失敗にならなかったので、`--max-turns` が何を数えるかは未確認。余裕を持たせて60にし、9.2 で確かめる）
- `--allowedTools`：`mcp__claude_ai_Gmail__search_threads`、`mcp__claude_ai_Gmail__get_thread`
- `--disallowedTools`：スパイクで確認した書き込み系24個すべて（`docs/spike/1a-gmail.md`）
- `--settings gmail-settings.json`（D12。作業フォルダの中の相対パス。`.cmd` 経由の起動でも安全な文字だけで渡せる）
- `--include-hook-events`（D12 の書き換えの記録を出力に含める）
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

### D4. 検索は1日分ずつかけ、絞り込みはコードで行う

- 対象期間の始まり `windowStart` を、カーソル − 10分（初回は 取得開始 − 24時間）とする（変更なし）。
- 1日ずつの区切り方は D11。各日の検索条件は `in:inbox after:YYYY/MM/DD before:<翌日>`。日付は UTC で計算する。タブは絞らない。
- 依頼文では、この検索条件をそのまま `search_threads` に渡すこと、`view` は `THREAD_VIEW_IDS_ONLY`、`pageSize` は50、見つかったスレッドをすべて `get_thread`（`messageFormat: PLAIN_TEXT`）で読むことを指示する。続きのページの指示はしない。最終出力は使わないので、短い完了報告だけを求める。
- Gmail の取得元の中での絞り込み（`gmail-source` の「取得範囲」「自分が送ったメッセージの除外」）：
  - `labelIds` に `INBOX` がある
  - `labelIds` に `SENT` がない
- 受信時刻での絞り込み（`fetch-cycle` の「取得の対象期間」）は、取得元によらない処理なので `fetch-cycle` 側で行う。取得元は受信時刻（Gmail では `internalDate`）を `receivedAt` として返し、`fetch-cycle` が `receivedAt ≥ windowStart` のものだけを保存する。Slack を足したときも同じ判定を使える。
- 検索は日付単位で、最初の日には `windowStart` より前のメッセージも含まれるが、受信時刻での絞り込みで落とす。日付の区切りの推測（UTC）が少しずれても、それで重複は起きない（一意制約で除く）。

### D5. 手順と返り値の検証

`gmail-source` の「取得手順の検証」「ツールの返り値の検証」に対応する。

- 指定した検索条件と `query` が完全に一致する `search_threads` の呼び出しが、1回以上ある。
- その結果に出てきたスレッド ID がすべて、`messageFormat` が `PLAIN_TEXT`（または省略）の `get_thread` で読まれ、その返り値が検証に通っている。
- その結果が件数の上限に当たっていない。スレッドが50件ちょうどで、`resultCountEstimate`（数字の文字列）がないか50より大きいときは、上限に当たったとして失敗にする（理由 `result-truncated`）。50件より少ないときは、推定値を見ない。推定値は実際より多く出ることがあり、それで失敗にすると、カーソルが進まずに止まり続けるため。50件ちょうどで推定値も50のときは、全件とは言い切れないが、ページ送りの手段がないため、これ以上は確かめられない（R3）。
- `search_threads` の返り値の zod スキーマ：`threads`（なければ空）、`resultCountEstimate`（任意。数字の文字列）。
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
  2. `MessageSource.planSlices(windowStart, startedAt)` で区切りの一覧を得る（D11）
  3. 区切りごとに、古い順に次を行う
     1. `MessageSource.fetchSlice(slice)` を呼ぶ
     2. 成功したら、`receivedAt ≥ windowStart` のものだけを残して `saveBatch` を呼ぶ。カーソルは、最後でない区切りでは `slice.endsAt`、最後の区切りでは `startedAt`
     3. 呼び出しを記録する（区切りの `label` を含める）
     4. 失敗したら、残りの区切りは扱わずに抜ける
  4. 状態を通知する。すべて成功なら `idle`、どれかが失敗なら `error`。新着の件数は、保存できた区切りの合計

  時計・取得元・受信箱・ログ・通知先は、すべて引数で受け取る。
- `src/main/fetch/scheduler.ts`：起動時に1回、その後は前回の開始から間隔ごとに `runCycle` を呼ぶ。実行中なら見送り、見送ったことを記録する。タイマーは差し替えられるようにし、テストでは Vitest の偽タイマーを使う。
- 最後の区切りまで成功したときのカーソルは、その回の取得を始めた時刻 S。取得中に届いたメッセージは、次の回の重ね時間で拾う。
- 途中の区切りで止まったときのカーソルは、成功した最後の区切りの終わり（Gmail では UTC の翌日0時）。次の回の `windowStart` はその10分前になるので、成功済みの日をもう一度読み直す。読み直しは1日分の呼び出しが1回増えるだけで、重複は一意制約で除かれる。失敗のあとだけ起きることなので、そのままにする。

### D8. 呼び出しログは JSON Lines で、決まった項目だけを書く

- `app.getPath('userData')/logs/calls.jsonl` に、1行1件で追記する。
- 1件は Claude CLI の呼び出し1回（区切り1つ）に当たる。
- 書き込む型を、決まった項目（取得元、区切りのラベル（Gmail では `YYYY-MM-DD`）、開始時刻、所要時間、トークン4種、ターン数、取得件数、保存件数、結果、エラーの種類、zod の issue の code と path、見送りの記録）だけにする。自由な文字列の項目を作らないことで、本文が紛れ込まないようにする。
- テスト：本文・件名・送信者に目印の文字列を入れた偽の返り値で1回分を回し、ログの全文にその目印がないことを確かめる。

### D9. 状態の通知

- `src/main/status/quill-status.ts`：取得の出来事（開始・成功・失敗）から状態を決める純粋関数（CLAUDE.md「状態の決定ロジックは main 側の純粋関数」）。
- main は `webContents.send('quill:status', state)` で送る。preload は `contextBridge` で `quill.onStatus(callback)` だけを公開する。
- renderer は、受け取った値が `QUILL_STATES` に含まれるときだけ表示を変える。
- 状態名の一覧は、main 側にも定義する。renderer の `QUILL_STATES` と一致することをテストで確かめる。main と renderer はモジュール形式（CommonJS と ES モジュール）もビルド設定も別なので、ファイルを共有するとビルド設定が複雑になるため。
- ウィンドウの読み込みが終わる前の通知は、読み込み完了時に最新の状態を送り直して取りこぼさないようにする。

### D10. 仮のボタンを外す

ステップ0の仮画面のボタンは、状態を手で切り替えるためのものだった。通知で表示が変わるようになるので外す。

### D11. 1日ずつの区切り

- `MessageSource` を次の2つに分ける。区切り方は取得元ごとに違う（Slack は時刻で検索できる見込み）ので、取得元が決める。
  - `planSlices(windowStart, now)`：区切りの一覧を古い順に返す純粋関数。区切りは `{ label, startsAt, endsAt }`
  - `fetchSlice(slice)`：1つの区切りを取得し、その区切りのメッセージか失敗を返す
- Gmail の `planSlices`：`windowStart` を含む UTC の日から、`now` を含む UTC の日まで、1日ずつ。`label` は `YYYY-MM-DD`、`startsAt` はその日の UTC 0時、`endsAt` は翌日の UTC 0時。
- Gmail の `fetchSlice`：その日の検索条件（D4）で `claude -p` を1回呼び、D5 の検証を行う。
- 日数に上限は設けない。長く起動していなかったあとの初回は、日数分の呼び出しが続くので時間がかかる（作者と合意済み）。
- `GmailSource` には `timeZone` を渡さなくなる。

### D12. PreToolUse hook で Gmail の呼び出しの引数を固定する

- Haiku は依頼文と違う引数で呼ぶことがある（スパイクでは5件での検索、`METADATA_ONLY` での読み取り）。失敗にして次の回に読み直すより、その場で直すほうが `error` で止まる回数が減る。作者と相談して決めた。
- hook のスクリプトは `src/main/sources/gmail/gmail-hook.ts`（ビルド後は `dist/` の下の `.js`）。標準入力の hook の入力（`tool_name`・`tool_input`）を読み、次の `updatedInput` を返す。それ以外のツールには何もしない。
  - `search_threads`：`pageSize: 50`
  - `get_thread`：`messageFormat: "PLAIN_TEXT"`
  - 書き換えの中身は純粋関数 `rewriteGmailToolInput(toolName, input)` にし、テストで固める。標準入出力をつなぐ数行だけは、`src/main/index.ts` と同じくテストのない例外とし、9.2 の実行確認で代える。
- 設定ファイル `gmail-settings.json` は、`createFetchApp` が起動時に作業フォルダ（`userData/claude-work`）に書く。中身は `hooks.PreToolUse` の1件で、`matcher` は `search_threads` と `get_thread`、`command` は `node "<hook スクリプトの絶対パス>"`。パスは区切りを `/` にそろえて渡す（hook はシェル経由で起動されるため）。
- 作者のユーザー設定の hook も動くが、作者の判断でそのままにする（R10）。
- **検証は書き換えたあとの値で行う。** stream-json の `tool_use` には書き換え前の値が残るので、`parseStreamJson` で PreToolUse の `hook_response` も取り出し、その `output` の `updatedInput` を、実際に Gmail に渡った引数とみなす。
  - 対応づけ：hook の記録には `tool_use` の ID がない。そこで、`search_threads` は `query`、`get_thread` は `threadId` が同じものを対応させる。
  - Gmail の検索・読み取りの `tool_use` に、対応する hook の記録（成功）がないときは、その日を失敗にする（理由 `hook-missing`）。`node` が見つからないなどで hook が動かなかった場合に、書き換えなしの結果を正しいとみなさないため。
  - 書き換えたあとの `pageSize` が50でないときも、その日を失敗にする（理由 `page-size-mismatch`）。50件より少ない結果を「全件」とみなせるのは、50件で検索したときだけだから（D5）。
  - 値の取り出し（D5 の「本文つきの読み取りの結果からだけ取る」）も、書き換えたあとの読み方で判断する。
- hook の記録に入るのは引数（検索条件、スレッド ID）だけで、本文は入らない。呼び出しログにも書かない。

## Risks / Trade-offs

- **[R1] Haiku が手順どおりに動かない**（スパイクでは、検索条件を変えたり `METADATA_ONLY` で読んだりした）→ 件数と読み方は D12 の hook で直す。それ以外（指定の検索をしない、読まないスレッドがある）は D5 の検証で失敗として扱い、`error` にする。カーソルは進まないので、次の回で取り直す。失敗が続くようなら、依頼文を見直す。
- **[R2] 1回あたりの費用**：スパイクでは 0.013 USD・14ターン。30分間隔なら1日48回で約 0.6 USD。キャッシュ作成のトークンが大きい。その日のスレッドは、日が変わるまで毎回本文つきで読み直す → 呼び出しログで実績を見て、間隔を見直す。
- **[R3] 1日に50スレッドを超えると、そこで止まる** → ページ送りの手段がなく、日付より細かくも検索できないため避けられない。その日は失敗になり、カーソルが進まないので、`error` が続く。止まったらログ（`result-truncated`）で気づける。また、`resultCountEstimate` は推定値なので、実際より少なく出ると取りこぼしに気づけない。
- **[R4] Windows の `.cmd` 経由の起動では、制限時間で止めるときに子プロセスが残ることがある** → `.cmd` のときは `taskkill /T /F` で、子プロセスごと止める。この PC は `.exe` なので、`.cmd` の経路は未確認として残す。
- **[R5] `better-sqlite3` の Mac での動作が未確認** → 実装に入る前に、作者が Mac で再現手順を実行する（Workflow follow-up）。
- **[R6] 日付の区切りが UTC だというのは、1回の観測による推測** → 実際の区切りが UTC の0時から数十分ずれていると、最初の日の検索から、`windowStart` 直後のメッセージが漏れることがある。区切りどうしは同じ規則で並ぶので、日と日の間に隙間はできない。観測では、区切りは UTC 23:37〜00:58 の間にあった。11/19 の件数の食い違いは未解決。9.2 で、日付の境目に近いメッセージがあれば確かめる。
- **[R7] 変更の大きさ**：KICKOFF で決めた範囲どおりだが、1〜2日を超えるかもしれない → 超えそうなら、タスク群の 1〜4（受信箱・取得の1回分）と 5〜7（Gmail の取得元・スケジューラ・画面）の間で、変更提案を2つに分けることを作者に相談する。
- **[R8] 送信者の値**：返り値の `sender` は、メールアドレスだけのことがある（スパイクで観測）。表示名は `addressDisplayNames` にある。この変更では `sender` をそのまま保存する。
- **[R9] 50スレッドを1回の `claude -p` で読み切れるか** → `--max-turns` は余裕を持たせて60にしたが、何を数えるかは未確認（D2）。制限時間（5分）と、モデルが一度に扱える量（本文の合計）が足りるかは未確認。足りないと、その日は時間切れかエラーで失敗し、R3 と同じく止まる。9.2 の実行で所要時間とトークンを見る。
- **[R10] hook の実行環境** → hook は PATH の `node` で動かす。作者の PC には入っているが、`node` がないと hook が動かず、毎回 `hook-missing` で失敗する（`error` で気づける）。作者のユーザー設定の hook（SessionStart など）も、`claude -p` の中で動く。作者の判断でそのままにする。止めたくなったら `--setting-sources` で読む設定を絞る。

## Migration Plan

新しく作るだけなので、移行はない。DB とログは `userData` の下に新しく作られる。元に戻すときは、この変更のコードを外し、`userData` の `quill.db` と `logs/` を消す。

## Open Questions

- **OQ1（解決、2026-11-23）**：`search_threads` に続きのページの印はない。50件と `resultCountEstimate` だけが返る。ページ送りをやめ、1日ずつの検索と、推定値による上限の判定にした（D5、D11）。
- **OQ2**：本文のない（HTML だけの）メールで、`plaintextBody` が空なのか、項目ごとないのか。どちらでも空文字で保存するので、仕様は変わらない。
