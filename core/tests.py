from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from rest_framework.test import APIClient
from rest_framework import status
from .models import Profile, Post, Comment, Follow


class ConnectSphereTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create two primary test users
        self.user1 = User.objects.create_user(
            username="user_one",
            email="user1@example.com",
            password="Password123!"
        )
        self.user2 = User.objects.create_user(
            username="user_two",
            email="user2@example.com",
            password="Password123!"
        )

        # Create a post authored by user1
        self.post1 = Post.objects.create(
            author=self.user1,
            content="Hello ConnectSphere from user1!"
        )

    # 1. User registration
    def test_01_user_registration(self):
        response = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'StrongPassword123!',
            'confirm_password': 'StrongPassword123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())
        self.assertTrue(Profile.objects.filter(user__username='newuser').exists())

    # 2. Login
    def test_02_user_login(self):
        response = self.client.post('/api/login/', {
            'username': 'user_one',
            'password': 'Password123!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'user_one')

    # 3. Logout
    def test_03_user_logout(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/logout/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # 3b. Current user unauthenticated returns 401
    def test_03b_unauthenticated_me(self):
        response = self.client.get('/api/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 4. Profile creation (auto-created on User creation)
    def test_04_profile_auto_creation(self):
        self.assertTrue(hasattr(self.user1, 'profile'))
        self.assertIsNotNone(self.user1.profile)
        self.assertEqual(self.user1.profile.user, self.user1)

    # 5. Profile update
    def test_05_profile_update(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.put('/api/profile/', {
            'bio': 'Updated software engineer bio'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user1.profile.refresh_from_db()
        self.assertEqual(self.user1.profile.bio, 'Updated software engineer bio')

    # 6. Profile permissions (unauthenticated cannot update profile)
    def test_06_profile_update_permissions(self):
        response = self.client.put('/api/profile/', {
            'bio': 'Hacker update'
        }, format='json')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    # 7. Post creation
    def test_07_post_creation(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/posts/create/', {
            'content': 'Brand new post by user1'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['author'], 'user_one')
        self.assertEqual(response.data['content'], 'Brand new post by user1')

    # 8. Post retrieval
    def test_08_post_retrieval(self):
        response = self.client.get(f'/api/posts/{self.post1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.post1.id)
        self.assertEqual(response.data['content'], self.post1.content)

    # 9. Post update by author
    def test_09_post_update_by_author(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.put(f'/api/posts/{self.post1.id}/update/', {
            'content': 'Edited content'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.post1.refresh_from_db()
        self.assertEqual(self.post1.content, 'Edited content')

    # 10. Post delete by author
    def test_10_post_delete_by_author(self):
        post_to_delete = Post.objects.create(author=self.user1, content="To delete")
        self.client.force_authenticate(user=self.user1)
        response = self.client.delete(f'/api/posts/{post_to_delete.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Post.objects.filter(id=post_to_delete.id).exists())

    # 11. Unauthorized post modification (user2 cannot edit user1's post)
    def test_11_unauthorized_post_modification(self):
        self.client.force_authenticate(user=self.user2)
        # Try update
        response = self.client.put(f'/api/posts/{self.post1.id}/update/', {
            'content': 'Malicious modification'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Try delete
        response = self.client.delete(f'/api/posts/{self.post1.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # 12. Comment creation
    def test_12_comment_creation(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(f'/api/posts/{self.post1.id}/comments/', {
            'text': 'Great post!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['author'], 'user_two')
        self.assertEqual(response.data['text'], 'Great post!')

    # 13. Comment retrieval
    def test_13_comment_retrieval(self):
        Comment.objects.create(post=self.post1, author=self.user2, text="First comment")
        Comment.objects.create(post=self.post1, author=self.user1, text="Second comment")
        response = self.client.get(f'/api/posts/{self.post1.id}/comments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    # 14. Like toggle (like post)
    def test_14_like_toggle_add(self):
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(f'/api/posts/{self.post1.id}/like/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['liked'])
        self.assertEqual(response.data['like_count'], 1)
        self.assertTrue(self.post1.likes.filter(id=self.user2.id).exists())

    # 15. Unlike toggle (unlike post)
    def test_15_unlike_toggle_remove(self):
        self.post1.likes.add(self.user2)
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(f'/api/posts/{self.post1.id}/like/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['liked'])
        self.assertEqual(response.data['like_count'], 0)
        self.assertFalse(self.post1.likes.filter(id=self.user2.id).exists())

    # 16. Follow toggle (follow user)
    def test_16_follow_toggle_add(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/users/{self.user2.username}/follow/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['following'])
        self.assertEqual(response.data['follower_count'], 1)
        self.assertTrue(Follow.objects.filter(follower=self.user1, following=self.user2).exists())

    # 17. Unfollow toggle (unfollow user)
    def test_17_unfollow_toggle_remove(self):
        Follow.objects.create(follower=self.user1, following=self.user2)
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/users/{self.user2.username}/follow/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['following'])
        self.assertEqual(response.data['follower_count'], 0)
        self.assertFalse(Follow.objects.filter(follower=self.user1, following=self.user2).exists())

    # 18. Prevent self-follow
    def test_18_prevent_self_follow(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post(f'/api/users/{self.user1.username}/follow/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

        # Also test model-level validation
        with self.assertRaises(ValidationError):
            f = Follow(follower=self.user1, following=self.user1)
            f.clean()

    # 19. Prevent duplicate follows
    def test_19_prevent_duplicate_follows(self):
        Follow.objects.create(follower=self.user1, following=self.user2)
        with self.assertRaises(IntegrityError):
            Follow.objects.create(follower=self.user1, following=self.user2)

    # 20. Feed generation (includes self posts and followed users' posts)
    def test_20_feed_generation(self):
        user3 = User.objects.create_user(username="user_three", email="user3@example.com", password="Password123!")
        post_user2 = Post.objects.create(author=self.user2, content="User 2 post")
        post_user3 = Post.objects.create(author=user3, content="User 3 post")

        # user1 follows user2, but does NOT follow user3
        Follow.objects.create(follower=self.user1, following=self.user2)

        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/feed/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        feed_post_ids = [p['id'] for p in response.data]
        self.assertIn(self.post1.id, feed_post_ids)      # user1's own post
        self.assertIn(post_user2.id, feed_post_ids)     # followed user2's post
        self.assertNotIn(post_user3.id, feed_post_ids)  # not-followed user3's post

    # 21. User search (case-insensitive)
    def test_21_user_search(self):
        response = self.client.get('/api/search/?q=user_one')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in response.data]
        self.assertIn('user_one', usernames)

        # Case-insensitive query
        response_ci = self.client.get('/api/search/?q=USER_TWO')
        self.assertEqual(response_ci.status_code, status.HTTP_200_OK)
        usernames_ci = [u['username'] for u in response_ci.data]
        self.assertIn('user_two', usernames_ci)

    # 22. Password change with automated security email notification
    def test_22_change_password_and_email_notification(self):
        from django.core import mail
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/settings/change-password/', {
            'current_password': 'Password123!',
            'new_password': 'NewPassword456!',
            'confirm_password': 'NewPassword456!'
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['email_sent'])
        self.assertEqual(response.data['email_recipient'], 'user1@example.com')

        # Verify user password updated
        self.user1.refresh_from_db()
        self.assertTrue(self.user1.check_password('NewPassword456!'))

        # Verify security notification email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Security Alert', mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ['user1@example.com'])
        self.assertIn('user_one', mail.outbox[0].body)

    # 23. Comment like toggle
    def test_23_comment_like_toggle(self):
        comment = Comment.objects.create(
            post=self.post1,
            author=self.user2,
            text="Hello @user_one, check this out!"
        )

        # Unauthenticated cannot like comment
        res_unauth = self.client.post(f'/api/comments/{comment.id}/like/')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # Authenticated user1 likes comment
        self.client.force_authenticate(user=self.user1)
        res_like = self.client.post(f'/api/comments/{comment.id}/like/')
        self.assertEqual(res_like.status_code, status.HTTP_200_OK)
        self.assertTrue(res_like.data['liked'])
        self.assertEqual(res_like.data['like_count'], 1)

        # Authenticated user1 unlikes comment
        res_unlike = self.client.post(f'/api/comments/{comment.id}/like/')
        self.assertEqual(res_unlike.status_code, status.HTTP_200_OK)
        self.assertFalse(res_unlike.data['liked'])
        self.assertEqual(res_unlike.data['like_count'], 0)

    # 24. Comment serialization includes like_count and liked_by_current_user
    def test_24_comment_serialization_likes(self):
        comment = Comment.objects.create(
            post=self.post1,
            author=self.user2,
            text="Testing serialization with @user_one"
        )
        comment.likes.add(self.user1)

        # When fetched by user1 (who liked it)
        self.client.force_authenticate(user=self.user1)
        res = self.client.get(f'/api/posts/{self.post1.id}/comments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        target = next(c for c in res.data if c['id'] == comment.id)
        self.assertEqual(target['like_count'], 1)
        self.assertTrue(target['liked_by_current_user'])

        # When fetched by user2 (who did not like it)
        self.client.force_authenticate(user=self.user2)
        res2 = self.client.get(f'/api/posts/{self.post1.id}/comments/')
        target2 = next(c for c in res2.data if c['id'] == comment.id)
        self.assertEqual(target2['like_count'], 1)
        self.assertFalse(target2['liked_by_current_user'])

    # 25. Active status tracking in Direct Messages
    def test_25_partner_active_status(self):
        from django.utils import timezone
        import datetime
        from .models import Message

        # Set user2 last_seen to now
        self.user2.profile.last_seen = timezone.now()
        self.user2.profile.save()

        self.client.force_authenticate(user=self.user1)
        res = self.client.get(f'/api/messages/{self.user2.username}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        partner = res.data['partner']
        self.assertTrue(partner['is_online'])
        self.assertEqual(partner['status_text'], 'Active now')

        # Change user2 last_seen to 2 hours ago
        self.user2.profile.last_seen = timezone.now() - datetime.timedelta(hours=2)
        self.user2.profile.save()

        res2 = self.client.get(f'/api/messages/{self.user2.username}/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        partner2 = res2.data['partner']
        self.assertFalse(partner2['is_online'])
        self.assertEqual(partner2['status_text'], 'Active 2h ago')

        # Test active status in conversation list
        Message.objects.create(sender=self.user1, recipient=self.user2, content="Test msg")
        res3 = self.client.get('/api/conversations/')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        conv = next(c for c in res3.data['conversations'] if c['partner']['username'] == self.user2.username)
        self.assertIn('is_online', conv['partner'])
        self.assertIn('status_text', conv['partner'])

    # 26. Message reply with quote support
    def test_26_message_reply(self):
        from .models import Message, Follow
        Follow.objects.get_or_create(follower=self.user1, following=self.user2)
        Follow.objects.get_or_create(follower=self.user2, following=self.user1)

        msg1 = Message.objects.create(sender=self.user2, recipient=self.user1, content="Hello there!")

        self.client.force_authenticate(user=self.user1)
        res = self.client.post(f'/api/messages/{self.user2.username}/send/', {
            'content': 'Replying to your hello!',
            'reply_to_id': msg1.id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        data = res.data['message']
        self.assertEqual(data['reply_to_id'], msg1.id)
        self.assertEqual(data['reply_to_sender'], self.user2.username)
        self.assertEqual(data['reply_to_content'], "Hello there!")

    # 27. Message editing
    def test_27_message_edit(self):
        from .models import Message, Follow
        Follow.objects.get_or_create(follower=self.user1, following=self.user2)

        msg = Message.objects.create(sender=self.user1, recipient=self.user2, content="Original typo text")

        # Edit own message
        self.client.force_authenticate(user=self.user1)
        res = self.client.patch(f'/api/messages/{msg.id}/edit/', {
            'content': 'Corrected text'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['message']['content'], 'Corrected text')
        self.assertTrue(res.data['message']['is_edited'])

        # Attempt to edit someone else's message returns 403
        self.client.force_authenticate(user=self.user2)
        res2 = self.client.patch(f'/api/messages/{msg.id}/edit/', {
            'content': 'Hacked text'
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

    # 28. Hashtag and post search
    def test_28_search_posts_and_hashtags(self):
        Post.objects.create(author=self.user1, content="Exploring #AI and #Python on ConnectSphere!")
        Post.objects.create(author=self.user2, content="Another random post without tags")

        # Search posts by hashtag
        res = self.client.get('/api/search/?q=%23AI&type=posts')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res.data), 1)
        self.assertIn('#AI', res.data[0]['content'])

        # Search all
        res_all = self.client.get('/api/search/?q=Python&type=all')
        self.assertEqual(res_all.status_code, status.HTTP_200_OK)
        self.assertIn('users', res_all.data)
        self.assertIn('posts', res_all.data)
        self.assertGreaterEqual(len(res_all.data['posts']), 1)
