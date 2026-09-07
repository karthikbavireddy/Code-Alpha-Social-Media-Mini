from django.db.models.signals import post_save
from django.contrib.auth.models import User
from django.dispatch import receiver
from .models import Profile


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """
    Ensure each User has an associated Profile upon creation.
    """
    if kwargs.get('raw', False):
        return

    if created:
        Profile.objects.get_or_create(user=instance)
    else:
        # If user existed without profile for any reason, ensure profile exists
        if hasattr(instance, "profile"):
            instance.profile.save()
        else:
            Profile.objects.create(user=instance)
