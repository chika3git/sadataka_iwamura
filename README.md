# 概要

- 目的: 
- ステータス: draft
- 担当: 

# 使い方

## セットアップ
- Python: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt`
- Node.js: `npm i`（必要な場合）

## 実行方法
- 例: `python 4_code/P1_prepare.py --config 1_config/settings.yaml`

## Notion（資料DB）同期 → Web表示
`5_output/web/index.html` は静的HTMLなので、ブラウザから直接Notion APIを叩くのは（トークン露出のため）避け、同期時に `notion_documents.json` を生成して読み込む方式にしています。

1) Notion側
- NotionでIntegrationを作成し、資料DB（データベース）をそのIntegrationに共有する

2) ローカル設定
- `1_config/notion.env.example` を参考に、環境変数を設定（例: `cp 1_config/notion.env.example 1_config/notion.env`）

3) 同期（JSON生成）
- 例:
  - `set -a && source 1_config/notion.env && set +a`
  - `python 4_code/notion_sync.py`

4) Web側
- `5_output/web/index.html` は `5_output/web/data/notion_documents.json` があればそれを、なければ `notion_documents.sample.json` を読み込みます。
- ローカルプレビュー例: `cd 5_output/web && python3 -m http.server 8000` → `http://localhost:8000`

注意:
- Notionの「ファイル」プロパティのURLは期限付きです（長期公開したい画像は別ホスティング/リポジトリ管理にするか、同期時にダウンロードして差し替える設計が必要です）。

# ディレクトリ構造（2025-11 整理）
- 0_task/                # タスク・やりたいこと・出典ポリシー
- 1_config/              # 設定・秘密（.env など）
- 2_input/               # 入力・生データ
  - seed_urls.txt        # 収集用のURL種
  - raw/                 # 外部サイトのスナップショット（HTML/CSV など）
- 3_docs/                # 調査結果・整形ドキュメント
  - extracted/           # 出典ごとの抜き書き（非要約・原文ベース、出典併記）
  - timelines/           # 年譜（人物／家）※各行末に出典を併記
  - sources.md           # 取得ソース一覧（タイトル／URL／保存先／サイズ）
- 4_code/                # 実行コード
- 5_output/              # 成果物・中間・ログ
  - deliverables/        # 共有・納品（必要に応じて作成）
  - derived/             # 中間（定期的に掃除）
  - logs/                # 実行ログ
    - screenshots/       # スクショ
  - archive/             # 過去成果

備考:
- 旧 `1_research/` は廃止。今後は新規ファイルを追加しない。
- 「入力（2_input）」は生データのみ。整形・抜粋は「3_docs」に配置。

# 作業履歴
## 2025-11-16 00:32
- 初期スキャフォールド作成（startup_project.py）

# やること
- [ ] 最初のタスクをここに追加
