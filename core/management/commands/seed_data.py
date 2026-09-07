import os
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.conf import settings
from core.models import Profile, Post, Comment, Follow


def generate_avatar(username, bg_color):
    """Generate a clean colored avatar image with initials using Pillow."""
    img = Image.new('RGB', (200, 200), color=bg_color)
    draw = ImageDraw.Draw(img)
    initial = username[:2].upper()
    
    # Draw simple circular border and text
    draw.rectangle([5, 5, 195, 195], outline=(255, 255, 255), width=4)
    
    # Try basic text drawing
    draw.text((70, 75), initial, fill=(255, 255, 255))
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return ContentFile(buffer.getvalue(), name=f"{username}_avatar.png")


def generate_post_image(title, bg_color):
    """Generate a clean banner image for demo posts."""
    img = Image.new('RGB', (800, 450), color=bg_color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 790, 440], outline=(255, 255, 255), width=6)
    draw.text((50, 210), title, fill=(255, 255, 255))
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    return ContentFile(buffer.getvalue(), name=f"{title.replace(' ', '_').lower()}.png")


class Command(BaseCommand):
    help = "Seed database with realistic demo users, posts, comments, likes, and follows."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding ConnectSphere demo data..."))

        # Create superuser if doesn't exist
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@connectsphere.io", "is_staff": True, "is_superuser": True}
        )
        if created:
            admin_user.set_password("AdminPass123!")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("Created superuser: admin / AdminPass123!"))
        else:
            admin_user.set_password("AdminPass123!")
            admin_user.save()

        # Demo users definition
        users_data = [
            {
                "username": "alice",
                "email": "alice@connectsphere.io",
                "bio": "Lead Full-Stack Architect & Open Source enthusiast. Building modern reactive systems.",
                "color": (67, 97, 238)
            },
            {
                "username": "bob",
                "email": "bob@connectsphere.io",
                "bio": "UI/UX Designer crafting sleek dark-mode experiences, motion graphics & typography.",
                "color": (114, 9, 183)
            },
            {
                "username": "charlie",
                "email": "charlie@connectsphere.io",
                "bio": "AI Researcher & Pythonista. Curious about neural networks and generative modeling.",
                "color": (76, 201, 240)
            },
            {
                "username": "diana",
                "email": "diana@connectsphere.io",
                "bio": "Cloud DevOps Engineer & Cloud-native architect. Kubernetes, Docker & CI/CD pipeline automation.",
                "color": (247, 37, 133)
            },
            {
                "username": "edward",
                "email": "edward@connectsphere.io",
                "bio": "Mobile engineer & tech blogger. Passionate about cross-platform frameworks and accessibility.",
                "color": (58, 12, 163)
            }
        ]

        user_objects = {}

        for u in users_data:
            user, u_created = User.objects.get_or_create(
                username=u["username"],
                defaults={"email": u["email"]}
            )
            user.set_password("DemoPassword123!")
            user.email = u["email"]
            user.save()

            profile, _ = Profile.objects.get_or_create(user=user)
            profile.bio = u["bio"]
            if not profile.profile_picture:
                profile.profile_picture.save(
                    f"{u['username']}_avatar.png",
                    generate_avatar(u["username"], u["color"]),
                    save=True
                )
            else:
                profile.save()

            user_objects[u["username"]] = user
            action_label = "Created" if u_created else "Updated"
            self.stdout.write(f"  {action_label} user: @{user.username}")

        # Follow relationships
        follow_pairs = [
            ("alice", "bob"),
            ("alice", "charlie"),
            ("bob", "alice"),
            ("bob", "diana"),
            ("charlie", "alice"),
            ("charlie", "edward"),
            ("diana", "alice"),
            ("diana", "bob"),
            ("diana", "charlie"),
            ("edward", "alice"),
            ("edward", "bob"),
        ]

        for f_name, t_name in follow_pairs:
            f_user = user_objects.get(f_name)
            t_user = user_objects.get(t_name)
            if f_user and t_user and f_user != t_user:
                Follow.objects.get_or_create(follower=f_user, following=t_user)

        self.stdout.write(self.style.SUCCESS("  Configured follow connections."))

        # Demo posts
        posts_data = [
            {
                "author": "alice",
                "content": "Welcome to ConnectSphere! 🚀 Built completely from scratch with Python, Django REST Framework, and clean modern JavaScript. Loving this responsive interface!",
                "has_image": True,
                "banner_title": "Welcome to ConnectSphere",
                "banner_color": (33, 37, 41)
            },
            {
                "author": "alice",
                "content": "Just finished refactoring the database queries with select_related and prefetch_related. Loading feeds with zero redundant N+1 queries feels magical.",
                "has_image": False
            },
            {
                "author": "bob",
                "content": "Aesthetics matter! A dark theme with glassmorphic cards and subtle gradients gives users that sleek, modern feeling without sacrificing usability or performance.",
                "has_image": True,
                "banner_title": "Design Systems & Aesthetics",
                "banner_color": (15, 23, 42)
            },
            {
                "author": "bob",
                "content": "What's everyone's favorite CSS feature in recent years? CSS Grid and subgrid have fundamentally changed how I organize component layouts.",
                "has_image": False
            },
            {
                "author": "charlie",
                "content": "Deep learning models are scaling at breakneck speed, but simple algorithmic foundations and clean architectures still determine real-world performance.",
                "has_image": True,
                "banner_title": "AI & Neural Architectures",
                "banner_color": (17, 24, 39)
            },
            {
                "author": "charlie",
                "content": "Tested out the new REST endpoints here on ConnectSphere. Clean JSON responses with complete error validation makes consuming APIs so effortless.",
                "has_image": False
            },
            {
                "author": "diana",
                "content": "Deployment tip: Always containerize with lightweight multi-stage builds. Minimized images keep CI/CD build times sub-minute and production rock solid.",
                "has_image": True,
                "banner_title": "Cloud Infrastructure & CI/CD",
                "banner_color": (24, 24, 27)
            },
            {
                "author": "diana",
                "content": "Monitoring latency across services today. Having standardized health checks and structured logs makes diagnosing bottlenecks 10x faster.",
                "has_image": False
            },
            {
                "author": "edward",
                "content": "Interactive UI without hefty frontend frameworks is surprisingly refreshing. Vanilla JS async/await with native fetch keeps bundles ultra lightweight!",
                "has_image": True,
                "banner_title": "Vanilla JS Power",
                "banner_color": (30, 41, 59)
            },
            {
                "author": "edward",
                "content": "Testing the like and comment interactions right now! Instant feedback without page reload makes the feed feel super snappy.",
                "has_image": False
            },
            {
                "author": "alice",
                "content": "Shoutout to everyone sharing their knowledge here on ConnectSphere. Let's keep building great software together! ✨",
                "has_image": False
            }
        ]

        created_posts = []
        for p_data in posts_data:
            author = user_objects.get(p_data["author"])
            if not author:
                continue

            post, p_created = Post.objects.get_or_create(
                author=author,
                content=p_data["content"]
            )

            if p_created and p_data.get("has_image"):
                img_file = generate_post_image(p_data["banner_title"], p_data["banner_color"])
                post.image.save(f"post_{post.id}.png", img_file, save=True)

            created_posts.append(post)

        self.stdout.write(self.style.SUCCESS(f"  Created/verified {len(created_posts)} posts."))

        # Demo comments
        demo_comments = [
            (0, "bob", "Incredible work Alice! The interface is so smooth."),
            (0, "charlie", "Loving the speed of this platform!"),
            (1, "diana", "Pre-fetching queries is a game changer for scale!"),
            (2, "alice", "Totally agree Bob! Dark mode + glassmorphism looks stunning."),
            (2, "edward", "The contrast and typography here are top-notch."),
            (4, "alice", "Exciting times in AI research!"),
            (6, "charlie", "Multi-stage Docker builds save so much bandwidth."),
            (8, "bob", "Vanilla JS is definitely underrated! Fast and no bundle bloat.")
        ]

        for post_idx, commenter_name, comment_text in demo_comments:
            if post_idx < len(created_posts):
                post = created_posts[post_idx]
                commenter = user_objects.get(commenter_name)
                if commenter:
                    Comment.objects.get_or_create(
                        post=post,
                        author=commenter,
                        text=comment_text
                    )

        # Demo likes
        like_matrix = [
            (0, ["bob", "charlie", "diana", "edward"]),
            (1, ["charlie", "diana"]),
            (2, ["alice", "edward", "charlie"]),
            (4, ["alice", "diana"]),
            (6, ["alice", "bob", "charlie"]),
            (8, ["alice", "bob", "diana"])
        ]

        for post_idx, liker_names in like_matrix:
            if post_idx < len(created_posts):
                post = created_posts[post_idx]
                for liker_name in liker_names:
                    liker = user_objects.get(liker_name)
                    if liker:
                        post.likes.add(liker)

        self.stdout.write(self.style.SUCCESS("Demo seeding completed successfully!"))
        self.stdout.write(self.style.SUCCESS("All users password: DemoPassword123!"))
        self.stdout.write(self.style.SUCCESS("Superuser: admin / AdminPass123!"))
