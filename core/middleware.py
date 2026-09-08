from django.utils import timezone


class UserActivityMiddleware:
    """
    Middleware that updates the authenticated user's last_seen timestamp.
    Throttled to at most once per minute per user to keep DB load minimal.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if getattr(request, 'user', None) and request.user.is_authenticated:
            try:
                profile = getattr(request.user, 'profile', None)
                if profile:
                    now = timezone.now()
                    if not profile.last_seen or (now - profile.last_seen).total_seconds() > 60:
                        profile.last_seen = now
                        profile.save(update_fields=['last_seen'])
            except Exception:
                pass

        return self.get_response(request)
