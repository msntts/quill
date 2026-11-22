# Tasks

## Scenario ID 一覧（トレーサビリティ）

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
| GS-01 | gmail-source / 取得範囲 | メインタブのメッセージ |
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
| GS-14 | gmail-source / 取得手順の検証 | 続きのページを読んでいない |
| GS-15 | gmail-source / 取得手順の検証 | 指定外の検索が追加で行われた |
| GS-16 | gmail-source / 取得手順の検証 | 検索結果が0件 |
| GS-17 | gmail-source / ツールの返り値の検証 | 必須の項目が欠けている |
| GS-18 | gmail-source / ツールの返り値の検証 | 返り値が JSON として読めない |
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

- [ ] 1.1 `pnpm add better-sqlite3 zod` を実行し（`better-sqlite3` に型定義が同梱されていなければ `pnpm add -D @types/better-sqlite3` も）、`pnpm-workspace.yaml` に `allowBuilds: { better-sqlite3: false }` を書く。確認：`pnpm install` が終了コード0で終わり、`pnpm test` と `pnpm run typecheck` が通る（ファイル：`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`）

## 2. 受信箱（message-inbox）

テストは `:memory:` の DB を使う。

- [ ] 2.1 【TDD】MI-01：失敗するテストを書き、`InboxStore` インターフェースと `SqliteInboxStore` のテーブル作成・`saveBatch`・`listMessages`（テスト用の読み出し）を実装して通す。確認：`pnpm test` で MI-01 が通る（ファイル：`src/main/inbox/inbox-store.ts`、`src/main/inbox/sqlite-inbox-store.ts`、`src/main/inbox/sqlite-inbox-store.test.ts`）
- [ ] 2.2 【TDD】MI-02・MI-03・MI-04：失敗するテストを書き、`saveBatch` の `INSERT OR IGNORE` と「新しく入った件数」の戻り値で通す。確認：3つのテストが通る（関数：`SqliteInboxStore.saveBatch`）
- [ ] 2.3 【TDD】MI-05：途中で失敗する行を混ぜたテストを書き、メッセージ保存とカーソル更新を1つのトランザクションにして通す。確認：失敗後にメッセージが0件、カーソルが元の値のまま（関数：`SqliteInboxStore.saveBatch`）
- [ ] 2.4 【TDD】FC-07 の前提として、カーソルがないときに `getCursor` が「なし」を返すテストを書き、`getCursor` を実装して通す。確認：テストが通る（関数：`SqliteInboxStore.getCursor`）

## 3. 対象期間（fetch-cycle の純粋関数）

- [ ] 3.1 【TDD】FC-05・FC-06・FC-07：失敗するテストを書き、`computeWindowStart(cursor, now)`（カーソル − 10分、なければ now − 24時間）と `filterByWindow(messages, windowStart)` を実装して通す。境界（ちょうど T − 10分）も含める。確認：3つのテストが通る（ファイル：`src/main/fetch/fetch-window.ts`、`fetch-window.test.ts`）

## 4. Claude CLI の境界

- [ ] 4.1 【TDD】stream-json の解析：記録済みの偽データ（本文は架空の値。実際と同じく最初に `ToolSearch`、続けて Gmail のツール）で、tool_use・tool_result・result を取り出すテストと、JSON でない行が混ざると失敗になるテスト、`ToolSearch` の結果（テキストなし）を無視するテストを書き、`parseStreamJson` を実装して通す。GS-09 の土台になる。確認：テストが通る（ファイル：`src/main/claude/stream-json.ts`、`stream-json.test.ts`、`src/main/claude/__fixtures__/`）
- [ ] 4.2 【TDD】`ClaudeRunner` インターフェースと、テスト用の `FakeClaudeRunner` を作る。実行ファイルを決める `resolveClaudeCommand(pathLookup, platform)` のテスト（`.exe` はそのまま起動、`.cmd` は `cmd.exe /d /s /c` 経由、Mac / Linux はそのまま）を書いて通す。確認：テストが通る（ファイル：`src/main/claude/claude-runner.ts`、`claude-runner.test.ts`）
- [ ] 4.3 【TDD】FC-13：制限時間を過ぎたらプロセスを止めて「時間切れ」を返すテストを、本物の claude ではなく Node で書いた「終わらない子プロセス」で書き、`SpawnClaudeRunner` を実装して通す。依頼文は標準入力で渡す。確認：テストが通り、子プロセスが残らない（ファイル：`src/main/claude/spawn-claude-runner.ts`、`spawn-claude-runner.test.ts`）

## 5. Gmail の取得元（gmail-source）

テストでは `FakeClaudeRunner` に、記録済みの stream-json（架空の値）を返させる。本物の Claude CLI は呼ばない。

- [ ] 5.1 【TDD】GS-05・GS-06・GS-07・GS-08：起動引数のテストを書き、`buildGmailArgs()` を実装して通す。確認：許可・禁止ツールの一覧と `--no-session-persistence` の有無、`--dangerously-skip-permissions` がないことがテストで固まる（ファイル：`src/main/sources/gmail/gmail-args.ts`、`gmail-args.test.ts`）
- [ ] 5.2 【TDD】検索条件と依頼文：`buildGmailQuery(windowStart, timeZone)` が `in:inbox category:primary after:<windowStart の前日>` を返すテスト（日付の境界を含む）を書いて実装する。確認：テストが通る（ファイル：`src/main/sources/gmail/gmail-query.ts`、`gmail-query.test.ts`）
- [ ] 5.3 【TDD】GS-17・GS-18：`get_thread` / `search_threads` の返り値の zod スキーマのテスト（必須項目の欠け、JSON でない、空の `{}`）を書いて実装する。確認：テストが通る（ファイル：`src/main/sources/gmail/gmail-schemas.ts`、`gmail-schemas.test.ts`）
- [ ] 5.4 【TDD】GS-09・GS-10：モデルの最終出力にわざと違う本文・送信者を入れた偽データで、`GmailSource.fetch` がツールの返り値の値（`internalDate` を `receivedAt` に）を返すテストを書いて実装する。同じスレッドを `METADATA_ONLY` と `PLAIN_TEXT` の両方で読んだ偽データで、本文つきの結果の値が使われるテストも書く。確認：テストが通る（ファイル：`src/main/sources/message-source.ts`、`src/main/sources/gmail/gmail-source.ts`、`gmail-source.test.ts`）
- [ ] 5.5 【TDD】GS-01・GS-02・GS-03・GS-04：ラベル違い（メインタブ、プロモーション、受信トレイ外、`SENT`）のメッセージを含む偽データでテストを書き、ラベルでの絞り込みを実装して通す。確認：4つのテストが通る（関数：`GmailSource.fetch` 内の `isPrimaryInboxReceived`）
- [ ] 5.6 【TDD】GS-11〜GS-16：手順の欠け（指定の検索がない、読んでいないスレッド、`METADATA_ONLY` だけ、続きのページ未取得、50件ちょうどで次ページなし）と、許される場合（指定外の検索が追加、0件）の偽データでテストを書き、`verifyGmailProcedure` を実装して通す。確認：6つのテストと、50件ちょうどのテストが通る（ファイル：`src/main/sources/gmail/gmail-procedure.ts`、`gmail-procedure.test.ts`）

## 6. 取得の1回分と記録（fetch-cycle、quill-status）

テストでは、偽の時計・偽の取得元・`:memory:` の受信箱・メモリ上のログ・記録用の通知先を渡す。

- [ ] 6.1 【TDD】QS-01〜QS-06：取得の出来事から状態を決める `nextQuillState(event)` のテストを書いて実装する。main 側の状態名の一覧が renderer の `QUILL_STATES` と一致するテストも書く。確認：テストが通る（ファイル：`src/main/status/quill-status.ts`、`quill-status.test.ts`）
- [ ] 6.2 【TDD】FC-08・FC-09・FC-05・FC-06（1回分として）：成功時に `windowStart` 以降だけを保存し、カーソルを開始時刻 S にするテストを書き、`runFetchCycle` を実装して通す。確認：テストが通る（ファイル：`src/main/fetch/fetch-cycle.ts`、`fetch-cycle.test.ts`）
- [ ] 6.3 【TDD】FC-10・FC-11・FC-12・FC-13（1回分として）：検証失敗・CLI 失敗・時間切れ・保存失敗のときに、保存0件・カーソルそのまま・`error` 通知になるテストを書いて実装する。確認：テストが通る（関数：`runFetchCycle`）
- [ ] 6.4 【TDD】FC-15・FC-16：成功時と失敗時に、決まった項目の記録が1件ずつ増えるテストを書き、`CallLog` インターフェースと JSON Lines の実装 `JsonlCallLog` を作って通す。確認：テストが通り、一時フォルダのファイルに1行ずつ書かれる（ファイル：`src/main/log/call-log.ts`、`jsonl-call-log.ts`、`call-log.test.ts`）
- [ ] 6.5 【TDD】FC-17・FC-18：本文・件名・送信者に目印の文字列を入れた偽データで、成功と検証失敗の1回分を回し、ログの全文に目印がないテストを書いて通す。確認：テストが通る（関数：`runFetchCycle`、`JsonlCallLog.append`）

## 7. スケジューラ

- [ ] 7.1 【TDD】FC-01・FC-02：Vitest の偽タイマーで、起動時に1回・間隔ごとに `runCycle` が呼ばれるテストを書き、`startScheduler` を実装して通す。確認：テストが通る（ファイル：`src/main/fetch/scheduler.ts`、`scheduler.test.ts`）
- [ ] 7.2 【TDD】FC-03・FC-04：終わらない `runCycle` で次の間隔を迎えるテスト（見送りが記録される）と、終わったあとは実行されるテストを書いて実装する。確認：テストが通る（関数：`startScheduler`）
- [ ] 7.3 【TDD】FC-14：失敗した回の次の回が、同じカーソルから取得するテストを書いて通す（スケジューラ＋`runFetchCycle`＋受信箱の組み合わせ）。確認：テストが通る

## 8. 画面への反映（quill-status のクイルの表示）

- [ ] 8.1 【TDD】QS-07・QS-08・QS-09：受け取った値と今の状態から次の表示状態を決める `resolveDisplayState(current, incoming)` のテストを書いて実装する。確認：テストが通る（ファイル：`src/renderer/display-state.ts`、`display-state.test.ts`）
- [ ] 8.2 【TDD】preload：`exposeQuillApi(contextBridge, ipcRenderer)` が `quill.onStatus(callback)` だけを公開し、`quill:status` の通知を callback に渡すテストを、偽の `contextBridge` と `ipcRenderer` で書いて実装する。確認：テストが通る（ファイル：`src/preload/quill-api.ts`、`quill-api.test.ts`、`src/preload/index.ts`）
- [ ] 8.3 【TDD】renderer：`bindQuillImage(onStatus, img)` が通知を受けて画像の `src` を変え、知らない値では変えないテストを、偽の `onStatus` と画像の代わりのオブジェクトで書いて実装する。仮のボタンと関連する HTML・CSS を外す。確認：テストと既存の `quill-assets.test.ts` が通る（ファイル：`src/renderer/bind-quill-image.ts`、`bind-quill-image.test.ts`、`src/renderer/index.ts`、`index.html`、`style.css`）
- [ ] 8.4 【TDD】main の状態の送信：`createStatusForwarder(webContents)` が状態を `quill:status` で送り、読み込み完了の前に来た状態は完了時に最新の1つだけを送るテストを、偽の `webContents` で書いて実装する。確認：テストが通る（ファイル：`src/main/status/status-forwarder.ts`、`status-forwarder.test.ts`）
- [ ] 8.5 【TDD】main の組み立て：`createFetchApp({ userDataDir, runner, now, timers, forward })` が DB・ログ・`GmailSource`・スケジューラを組み立て、`stop()` でタイマーと DB を閉じるテストを、偽の runner と一時フォルダで書いて実装する。確認：テストが通り、一時フォルダに `quill.db` と `logs/` ができる（ファイル：`src/main/app/create-fetch-app.ts`、`create-fetch-app.test.ts`）
- [ ] 8.6 `src/main/index.ts` に、Electron の `app`・`BrowserWindow` と 8.4・8.5 をつなぐ数行だけを書く。**ここだけはテストのない本番コードの例外**（Electron 本体が必要で、単体テストでは動かせない）とし、9.2 の実行確認で代える。確認：`pnpm run typecheck` が通る（ファイル：`src/main/index.ts`）

## 9. 結合確認

- [ ] 9.1 `pnpm test` と `pnpm run typecheck` がすべて通ることを確認する
- [ ] 9.2 本物の Gmail で `pnpm run dev` を1回動かし、次を確認する。結果は本文を残さずに `docs/spike/` か変更提案のメモに書く
  - クイルが `fetching` → `idle` と変わる
  - `userData` の `quill.db` に保存された件数と、`logs/calls.jsonl` の記録
  - ログに決まった項目以外がない
  - `~/.claude/projects/` に、この実行の会話記録（`.jsonl`）が増えていない
  - 件数の多い検索で、続きのページの印の項目名を確かめる（OQ1）。違っていたら 5.6 の判定を直す

## Workflow follow-up

- 作者のレビューと承認を受けてから実装（apply）に入る
- 実装が終わったらアーカイブし、差分を `openspec/specs/` に反映する
