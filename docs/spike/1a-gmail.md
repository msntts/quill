# スパイク 1-A：`claude -p` から Gmail を読めるか

- 実施日：2026-11-22
- 実施環境：Windows 11、Claude Code 2.1.302、モデル `claude-haiku-5-5`
- 取得元：claude.ai の Gmail コネクタ（`claude.ai Gmail`）
- Slack 版：未実施（この PC では Slack を確認できないため。KICKOFF.md の変更を参照）
- このファイルには、メッセージ本文・件名・送信者を残していない。記録したのは件数・形式・時間だけ。照合に使った生データと、`claude -p` が自動保存したこの実行のセッション記録（`~/.claude/projects/` の下）は、照合後に削除した。

## 1. Gmail のツール一覧

`claude -p` の初期化情報によると、`mcp__claude_ai_Gmail__` で始まるツールが30個あった。

### 読み取り系（許可してよいもの）

| ツール | 用途 | 主な引数 |
|---|---|---|
| `search_threads` | スレッドを検索する | `query`（Gmail の検索構文）、`pageSize`（初期値20・最大50）、`pageToken`、`view`、`includeTrash` |
| `get_thread` | スレッド内の全メッセージを取る | `threadId`（必須）、`messageFormat` |
| `get_message` | メッセージを1件取る | `messageId`（必須）、`messageFormat` |
| `list_labels` | ラベル一覧を取る | なし |
| `list_drafts` / `get_draft` | 下書きを読む | 今回は使わない |

引数の補足：

- `view`：`THREAD_VIEW_MINIMAL`（初期値。件名と冒頭の抜粋つき）、`THREAD_VIEW_METADATA_ONLY`、`THREAD_VIEW_IDS_ONLY`、`THREAD_VIEW_SUMMARY`
- `messageFormat`：`PLAIN_TEXT`（初期値。本文はテキストだけ）、`FULL_CONTENT`、`MINIMAL`、`METADATA_ONLY`、`get_message` のみ `RAW` もある
- メッセージに含まれる主な項目：`id`、`threadId`、`date`、`internalDate`（ミリ秒の UNIX 時刻）、`sender`、`toRecipients`、`ccRecipients`、`labelIds`、`subject`、`snippet`、`plaintextBody`、`viewUrl`

### 書き込み系（許可しないもの）

`send_message`、`reply`、`forward`、`create_draft`、`update_draft`、`delete_draft`、`label_message`、`label_thread`、`unlabel_message`、`unlabel_thread`、`update_message_labels`、`create_label`、`update_label`、`delete_label`、`trash_message`、`trash_thread`、`untrash_message`、`untrash_thread`、`mark_message_spam`、`mark_thread_spam`、`unmark_message_spam`、`unmark_thread_spam`、`apply_sensitive_message_label`、`apply_sensitive_thread_label`

### 時刻での絞り込みについて（ツールの説明より）

`search_threads` の説明には、`after:` と `before:` は **その日の0時（00:00:00）で評価する** と書かれている。日付単位の指定（`after:YYYY/MM/DD`）と、相対指定（`newer_than:2d`）が載っている。UNIX タイムスタンプを渡す書き方は載っていない。

### ツール一覧の取り方で分かったこと

- Gmail のツールは「必要になったら読み込む」方式（ToolSearch 経由）。
- `--disallowedTools` に入れたツールは、モデルからは**存在しないもの**として扱われる。
- 引数の定義は、ToolSearch で読み込ませたうえで、モデルに JSON で書き出させて取得した。つまり**モデルが書き写した内容**で、原文そのものではない。

## 2. ヘッドレス実行（1回）

### 実行条件

- `claude -p <依頼> --model haiku --output-format stream-json --verbose --max-turns 60`
- `--allowedTools`：`search_threads`、`get_thread`、`get_message` だけ
- `--disallowedTools`：書き込み系の24個すべて（モデルから見えなくする）
- 依頼の内容：
  1. `search_threads` を `in:inbox after:<24時間前の UNIX 秒>` で呼ぶ
  2. 見つかったスレッドを `get_thread`（`PLAIN_TEXT`）で読む
  3. 各メッセージの `external_id`・`thread_id`・`from`・`subject`・`date`・`body` を、言い換えずに JSON 配列で返す
- `--output-format` は `json` ではなく `stream-json` にした。ツールが返した生データも記録し、モデルの出力と機械的に照合するため。

### 結果

| 確認項目 | 結果 |
|---|---|
| Gmail のツールが呼べたか | **呼べた**（`search_threads` 3回、`get_thread` 9回） |
| 書き込み系が呼ばれたか | 呼ばれていない |
| `after:<UNIX 秒>` で時刻単位に絞れたか | **絞れなかった**。結果は0件（`{}`）だった。ただし、その後 `in:inbox newer_than:2d` で見つかったスレッドには、24時間以内のメッセージが2件あった |
| 指示どおりに動いたか | **動かなかった**。0件を受けて、Haiku が自分の判断で `newer_than:2d` → `newer_than:3d` と検索し直した。`get_thread` も9回中7回を `METADATA_ONLY` で呼んでいた |
| 件数 | モデルが取得したスレッドの範囲では、24時間以内のメッセージ2件に対して出力も2件で一致した。ただし、受信箱全体に対して漏れがないか（`pageSize: 5` の検索もあった）と、2件が受信メールか（自分の送信 `SENT` ではないか）は未確認 |
| JSON をそのままパースできたか | **できた**（`[` で始まり `]` で終わり、コードフェンスなし） |
| `external_id`・`thread_id`・`subject`・`date` | 4項目とも、ツールの生データと完全に一致 |
| `from` | 2件とも**書き換わっていた**。生データの `sender` はメールアドレスだけなのに、出力は「表示名 <アドレス>」になっていた |
| `body` | 1件は完全一致。もう1件は**2文字が欠けていた**（620文字→618文字。ASCII 以外の2文字が消えていた。絵文字1つと思われる） |
| 所要時間 | 32.7秒（API 時間 29.5秒）、ターン数14 |
| トークン | 入力 16、キャッシュ作成 36,825、キャッシュ読み取り 298,285、出力 4,952 |
| 費用（CLI の表示） | 0.0128 USD |

モデルはすべて `claude-haiku-5-5` だった。

上の1回とは別に、ツール一覧と引数定義を取るために `claude -p` を3回呼んでいる。この3回は Gmail を読んでいない。

## 3. わかったこと

1. **Gmail は `claude -p` から読める。** 書き込み系を見えなくしたホワイトリストでも、取得まで通った。
2. **`after:` に UNIX 時刻を渡す絞り込みは、このコネクタでは使えないと考えるべき。** ツールの説明も日付単位だけで、実際に0件が返った（1回だけの観測）。
3. **モデルに本文を書き写させると、少しだが壊れる。** 件数は合っていた。それでも、送信者の書き換えと文字の欠落が1回の実行で両方起きた。原則4「Claude の出力は信用しすぎない」が、実際に当てはまった。
4. **Haiku は、うまくいかないと検索条件を勝手に変える。** 今回は結果が正しかったが、毎回同じ手順で動く保証はない。
5. **`stream-json` なら、ツールの生データ（JSON）がそのまま手に入る。** ID、`internalDate`、`plaintextBody` は、モデルの書き写しを通さずに取り出せる。
6. **`claude -p` は、既定で会話の記録を `~/.claude/projects/<作業フォルダ名>/` に保存する。** ツールの返り値もそのまま入るので、**メール本文がアプリの管理外に残る。** `--no-session-persistence`（`-p` 専用）で保存を止められることを `claude --help` で確認した（実際に付けて動かすのは未確認）。

## 4. 設計への影響（提案。CLAUDE.md はまだ変えていない）

### 案：①の結果は「モデルの出力」ではなく「ツールの生データ」から取る

- `claude -p` を `stream-json` で動かし、`get_thread` の tool_result の JSON をコード側でパースして受信箱に入れる。
- モデルに任せるのは「どのツールを、どの順で呼ぶか」だけにする。
- 書き写しによる欠落・言い換えがなくなる。スキーマ検証の対象も、ツールの生データになる。
- 最終出力は、取ったスレッド ID の一覧などの確認用にとどめる。

### 必須：`claude -p` には `--no-session-persistence` を付ける

- CLAUDE.md の「セキュリティとデータ」では、本文は `userData` の外に置かないことになっている。
- 30分ごとに呼ぶと、付けない限り Gmail と Slack の本文が `~/.claude/projects/` に溜まり続ける。
- 起動処理を1か所にまとめる方針なので、そこで必ず付ける。テストで固める。

### 必須：自分が送ったメールを除く

- `get_thread` はスレッド内の全メッセージを返すので、自分の返信（`labelIds` に `SENT`）も入る。
- 受信箱に入れる前に、`labelIds` を見てコードで除く。

### 案：時刻の絞り込みはコード側でやる

- 検索は日付単位にする（例：カーソルの日付の1日前から `after:YYYY/MM/DD`）。日付の境界がどのタイムゾーンかは未確認なので、1日余分に取る。
- `internalDate` がカーソル（から重ね時間を引いた時刻）より新しいものだけを、コードで残す。
- 重複は `(source, external_id)` の一意制約で除く。これは、変更提案のカーソルと重ね取りの Scenario と、そのまま合う。

### 別案（参考）：Gmail API をコードから直接呼ぶ

- ①に Claude を使わないので、完全に決定的で、呼び出しの費用もかからない。
- ただし、Google Cloud で OAuth クライアントを作り、トークンを安全に保管する仕組みが必要になる。
- CLAUDE.md の「①は claude -p」という決定から外れるので、採用するなら作者の判断が要る。

## 5. 未確認

- 受信箱全体に対する網羅性（モデルが取らなかったスレッドに、対象のメールがなかったか）
- `--no-session-persistence` を付けたときに、本当に記録が残らないか
- 実行1回だけの結果なので、毎回同じになるかは分からない（特に4の検索のやり直し）
- `after:YYYY/MM/DD` の日付の境界がどのタイムゾーンか
- メールが多い日の挙動（ページ送り、50件を超える場合）
- Mac での実行
- Slack 版
