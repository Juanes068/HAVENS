from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_welcome_email(user_email, username):
    """
    Asynchronous Celery task to send a welcome email to a newly registered user.
    Executes in background without blocking GraphQL HTTP response.
    """
    subject = "Welcome to havens!"
    message = (
        f"Hi {username},\n\n"
        f"Welcome to havens! We are excited to have you join our trusted community circles.\n\n"
        f"Explore local events, connect with friends, and customize your profile hobbies.\n\n"
        f"Warmly,\n"
        f"The havens Team"
    )
    try:
        if user_email:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'welcome@havens.app'),
                recipient_list=[user_email],
                fail_silently=True,
            )
            logger.info(f"[Celery Task] Welcome email dispatched to {user_email} for user {username}")
            return f"Welcome email dispatched to {user_email}"
    except Exception as e:
        logger.error(f"[Celery Task] Error sending welcome email to {user_email}: {e}")
        return f"Error sending welcome email: {e}"
