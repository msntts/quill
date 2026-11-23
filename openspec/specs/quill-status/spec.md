# quill-status Specification

## Purpose

エージェントが今何をしているかを1つの状態にまとめ、画面のクイルの表示に反映する。この変更では取得に関わる `idle` / `fetching` / `error` を扱い、`triaging` / `todo` / `unsure` は後の変更で足す。

## Requirements

### Requirement: 取得中の状態

システムは、取得を始めたときに、状態 `fetching` を renderer に通知する（SHALL）。

#### Scenario: 取得を始める
- **WHEN** 取得を始める
- **THEN** renderer に `fetching` が通知される

### Requirement: 失敗時の状態

システムは、取得・検証・保存のいずれかが失敗したときに、状態 `error` を renderer に通知する（SHALL）。`error` は、次の取得が成功するまで続く。

#### Scenario: 取得が失敗する
- **WHEN** 取得・検証・保存のいずれかが失敗する
- **THEN** renderer に `error` が通知される

#### Scenario: 失敗のあとの取得中
- **WHEN** 状態が `error` のときに、次の取得を始める
- **THEN** renderer に `fetching` が通知される

### Requirement: 成功時の状態

システムは、取得と保存が成功したときに、状態 `idle` を renderer に通知する（SHALL）。新しく保存したメッセージがあっても、この変更では `idle` とする（仕分けと ToDo はまだないため）。

#### Scenario: 成功して新着なし
- **WHEN** 取得が成功し、新しく保存したメッセージが0件である
- **THEN** renderer に `idle` が通知される

#### Scenario: 成功して新着あり
- **WHEN** 取得が成功し、新しく保存したメッセージが1件以上ある
- **THEN** renderer に `idle` が通知される

#### Scenario: 失敗のあとに成功する
- **WHEN** 状態が `error` のあとで、取得が成功する
- **THEN** renderer に `idle` が通知される

### Requirement: クイルの表示

renderer は、通知された状態に対応するクイルの画像を表示する（SHALL）。知らない状態名が届いたときは、表示を変えない。

#### Scenario: 状態に対応する画像を表示する
- **WHEN** renderer に `idle` / `fetching` / `error` のいずれかが通知される
- **THEN** その状態に対応する画像（`quill-<状態>.svg`）が表示される

#### Scenario: 知らない状態名は無視する
- **WHEN** renderer に、決められた6つ以外の状態名が届く
- **THEN** 表示は直前のまま変わらない

#### Scenario: 起動直後
- **WHEN** アプリが起動し、まだ状態が通知されていない
- **THEN** `idle` の画像が表示される
