# Tasks

## Scenario ID 一覧（トレーサビリティ）

2026-11-23 の改訂（design.md「改訂」）で、GS-01〜03 の中身、FC-10 の条件（「最初の区切りで」）、FC-11〜16 の単位（1回の取得 → 区切り）が変わった。GS-14 は削除した。済んだタスクのうち、改訂で直すものには「→ 10.x で直す」と書いた。

テスト名は `"<ID> <Scenario 名>"` の形にする（例：`it('FC-03 前回の取得が終わっていない', ...)`）。

「【TDD】」の付いたタスクは、**失敗するテストを書く → 失敗を確認する → 最小の実装で通す → リファクタ** の順で進める。

| ID | 機能 / Requirement | Scenario |
|---|---|---|
| FC-01 | fetch-cycle / 定期取得 | 起動時に取得する |
| FC-02 | fetch-cycle / 定期取得 | 間隔ごとに取得する |
| FC-03 | fetch-cycle / 多重実行の防止 | 前回の取得が終わっていない |
| FC-04 | fetch-cycle / 多重実行の防止 | 前回の取得が終わったあと |
| FC-05 | fetch-cycle / 取得の対象期間 | カーソルより前のメッセージは対象にしない |
| FC-06 | fetch-cycle / 取得の対象期間 | 重ね時間の中のメッセージは対象にする |
| FC-07 | fetch-cycle / 取得の対象期間 | 初回は24時間前から |
| FC-08 | fetch-cycle / カーソルの更新 | 成功したらカーソルを進める |
| FC-09 | fetch-cycle / カーソルの更新 | 新着が0件でもカーソルを進める |
| FC-10 | fetch-cycle / カーソルの更新 | 失敗したらカーソルを進めない |
| FC-11 | fetch-cycle / 取得の失敗 | 検証に失敗した |
| FC-12 | fetch-cycle / 取得の失敗 | Claude CLI が失敗した |
| FC-13 | fetch-cycle / 取得の失敗 | 制限時間を超えた |
| FC-14 | fetch-cycle / 取得の失敗 | 失敗の次の回 |
| FC-15 | fetch-cycle / 呼び出しの記録 | 成功した呼び出しを記録する |
| FC-16 | fetch-cycle / 呼び出しの記録 | 失敗した呼び出しも記録する |
| FC-17 | fetch-cycle / ログに本文を残さない | 記録に本文が含まれない |
| FC-18 | fetch-cycle / ログに本文を残さない | エラーの記録に本文が含まれない |
| MI-01 | message-inbox / メッセージの保存 | 新しいメッセージを保存する |
| MI-02 | message-inbox / 重複除外 | 同じメッセージを2回受け取る |
| MI-03 | message-inbox / 重複除外 | 重ね取りで同じメッセージが再び届く |
| MI-04 | message-inbox / 重複除外 | 取得元が違えば別のメッセージとして扱う |
| MI-05 | message-inbox / 保存とカーソル更新の一体性 | 保存の途中で失敗する |
| GS-01 | gmail-source / 取得範囲 | 受信トレイのメッセージ |
| GS-02 | gmail-source / 取得範囲 | メインタブ以外のタブのメッセージ |
| GS-03 | gmail-source / 取得範囲 | 受信トレイにないメッセージ |
| GS-04 | gmail-source / 自分が送ったメッセージの除外 | スレッドに自分の返信が含まれる |
| GS-05 | gmail-source / 読み取り専用の呼び出し | 許可するツールは読み取り系だけ |
| GS-06 | gmail-source / 読み取り専用の呼び出し | 書き込み系ツールは禁止する |
| GS-07 | gmail-source / 読み取り専用の呼び出し | 権限確認を飛ばさない |
| GS-08 | gmail-source / 会話の記録を残さない | 記録を保存しない指定を付ける |
| GS-09 | gmail-source / 値はツールの返り値から取る | モデルの出力とツールの返り値が違う |
| GS-10 | gmail-source / 値はツールの返り値から取る | 受信時刻はツールの返り値から決める |
| GS-11 | gmail-source / 取得手順の検証 | 指定した検索が行われていない |
| GS-12 | gmail-source / 取得手順の検証 | 読み取っていないスレッドがある |
| GS-13 | gmail-source / 取得手順の検証 | 本文なしで読み取ったスレッドがある |
| ~~GS-14~~ | （削除。2026-11-23 の改訂でページ送りをやめた） | ~~続きのページを読んでいない~~ |
| GS-15 | gmail-source / 取得手順の検証 | 指定外の検索が追加で行われた |
| GS-16 | gmail-source / 取得手順の検証 | 検索結果が0件 |
| GS-17 | gmail-source / ツールの返り値の検証 | 必須の項目が欠けている |
| GS-18 | gmail-source / ツールの返り値の検証 | 返り値が JSON として読めない |
| GS-19 | gmail-source / 1日ずつの取得 | 複数の日にまたがる |
| GS-20 | gmail-source / 1日ずつの取得 | 1日に収まる |
| GS-21 | gmail-source / 1日ずつの取得 | 日付は UTC で数える |
| GS-22 | gmail-source / 1日ずつの取得 | 途中の日で失敗する |
| GS-23 | gmail-source / 取得手順の検証 | 推定件数が返ってきた数より多い |
| GS-24 | gmail-source / 取得手順の検証 | 推定件数がなく50件ちょうど返ってきた |
| GS-25 | gmail-source / 取得手順の検証 | 50件ちょうどで推定件数も50件 |
| GS-26 | gmail-source / 取得手順の検証 | 50件より少なく推定件数がそれより多い |
| GS-27 | gmail-source / 呼び出しの引数の固定 | 検索の件数を書き換える |
| GS-28 | gmail-source / 呼び出しの引数の固定 | 読み方を書き換える |
| GS-29 | gmail-source / 呼び出しの引数の固定 | 書き換えの仕組みを付けて起動する |
| GS-30 | gmail-source / 取得手順の検証 | 書き換えの記録がない |
| GS-31 | gmail-source / 取得手順の検証 | 50件以外の件数で検索された |
| FC-19 | fetch-cycle / 区切りごとの保存 | 区切りごとに保存する |
| FC-20 | fetch-cycle / カーソルの更新 | 途中の区切りで失敗する |
| FC-21 | fetch-cycle / 呼び出しの記録 | 区切りごとに記録する |
| QS-01 | quill-status / 取得中の状態 | 取得を始める |
| QS-02 | quill-status / 失敗時の状態 | 取得が失敗する |
| QS-03 | quill-status / 失敗時の状態 | 失敗のあとの取得中 |
| QS-04 | quill-status / 成功時の状態 | 成功して新着なし |
| QS-05 | quill-status / 成功時の状態 | 成功して新着あり |
| QS-06 | quill-status / 成功時の状態 | 失敗のあとに成功する |
| QS-07 | quill-status / クイルの表示 | 状態に対応する画像を表示する |
| QS-08 | quill-status / クイルの表示 | 知らない状態名は無視する |
| QS-09 | quill-status / クイルの表示 | 起動直後 |

## 前提（実装に入る前）

- 作者が Mac で `docs/spike/1b-sqlite.md` の再現手順を実行し、`better-sqlite3` が Mac でも動くことを確かめる（design.md R5）。

## 1. 準備

- [x] 1.1 `pnpm add better-sqlite3 zod` を実行し（`better-sqlite3` に型定義が同梱されていなければ `pnpm add -D @types/better-sqlite3` も）、`pnpm-workspace.yaml` に `allowBuilds: { better-sqlite3: false }` を書く。確認：`pnpm install` が終了コード0で終わり、`pnpm test` と `pnpm run typecheck` が通る（ファイル：`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`）

## 2. 受信箱（message-inbox）

テストは `:memory:` の DB を使う。

- [x] 2.1 【TDD】MI-01：失敗するテストを書き、`InboxStore` インターフェースと `SqliteInboxStore` のテーブル作成・`saveBatch`・`listMessages`（テスト用の読み出し）を実装して通す。確認：`pnpm test` で MI-01 が通る（ファイル：`src/main/inbox/inbox-store.ts`、`src/main/inbox/sqlite-inbox-store.ts`、`src/main/inbox/sqlite-inbox-store.test.ts`）
- [x] 2.2 【TDD】MI-02・MI-03・MI-04：失敗するテストを書き、`saveBatch` の `INSERT OR IGNORE` と「新しく入った件数」の戻り値で通す。確認：3つのテストが通る（関数：`SqliteInboxStore.saveBatch`）
- [x] 2.3 【TDD】MI-05：途中で失敗する行を混ぜたテストを書き、メッセージ保存とカーソル更新を1つのトランザクションにして通す。確認：失敗後にメッセージが0件、カーソルが元の値のまま（関数：`SqliteInboxStore.saveBatch`）
- [x] 2.4 【TDD】FC-07 の前提として、カーソルがないときに `getCursor` が「なし」を返すテストを書き、`getCursor` を実装して通す。確認：テストが通る（関数：`SqliteInboxStore.getCursor`）

## 3. 対象期間（fetch-cycle の純粋関数）

- [x] 3.1 【TDD】FC-05・FC-06・FC-07：失敗するテストを書き、`computeWindowStart(cursor, now)`（カーソル − 10分、なければ now − 24時間）と `filterByWindow(messages, windowStart)` を実装して通す。境界（ちょうど T − 10分）も含める。確認：3つのテストが通る（ファイル：`src/main/fetch/fetch-window.ts`、`fetch-window.test.ts`）

## 4. Claude CLI の境界

- [x] 4.1 【TDD】stream-json の解析：記録済みの偽データ（本文は架空の値。実際と同じく最初に `ToolSearch`、続けて Gmail のツール）で、tool_use・tool_result・result を取り出すテストと、JSON でない行が混ざると失敗になるテスト、`ToolSearch` の結果（テキストなし）を無視するテストを書き、`parseStreamJson` を実装して通す。GS-09 の土台になる。確認：テストが通る（ファイル：`src/main/claude/stream-json.ts`、`stream-json.test.ts`、`src/main/claude/__fixtures__/`）
- [x] 4.2 【TDD】`ClaudeRunner` インターフェースと、テスト用の `FakeClaudeRunner` を作る。実行ファイルを決める `resolveClaudeCommand(pathLookup, platform)` のテスト（`.exe` はそのまま起動、`.cmd` は `cmd.exe /d /s /c` 経由、Mac / Linux はそのまま）を書いて通す。確認：テストが通る（ファイル：`src/main/claude/claude-runner.ts`、`claude-runner.test.ts`）
- [x] 4.3 【TDD】FC-13：制限時間を過ぎたらプロセスを止めて「時間切れ」を返すテストを、本物の claude ではなく Node で書いた「終わらない子プロセス」で書き、`SpawnClaudeRunner` を実装して通す。依頼文は標準入力で渡す。確認：テストが通り、子プロセスが残らない（ファイル：`src/main/claude/spawn-claude-runner.ts`、`spawn-claude-runner.test.ts`）

## 5. Gmail の取得元（gmail-source）

テストでは `FakeClaudeRunner` に、記録済みの stream-json（架空の値）を返させる。本物の Claude CLI は呼ばない。

- [x] 5.1 【TDD】GS-05・GS-06・GS-07・GS-08：起動引数のテストを書き、`buildGmailArgs()` を実装して通す。確認：許可・禁止ツールの一覧と `--no-session-persistence` の有無、`--dangerously-skip-permissions` がないことがテストで固まる（ファイル：`src/main/sources/gmail/gmail-args.ts`、`gmail-args.test.ts`）
- [x] 5.2 【TDD】検索条件と依頼文：`buildGmailQuery(windowStart, timeZone)` が `in:inbox category:primary after:<windowStart の前日>` を返すテスト（日付の境界を含む）を書いて実装する。確認：テストが通る（ファイル：`src/main/sources/gmail/gmail-query.ts`、`gmail-query.test.ts`）→ 10.2 で直す
- [x] 5.3 【TDD】GS-17・GS-18：`get_thread` / `search_threads` の返り値の zod スキーマのテスト（必須項目の欠け、JSON でない、空の `{}`）を書いて実装する。確認：テストが通る（ファイル：`src/main/sources/gmail/gmail-schemas.ts`、`gmail-schemas.test.ts`）
- [x] 5.4 【TDD】GS-09・GS-10：モデルの最終出力にわざと違う本文・送信者を入れた偽データで、`GmailSource.fetch` がツールの返り値の値（`internalDate` を `receivedAt` に）を返すテストを書いて実装する。同じスレッドを `METADATA_ONLY` と `PLAIN_TEXT` の両方で読んだ偽データで、本文つきの結果の値が使われるテストも書く。確認：テストが通る（ファイル：`src/main/sources/message-source.ts`、`src/main/sources/gmail/gmail-source.ts`、`gmail-source.test.ts`）
- [x] 5.5 【TDD】GS-01・GS-02・GS-03・GS-04：ラベル違い（メインタブ、プロモーション、受信トレイ外、`SENT`）のメッセージを含む偽データでテストを書き、ラベルでの絞り込みを実装して通す。確認：4つのテストが通る（関数：`GmailSource.fetch` 内の `isPrimaryInboxReceived`）→ 10.4 で直す
- [x] 5.6 【TDD】GS-11〜GS-16：手順の欠け（指定の検索がない、読んでいないスレッド、`METADATA_ONLY` だけ、続きのページ未取得、50件ちょうどで次ページなし）と、許される場合（指定外の検索が追加、0件）の偽データでテストを書き、`verifyGmailProcedure` を実装して通す。確認：6つのテストと、50件ちょうどのテストが通る（ファイル：`src/main/sources/gmail/gmail-procedure.ts`、`gmail-procedure.test.ts`）→ 10.3 で直す

## 6. 取得の1回分と記録（fetch-cycle、quill-status）

テストでは、偽の時計・偽の取得元・`:memory:` の受信箱・メモリ上のログ・記録用の通知先を渡す。

- [x] 6.1 【TDD】QS-01〜QS-06：取得の出来事から状態を決める `nextQuillState(event)` のテストを書いて実装する。main 側の状態名の一覧が renderer の `QUILL_STATES` と一致するテストも書く。確認：テストが通る（ファイル：`src/main/status/quill-status.ts`、`quill-status.test.ts`）
- [x] 6.2 【TDD】FC-08・FC-09・FC-05・FC-06（1回分として）：成功時に `windowStart` 以降だけを保存し、カーソルを開始時刻 S にするテストを書き、`runFetchCycle` を実装して通す。確認：テストが通る（ファイル：`src/main/fetch/fetch-cycle.ts`、`fetch-cycle.test.ts`）→ 10.6 で直す
- [x] 6.3 【TDD】FC-10・FC-11・FC-12・FC-13（1回分として）：検証失敗・CLI 失敗・時間切れ・保存失敗のときに、保存0件・カーソルそのまま・`error` 通知になるテストを書いて実装する。確認：テストが通る（関数：`runFetchCycle`）
- [x] 6.4 【TDD】FC-15・FC-16：成功時と失敗時に、決まった項目の記録が1件ずつ増えるテストを書き、`CallLog` インターフェースと JSON Lines の実装 `JsonlCallLog` を作って通す。確認：テストが通り、一時フォルダのファイルに1行ずつ書かれる（ファイル：`src/main/log/call-log.ts`、`jsonl-call-log.ts`、`call-log.test.ts`）→ 10.7 で直す
- [x] 6.5 【TDD】FC-17・FC-18：本文・件名・送信者に目印の文字列を入れた偽データで、成功と検証失敗の1回分を回し、ログの全文に目印がないテストを書いて通す。確認：テストが通る（関数：`runFetchCycle`、`JsonlCallLog.append`）

## 7. スケジューラ

- [x] 7.1 【TDD】FC-01・FC-02：Vitest の偽タイマーで、起動時に1回・間隔ごとに `runCycle` が呼ばれるテストを書き、`startScheduler` を実装して通す。確認：テストが通る（ファイル：`src/main/fetch/scheduler.ts`、`scheduler.test.ts`）
- [x] 7.2 【TDD】FC-03・FC-04：終わらない `runCycle` で次の間隔を迎えるテスト（見送りが記録される）と、終わったあとは実行されるテストを書いて実装する。確認：テストが通る（関数：`startScheduler`）
- [x] 7.3 【TDD】FC-14：失敗した回の次の回が、同じカーソルから取得するテストを書いて通す（スケジューラ＋`runFetchCycle`＋受信箱の組み合わせ）。確認：テストが通る

## 8. 画面への反映（quill-status のクイルの表示）

- [x] 8.1 【TDD】QS-07・QS-08・QS-09：受け取った値と今の状態から次の表示状態を決める `resolveDisplayState(current, incoming)` のテストを書いて実装する。確認：テストが通る（ファイル：`src/renderer/display-state.ts`、`display-state.test.ts`）
- [x] 8.2 【TDD】preload：`exposeQuillApi(contextBridge, ipcRenderer)` が `quill.onStatus(callback)` だけを公開し、`quill:status` の通知を callback に渡すテストを、偽の `contextBridge` と `ipcRenderer` で書いて実装する。確認：テストが通る（ファイル：`src/preload/index.ts`、`index.test.ts`。サンドボックスの preload はローカルファイルを `require` できないため、1ファイルにまとめ、テストでは `electron` をモックする）
- [x] 8.3 【TDD】renderer：`bindQuillImage(onStatus, img)` が通知を受けて画像の `src` を変え、知らない値では変えないテストを、偽の `onStatus` と画像の代わりのオブジェクトで書いて実装する。仮のボタンと関連する HTML・CSS を外す。確認：テストと既存の `quill-assets.test.ts` が通る（ファイル：`src/renderer/bind-quill-image.ts`、`bind-quill-image.test.ts`、`src/renderer/index.ts`、`index.html`、`style.css`）
- [x] 8.4 【TDD】main の状態の送信：`createStatusForwarder(webContents)` が状態を `quill:status` で送り、読み込み完了の前に来た状態は完了時に最新の1つだけを送るテストを、偽の `webContents` で書いて実装する。確認：テストが通る（ファイル：`src/main/status/status-forwarder.ts`、`status-forwarder.test.ts`）
- [x] 8.5 【TDD】main の組み立て：`createFetchApp({ userDataDir, runner, now, timers, forward })` が DB・ログ・`GmailSource`・スケジューラを組み立て、`stop()` でタイマーと DB を閉じるテストを、偽の runner と一時フォルダで書いて実装する。確認：テストが通り、一時フォルダに `quill.db` と `logs/` ができる（ファイル：`src/main/app/create-fetch-app.ts`、`create-fetch-app.test.ts`）
- [x] 8.6 `src/main/index.ts` に、Electron の `app`・`BrowserWindow` と 8.4・8.5 をつなぐ数行だけを書く。**ここだけはテストのない本番コードの例外**（Electron 本体が必要で、単体テストでは動かせない）とし、9.2 の実行確認で代える。確認：`pnpm run typecheck` が通る（ファイル：`src/main/index.ts`）

## 9. 結合確認

- [x] 9.1 `pnpm test` と `pnpm run typecheck` がすべて通ることを確認する
- [x] 9.2 本物の Gmail で `pnpm run dev` を1回動かし、次を確認する。結果は本文を残さずに `docs/spike/` か変更提案のメモに書く（2026-11-23 実施。`docs/spike/1a-gmail.md` 7節。メインタブ以外のタブの保存は実際の実行では未確認で、作者の判断で単体テスト GS-02 の確認で代えた）
  - クイルが `fetching` → `idle` と変わる
  - `userData` の `quill.db` に保存された件数と、`logs/calls.jsonl` の記録
  - ログに決まった項目以外がない
  - `~/.claude/projects/` に、この実行の会話記録（`.jsonl`）が増えていない
  - stream-json に、Gmail の呼び出しごとの hook の記録が出ている（`hook-missing` で失敗していない）
  - 区切り（日）ごとの記録が並び、日付・所要時間・トークンが入っている（design.md R9：1日分の所要時間が制限時間の5分に対してどれくらいか）
  - 受信トレイのメインタブ以外のメッセージも保存されている
  - 日付の境目（UTC 0時 = 日本時間 9時）の近くに届いたメッセージがあれば、取りこぼしていないか（design.md R6）

## 10. 改訂：全タブ化と1日ずつの取得（2026-11-23）

- [x] 10.1 【TDD】GS-05 の前提：`--max-turns` が 60 であることを確かめるよう既存のテストを直し、失敗を確認してから `MAX_TURNS` を直す。確認：テストが通る（ファイル：`src/main/sources/gmail/gmail-args.ts`、`gmail-args.test.ts`）
- [x] 10.2 【TDD】GS-19・GS-20・GS-21：`planGmailSlices(windowStart, now)` が UTC の1日ずつの区切り（`label`・`startsAt`・`endsAt`）を古い順に返すテスト（複数日、1日、日本時間 08:37 = UTC 前日 23:37 の境界）を書いて実装する。あわせて、`buildGmailQuery(slice)` が `in:inbox after:<その日> before:<翌日>` を返すテストと、`buildGmailPrompt` に続きのページの指示がないテストに直す。確認：テストが通る（ファイル：`src/main/sources/gmail/gmail-slices.ts`、`gmail-slices.test.ts`、`gmail-query.ts`、`gmail-query.test.ts`）
- [x] 10.3 【TDD】GS-23・GS-24・GS-25・GS-26：推定件数あり（50件で715件）・なし・50件で一致・12件で14件、の偽データでテストを書き、`searchThreadsResultSchema` に `resultCountEstimate` を足し、`verifyGmailProcedure` を直して通す（理由 `result-truncated`）。GS-14 と「50件ちょうどで次ページなし」のテスト、`next-page-missing`・`page-full-without-token` の判定は消す。確認：テストが通る（ファイル：`src/main/sources/gmail/gmail-schemas.ts`、`gmail-procedure.ts`、それぞれのテスト）
- [x] 10.4 【TDD】GS-01・GS-02・GS-03：プロモーションのタブのメッセージが「渡される」ように GS-02 のテストを直し、失敗を確認してから、ラベルでの絞り込みを「`INBOX` があり `SENT` がない」に直して通す。確認：GS-01〜GS-04 が通る（関数：`isPrimaryInboxReceived` → `isInboxReceived`）
- [x] 10.5 【TDD】区切りの取得：`MessageSource` を `planSlices(windowStart, now)` と `fetchSlice(slice)` に分ける。`GmailSource.fetchSlice` がその日の検索条件で呼ぶテストを書き、既存の GS-09〜GS-13・GS-15〜GS-18 のテストを `fetchSlice` に移して通す。偽の取得元も区切りを返せるように直す。確認：テストが通る（ファイル：`src/main/sources/message-source.ts`、`gmail-source.ts`、`gmail-source.test.ts`、`__fixtures__/fake-source.ts`、`gmail/__fixtures__/gmail-stream.ts`）
- [x] 10.6 【TDD】FC-19・FC-20・GS-22・FC-10・FC-08：3区切りの偽の取得元で、すべて成功（古い順に保存、カーソルは S）、2つ目で失敗（1つ目は保存、カーソルは1つ目の `endsAt`、3つ目は呼ばれない、`error` 通知）、1つ目で失敗（カーソルそのまま）のテストを書き、`runFetchCycle` を区切りごとの繰り返しに直して通す。既存の FC-05〜FC-13 のテストも通ることを確かめる。確認：テストが通る（関数：`runFetchCycle`）
- [x] 10.7 【TDD】FC-21・FC-15・FC-16：区切りごとに記録が1件ずつ増え、区切りのラベルが入るテストを書き、`FetchLogEntry` に `slice` を足して、`JsonlCallLog` の書き出す項目に加えて通す。FC-17・FC-18 が通ることも確かめる。確認：テストが通る（ファイル：`src/main/log/call-log.ts`、`jsonl-call-log.ts`、`call-log.test.ts`、`fetch-cycle.test.ts`）
- [x] 10.8 【TDD】組み立てと FC-14：`createFetchApp` から `timeZone` を外し、FC-14（失敗の次の回は、前の回が終わった時点のカーソルから）のテストを区切りに合わせて直して通す。確認：テストが通る（ファイル：`src/main/app/create-fetch-app.ts`、`create-fetch-app.test.ts`、`scheduler.test.ts`）
- [x] 10.9 `pnpm test` と `pnpm run typecheck` がすべて通ることを確認する

## 11. 改訂：hook で Gmail の呼び出しの引数を固定する（2026-11-23）

9.2 は、この群が終わってから行う。

- [x] 11.1 【TDD】GS-27・GS-28：`rewriteGmailToolInput(toolName, input)` が、`search_threads` の `pageSize` を50に、`get_thread` の `messageFormat` を `PLAIN_TEXT` にし、ほかの引数はそのまま残し、ほかのツールには何もしないテストを書いて実装する。hook の標準入力を受けて PreToolUse の応答 JSON を返す `runGmailHook(stdinText)` も同じくテストして実装する。標準入出力をつなぐ数行だけはテストのない例外とする（design.md D12）。確認：テストが通る（ファイル：`src/main/sources/gmail/gmail-hook.ts`、`gmail-hook.test.ts`、`gmail-hook-main.ts`）
- [x] 11.2 【TDD】GS-29：`buildGmailArgs()` に `--settings gmail-settings.json` と `--include-hook-events` が入るテストと、`buildGmailHookSettings(hookScriptPath)` が `matcher` と `node "<パス>"` の `command` を持つ設定を返すテストを書いて実装する。確認：テストが通る（ファイル：`gmail-args.ts`、`gmail-args.test.ts`）
- [x] 11.3 【TDD】stream-json の解析：PreToolUse の `hook_response`（`hook_name`・`outcome`・`output`）を取り出すテストを書き、`parseStreamJson` に足して通す。偽データの組み立てにも hook の記録を足す。確認：テストが通る（ファイル：`src/main/claude/stream-json.ts`、`stream-json.test.ts`、`src/main/claude/__fixtures__/stream.ts`、`gmail/__fixtures__/gmail-stream.ts`）
- [x] 11.4 【TDD】GS-30・GS-31・GS-13：hook の記録がない呼び出し、書き換え後の件数が50以外、書き換え後も本文なし、の偽データでテストを書き、`verifyGmailProcedure` が書き換えたあとの値で判断するように直して通す（理由 `hook-missing`・`page-size-mismatch`）。モデルが `METADATA_ONLY` を指定し hook が `PLAIN_TEXT` に書き換えた読み取りから値を取り出すテストも、`GmailSource` に書いて通す。既存の GS-09〜GS-26 が通ることも確かめる。確認：テストが通る（ファイル：`gmail-procedure.ts`、`gmail-source.ts`、それぞれのテスト）
- [x] 11.5 【TDD】組み立て：`createFetchApp` が作業フォルダに `gmail-settings.json`（hook スクリプトの絶対パス入り）を書くテストを書いて実装する。確認：テストが通る（ファイル：`src/main/app/create-fetch-app.ts`、`create-fetch-app.test.ts`）
- [x] 11.6 `pnpm test` と `pnpm run typecheck` がすべて通ることを確認する。`pnpm run build` のあとで `dist/` に hook スクリプトがあることを確かめる

## Workflow follow-up

- 作者のレビューと承認を受けてから実装（apply）に入る
- 実装が終わったらアーカイブし、差分を `openspec/specs/` に反映する
