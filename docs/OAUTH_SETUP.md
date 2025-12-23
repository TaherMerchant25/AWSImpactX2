# 🔐 Supabase OAuth Setup Guide

Step-by-step guide to enable Google, GitHub, and Microsoft authentication for ASPERA.

## 🎯 Quick Setup (10 minutes)

### Step 1: Configure OAuth Providers in Supabase

1. Go to your Supabase dashboard: https://wdbxvhjibcmwgpggiwgw.supabase.co
2. Navigate to **Authentication** → **Providers**

### Step 2: Enable Google OAuth

1. In Supabase **Providers**, scroll to **Google** and toggle it **ON**
2. Get Google OAuth credentials:
   - Visit [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Go to **APIs & Services** → **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `ASPERA Platform`
   - Authorized redirect URIs:
     ```
     https://wdbxvhjibcmwgpggiwgw.supabase.co/auth/v1/callback
     ```
   - Click **CREATE**
   - Copy **Client ID** and **Client Secret**
3. Back in Supabase:
   - Paste **Client ID**
   - Paste **Client secret**
   - Click **Save**

### Step 3: Enable GitHub OAuth

1. In Supabase **Providers**, scroll to **GitHub** and toggle it **ON**
2. Get GitHub OAuth credentials:
   - Visit [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **New OAuth App**
   - Application name: `ASPERA Platform`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL:
     ```
     https://wdbxvhjibcmwgpggiwgw.supabase.co/auth/v1/callback
     ```
   - Click **Register application**
   - Click **Generate a new client secret**
   - Copy **Client ID** and **Client Secret**
3. Back in Supabase:
   - Paste **Client ID**
   - Paste **Client secret**
   - Click **Save**

### Step 4: Enable Microsoft/Azure OAuth (Optional)

1. In Supabase **Providers**, scroll to **Azure (Microsoft)** and toggle it **ON**
2. Get Azure OAuth credentials:
   - Visit [Azure Portal](https://portal.azure.com/)
   - Go to **Microsoft Entra ID** (formerly Azure AD)
   - Click **App registrations** → **New registration**
   - Name: `ASPERA Platform`
   - Redirect URI:
     ```
     https://wdbxvhjibcmwgpggiwgw.supabase.co/auth/v1/callback
     ```
   - Click **Register**
   - Copy **Application (client) ID**
   - Go to **Certificates & secrets** → **New client secret**
   - Copy the secret value
3. Back in Supabase:
   - Paste **Azure Client ID**
   - Paste **Azure Secret**
   - Click **Save**

### Step 5: Configure Site URL

1. In Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Set these values:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:**
     ```
     http://localhost:3000/auth/callback
     http://localhost:3000/dashboard
     ```

### Step 6: Test Authentication

1. Start the frontend:
   ```powershell
   cd frontend
   npm run dev
   ```

2. Open http://localhost:3000
3. Click **Sign In** button
4. Try each provider (Google, GitHub, Microsoft)
5. After successful auth, you should be redirected to dashboard

## 🔧 How It Works

### Authentication Flow

1. **User clicks "Sign In"** → Opens AuthModal
2. **Selects provider** → Redirects to provider (Google/GitHub/Microsoft)
3. **User authorizes** → Provider redirects to `/auth/callback`
4. **Callback exchanges code** → Gets session token
5. **User redirected** → Dashboard with authenticated session

### Key Files

- **`lib/auth-context.tsx`** - Auth state management
- **`components/ui/auth-modal.tsx`** - Sign-in modal
- **`components/ui/hero-landing-page.tsx`** - Landing with auth UI
- **`app/auth/callback/route.ts`** - OAuth callback handler
- **`app/layout.tsx`** - Auth provider wrapper

### Session Management

```typescript
// Get current user
const { user, session } = useAuth()

// Check if authenticated
if (user) {
  // User is signed in
  console.log(user.email)
}

// Sign out
await signOut()
```

## 🎨 UI Features

### Landing Page
- **Sign In button** in top nav (when not authenticated)
- **User email + Sign Out** in top nav (when authenticated)
- **Get Started button** → Opens auth modal or goes to dashboard

### Auth Modal
- Google OAuth (white button)
- GitHub OAuth (dark button)
- Microsoft OAuth (blue button)
- Error handling
- Loading states
- ESC key to close

## 🔒 Security Best Practices

### Environment Variables
Already configured in `frontend/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://wdbxvhjibcmwgpggiwgw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Row Level Security (RLS)
Supabase automatically handles user sessions. For production, add RLS policies:

```sql
-- Example: Users can only see their own documents
ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Users can view own documents"
ON documents FOR SELECT
USING (auth.uid() = user_id);
```

## 📱 Responsive Design

Auth modal works on:
- ✅ Desktop (centered modal)
- ✅ Tablet (full-width modal)
- ✅ Mobile (full-screen experience)

## 🐛 Troubleshooting

### OAuth Redirect Not Working
- Check **Site URL** in Supabase matches exactly
- Verify **Redirect URLs** includes callback URL
- Clear browser cookies and try again

### "Invalid OAuth state" Error
- Ensure Supabase project URL is correct
- Check OAuth provider redirect URI is exactly:
  `https://wdbxvhjibcmwgpggiwgw.supabase.co/auth/v1/callback`

### User Not Persisting After Refresh
- Check cookies are enabled
- Verify session is being stored correctly
- Look for console errors

### Provider-Specific Issues

**Google:**
- Ensure Google Cloud project has OAuth consent screen configured
- Add test users if app is in testing mode
- Check scopes include email and profile

**GitHub:**
- Verify callback URL has no trailing slash
- Check user email is public or request `user:email` scope

**Microsoft:**
- Ensure app has proper permissions in Azure
- Add redirect URI in both **Web** and **Single-page application** platforms

## 🚀 Production Deployment

When deploying to production:

1. **Update Site URLs** in Supabase:
   ```
   https://your-domain.com
   https://your-domain.com/auth/callback
   ```

2. **Update OAuth Redirect URIs** in each provider:
   - Google Cloud Console
   - GitHub OAuth Apps
   - Azure App Registration

3. **Update Environment Variables**:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://wdbxvhjibcmwgpggiwgw.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```

4. **Enable Email Confirmations** (optional):
   - Supabase **Authentication** → **Email Auth**
   - Toggle **Confirm email** ON

## ✅ Verification Checklist

- [ ] OAuth providers enabled in Supabase
- [ ] Site URL configured correctly
- [ ] Redirect URLs added
- [ ] Provider credentials (Client ID & Secret) saved
- [ ] Frontend environment variables set
- [ ] `npm install` completed
- [ ] Frontend dev server running
- [ ] Test sign-in with each provider
- [ ] User shown in nav after auth
- [ ] Dashboard accessible after auth
- [ ] Sign out works correctly

## 📊 Monitor Authentication

In Supabase dashboard:
- **Authentication** → **Users** - See all signed-up users
- **Authentication** → **Logs** - View auth events
- **Database** → **auth.users** - Raw user data

## 🎯 Next Steps

After OAuth is working:
1. Protect dashboard route (require authentication)
2. Add user profile page
3. Link documents to user accounts
4. Implement role-based access control
5. Add email notifications for findings

---

**Your authentication is now ready!** 🎉

Users can sign in with Google, GitHub, or Microsoft to access the ASPERA platform.
