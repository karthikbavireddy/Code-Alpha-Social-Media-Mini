from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User
from django.db.models import Q
from django.core.exceptions import ValidationError

from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.authtoken.models import Token

from .models import Profile, Post, Comment, Follow, Message
from .serializers import (
    UserRegisterSerializer,
    PostSerializer,
    CommentSerializer,
    UserProfileSerializer,
    UserPublicSerializer,
    MessageSerializer
)


# ==========================================
# TEMPLATE VIEWS
# ==========================================

def home_view(request):
    """Render the Home/Feed page."""
    if not request.user.is_authenticated:
        return redirect('login_page')
    return render(request, 'home.html')


def login_view(request):
    """Render the Login page."""
    if request.user.is_authenticated:
        return redirect('home_page')
    return render(request, 'login.html')


def register_view(request):
    """Render the Registration page."""
    if request.user.is_authenticated:
        return redirect('home_page')
    return render(request, 'register.html')


def profile_view(request, username):
    """Render the User Profile page."""
    target_user = get_object_or_404(User, username__iexact=username)
    return render(request, 'profile.html', {'target_username': target_user.username})


def post_detail_view(request, post_id):
    """Render the Single Post Detail page."""
    post = get_object_or_404(Post, id=post_id)
    return render(request, 'post_detail.html', {'post_id': post.id})


def explore_view(request):
    """Render the Explore & Search page."""
    return render(request, 'explore.html')


def messages_page_view(request, username=None):
    """Render the Direct Messages (DM) page."""
    if not request.user.is_authenticated:
        return redirect('login_page')
    return render(request, 'messages.html', {'target_username': username or ''})


def settings_view(request):
    """Render the User Settings & Account Management page."""
    if not request.user.is_authenticated:
        return redirect('login_page')
    return render(request, 'settings.html')


# ==========================================
# AUTHENTICATION API ENDPOINTS
# ==========================================

@api_view(['POST'])
@permission_classes([AllowAny])
def api_register(request):
    """
    Register a new user, automatically create their profile,
    and log them into the active session.
    """
    serializer = UserRegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        login(request, user)
        token, _ = Token.objects.get_or_create(user=user)
        
        avatar_url = None
        if hasattr(user, 'profile') and user.profile.profile_picture:
            avatar_url = request.build_absolute_uri(user.profile.profile_picture.url)

        return Response({
            'message': 'Registration successful.',
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'bio': getattr(user.profile, 'bio', ''),
                'profile_picture': avatar_url
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    """
    Authenticate a user via username or email and establish a session.
    """
    username_or_email = request.data.get('username', '').strip()
    password = request.data.get('password', '')

    if not username_or_email or not password:
        return Response(
            {'error': 'Both username/email and password are required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Allow login with email as well
    if '@' in username_or_email:
        user_obj = User.objects.filter(email__iexact=username_or_email).first()
        username = user_obj.username if user_obj else username_or_email
    else:
        username = username_or_email

    user = authenticate(request, username=username, password=password)

    if user is not None:
        if not user.is_active:
            return Response({'error': 'This account has been disabled.'}, status=status.HTTP_403_FORBIDDEN)
        
        login(request, user)
        # Ensure profile exists
        Profile.objects.get_or_create(user=user)
        token, _ = Token.objects.get_or_create(user=user)

        avatar_url = None
        if user.profile.profile_picture:
            avatar_url = request.build_absolute_uri(user.profile.profile_picture.url)

        return Response({
            'message': 'Login successful.',
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'bio': user.profile.bio,
                'profile_picture': avatar_url
            }
        }, status=status.HTTP_200_OK)

    return Response({'error': 'Invalid username/email or password.'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def api_logout(request):
    """
    Terminate the user session and token.
    """
    if request.user.is_authenticated:
        Token.objects.filter(user=request.user).delete()
    logout(request)
    return Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
def api_me(request):
    """
    Return profile data of the currently authenticated user.
    """
    if not request.user.is_authenticated:
        return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

    user = request.user
    profile, _ = Profile.objects.get_or_create(user=user)

    avatar_url = None
    if profile.profile_picture:
        avatar_url = request.build_absolute_uri(profile.profile_picture.url)

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'bio': profile.bio,
        'profile_picture': avatar_url,
        'post_count': user.posts.count(),
        'follower_count': user.followers.count(),
        'following_count': user.following.count()
    }, status=status.HTTP_200_OK)


# ==========================================
# USER PROFILE API ENDPOINTS
# ==========================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_user_detail(request, username):
    """
    Retrieve full user profile details, follower/following counts,
    follow status relative to the current viewer, and user's posts.
    """
    user = get_object_or_404(User, username__iexact=username)
    # Ensure profile exists
    Profile.objects.get_or_create(user=user)

    serializer = UserProfileSerializer(user, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def api_update_profile(request):
    """
    Update the authenticated user's profile (bio and/or profile_picture).
    Supports multipart form uploads.
    """
    profile, _ = Profile.objects.get_or_create(user=request.user)

    if 'bio' in request.data:
        profile.bio = request.data.get('bio', '')

    if 'profile_picture' in request.FILES:
        profile.profile_picture = request.FILES['profile_picture']

    profile.save()

    avatar_url = None
    if profile.profile_picture:
        avatar_url = request.build_absolute_uri(profile.profile_picture.url)

    return Response({
        'message': 'Profile updated successfully.',
        'profile': {
            'bio': profile.bio,
            'profile_picture': avatar_url
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_change_password(request):
    """
    Securely change user password after validating current password.
    """
    user = request.user
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not current_password or not new_password or not confirm_password:
        return Response({'error': 'All password fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_password):
        return Response({'error': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({'error': 'New passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({'error': 'New password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    update_session_auth_hash(request, user)  # Prevent session invalidation

    # Refresh auth token
    Token.objects.filter(user=user).delete()
    token = Token.objects.create(user=user)

    return Response({
        'message': 'Password changed successfully.',
        'token': token.key
    }, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def api_update_account(request):
    """
    Update username and/or email address for the user.
    """
    user = request.user
    new_username = request.data.get('username', '').strip()
    new_email = request.data.get('email', '').strip()

    if not new_username:
        return Response({'error': 'Username cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_username) < 3:
        return Response({'error': 'Username must be at least 3 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    # Verify uniqueness
    if User.objects.filter(username__iexact=new_username).exclude(id=user.id).exists():
        return Response({'error': 'This username is already taken. Please choose another.'}, status=status.HTTP_400_BAD_REQUEST)

    if new_email:
        if '@' not in new_email:
            return Response({'error': 'Please enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
            return Response({'error': 'This email is already in use by another account.'}, status=status.HTTP_400_BAD_REQUEST)
        user.email = new_email

    user.username = new_username
    user.save()

    return Response({
        'message': 'Account settings updated successfully.',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_delete_account(request):
    """
    Permanently delete the user account after password verification.
    """
    user = request.user
    confirm_password = request.data.get('password', '')

    if not confirm_password:
        return Response({'error': 'Please enter your password to confirm account deletion.'}, status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(confirm_password):
        return Response({'error': 'Incorrect password. Account was not deleted.'}, status=status.HTTP_400_BAD_REQUEST)

    username = user.username
    logout(request)
    user.delete()

    return Response({'message': f'Account @{username} has been permanently deleted.'}, status=status.HTTP_200_OK)



# ==========================================
# POST CRUD API ENDPOINTS
# ==========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def api_create_post(request):
    """
    Create a new post. Content is required; image is optional.
    Author is automatically set to request.user.
    """
    content = request.data.get('content', '').strip()
    if not content:
        return Response({'error': 'Post content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

    image = request.FILES.get('image', None)

    post = Post.objects.create(
        author=request.user,
        content=content,
        image=image
    )

    serializer = PostSerializer(post, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_get_post(request, post_id):
    """
    Retrieve single post details by id.
    """
    post = get_object_or_404(
        Post.objects.select_related('author', 'author__profile').prefetch_related('likes', 'comments'),
        id=post_id
    )
    serializer = PostSerializer(post, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def api_update_post(request, post_id):
    """
    Update post content or image. Author check is strictly enforced.
    Returns 403 Forbidden if another user attempts modification.
    """
    post = get_object_or_404(Post, id=post_id)

    if post.author != request.user:
        return Response({'error': 'You are not authorized to edit this post.'}, status=status.HTTP_403_FORBIDDEN)

    content = request.data.get('content', '').strip()
    if not content:
        return Response({'error': 'Content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

    post.content = content

    if 'image' in request.FILES:
        post.image = request.FILES['image']
    elif request.data.get('remove_image') == 'true':
        post.image = None

    post.save()

    serializer = PostSerializer(post, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def api_delete_post(request, post_id):
    """
    Delete a post. Author check is strictly enforced.
    Returns 403 Forbidden if another user attempts deletion.
    """
    post = get_object_or_404(Post, id=post_id)

    if post.author != request.user:
        return Response({'error': 'You are not authorized to delete this post.'}, status=status.HTTP_403_FORBIDDEN)

    post.delete()
    return Response({'message': 'Post deleted successfully.'}, status=status.HTTP_200_OK)


# ==========================================
# COMMENT API ENDPOINTS
# ==========================================

@api_view(['GET', 'POST'])
def api_post_comments(request, post_id):
    """
    GET: List all comments on a post.
    POST: Add a comment to the post (authenticated users only).
    """
    post = get_object_or_404(Post, id=post_id)

    if request.method == 'GET':
        comments = post.comments.select_related('author', 'author__profile').order_by('created_at')
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'POST':
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required to post comments.'}, status=status.HTTP_401_UNAUTHORIZED)

        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'Comment text cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(
            post=post,
            author=request.user,
            text=text
        )

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ==========================================
# LIKE / UNLIKE SYSTEM
# ==========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_like_toggle(request, post_id):
    """
    Toggle like status on a post for the authenticated user:
    - If user has already liked the post: remove the like.
    - If user has not liked the post: add the like.
    Uses the ManyToMany relationship to prevent duplicate likes naturally.
    Returns: {"liked": bool, "like_count": int}
    """
    post = get_object_or_404(Post, id=post_id)

    # Check if current user is already in post.likes
    if post.likes.filter(id=request.user.id).exists():
        post.likes.remove(request.user)
        liked = False
    else:
        post.likes.add(request.user)
        liked = True

    return Response({
        'liked': liked,
        'like_count': post.likes.count()
    }, status=status.HTTP_200_OK)


# ==========================================
# FOLLOW / UNFOLLOW SYSTEM
# ==========================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_follow_toggle(request, username):
    """
    Toggle follow status on a target user:
    - If current user already follows target: delete Follow record (unfollow).
    - If current user does not follow target: create Follow record.
    Enforces rules:
    1. User cannot follow themselves.
    2. Only authenticated users can perform action.
    3. Duplicate follows are impossible.
    Returns: {"following": bool, "follower_count": int}
    """
    target_user = get_object_or_404(User, username__iexact=username)

    if request.user.id == target_user.id:
        return Response(
            {'error': 'You cannot follow yourself.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    follow_record = Follow.objects.filter(follower=request.user, following=target_user).first()

    if follow_record:
        follow_record.delete()
        following = False
    else:
        Follow.objects.create(follower=request.user, following=target_user)
        following = True

    follower_count = target_user.followers.count()

    return Response({
        'following': following,
        'follower_count': follower_count
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_user_followers(request, username):
    """
    Retrieve list of users following the specified user.
    """
    target_user = get_object_or_404(User, username__iexact=username)
    followers = User.objects.filter(
        following__following=target_user
    ).select_related('profile').distinct()

    serializer = UserPublicSerializer(followers, many=True, context={'request': request})
    return Response({
        'count': followers.count(),
        'results': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def api_user_following(request, username):
    """
    Retrieve list of users whom the specified user follows.
    """
    target_user = get_object_or_404(User, username__iexact=username)
    following_users = User.objects.filter(
        followers__follower=target_user
    ).select_related('profile').distinct()

    serializer = UserPublicSerializer(following_users, many=True, context={'request': request})
    return Response({
        'count': following_users.count(),
        'results': serializer.data
    }, status=status.HTTP_200_OK)


# ==========================================
# FEED API ENDPOINT
# ==========================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_feed(request):
    """
    Generate the personalized home feed for the authenticated user:
    1. Current user's own posts.
    2. Posts from users they actively follow.
    Sorted newest first.
    Optimized with select_related and prefetch_related to prevent N+1 queries.
    """
    # Get IDs of followed users
    following_ids = request.user.following.values_list('following_id', flat=True)

    # Query posts by self or followed users
    posts = Post.objects.filter(
        Q(author=request.user) | Q(author_id__in=following_ids)
    ).select_related('author', 'author__profile').prefetch_related('likes', 'comments').order_by('-created_at')

    serializer = PostSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# SEARCH API ENDPOINT
# ==========================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_search(request):
    """
    Search users by username using case-insensitive partial match.
    Does not expose sensitive fields.
    """
    query = request.GET.get('q', '').strip()
    if not query:
        # Return popular/suggested users if no query provided
        users = User.objects.filter(is_active=True).select_related('profile')
        if request.user.is_authenticated:
            users = users.exclude(id=request.user.id)
        users = users.order_by('-date_joined')[:10]
    else:
        users = User.objects.filter(
            username__icontains=query,
            is_active=True
        ).select_related('profile')
        if request.user.is_authenticated:
            users = users.exclude(id=request.user.id)
        users = users[:20]

    serializer = UserPublicSerializer(users, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# DIRECT MESSAGING API ENDPOINTS
# ==========================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_conversations(request):
    """
    List all active conversation threads for the authenticated user,
    including the partner's info, latest message, and unread count.
    """
    user = request.user
    # Find all users with whom messages have been exchanged
    sent_to = Message.objects.filter(sender=user).values_list('recipient_id', flat=True)
    received_from = Message.objects.filter(recipient=user).values_list('sender_id', flat=True)
    partner_ids = set(sent_to).union(set(received_from))

    conversations = []
    partners = User.objects.filter(id__in=partner_ids).select_related('profile')

    for partner in partners:
        last_msg = Message.objects.filter(
            Q(sender=user, recipient=partner) | Q(sender=partner, recipient=user)
        ).order_by('-created_at').first()

        unread_count = Message.objects.filter(
            sender=partner,
            recipient=user,
            is_read=False
        ).count()

        avatar_url = None
        if hasattr(partner, 'profile') and partner.profile.profile_picture:
            avatar_url = request.build_absolute_uri(partner.profile.profile_picture.url)

        user_follows = Follow.objects.filter(follower=user, following=partner).exists()
        partner_follows = Follow.objects.filter(follower=partner, following=user).exists()

        conversations.append({
            'partner': {
                'id': partner.id,
                'username': partner.username,
                'avatar': avatar_url,
                'bio': getattr(partner.profile, 'bio', '') if hasattr(partner, 'profile') else '',
                'is_following': user_follows,
                'is_followed_by': partner_follows,
                'is_mutual': user_follows and partner_follows,
            },
            'last_message': {
                'content': last_msg.content if last_msg else '',
                'created_at': last_msg.created_at if last_msg else None,
                'is_mine': last_msg.sender_id == user.id if last_msg else False,
            } if last_msg else None,
            'unread_count': unread_count,
        })

    # Sort conversations by latest message timestamp descending
    conversations.sort(
        key=lambda c: c['last_message']['created_at'] if c.get('last_message') and c['last_message'].get('created_at') else '',
        reverse=True
    )

    return Response({'conversations': conversations}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_message_contacts(request):
    """
    List connected contacts (mutual followers and followed users) so the user can easily
    start a conversation with anyone they follow.
    """
    user = request.user
    following_ids = set(Follow.objects.filter(follower=user).values_list('following_id', flat=True))
    follower_ids = set(Follow.objects.filter(following=user).values_list('follower_id', flat=True))

    connected_ids = following_ids.union(follower_ids)
    connected_users = User.objects.filter(id__in=connected_ids).select_related('profile')

    sent_to = Message.objects.filter(sender=user).values_list('recipient_id', flat=True)
    received_from = Message.objects.filter(recipient=user).values_list('sender_id', flat=True)
    active_chat_ids = set(sent_to).union(set(received_from))

    contacts = []
    for partner in connected_users:
        is_following = partner.id in following_ids
        is_followed_by = partner.id in follower_ids
        is_mutual = is_following and is_followed_by
        avatar_url = None
        if hasattr(partner, 'profile') and partner.profile.profile_picture:
            avatar_url = request.build_absolute_uri(partner.profile.profile_picture.url)

        contacts.append({
            'id': partner.id,
            'username': partner.username,
            'avatar': avatar_url,
            'bio': getattr(partner.profile, 'bio', '') if hasattr(partner, 'profile') else '',
            'is_following': is_following,
            'is_followed_by': is_followed_by,
            'is_mutual': is_mutual,
            'can_message': is_mutual or is_following or is_followed_by,
            'has_existing_chat': partner.id in active_chat_ids,
        })

    # Sort: mutual followers first, then following, then alphabetically
    contacts.sort(key=lambda c: (not c['is_mutual'], not c['is_following'], c['username'].lower()))

    return Response({'contacts': contacts}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_messages_with_user(request, username):
    """
    Retrieve message history between the authenticated user and target username.
    Automatically marks incoming messages as read.
    """
    partner = get_object_or_404(User, username__iexact=username)
    user = request.user

    # Fetch messages between user and partner
    messages = Message.objects.filter(
        Q(sender=user, recipient=partner) | Q(sender=partner, recipient=user)
    ).select_related('sender__profile', 'recipient__profile').order_by('created_at')

    # Mark incoming unread messages as read
    Message.objects.filter(
        sender=partner,
        recipient=user,
        is_read=False
    ).update(is_read=True)

    serializer = MessageSerializer(messages, many=True, context={'request': request})

    avatar_url = None
    if hasattr(partner, 'profile') and partner.profile.profile_picture:
        avatar_url = request.build_absolute_uri(partner.profile.profile_picture.url)

    # Check follow relationships
    user_follows_partner = Follow.objects.filter(follower=user, following=partner).exists()
    partner_follows_user = Follow.objects.filter(follower=partner, following=user).exists()
    is_mutual = user_follows_partner and partner_follows_user

    return Response({
        'partner': {
            'id': partner.id,
            'username': partner.username,
            'avatar': avatar_url,
            'bio': getattr(partner.profile, 'bio', '') if hasattr(partner, 'profile') else '',
        },
        'user_follows_partner': user_follows_partner,
        'partner_follows_user': partner_follows_user,
        'is_mutual': is_mutual,
        'can_message': is_mutual or user_follows_partner or partner_follows_user,
        'messages': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_send_message(request, username):
    """
    Send a direct message to target username.
    Both users following each other (or connected via follow) can chat normally.
    """
    partner = get_object_or_404(User, username__iexact=username)
    content = request.data.get('content', '').strip()

    if not content:
        return Response({'error': 'Message content cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)

    if partner.id == request.user.id:
        return Response({'error': 'Cannot send messages to yourself.'}, status=status.HTTP_400_BAD_REQUEST)

    user_follows_partner = Follow.objects.filter(follower=request.user, following=partner).exists()
    partner_follows_user = Follow.objects.filter(follower=partner, following=request.user).exists()

    # Validate that they are connected by following
    if not (user_follows_partner or partner_follows_user):
        return Response({
            'error': 'You must follow each other to send direct messages.'
        }, status=status.HTTP_403_FORBIDDEN)

    message = Message.objects.create(
        sender=request.user,
        recipient=partner,
        content=content
    )

    serializer = MessageSerializer(message, context={'request': request})
    return Response({'message': serializer.data}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_unread_messages_count(request):
    """
    Return total unread incoming messages count for notifications badge.
    """
    count = Message.objects.filter(recipient=request.user, is_read=False).count()
    return Response({'unread_count': count}, status=status.HTTP_200_OK)


