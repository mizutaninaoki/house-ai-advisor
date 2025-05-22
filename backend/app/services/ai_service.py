import json
from typing import List, Dict, Any, Optional
import re
from collections import Counter
import os
import google.generativeai as genai

# Google Generative AIの初期化
def initialize_google_ai():
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
    else:
        print("警告: GEMINI_API_KEYが設定されていません。")

# LLMによる論点生成関数
async def generate_issue_content_with_llm(topic: str, topic_sentences: List[str], main_keyword: str, issue_type: str, agreement_level: str) -> Dict[str, str]:
    """
    LLMを使用して論点の内容を生成する

    Args:
        topic: 論点のトピック（例：「実家」「預金」など）
        topic_sentences: トピックに関連する会話の文章リスト
        main_keyword: 主要キーワード
        issue_type: 論点タイプ（positive, negative, neutral, requirement）
        agreement_level: 合意レベル（high, medium, low）

    Returns:
        Dict[str, str]: topic（見出し）とcontent（詳細説明）を含む辞書
    """
    try:
        # Google AIの初期化
        initialize_google_ai()
        
        # 論点タイプと合意レベルを日本語に変換
        issue_type_ja = {
            "positive": "肯定的",
            "negative": "否定的",
            "neutral": "中立的",
            "requirement": "要望"
        }.get(issue_type, "中立的")
        
        agreement_level_ja = {
            "high": "高い",
            "medium": "中程度",
            "low": "低い"
        }.get(agreement_level, "中程度")
        
        # 会話の要約を作成
        conversation_summary = " ".join(topic_sentences[:10])  # 会話の一部を使用
        
        # プロンプト作成
        prompt = f"""
        あなたは相続や実家の処分などについての家族間の話し合いを支援するAIアシスタントです。
        以下の情報から、論点の「見出し」と「詳細説明」を生成してください。

        【トピック】: {topic}
        【キーワード】: {main_keyword}
        【意見の傾向】: {issue_type_ja}
        【合意度】: {agreement_level_ja}
        
        【関連する会話】:
        {conversation_summary}
        
        以下の形式で出力してください：
        見出し：（簡潔で具体的な論点のタイトル）
        詳細：（この論点の詳細。なぜ議論が必要か、どのような意見の対立や合意があるか、今後どうすれば合意形成できるかなどを含める。150文字程度で簡潔にまとめてください）
        
        特に詳細部分では、合意形成のために何を話し合うべきかを明確にしてください。
        """
        
        # Google Generative AIを使用
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-preview-04-17")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        
        # 応答からトピックとサマリーを抽出
        response_text = response.text
        
        # 見出しと詳細を抽出
        topic_match = re.search(r'見出し[：:](.*?)(?:\n|$)', response_text)
        summary_match = re.search(r'詳細[：:](.*)', response_text, re.DOTALL)
        
        generated_topic = topic_match.group(1).strip() if topic_match and topic_match.group(1).strip() else f"{main_keyword}に関する論点"
        if summary_match and summary_match.group(1).strip():
            generated_summary = summary_match.group(1).strip()
        elif response_text.strip():
            # 詳細が抽出できない場合は応答全体をsummaryとして使う
            generated_summary = response_text.strip()
        else:
            generated_summary = f"この論点は{issue_type_ja}な意見が多く、合意度は{agreement_level_ja}です。"
        
        return {
            "topic": generated_topic,
            "content": generated_summary
        }
        
    except Exception as e:
        print(f"LLMによる論点生成エラー: {e}")
        # エラー時はフォールバックとしてシンプルな論点を返す
        return {
            "topic": f"{main_keyword}に関する論点",
            "content": f"この論点については{'意見が分かれており、さらなる話し合いが必要です。' if agreement_level == 'low' else '一定の合意が見られます。'}"
        }

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
        topic_mentioned = str(main_keyword) in total_text
        if not topic_mentioned:
            for related in related_keywords:
                if related in total_text:
                    topic_mentioned = True
                    break
        
        if topic_mentioned:
            # トピックに関する意見を集計
            opinions = {"positive": 0, "negative": 0, "requirement": 0}
            topic_sentences_all = []
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
                topic_sentences_all.extend(topic_sentences)
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
            
            # 合意度を計算
            agreement_counter = {"agree": 0, "disagree": 0}
            if opinions["positive"] > 0 or opinions["negative"] > 0:
                dominant_speakers = opinions[dominant_opinion[0]]
                total_opinion_speakers = opinions["positive"] + opinions["negative"]
                agreement_counter["agree"] = dominant_speakers
                agreement_counter["disagree"] = total_opinion_speakers - dominant_speakers
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
                
            # LLMを使用して論点内容を生成
            issue_content = await generate_issue_content_with_llm(
                topic=str(main_keyword), 
                topic_sentences=topic_sentences_all, 
                main_keyword=str(main_keyword),
                issue_type=issue_type,
                agreement_level=agreement_level
            )
            
            # 論点を追加
            # agreement_levelに応じてclassificationを決定
            if agreement_level == "high":
                classification = "agreed"
            elif agreement_level == "medium":
                classification = "discussing"
            else:
                classification = "disagreed"
            extracted_issues.append({
                "topic": issue_content["topic"],
                "content": issue_content["content"],
                "type": issue_type,
                "agreement_level": agreement_level,
                "classification": classification
            })
    
    # カスタム論点の抽出（会話内容に特有の論点）
    # 実際の実装ではAIを使って会話から論点を抽出するべき
    
    # 賛同率の高い意見
    if "譲り合い" in total_text or "話し合い" in total_text:
        # LLMを使用して「話し合い」についての論点を生成
        talking_issue = await generate_issue_content_with_llm(
            topic="話し合い", 
            topic_sentences=["家族間での話し合いと譲り合いが重要です", "話し合いで解決しましょう"], 
            main_keyword="話し合い",
            issue_type="positive",
            agreement_level="high"
        )
        
        extracted_issues.append({
            "topic": talking_issue["topic"],
            "content": talking_issue["content"],
            "type": "positive",
            "agreement_level": "high",
            "classification": "agreed"
        })
    
    # 争点
    if "争い" in total_text or "揉め" in total_text:
        # LLMを使用して「争いを避ける」についての論点を生成
        dispute_issue = await generate_issue_content_with_llm(
            topic="争いを避ける", 
            topic_sentences=["相続での争いを避けたい", "揉め事は避けたい"], 
            main_keyword="争い",
            issue_type="requirement",
            agreement_level="high"
        )
        
        extracted_issues.append({
            "topic": dispute_issue["topic"],
            "content": dispute_issue["content"],
            "type": "requirement",
            "agreement_level": "high",
            "classification": "agreed"
        })
    
    # 少なくとも3つの論点があるように調整
    if len(extracted_issues) < 3:
        default_issues = [
            {
                "topic": "家族の思い出を大切にする方法",
                "content": "家族の思い出の品やアルバムなどの扱いについて、どのように分配や保存をするかについて話し合う必要があります。全員にとって大切な思い出を残すために、デジタル化や思い出の品の公平な分配方法を検討しましょう。",
                "type": "positive",
                "agreement_level": "high",
                "classification": "agreed"
            },
            {
                "topic": "将来的な資産価値の変動を考慮した判断",
                "content": "不動産や有価証券などの資産は将来的に価値が変動する可能性があります。現時点での価値だけでなく、将来の価値変動リスクをどのように考慮して分配するかについて、専門家のアドバイスも含めて話し合いましょう。",
                "type": "neutral",
                "agreement_level": "medium",
                "classification": "discussing"
            },
            {
                "topic": "固定資産税などの維持費用の負担",
                "content": "不動産を相続する場合、固定資産税や修繕費などの維持コストが継続的に発生します。これらの費用をどのように負担するか、特に一部の相続人が不動産を取得する場合の不公平感を解消するための方法について話し合う必要があります。",
                "type": "negative", 
                "agreement_level": "medium",
                "classification": "discussing"
            }
        ]
        
        # 不足分の論点を追加
        for issue in default_issues:
            if len(extracted_issues) >= 3:
                break
                
            # 既に同様の内容がなければ追加
            if not any(existing["content"] == issue["content"] for existing in extracted_issues):
                extracted_issues.append(issue)
    
    return extracted_issues
