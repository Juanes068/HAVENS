import logging
from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(name='core.tasks.send_welcome_email_task')
def send_welcome_email_task(user_email, username, app_url=None):
    """
    Asynchronous Celery task to send a rich HTML welcome email to newly registered users.
    Executes in background without blocking GraphQL HTTP mutations.
    """
    if not user_email:
        logger.warning("[Celery Email] Skipped welcome email: No email provided.")
        return "No email provided"

    subject = "Welcome to Havens! 🌿"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Havens <welcome@havens.app>')
    app_link = app_url or getattr(settings, 'FRONTEND_URL', 'http://localhost:5173/discover')

    context = {
        'username': username,
        'app_url': app_link,
    }

    try:
        html_content = render_to_string('emails/welcome_email.html', context)
        plain_message = strip_tags(html_content)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[user_email],
            html_message=html_content,
            fail_silently=False,
        )
        logger.info(f"[Celery Email] Successfully sent welcome email to {user_email} (user: {username})")
        return f"Welcome email sent to {user_email}"
    except Exception as exc:
        logger.error(f"[Celery Email] Error sending welcome email to {user_email}: {exc}")
        return f"Failed to send welcome email: {exc}"


@shared_task(name='core.tasks.send_welcome_email')
def send_welcome_email(user_email, username, app_url=None):
    """
    Direct alias for send_welcome_email_task to support both naming conventions.
    """
    return send_welcome_email_task(user_email, username, app_url)


@shared_task(name='core.tasks.send_system_alert_task')
def send_system_alert_task(user_email, alert_subject, alert_message, username=None, action_url=None, action_text=None):
    """
    Asynchronous Celery task to send critical notifications, security notices, or updates.
    """
    if not user_email:
        logger.warning("[Celery Email] Skipped system alert: No email provided.")
        return "No email provided"

    subject = f"[Havens] {alert_subject}"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Havens <welcome@havens.app>')

    context = {
        'username': username,
        'alert_subject': alert_subject,
        'alert_message': alert_message,
        'action_url': action_url,
        'action_text': action_text,
    }

    try:
        html_content = render_to_string('emails/system_alert.html', context)
        plain_message = strip_tags(html_content)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=from_email,
            recipient_list=[user_email],
            html_message=html_content,
            fail_silently=False,
        )
        logger.info(f"[Celery Email] System alert '{alert_subject}' dispatched to {user_email}")
        return f"System alert sent to {user_email}"
    except Exception as exc:
        logger.error(f"[Celery Email] Error sending system alert to {user_email}: {exc}")
        return f"Failed to send system alert: {exc}"
