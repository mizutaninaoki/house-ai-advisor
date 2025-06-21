import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from app.config import settings  # type: ignore[import]

logger = logging.getLogger(__name__)

class EmailService:
    
    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        """メール送信のメインメソッド"""
        try:
            if settings.email_backend == "resend" and settings.resend_api_key:
                return EmailService._send_via_resend(to_email, subject, html_content, text_content)
            else:
                return EmailService._send_via_smtp(to_email, subject, html_content, text_content)
        except Exception as e:
            logger.error(f"メール送信エラー: {e}")
            return False
    
    @staticmethod
    def _send_via_smtp(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        """SMTP経由でメール送信（ローカル開発用）"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.from_name} <{settings.from_email}>"
            msg['To'] = to_email
            
            # テキスト版
            text_part = MIMEText(text_content or EmailService._html_to_text(html_content), 'plain', 'utf-8')
            msg.attach(text_part)
            
            # HTML版
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # SMTP送信
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                
                server.send_message(msg)
                logger.info(f"SMTP経由でメール送信成功: {to_email}")
                return True
                
        except Exception as e:
            logger.error(f"SMTP送信エラー: {e}")
            return False
    
    @staticmethod
    def _html_to_text(html_content: str) -> str:
        """HTMLをプレーンテキストに変換（簡易版）"""
        import re
        # HTMLタグを除去
        text = re.sub('<[^<]+?>', '', html_content)
        # 改行を整理
        text = re.sub(r'\n\s*\n', '\n\n', text)
        return text.strip()
    
    @staticmethod
    def send_project_invitation(
        to_email: str,
        to_name: str,
        project_title: str,
        invitation_token: str,
        inviter_name: str = "プロジェクト作成者"
    ) -> bool:
        """プロジェクト招待メールを送信"""
        invitation_url = f"{settings.frontend_url}/invitations/accept/{invitation_token}"
        
        subject = f"[プロジェクト] {project_title}への招待"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{subject}</title>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #06b6d4; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; background-color: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }}
                .footer {{ margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }}
                .warning {{ background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>プロジェクトへの招待</h1>
                </div>
                <div class="content">
                    <p>こんにちは、<strong>{to_name}</strong>様</p>
                    
                    <p>{inviter_name}から、「<strong>{project_title}</strong>」のプロジェクトに招待されました。</p>
                    
                    <p>このプロジェクトでは、相続に関する情報を共有し、家族間で円滑な遺産分割を進めることができます。</p>
                    
                    <p>下記のボタンをクリックしてプロジェクトに参加してください：</p>
                    
                    <div style="text-align: center;">
                        <a href="{invitation_url}" class="button">プロジェクトに参加する</a>
                    </div>
                    
                    <div class="warning">
                        <p><strong>⚠️ 重要な注意事項</strong></p>
                        <ul>
                            <li>このリンクの有効期限は<strong>7日間</strong>です。</li>
                            <li>リンクは一度しか使用できません。</li>
                            <li>アカウントをお持ちでない場合は、自動的にアカウント作成画面に案内されます。</li>
                        </ul>
                    </div>
                    
                    <p>リンクをクリックできない場合は、以下のURLをコピーしてブラウザに貼り付けてください：</p>
                    <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">
                        {invitation_url}
                    </p>
                </div>
                <div class="footer">
                    <p>このメールは相続AIアドバイザーから自動送信されています。</p>
                    <p>ご不明な点がございましたら、プロジェクト作成者にお問い合わせください。</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        プロジェクトへの招待
        
        こんにちは、{to_name}様
        
        {inviter_name}から、「{project_title}」のプロジェクトに招待されました。
        
        プロジェクトに参加するには、以下のリンクをクリックしてください：
        {invitation_url}
        
        ※このリンクの有効期限は7日間です。
        ※リンクは一度しか使用できません。
        
        ご不明な点がございましたら、プロジェクト作成者にお問い合わせください。
        
        ---
        相続AIアドバイザー
        """
        
        return EmailService.send_email(to_email, subject, html_content, text_content)
    
    @staticmethod
    def _send_via_resend(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        """Resend 経由でメール送信"""
        try:
            import httpx

            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "from": settings.from_email,
                "to": to_email,
                "subject": subject,
                "html": html_content
            }
            # プレーンテキストがあれば追加
            if text_content:
                payload["text"] = text_content

            response = httpx.post(url, headers=headers, json=payload)
            if 200 <= response.status_code < 300:
                logger.info(f"Resend 経由でメール送信成功: {to_email}")
                return True
            else:
                logger.error(f"Resend 送信失敗: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            logger.error(f"Resend送信エラー: {e}")
            return False 
