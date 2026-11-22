# CLAUDE.md — QUILL

このファイルは、このリポジトリで作業する Claude Code への常設の指示です。作業を始める前に必ず読んでください。

## プロジェクト概要

QUILL は、Gmail と Slack の通知を見張り、**人の確認が必要なものだけ**を ToDo として積むデスクトップ常駐エージェントです。
画面の隅には秘書鳥（ヘビクイワシ）の「クイル」が常駐し、エージェントの状態を表情と冠羽の向きで知らせます。

- 利用者は1人（作者自身）。チーム配布は当面考えない
- Mac と Windows の両方で動くこと（Linux は動けば尚可）
- 取得元は Gmail と Slack の2つ。届く連絡の中身はそれぞれ違う。**まず Gmail から実装し、Slack は2つ目の取得元として後から足す**
- まずは **読み取り専用**。返信や投稿などの書き込みは、明示的な変更提案が承認されるまで実装しない

## アーキテクチャ（決定事項）

```
[Electron main プロセス = オーケストレーター]
   │ 一定間隔（初期値 30分）
   ├─ ① 取得   : 取得元ごとの MessageSource（Gmail / Slack）。中身は claude -p（Haiku）。
   │            その取得元の読み取りツールだけ許可し、--output-format stream-json で動かす。
   │            メッセージは、モデルの最終出力ではなく、ツールの返り値（tool_result）をコードでパースして得る
   │            （モデルに書き写させると本文が欠けたり言い換えられたりする。docs/spike/1a-gmail.md）。
   │            時刻の絞り込みもコードで行う（検索は日付単位で広めにかけ、受信時刻で絞る）
   ├─ ② 受信箱 : SQLite に保存。(source, external_id) で一意。カーソル（前回時刻）は取得元ごとに保持
   │            新着がなければここで終了（③は呼ばない）
   ├─ ③ 仕分け : claude -p（ツールなし）。その取得元のルールファイル＋新着だけを渡し todo / ignore / unsure を JSON で返させる
   │            ルールファイルは取得元ごとに分ける（Gmail と Slack で届く中身が違うため）
   └─ ④ 出力   : todos テーブルに積む → renderer のクイルと一覧に反映
[Electron renderer = クイル]  透明・枠なし・最前面ウィンドウ。キャラ以外はクリック透過
```

### 原則

1. **決定的にできることはコードでやる。** スケジュール、時刻カーソル、重複除外、保存、件数上限はすべて通常のコード。Claude に任せるのは「Gmail / Slack を読む手（①）」と「関係あるかの判断（③）」だけ。
2. **Claude の呼び出しは最小限。** 組織の利用は従量課金。新着がない回は③を呼ばない。①も間隔を短くしすぎない。呼び出し回数とトークンはログに残す。
3. **狼少年にしない。** 「タスク」の定義、タスクの例・タスクでない例、1日の上限件数をルールファイルに書き、それに従わせる。迷うものは `unsure` に分け、todo に混ぜない。
4. **Claude の出力は信用しすぎない。** ①②③の JSON は必ずスキーマ検証する。①では、ツールの返り値が想定どおりの形かを検証する。件数が落ちる可能性を前提に、`source` と `external_id` は必須にする（Slack は `channel_id` と `ts` の組、Gmail はメッセージ ID）。検証に失敗したら、エラー状態にして記録する。
5. **コンテキストは会話に持たせない。** 状態は SQLite とルールファイルに置き、毎回そこから読み込む。

## 技術スタック

- Electron + TypeScript（main / preload / renderer を分離。`contextIsolation: true`、`nodeIntegration: false`）
- SQLite：`better-sqlite3`。ビルド済みバイナリ（Node-API）を使うので、Electron 向けの作り直し（`@electron/rebuild`）は不要。pnpm では `pnpm-workspace.yaml` の `allowBuilds` に `better-sqlite3: false` を書く。Windows は確認済み、Mac は採用前に確認する（`docs/spike/1b-sqlite.md`）
- パッケージマネージャー：pnpm（npm / yarn は使わない）
- テスト：Vitest
- スキーマ検証：zod
- 仕様管理：OpenSpec

## 開発プロセス（必ず守る）

このプロジェクトは **OpenSpec × TDD × XDDP** の組み合わせで進めます。

### OpenSpec

- 機能の追加・変更は、必ず `openspec/changes/<変更名>/` の変更提案から始める
- 提案（proposal）・設計（design）・タスク（tasks）・仕様の差分（ADDED / MODIFIED / REMOVED と Scenario）を書いたら、**実装に入る前に人のレビューを待つ**
- 実装が終わったらアーカイブし、差分を `openspec/specs/` に反映する

### TDD

- tasks.md の各タスクは「Scenario X の失敗するテストを書く → 最小の実装で通す → リファクタ」の順で書く
- **失敗するテストがない状態で本番コードを書かない**
- テストは Scenario と1対1で対応させ、テスト名に Scenario 名を含める
- Claude CLI の呼び出しは、境界（`ClaudeRunner` のようなインターフェース）で差し替えられるようにし、単体テストでは本物を呼ばない

### XDDP（派生開発の考え方）

- **スペックアウト**：既存コードを変更する提案では、提案を書く前に影響範囲を調べ、design.md に「変更前の振る舞い」と「影響箇所」を書く
- **トレーサビリティ**：tasks.md は「要求/Scenario ID × 変更するファイル・関数」が分かる形で書く
- 変更要求は「何を変えたいか（要求）」と「どう振る舞うべきか（仕様）」を分けて書く

### 進め方の約束

- 変更は小さく。1つの変更提案は1〜2日で終わる大きさにする
- 迷ったら作業を止めて質問する。推測で仕様を足さない
- 作業の区切りでは `pnpm test` と型チェック（`pnpm run typecheck`）が通る状態にする

## マルチ OS の注意

- パスは必ず `path` / `os` / `app.getPath()` で組み立てる。`/` や `\` を直書きしない
- Claude CLI は `child_process.spawn` で起動する。Windows ではグローバルコマンドが `claude.cmd` になる点に注意し、起動処理は1か所にまとめる
- シェル固有の構文（パイプ、`&&`、環境変数の書き方）に依存しない
- スケジュールは OS のスケジューラ（cron / launchd / タスクスケジューラ）を使わず、アプリ内のタイマーで行う。OS に頼るのは「ログイン時に起動」だけ

## セキュリティとデータ

- メッセージ本文（Gmail・Slack とも）は会社や個人の情報。**リポジトリ内に保存しない。** DB・ログは `app.getPath('userData')` 配下に置く
- ログにはメッセージ本文を出さない（件数、ID、所要時間、呼び出し回数のみ）
- `claude -p` に渡す許可ツールは **ホワイトリスト**（`--allowedTools`）で明示する。書き込み系のツールは許可しない（Slack の送信・投稿・リアクション、Gmail の送信・下書き作成・ラベル変更・既読化・削除など）
- `claude -p` には必ず `--no-session-persistence` を付ける（付けないと、ツールの返り値に含まれる本文が `~/.claude/projects/` に保存され、`userData` の外に残る）
- `--dangerously-skip-permissions` は使わない
- トークンや認証情報をコード・設定ファイル・テストデータに書かない

## クイル（キャラクター）

状態と素材の対応は次のとおり。素材は `assets/states/` にある。

| 状態 | ファイル | いつ |
|---|---|---|
| idle | quill-idle.svg | 新着なし・待機中 |
| fetching | quill-fetching.svg | ①取得中 |
| triaging | quill-triaging.svg | ③仕分け中 |
| todo | quill-todo.svg | 未処理の ToDo がある（件数を表示） |
| unsure | quill-unsure.svg | 判断がつかないものがある（クリックで確認画面） |
| error | quill-error.svg | 取得・検証・仕分けのいずれかに失敗 |

- 知らせ方は静かに。ToDo が増えても大きく動かさない
- 状態の決定ロジックは main 側の純粋関数にして、テストで固める

## ディレクトリ構成（予定）

```
quill/
├── CLAUDE.md
├── README.md
├── docs/            README 用画像、スパイクの記録
├── assets/states/   クイルの状態別 SVG
├── openspec/        仕様（specs/）と変更提案（changes/）
├── rules/           仕分けルールのひな形。取得元ごとに分ける（実際のルールは userData 側に置く）
└── src/
    ├── main/        オーケストレーター、受信箱、Claude 呼び出し
    ├── preload/
    └── renderer/    クイルの表示
```

## コミュニケーション

- 作者とのやり取り、ドキュメント、OpenSpec の文章は日本語
- 識別子とコードコメントは英語
