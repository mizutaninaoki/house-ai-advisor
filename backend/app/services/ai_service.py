import json
from typing import List, Dict, Any, Optional
import re
from collections import Counter

# 論点タイプを日本語のテキストに変換するヘルパー関数
def issue_type_text(issue_type: str) -> str:
    if issue_type == "positive":
        return "積極的な意見"
    elif issue_type == "negative":
        return "消極的な意見"
    elif issue_type == "requirement":
        return "要望"
    else:
        return "議論"

# 論点抽出関数
async def extract_issues_from_conversations(conversations: List[Any]) -> List[Dict[str, Any]]:
    """
    会話データから論点を抽出し、合意度を計算する
    
    Args:
        conversations: 会話データのリスト
        
    Returns:
        抽出された論点のリスト
    """
    # 実際の実装ではOpenAIなどのAI APIを使うべきですが、
    # ここではルールベースで疑似的に実装します
    
    # 会話テキストを取得（transcriptからcontentに変更）
    conversation_texts = [conv.content for conv in conversations]
    total_text = " ".join(conversation_texts)
    
    # スピーカー情報を収集（誰が何を言ったか）
    speaker_messages: Dict[str, List[str]] = {}
    for conv in conversations:
        speaker = conv.speaker or "不明"
        if speaker not in speaker_messages:
            speaker_messages[speaker] = []
        speaker_messages[speaker].append(conv.content)  # transcriptからcontentに変更
    
    # 論点の種類ごとのキーワードを定義
    positive_keywords = ["賛成", "同意", "良い", "いい", "好き", "メリット", "賛同", "住み続け"]
    negative_keywords = ["反対", "同意できない", "悪い", "嫌い", "デメリット", "心配", "不安", "売却"]
    requirement_keywords = ["必要", "要望", "してほしい", "すべき", "べき", "保存", "残す", "思い出"]
    
    # 抽出された論点リスト
    extracted_issues: List[Dict[str, Any]] = []
    
    # 会話から相続に関する主要なトピックを抽出
    inheritance_topics = [
        {"keyword": "実家", "related": ["家", "土地", "不動産", "住む", "住居", "建物"]},
        {"keyword": "預金", "related": ["貯金", "現金", "口座", "お金", "資産"]},
        {"keyword": "遺言", "related": ["遺書", "意思", "希望", "要望"]},
        {"keyword": "分割", "related": ["分ける", "分配", "割合", "配分", "配る"]},
        {"keyword": "税金", "related": ["相続税", "納税", "税務", "固定資産税"]},
    ]
    
    # 各トピックについて論点を抽出
    for topic in inheritance_topics:
        main_keyword = topic["keyword"]
        related_keywords = topic["related"]
        
        # このトピックに関連する発言があるか確認
        topic_mentioned = main_keyword in total_text
        if not topic_mentioned:
            for related in related_keywords:
                if related in total_text:
                    topic_mentioned = True
                    break
        
        if topic_mentioned:
            # トピックに関する意見を集計
            opinions = {"positive": 0, "negative": 0, "requirement": 0}
            
            # 各話者の発言を分析
            for speaker, messages in speaker_messages.items():
                speaker_text = " ".join(messages)
                
                # メイントピックまたは関連キーワードを含む文を抽出
                topic_sentences = []
                for sentence in re.split(r'[。.!?！？]', speaker_text):
                    if main_keyword in sentence:
                        topic_sentences.append(sentence)
                    else:
                        for related in related_keywords:
                            if related in sentence:
                                topic_sentences.append(sentence)
                                break
                
                topic_text = " ".join(topic_sentences)
                
                # 各カテゴリのキーワード出現回数を数える
                positive_count = sum([1 for word in positive_keywords if word in topic_text])
                negative_count = sum([1 for word in negative_keywords if word in topic_text])
                requirement_count = sum([1 for word in requirement_keywords if word in topic_text])
                
                # 最も多い意見タイプを特定
                opinion_counts = [
                    ("positive", positive_count),
                    ("negative", negative_count),
                    ("requirement", requirement_count)
                ]
                
                max_opinion = max(opinion_counts, key=lambda x: x[1])
                if max_opinion[1] > 0:
                    opinions[max_opinion[0]] += 1
            
            # トピックの種類を決定
            opinion_counts = [
                ("positive", opinions["positive"]),
                ("negative", opinions["negative"]),
                ("requirement", opinions["requirement"])
            ]
            
            dominant_opinion = max(opinion_counts, key=lambda x: x[1])
            
            if dominant_opinion[1] == 0:
                # 明確な意見がない場合はneutral
                issue_type = "neutral"
            else:
                issue_type = dominant_opinion[0]
            
            # 論点タイトルを作成
            topic_titles = {
                "実家": f"実家の{issue_type_text(issue_type)}に関する論点",
                "預金": f"預貯金の分配方法について",
                "遺言": f"故人の遺志の尊重について",
                "分割": f"遺産分割の公平性",
                "税金": f"相続税の負担と対策"
            }
            
            # トピックに対応するタイトルがなければ一般的なタイトルを使用
            issue_title = topic_titles.get(main_keyword, f"{main_keyword}に関する論点")
            
            # 合意度を計算
            agreement_counter = {"agree": 0, "disagree": 0}
            
            # 各話者の意見の一致/不一致を計算
            if opinions["positive"] > 0 or opinions["negative"] > 0:
                dominant_speakers = opinions[dominant_opinion[0]]
                total_opinion_speakers = opinions["positive"] + opinions["negative"]
                
                agreement_counter["agree"] = dominant_speakers
                agreement_counter["disagree"] = total_opinion_speakers - dominant_speakers
            
            # 合意レベルを決定
            total_opinions = agreement_counter["agree"] + agreement_counter["disagree"]
            
            if total_opinions > 0:
                agree_ratio = agreement_counter["agree"] / total_opinions
                
                if agree_ratio > 0.7:
                    agreement_level = "high"
                elif agree_ratio > 0.3:
                    agreement_level = "medium"
                else:
                    agreement_level = "low"
            else:
                agreement_level = "medium"  # デフォルト
            
            # 論点を追加
            extracted_issues.append({
                "content": issue_title,
                "type": issue_type,
                "agreement_level": agreement_level
            })
    
    # カスタム論点の抽出（会話内容に特有の論点）
    # 実際の実装ではAIを使って会話から論点を抽出するべき
    
    # 賛同率の高い意見
    if "譲り合い" in total_text or "話し合い" in total_text:
        extracted_issues.append({
            "content": "家族間での話し合いと譲り合いの重要性",
            "type": "positive",
            "agreement_level": "high"
        })
    
    # 争点
    if "争い" in total_text or "揉め" in total_text:
        extracted_issues.append({
            "content": "相続での争いを避けるための方策",
            "type": "requirement",
            "agreement_level": "high"
        })
    
    # その他のカスタム論点（適宜追加）
    
    # 少なくとも5つの論点があるように調整
    if len(extracted_issues) < 5:
        default_issues = [
            {
                "content": "家族の思い出を大切にする方法",
                "type": "positive",
                "agreement_level": "high"
            },
            {
                "content": "将来的な資産価値の変動を考慮した判断",
                "type": "neutral",
                "agreement_level": "medium"
            },
            {
                "content": "固定資産税などの維持費用の負担",
                "type": "negative", 
                "agreement_level": "medium"
            },
            {
                "content": "相続時の税金対策",
                "type": "requirement",
                "agreement_level": "high"
            },
            {
                "content": "公平な資産分割の原則",
                "type": "requirement",
                "agreement_level": "high"
            }
        ]
        
        # 不足分の論点を追加
        for issue in default_issues:
            if len(extracted_issues) >= 5:
                break
                
            # 既に同様の内容がなければ追加
            if not any(existing["content"] == issue["content"] for existing in extracted_issues):
                extracted_issues.append(issue)
    
    return extracted_issues
