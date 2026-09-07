# ConnectSphere — Mini Social Media Platform

ConnectSphere is a full-stack, responsive mini social media web platform engineered with **Python 3**, **Django 6**, **Django REST Framework**, and **Vanilla HTML5, CSS3, and JavaScript**.

The platform provides a modern, fast, and secure social experience: personalized user feeds, user profiles, rich post authoring with media uploads, real-time threaded comments, an interactive toggle-based like system, follow/unfollow capabilities, and dynamic user exploration/search.

---

## 🚀 Key Features

- **User Authentication & Session Management**:
  - Secure registration with validation (username uniqueness, email format, password confirmation, minimum length).
  - Session-based login and logout via Django Authentication.
  - Automatic profile provisioning with signals.
  - `/api/me/` endpoint returning authenticated user state.
- **User Profiles**:
  - Bio editing and avatar uploads (with Pillow image processing).
  - Dynamic user stats: post count, follower count, following count.
  - Interactive Follow/Unfollow toggle button for visiting other profiles.
  - Owner-only "Edit Profile" controls.
- **Rich Post Authoring & CRUD**:
  - Real-time post composer with image attachment preview.
  - Full CRUD: Create, Read, Update, and Delete.
  - Strict ownership permissions: users can only edit or delete their own posts (enforced with HTTP 403).
- **Personalized Feed**:
  - Algorithmic feed aggregating the user's own posts and posts from accounts they follow.
  - Sorted newest first.
  - Optimized database queries using `select_related` and `prefetch_related` to eliminate N+1 query overhead.
- **Interactive Like/Unlike System**:
  - Single-click like toggle without page reload.
  - Many-to-many relationship preventing duplicate likes naturally.
  - Animated heart icon with real-time counter updates.
- **Comment Threads**:
  - Threaded comments per post.
  - Instant comment submission using asynchronous `fetch()` without page refreshes.
- **Follow & Unfollow System**:
  - Modern `UniqueConstraint` preventing duplicate follows.
  - Database-level constraint and model validation preventing self-following.
  - Instant follower/following counter synchronization.
- **Explore & Search**:
  - Real-time debounced username search with case-insensitive queries (`/api/search/?q=`).
  - Suggested/trending user profiles when search query is empty.
  - Direct follow/unfollow capability from search cards.
- **Django Admin Integration**:
  - Custom admin interfaces for Users/Profiles, Posts, Comments, and Follows with search filters and statistics.
- **Modern Responsive Design**:
  - Dark theme with glassmorphic cards, indigo/violet gradients, responsive CSS Grid and Flexbox layouts.
  - Mobile bottom navigation bar and responsive views tailored for phones, tablets, and desktops.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.13+, Django 6.1+, Django REST Framework 3.18+
- **Frontend**: HTML5, CSS3 (Vanilla design system), Vanilla JavaScript (ES6+ async/await, native `fetch`)
- **Database**: SQLite (Development) / PostgreSQL-ready architecture
- **Image Processing**: Pillow 12.2+
- **Authentication**: Django Session Authentication with standard CSRF protection
- **CORS**: `django-cors-headers`

---

## 📁 Project Structure

```
connectsphere/
│
├── manage.py
├── requirements.txt
├── README.md
├── .gitignore
│
├── connectsphere/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── core/
│   ├── __init__.py
│   ├── admin.py
│   ├── apps.py
│   ├── models.py
│   ├── serializers.py
│   ├── signals.py
│   ├── urls.py
│   ├── views.py
│   ├── tests.py
│   │
│   └── management/
│       ├── __init__.py
│       └── commands/
│           ├── __init__.py
│           └── seed_data.py
│
├── templates/
│   ├── base.html
│   ├── login.html
│   ├── register.html
│   ├── home.html
│   ├── profile.html
│   ├── post_detail.html
│   └── explore.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── common.js
│       ├── auth.js
│       ├── home.js
│       ├── profile.js
│       ├── post.js
│       └── explore.js
│
└── media/
    ├── profiles/
    └── posts/
```

---

## 📦 Installation & Setup

### 1. Clone or Open Workspace
Open a terminal in the root directory:
```bash
cd "c:\Users\B Karthik\Downloads\Code_Alpha Mini Social Media"
```

### 2. Create and Activate Virtual Environment

#### Windows (PowerShell / Command Prompt):
```powershell
python -m venv venv
.\venv\Scripts\activate
```

#### macOS / Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Seed Realistic Demo Data
Run the automated seed command to populate demo users, posts, images, comments, likes, and follow links:
```bash
python manage.py seed_data
```

### 6. Create Superuser (Optional)
A default superuser `admin` is automatically configured by `seed_data`, but you can create additional admin users:
```bash
python manage.py createsuperuser
```

### 7. Run the Development Server
```bash
python manage.py runserver
```
Visit the application at: **http://127.0.0.1:8000/**  
Visit the Django Admin at: **http://127.0.0.1:8000/admin/**

---

## 🔑 Demo Credentials

| Username | Password | Email | Role |
| :--- | :--- | :--- | :--- |
| `admin` | `AdminPass123!` | admin@connectsphere.io | Superuser / Administrator |
| `alice` | `DemoPassword123!` | alice@connectsphere.io | Full-Stack Architect |
| `bob` | `DemoPassword123!` | bob@connectsphere.io | UI/UX Designer |
| `charlie` | `DemoPassword123!` | charlie@connectsphere.io | AI Researcher |
| `diana` | `DemoPassword123!` | diana@connectsphere.io | Cloud DevOps Engineer |
| `edward` | `DemoPassword123!` | edward@connectsphere.io | Mobile Engineer |

---

## 📡 REST API Summary

### Authentication Endpoints
- `POST /api/register/` — Register new user, create profile, establish session.
- `POST /api/login/` — Authenticate via username/email and password.
- `POST /api/logout/` — Terminate current session.
- `GET /api/me/` — Retrieve currently authenticated user details (returns 401 if unauthenticated).

### User & Profile Endpoints
- `GET /api/users/<username>/` — Full profile view with stats, posts, and follow relationship.
- `PUT /api/profile/` — Update own bio and/or profile avatar (multipart supported).
- `POST /api/users/<username>/follow/` — Toggle follow/unfollow status.
- `GET /api/users/<username>/followers/` — List users following the target user.
- `GET /api/users/<username>/following/` — List users followed by target user.
- `GET /api/search/?q=<query>` — Case-insensitive user search with debounced frontend querying.

### Post & Interaction Endpoints
- `GET /api/feed/` — Personalized feed (self + followed users' posts, newest first).
- `POST /api/posts/create/` — Create new post with text and optional media upload.
- `GET /api/posts/<id>/` — Retrieve single post details.
- `PUT /api/posts/<id>/update/` — Update post content (author only, returns 403 otherwise).
- `DELETE /api/posts/<id>/delete/` — Delete post (author only, returns 403 otherwise).
- `POST /api/posts/<id>/like/` — Toggle like status (`{"liked": bool, "like_count": int}`).
- `GET /api/posts/<id>/comments/` — List all comments for a post.
- `POST /api/posts/<id>/comments/` — Add comment to a post.

---

## 🛡️ Security & CSRF Architecture

1. **CSRF Protection**:
   - Django's `CsrfViewMiddleware` is enabled for all state-changing endpoints (`POST`, `PUT`, `DELETE`).
   - CSRF tokens are embedded in `<meta name="csrf-token">` and transmitted automatically by the `apiRequest()` JavaScript wrapper via the `X-CSRFToken` header.
2. **Authorization & Permissions**:
   - Posts and profiles can only be updated or deleted by their respective owners. Unauthorized attempts are rejected with `HTTP 403 Forbidden`.
   - Unauthenticated access to protected endpoints returns `HTTP 401 Unauthorized`.
3. **Database-Level Integrity**:
   - `models.UniqueConstraint(fields=['follower', 'following'])` enforces follow uniqueness.
   - `models.CheckConstraint(condition=~Q(follower=F('following')))` prevents self-follows at the database engine level, complemented by Django model `clean()` validation.

---

## 🧪 Automated Testing

Execute the complete 22-test automated test suite covering all authentication, authorization, CRUD, like/follow toggling, feed generation, and search scenarios:
```bash
python manage.py test core -v 2
```

---

## 🐘 Future PostgreSQL Production Deployment

The models and settings are designed to be 100% PostgreSQL-compatible:
1. Install `psycopg2-binary` and `dj-database-url`.
2. Configure environment variable `DATABASE_URL=postgres://user:password@host:5432/connectsphere`.
3. Replace the `DATABASES` dictionary in `connectsphere/settings.py`:
   ```python
   import dj_database_url
   DATABASES = {
       'default': dj_database_url.config(default='sqlite:///db.sqlite3')
   }
   ```
4. Run `python manage.py migrate`.
