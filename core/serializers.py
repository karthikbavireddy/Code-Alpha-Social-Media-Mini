from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile, Post, Comment, Follow, Message


class UserRegisterSerializer(serializers.ModelSerializer):
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }

    def validate_username(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value.strip()

    def validate_email(self, value):
        if not value or '@' not in value:
            raise serializers.ValidationError("A valid email address is required.")
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value.strip().lower()

    def validate(self, data):
        password = data.get('password')
        confirm_password = data.get('confirm_password')

        if not password:
            raise serializers.ValidationError({"password": "Password is required."})

        if len(password) < 6:
            raise serializers.ValidationError({"password": "Password must be at least 6 characters long."})

        if password != confirm_password:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


def resolve_profile_avatar_url(user_or_profile, request=None):
    """
    Safely resolve avatar URL: checks if physical file exists on disk,
    otherwise falls back to persistent base64 data URI (survives Render restarts).
    Returns None if neither exists to trigger clean initials avatar fallback.
    """
    if not user_or_profile:
        return None
    profile = getattr(user_or_profile, 'profile', user_or_profile)
    if not profile:
        return None
    if profile.profile_picture:
        try:
            if profile.profile_picture.storage.exists(profile.profile_picture.name):
                url = profile.profile_picture.url
                if url and url.strip() not in ('', '/media/'):
                    return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
    if getattr(profile, 'profile_picture_data', None):
        return profile.profile_picture_data
    return None


def resolve_post_image_url(post, request=None):
    """
    Safely resolve post media URL: checks if physical file exists on disk,
    otherwise falls back to persistent base64 data URI (survives Render restarts).
    """
    if not post:
        return None
    if post.image:
        try:
            if post.image.storage.exists(post.image.name):
                url = post.image.url
                if url and url.strip() not in ('', '/media/'):
                    return request.build_absolute_uri(url) if request else url
        except Exception:
            pass
    if getattr(post, 'image_data', None):
        return post.image_data
    return None


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')
    author_id = serializers.ReadOnlyField(source='author.id')
    author_profile_picture = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    liked_by_current_user = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'author', 'author_id', 'author_profile_picture',
            'text', 'created_at', 'like_count', 'liked_by_current_user'
        ]
        read_only_fields = [
            'id', 'author', 'author_id', 'author_profile_picture',
            'created_at', 'like_count', 'liked_by_current_user'
        ]

    def get_author_profile_picture(self, obj):
        return resolve_profile_avatar_url(obj.author, self.context.get('request'))

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_liked_by_current_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')
    author_id = serializers.ReadOnlyField(source='author.id')
    author_profile_picture = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    liked_by_current_user = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_id', 'author_profile_picture',
            'content', 'image', 'created_at',
            'like_count', 'comment_count', 'liked_by_current_user'
        ]
        read_only_fields = [
            'id', 'author', 'author_id', 'author_profile_picture',
            'created_at', 'like_count', 'comment_count', 'liked_by_current_user'
        ]

    def get_image(self, obj):
        return resolve_post_image_url(obj, self.context.get('request'))

    def get_author_profile_picture(self, obj):
        return resolve_profile_avatar_url(obj.author, self.context.get('request'))

    def get_like_count(self, obj):
        return obj.likes.count()

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_liked_by_current_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False


class UserPublicSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(source='profile.bio', read_only=True)
    profile_picture = serializers.SerializerMethodField()
    follower_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_followed_by = serializers.SerializerMethodField()
    is_mutual_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'bio', 'profile_picture', 'follower_count', 'is_following', 'is_followed_by', 'is_mutual_following']

    def get_profile_picture(self, obj):
        return resolve_profile_avatar_url(obj, self.context.get('request'))

    def get_follower_count(self, obj):
        return obj.followers.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False

    def get_is_followed_by(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=obj, following=request.user).exists()
        return False

    def get_is_mutual_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.id == obj.id:
                return False
            follows_them = Follow.objects.filter(follower=request.user, following=obj).exists()
            follows_me = Follow.objects.filter(follower=obj, following=request.user).exists()
            return follows_them and follows_me
        return False


class UserProfileSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(source='profile.bio', read_only=True)
    profile_picture = serializers.SerializerMethodField()
    post_count = serializers.SerializerMethodField()
    follower_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_followed_by = serializers.SerializerMethodField()
    is_mutual_following = serializers.SerializerMethodField()
    posts = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'bio', 'profile_picture',
            'post_count', 'follower_count', 'following_count',
            'is_following', 'is_followed_by', 'is_mutual_following', 'posts'
        ]

    def get_profile_picture(self, obj):
        return resolve_profile_avatar_url(obj, self.context.get('request'))

    def get_post_count(self, obj):
        return obj.posts.count()

    def get_follower_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.id == obj.id:
                return False
            return Follow.objects.filter(follower=request.user, following=obj).exists()
        return False

    def get_is_followed_by(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.id == obj.id:
                return False
            return Follow.objects.filter(follower=obj, following=request.user).exists()
        return False

    def get_is_mutual_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.id == obj.id:
                return False
            follows_them = Follow.objects.filter(follower=request.user, following=obj).exists()
            follows_me = Follow.objects.filter(follower=obj, following=request.user).exists()
            return follows_them and follows_me
        return False

    def get_posts(self, obj):
        posts = obj.posts.all().order_by('-created_at')
        return PostSerializer(posts, many=True, context=self.context).data


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    recipient_username = serializers.CharField(source='recipient.username', read_only=True)
    recipient_avatar = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender_username', 'sender_avatar',
            'recipient_username', 'recipient_avatar',
            'content', 'created_at', 'is_read', 'is_mine'
        ]

    def get_sender_avatar(self, obj):
        return resolve_profile_avatar_url(obj.sender, self.context.get('request'))

    def get_recipient_avatar(self, obj):
        return resolve_profile_avatar_url(obj.recipient, self.context.get('request'))

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.sender_id == request.user.id
        return False

