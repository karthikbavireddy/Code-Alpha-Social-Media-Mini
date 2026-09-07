from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Profile, Post, Comment, Follow


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'
    fk_name = 'user'


class CustomUserAdmin(BaseUserAdmin):
    inlines = (ProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'get_date_joined')
    list_select_related = ('profile',)

    def get_date_joined(self, instance):
        return instance.date_joined
    get_date_joined.short_description = 'Date Joined'


# Re-register User with Profile inline
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'bio_preview', 'profile_picture', 'date_joined')
    search_fields = ('user__username', 'user__email', 'bio')
    list_filter = ('date_joined',)
    ordering = ('-date_joined',)

    def bio_preview(self, obj):
        return (obj.bio[:40] + '...') if len(obj.bio) > 40 else obj.bio
    bio_preview.short_description = 'Bio'


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'content_preview', 'image', 'created_at', 'get_like_count', 'get_comment_count')
    search_fields = ('author__username', 'content')
    list_filter = ('created_at',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)

    def content_preview(self, obj):
        return (obj.content[:40] + '...') if len(obj.content) > 40 else obj.content
    content_preview.short_description = 'Content'

    def get_like_count(self, obj):
        return obj.likes.count()
    get_like_count.short_description = 'Likes'

    def get_comment_count(self, obj):
        return obj.comments.count()
    get_comment_count.short_description = 'Comments'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'author', 'post', 'text_preview', 'created_at')
    search_fields = ('author__username', 'text', 'post__content')
    list_filter = ('created_at',)
    ordering = ('-created_at',)

    def text_preview(self, obj):
        return (obj.text[:40] + '...') if len(obj.text) > 40 else obj.text
    text_preview.short_description = 'Text'


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at')
    search_fields = ('follower__username', 'following__username')
    list_filter = ('created_at',)
    ordering = ('-created_at',)
