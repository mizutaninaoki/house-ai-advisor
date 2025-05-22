#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
DBのデータをリセットするスクリプト
- すべてのテーブルを削除
- テーブルを再作成
"""

import os
import contextlib
from sqlalchemy import MetaData, create_engine
from app.db.session import Base, engine
from app.db.models import User, Project, Conversation, Analysis, Proposal

# データベース接続情報
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5433")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "houseai")


def reset_database():
    """データベースをリセットする関数"""
    print("データベースをリセットします...")
    
    # データベース接続エンジンを作成
    db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(db_url, pool_pre_ping=True, echo=True)
    
    # メタデータを取得
    meta = MetaData()
    
    # 接続を確立してトランザクションを開始
    with contextlib.closing(engine.connect()) as con:
        trans = con.begin()
        
        try:
            # 既存のテーブルの情報を取得
            meta.reflect(bind=engine)
            
            # テーブルを削除（外部キー制約に注意してリバース順に削除）
            print("テーブルを削除中...")
            for table in reversed(meta.sorted_tables):
                print(f"削除: {table.name}")
                con.execute(table.delete())
            
            # トランザクションをコミット
            trans.commit()
            print("テーブルのデータがリセットされました。")
        
        except Exception as e:
            # エラーが発生した場合はロールバック
            trans.rollback()
            print(f"エラーが発生しました: {e}")
            raise


def recreate_tables():
    """テーブルを再作成する関数"""
    print("テーブルを再作成します...")
    
    try:
        # 既存のテーブルをすべて削除
        Base.metadata.drop_all(bind=engine)
        print("既存のテーブルを削除しました。")
        
        # テーブルを新規作成
        Base.metadata.create_all(bind=engine)
        print("テーブルを再作成しました。")
        
        return True
    
    except Exception as e:
        print(f"テーブル再作成中にエラーが発生しました: {e}")
        return False


if __name__ == "__main__":
    # データをリセット
    reset_database()
    
    # テーブルを再作成
    recreate_tables()
    
    print("データベースのリセットが完了しました。")
