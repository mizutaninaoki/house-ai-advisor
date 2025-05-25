# おうちのAI相談室

家族間の家の相続についての問題解決をサポートするAIアドバイザーアプリケーションです。

## プロジェクト構成

このプロジェクトは以下の2つの主要コンポーネントで構成されています：

- **Backend**: FastAPI製のREST APIサーバー
- **Frontend**: Next.js製のWebアプリケーション

## 立ち上げ方法（Docker Compose推奨・マイグレーション自動実行対応）

Docker Composeを使うと、**バックエンド（マイグレーション自動実行）・フロントエンド・DB**を一度に簡単に起動できます。

### 必要条件
- Docker
- Docker Compose

### 手順

1. リポジトリのクローン
```bash
git clone https://github.com/yourusername/house-ai-advisor.git
cd house-ai-advisor
```

2. 環境変数の設定
```bash
cd backend
# 事前に配布したenvファイルを.envとして配置してください
cd ..

cd frontend
# 事前に配布したenv.localファイルを.env.localとして配置してください
cd ..
```

3. Docker Composeで一発起動（マイグレーション自動実行）
```bash
docker compose up
```
- バックエンド（FastAPI）は http://localhost:8000
- フロントエンド（Next.js）は http://localhost:3000

4. http://localhost:3000 にアクセス
トップ画面が表示されたらOKです。

> **注意**: 初回起動時はDBマイグレーション（alembic upgrade head）が自動で実行されます。他の開発者もマイグレーションを意識せず立ち上げ可能です。

## 個別環境での立ち上げ方法（開発用）

### 必要条件
- Node.js (v18以上)とnpm（フロントエンド開発用）
- Python 3.11（バックエンド開発用）
- pipenv (Pythonパッケージ管理用)

### バックエンド
```bash
cd backend
pipenv install
# .envファイルを配置
alembic upgrade head  # マイグレーション適用
pipenv run dev        # 開発サーバー起動
```

### フロントエンド
```bash
cd frontend
npm install
npm run dev
```

## APIエンドポイント

バックエンドは以下の主要なAPIエンドポイントを提供します：

- `/api/speech` - 音声処理関連
- `/api/analysis` - 感情分析、論点抽出関連
- `/api/proposals` - AI提案生成関連
- `/api/projects` - プロジェクト管理
- `/api/issues` - 論点管理
- `/api/agreements` - 協議書管理
- `/api/signatures` - 署名管理

詳細なAPIドキュメントは http://localhost:8000/docs で確認できます。

## トラブルシューティング

- **Dockerが起動しない**: Dockerデーモンが実行されているか確認してください
- **ポート競合**: 8000番や3000番ポートが他のアプリケーションで使用されていないか確認してください
- **pipenvコマンドが見つからない**: `pip install pipenv`でpipenvをインストールしてください
- **APIキーの設定エラー**: `.env`ファイル内の認証情報が正しく設定されているか確認してください

## 開発者向け情報

- バックエンド開発: `backend/app` ディレクトリ内にコードがあります
- フロントエンド開発: `frontend/app` ディレクトリ内にコードがあります
- 環境変数設定: バックエンドの設定は `backend/.env` ファイルで行います

