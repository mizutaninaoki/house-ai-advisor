FROM node:20-slim

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json package-lock.json ./

# パッケージをインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# 開発モードで実行
CMD ["npm", "run", "dev"] 
