# おうちのAI相談室

家族間の家の相続についての問題解決をサポートするAIアドバイザーアプリケーションです。

## プロジェクト構成

このプロジェクトは以下の2つの主要コンポーネントで構成されています：

- **Backend**: FastAPI製のREST APIサーバー
- **Frontend**: Next.js製のWebアプリケーション

## 立ち上げ方法（Docker Compose）

Docker Composeを使うと、バックエンドとフロントエンドを一度に簡単に起動できます。

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
# 事前に配布したファイルを.envとして設定してください
```

3. Docker Composeで起動
```bash
cd ..  # プロジェクトのルートディレクトリに戻る
docker-compose up
```
（バックエンドは http://localhost:8000、 フロントエンドは http://localhost:3000 で起動します。)

4. http://localhost:3000 にアクセス
トップ画面が表示されたらOK



> **注意**: フロントエンドのコードには一部ESLintエラーがありますが、開発環境では問題なく動作します。本番環境にデプロイする前に修正することをお勧めします。

## 個別環境での立ち上げ方法

### 必要条件

- Node.js (v18以上)とnpm（フロントエンド開発用）
- Python 3.11（バックエンド開発用）
- pipenv (Pythonパッケージ管理用)

### 前提ソフトウェアのインストール

#### Node.jsのインストール

Node.jsがインストールされていない場合は、[Node.js公式サイト](https://nodejs.org/)からインストーラーをダウンロードしてインストールしてください。

```bash
# バージョン確認
node -v
npm -v
```

#### Pythonとpipenvのインストール

1. [Python公式サイト](https://www.python.org/downloads/)からPython 3.11をインストール
2. pipenvのインストール:

```bash
# pipenvのインストール
pip install pipenv

# バージョン確認
pipenv --version
```

### バックエンド環境構築

```bash
cd backend

# 環境変数ファイルの準備
# ※ 事前に配布したファイルを設定してください

# 必要に応じて.envファイルを編集して環境設定を行う
# 特にAPI_MODE、GOOGLE_APPLICATION_CREDENTIALS、GEMINI_API_KEYなどの設定を確認

# pipenvで仮想環境と依存パッケージをインストール
pipenv install

# 開発サーバーの起動
pipenv run dev
```

バックエンドサーバーは http://localhost:8000 で実行されます。

#### 重要: API認証情報の設定

- Google Cloud Speech APIとGemini APIを利用するには、適切な認証情報が必要です
- `.env`ファイル内の`GOOGLE_APPLICATION_CREDENTIALS`と`GEMINI_API_KEY`を設定してください

### フロントエンド環境構築

```bash
cd frontend

# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

フロントエンドアプリケーションは http://localhost:3000 で実行されます。

## APIエンドポイント

バックエンドは以下の主要なAPIエンドポイントを提供します：

- `/api/speech` - 音声処理関連
- `/api/analysis` - 感情分析、論点抽出関連
- `/api/proposals` - AI提案生成関連

詳細なAPIドキュメントは http://localhost:8000/docs で確認できます。

## トラブルシューティング

### Docker関連

- **Dockerが起動しない**: Dockerデーモンが実行されているか確認してください
- **ポートがすでに使用されている**: 8000番や3000番ポートが他のアプリケーションで使用されていないか確認してください
- **Volumeマウントエラー**: Dockerの共有設定を確認してください

### ローカル環境

- **pipenvコマンドが見つからない**: `pip install pipenv`でpipenvをインストールしてください
- **Node.jsのバージョンエラー**: `nvm`や`n`などのバージョン管理ツールを使用してNode.jsのバージョンを切り替えてください
- **APIキーの設定エラー**: `.env`ファイル内の認証情報が正しく設定されているか確認してください
- **APIアクセスエラー**: CORSの設定が正しいか確認してください

## 開発者向け情報

- バックエンド開発: `backend/app` ディレクトリ内にコードがあります
- フロントエンド開発: `frontend/app` ディレクトリ内にコードがあります
- 環境変数設定: バックエンドの設定は `backend/.env` ファイルで行います

