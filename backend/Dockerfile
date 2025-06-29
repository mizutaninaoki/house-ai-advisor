FROM python:3.11-slim

WORKDIR /app

# 必要なパッケージをインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 開発モードで実行（ホットリロード有効）
# "--port", "${PORT}"のように書くと、Cloud Runでシェルを介さないため、${PORT}が展開されないため下記のように記載
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
