FROM node:20-slim

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json package-lock.json ./

# パッケージをインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# 本番用の環境変数ファイルをコピー
# firebaseのキーがないとdockerのビルドができないため、あえて入れるようにしている
COPY .env.production .env

# 本番環境で実行するためにビルド
RUN npm run build

# 本番環境では、Cloud Runで実行。
# next start（npm run start）はPORT環境変数を自動で参照し、Cloud Runの仕様（PORT=8080）に対応。
# 開発モード（npm run dev）はホットリロードやデバッグ用のためdocker-composeで実行。
CMD ["npm", "run", "start"]