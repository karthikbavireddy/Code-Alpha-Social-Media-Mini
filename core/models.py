from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models import F, Q


class Profile(models.Model):
    """
    User profile extension storing bio and avatar.
    Automatically created whenever a new User instance is saved.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )
    bio = models.TextField(blank=True, default="")
    profile_picture = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True
    )
    profile_picture_data = models.TextField(
        blank=True,
        null=True,
        help_text="Persistent base64 data URI fallback for ephemeral hosting like Render"
    )
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.user.username}'s profile"

    @property
    def profile_picture_url(self):
        """Returns the media URL of avatar or persistent data URI or None."""
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            try:
                if self.profile_picture.storage.exists(self.profile_picture.name):
                    return self.profile_picture.url
            except Exception:
                pass
        if self.profile_picture_data:
            return self.profile_picture_data
        return None


class Post(models.Model):
    """
    User post containing text content and an optional image attachment.
    Supports a many-to-many relationship for likes.
    """
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="posts"
    )
    content = models.TextField()
    image = models.ImageField(
        upload_to="posts/",
        blank=True,
        null=True
    )
    image_data = models.TextField(
        blank=True,
        null=True,
        help_text="Persistent base64 data URI fallback for ephemeral hosting like Render"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(
        User,
        related_name="liked_posts",
        blank=True
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        snippet = (self.content[:30] + "...") if len(self.content) > 30 else self.content
        return f"Post #{self.id} by @{self.author.username}: {snippet}"

    @property
    def like_count(self):
        return self.likes.count()

    @property
    def comment_count(self):
        return self.comments.count()


class Comment(models.Model):
    """
    Comment on a Post authored by a User.
    """
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="comments"
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="comments"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(
        User,
        related_name="liked_comments",
        blank=True
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        snippet = (self.text[:30] + "...") if len(self.text) > 30 else self.text
        return f"Comment by @{self.author.username} on Post #{self.post.id}: {snippet}"

    @property
    def like_count(self):
        return self.likes.count()


class Follow(models.Model):
    """
    Follow relationship between two users.
    'follower' is the user doing the following.
    'following' is the target user being followed.
    """
    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="following"
    )
    following = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="followers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            # Ensure unique follow pair
            models.UniqueConstraint(
                fields=["follower", "following"],
                name="unique_follower_following"
            ),
            # Database level check preventing self-follow
            models.CheckConstraint(
                condition=~Q(follower=F("following")),
                name="prevent_self_follow"
            )
        ]

    def clean(self):
        if self.follower_id == self.following_id:
            raise ValidationError("A user cannot follow themselves.")
        super().clean()

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"@{self.follower.username} -> @{self.following.username}"


class Message(models.Model):
    """
    Direct message between two users.
    """
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_messages"
    )
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_messages"
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["sender", "recipient"]),
            models.Index(fields=["recipient", "is_read"]),
        ]

    def __str__(self):
        snippet = (self.content[:25] + "...") if len(self.content) > 25 else self.content
        return f"Msg from @{self.sender.username} to @{self.recipient.username}: {snippet}"

