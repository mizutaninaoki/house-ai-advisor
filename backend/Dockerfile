FROM python:3.11-slim

WORKDIR /app

# pipenvのインストール
RUN pip install --no-cache-dir pipenv

# Pipfile.lockとPipfileをコピー
COPY Pipfile Pipfile.lock ./

# pipenv経由で依存関係をインストール（システムにインストールして仮想環境を使わない）
RUN pipenv install --system --deploy --ignore-pipfile

COPY . .

# 開発モードで実行（ホットリロード有効）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 
