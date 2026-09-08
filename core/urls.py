from django.urls import path
from . import views

urlpatterns = [
    # Frontend Page Routes
    path('', views.home_view, name='home_page'),
    path('login/', views.login_view, name='login_page'),
    path('register/', views.register_view, name='register_page'),
    path('profile/<str:username>/', views.profile_view, name='profile_page'),
    path('posts/<int:post_id>/', views.post_detail_view, name='post_detail_page'),
    path('explore/', views.explore_view, name='explore_page'),
    path('messages/', views.messages_page_view, name='messages_page'),
    path('messages/<str:username>/', views.messages_page_view, name='messages_with_user_page'),
    path('settings/', views.settings_view, name='settings_page'),

    # REST API Endpoints
    # Auth
    path('api/register/', views.api_register, name='api_register'),
    path('api/login/', views.api_login, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/me/', views.api_me, name='api_me'),

    # Settings & Account
    path('api/settings/change-password/', views.api_change_password, name='api_change_password'),
    path('api/settings/account/', views.api_update_account, name='api_update_account'),
    path('api/settings/delete-account/', views.api_delete_account, name='api_delete_account'),

    # Profile
    path('api/users/<str:username>/', views.api_user_detail, name='api_user_detail'),
    path('api/profile/', views.api_update_profile, name='api_update_profile'),

    # Posts CRUD
    path('api/posts/create/', views.api_create_post, name='api_create_post'),
    path('api/posts/<int:post_id>/', views.api_get_post, name='api_get_post'),
    path('api/posts/<int:post_id>/update/', views.api_update_post, name='api_update_post'),
    path('api/posts/<int:post_id>/delete/', views.api_delete_post, name='api_delete_post'),

    # Comments
    path('api/posts/<int:post_id>/comments/', views.api_post_comments, name='api_post_comments'),
    path('api/comments/<int:comment_id>/like/', views.api_comment_like_toggle, name='api_comment_like_toggle'),

    # Like toggle
    path('api/posts/<int:post_id>/like/', views.api_like_toggle, name='api_like_toggle'),

    # Follow toggle & lists
    path('api/users/<str:username>/follow/', views.api_follow_toggle, name='api_follow_toggle'),
    path('api/users/<str:username>/followers/', views.api_user_followers, name='api_user_followers'),
    path('api/users/<str:username>/following/', views.api_user_following, name='api_user_following'),

    # Feed
    path('api/feed/', views.api_feed, name='api_feed'),

    # Search
    path('api/search/', views.api_search, name='api_search'),

    # Direct Messages
    path('api/conversations/', views.api_conversations, name='api_conversations'),
    path('api/messages/contacts/', views.api_message_contacts, name='api_message_contacts'),
    path('api/messages/unread-count/', views.api_unread_messages_count, name='api_unread_messages_count'),
    path('api/messages/<str:username>/', views.api_messages_with_user, name='api_messages_with_user'),
    path('api/messages/<str:username>/send/', views.api_send_message, name='api_send_message'),
]
