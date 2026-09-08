from django.utils import timezone
from rest_framework.authtoken.models import Token


class UserActivityMiddleware:
    """
    Middleware that updates the authenticated user's last_seen timestamp.
    Supports both standard Django session authentication and DRF Token authentication.
    Throttled to at most once per 25 seconds per user to keep DB load minimal.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = None

        # 1. Check session auth
        if getattr(request, 'user', None) and request.user.is_authenticated:
            user = request.user
        else:
            # 2. Check Authorization header for Token auth
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Token '):
                try:
                    token_key = auth_header.split(' ')[1]
                    token = Token.objects.filter(key=token_key).select_related('user__profile').first()
                    if token and token.user and token.user.is_active:
                        user = token.user
                except Exception:
                    pass

        if user:
            self._touch_user(user)

        response = self.get_response(request)

        # 3. Check post-dispatch in case DRF view attached user to request
        if not user and getattr(request, 'user', None) and request.user.is_authenticated:
            self._touch_user(request.user)

        return response

    def _touch_user(self, user):
        try:
            profile = getattr(user, 'profile', None)
            if profile:
                now = timezone.now()
                if not profile.last_seen or (now - profile.last_seen).total_seconds() > 25:
                    profile.last_seen = now
                    profile.save(update_fields=['last_seen'])
        except Exception:
            pass

