import os
import logging
import traceback
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Cloud SQL Auth Proxy用
from google.cloud.sql.connector import Connector
import pg8000

def get_engine():
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME = os.getenv("DB_NAME", "houseai")
    INSTANCE_CONNECTION_NAME = os.getenv("INSTANCE_CONNECTION_NAME", None)

    logging.info(f"DB接続設定: DB_HOST={DB_HOST}, DB_USER={DB_USER}, DB_NAME={DB_NAME}, INSTANCE_CONNECTION_NAME={INSTANCE_CONNECTION_NAME}")
    print(f"DB接続設定: DB_HOST={DB_HOST}, DB_USER={DB_USER}, DB_NAME={DB_NAME}, INSTANCE_CONNECTION_NAME={INSTANCE_CONNECTION_NAME}")

    try:
        # Cloud SQL Auth Proxy経由（Cloud Run環境）
        if DB_HOST.startswith("/cloudsql/") or INSTANCE_CONNECTION_NAME:
            def getconn():
                connector = Connector()
                logging.info("Cloud SQL Auth Proxy経由でDB接続を試みます")
                print("Cloud SQL Auth Proxy経由でDB接続を試みます")
                conn = connector.connect(
                    INSTANCE_CONNECTION_NAME or DB_HOST.replace("/cloudsql/", ""),
                    "pg8000",
                    user=DB_USER,
                    password=DB_PASSWORD,
                    db=DB_NAME
                )
                logging.info("Cloud SQL Auth Proxy経由でDB接続成功")
                print("Cloud SQL Auth Proxy経由でDB接続成功")
                return conn
            engine = create_engine(
                "postgresql+pg8000://",
                creator=getconn,
            )
        else:
            # ローカルや通常のTCP接続
            DB_PORT = os.getenv("DB_PORT", "5433")
            DATABASE_URL = f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
            logging.info(f"ローカル/TCPでDB接続を試みます: {DATABASE_URL}")
            print(f"ローカル/TCPでDB接続を試みます: {DATABASE_URL}")
            engine = create_engine(DATABASE_URL)
        logging.info("DBエンジン作成成功")
        print("DBエンジン作成成功")
        return engine
    except Exception as e:
        logging.error(f"DBエンジン作成失敗: {e}")
        logging.error(traceback.format_exc())
        print(f"DBエンジン作成失敗: {e}")
        print(traceback.format_exc())
        raise

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_database_url():
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME = os.getenv("DB_NAME", "houseai")
    DB_PORT = os.getenv("DB_PORT", "5432")
    # Unixソケットの場合
    if DB_HOST.startswith("/"):
        # pg8000用: unix_sockパラメータでソケットファイルを指定
        return f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@/{DB_NAME}?unix_sock={DB_HOST}/.s.PGSQL.{DB_PORT}"
    else:
        return f"postgresql+pg8000://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    