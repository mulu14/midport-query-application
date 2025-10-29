# NextAuth.js Integration Proposal

## 📋 Executive Summary

This document proposes integrating [NextAuth.js](https://next-auth.js.org) into the Midport Query Application to replace the current custom authentication system with an industry-standard, secure authentication framework.

**Status**: 🟡 Proposed (Awaiting Approval)  
**Complexity**: Medium  
**Breaking Changes**: Minimal (Hybrid migration possible)  
**Benefits**: Enhanced security, standardized sessions, route protection  

---

## 🎯 Problem Statement

### **Current Authentication System Limitations:**

1. **Manual Session Management** - Using `localStorage` (vulnerable to XSS)
2. **No Server-Side Session Validation** - Cannot verify sessions on API routes
3. **No Automatic CSRF Protection** - Vulnerable to cross-site attacks
4. **No Route Protection Middleware** - Manual checks needed on every page
5. **Client-Side Only** - No server-side authentication state
6. **Scalability Issues** - Adding OAuth providers (Google, Microsoft) would require extensive custom code

### **Current Implementation:**
```
┌────────────────────────────────────────────┐
│         Current Auth System                │
├────────────────────────────────────────────┤
│  • localStorage for session storage        │
│  • Manual API route: /api/auth/login       │
│  • Client-side state management            │
│  • No middleware protection                │
│  • Custom encryption (AES-256-GCM)         │
│  • SQLite database (user-auth.db)          │
└────────────────────────────────────────────┘
```

---

## ✅ Proposed Solution: NextAuth.js Integration

### **What is NextAuth.js?**

NextAuth.js is the industry-standard authentication library for Next.js applications, providing:
- ✅ Secure session management (JWT or database)
- ✅ Built-in CSRF protection
- ✅ Automatic middleware for route protection
- ✅ Support for 50+ OAuth providers
- ✅ TypeScript-first with excellent type safety
- ✅ Serverless-ready
- ✅ Maintained by Vercel team

### **Integration Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                    NextAuth.js Layer                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Session    │  │  Middleware  │  │   JWT/Database  │  │
│  │  Provider    │  │  Protection  │  │     Sessions    │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Credentials Provider (Custom)                │  │
│  │  - Uses existing user-auth.db                        │  │
│  │  - Uses existing EncryptionUtil                      │  │
│  │  - Validates username/password/tenant                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Existing Authentication (Preserved)             │
├─────────────────────────────────────────────────────────────┤
│  • user-auth.db (SQLite) - NO CHANGES                       │
│  • EncryptionUtil (AES-256-GCM) - NO CHANGES                │
│  • Username/Password validation - NO CHANGES                │
│  • Tenant association - NO CHANGES                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Required Dependencies

```json
{
  "dependencies": {
    "next-auth": "^5.0.0",
    "@auth/core": "^0.36.0"
  }
}
```

**Size Impact**: ~200KB (minimal compared to benefits)  
**Compatibility**: Next.js 15.5.4 ✅ Fully compatible  

---

## 🏗️ Implementation Plan

### **Phase 1: Setup & Configuration (Non-Breaking)**

**Files to Create:**
```
app/
├── api/auth/[...nextauth]/
│   └── route.ts                 # NextAuth API handler
├── auth.ts                      # Auth configuration
└── types/next-auth.d.ts         # TypeScript type extensions

middleware.ts                     # Route protection (root level)
```

**Estimated Time**: 2-3 hours  
**Risk**: Low (no breaking changes)

---

### **Phase 2: Integration (Hybrid Approach)**

**Files to Modify:**
```
app/
├── layout.tsx                   # Add SessionProvider wrapper
└── api/auth/
    ├── login/route.ts          # Mark as DEPRECATED (keep for compatibility)
    └── signup/route.ts         # Keep, add auto-login after registration

components/layout/
├── NavigationHeader.tsx         # Use useSession() instead of localStorage
├── LoginDialog.tsx              # Use signIn() from NextAuth
└── SignUpDialog.tsx             # Keep form, call NextAuth after signup
```

**Estimated Time**: 3-4 hours  
**Risk**: Low (fallback to old system if issues)

---

### **Phase 3: Route Protection**

**Routes to Protect:**
```typescript
// middleware.ts
export const config = {
  matcher: [
    '/credentials/:path*',           // Credentials management page
    '/api/credentials/:path*',       // Credentials API
    '/api/tenants/:path*',           // Tenants API
    '/api/gateway/:path*',           // Query gateway (optional)
  ]
};
```

**Estimated Time**: 1-2 hours  
**Risk**: Low (easy to adjust protected routes)

---

### **Phase 4: Cleanup (Optional)**

- Remove old login API route
- Remove localStorage session code
- Update documentation

**Estimated Time**: 1-2 hours  
**Risk**: None (only after full migration)

---

## 🔐 Security Comparison

### **Current System vs NextAuth.js**

| Feature | Current System | With NextAuth.js |
|---------|----------------|------------------|
| **Session Storage** | localStorage (client) | Secure httpOnly cookies |
| **XSS Vulnerability** | ⚠️ High risk | ✅ Protected |
| **CSRF Protection** | ❌ None | ✅ Built-in |
| **Session Invalidation** | ❌ Not possible | ✅ Server-side control |
| **Token Encryption** | Manual (AES) | ✅ JWE (A256GCM) |
| **Server-Side Validation** | ❌ Not available | ✅ On every request |
| **Rate Limiting** | ❌ Not implemented | ⚠️ Can add easily |
| **Session Expiry** | Manual checks | ✅ Automatic refresh |
| **Multi-Tab Sync** | ❌ No | ✅ Yes |
| **Mobile App Support** | ⚠️ Limited | ✅ Full support |

---

## 🔄 Authentication Flow Comparison

### **Current Flow:**
```
1. User enters credentials in LoginDialog
   ↓
2. POST to /api/auth/login
   ↓
3. Server: Encrypt username, query database, decrypt password
   ↓
4. Server: Return user object if valid
   ↓
5. Client: Store user in localStorage
   ↓
6. Client: Manual state management in NavigationHeader
   ↓
7. ⚠️ No server-side session validation
8. ⚠️ No automatic refresh
9. ⚠️ Vulnerable to XSS attacks
```

### **Proposed Flow with NextAuth.js:**
```
1. User enters credentials in LoginDialog
   ↓
2. Call signIn('credentials', { username, password, tenant })
   ↓
3. NextAuth calls authorize() callback
   ↓
4. Your existing validation logic:
   - Encrypt username with EncryptionUtil
   - Query user-auth.db
   - Decrypt and verify password
   - Return user object or null
   ↓
5. NextAuth creates secure JWT token (JWE encrypted)
   ↓
6. Token stored in httpOnly cookie (not accessible by JS)
   ↓
7. ✅ Automatic session refresh
8. ✅ Server-side validation on every request
9. ✅ Protected from XSS/CSRF attacks
10. ✅ Multi-tab session sync
```

---

## 📝 Configuration Overview

### **1. Auth Configuration (`app/auth.ts`)**

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { EncryptionUtil } from '@/lib/utils/encryption';
import sqlite3 from 'sqlite3';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        tenant: { label: "Tenant", type: "text" }
      },
      
      async authorize(credentials) {
        // ✅ Your existing logic goes here
        // 1. Encrypt username
        // 2. Query user-auth.db
        // 3. Decrypt and verify password
        // 4. Return user object if valid
        
        if (valid) {
          return {
            id: user.id,
            username: user.username,
            tenant: user.tenant
          };
        }
        return null;
      }
    })
  ],
  
  session: {
    strategy: "jwt",              // Recommended for your setup
    maxAge: 30 * 24 * 60 * 60,   // 30 days
  },
  
  callbacks: {
    async jwt({ token, user }) {
      // Add custom fields to token
      if (user) {
        token.username = user.username;
        token.tenant = user.tenant;
      }
      return token;
    },
    
    async session({ session, token }) {
      // Populate session with user data
      session.user.username = token.username;
      session.user.tenant = token.tenant;
      return session;
    }
  },
  
  pages: {
    signIn: '/',  // Your home page with LoginDialog
  },
  
  secret: process.env.NEXTAUTH_SECRET,  // Add to .env
});
```

---

### **2. API Route Handler (`app/api/auth/[...nextauth]/route.ts`)**

```typescript
import { handlers } from '@/app/auth';

export const { GET, POST } = handlers;
```

---

### **3. Middleware (`middleware.ts`)**

```typescript
export { auth as middleware } from '@/app/auth';

export const config = {
  matcher: [
    '/credentials/:path*',
    '/api/credentials/:path*',
    '/api/tenants/:path*',
  ]
};
```

---

### **4. Session Provider (`app/layout.tsx`)**

```typescript
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <SidebarModeProvider>
            <DatabaseProvider>
              <RemoteAPIProvider>
                {/* Existing layout */}
              </RemoteAPIProvider>
            </DatabaseProvider>
          </SidebarModeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

---

### **5. Login Component (`components/layout/LoginDialog.tsx`)**

```typescript
import { signIn } from 'next-auth/react';

async function handleLogin(username, password, tenant) {
  const result = await signIn('credentials', {
    username,
    password,
    tenant,
    redirect: false,  // Handle manually
  });
  
  if (result?.error) {
    setError('Invalid credentials');
  } else {
    onClose();  // Close dialog on success
  }
}
```

---

### **6. Using Session (`components/layout/NavigationHeader.tsx`)**

```typescript
import { useSession, signOut } from 'next-auth/react';

function NavigationHeader() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <LoadingSpinner />;
  }
  
  if (status === 'unauthenticated') {
    return <LoginButton onClick={() => setShowLoginDialog(true)} />;
  }
  
  return (
    <div>
      <span>Welcome, {session.user.username}</span>
      <span>Tenant: {session.user.tenant}</span>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
```

---

### **7. Protected API Route Example**

```typescript
// app/api/credentials/route.ts
import { auth } from '@/app/auth';

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // ✅ User is authenticated
  const tenant = session.user.tenant;
  
  // Your logic here...
}
```

---

## 🔧 Environment Variables

**Required Addition to `.env`:**
```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-random-secret-32-chars-or-more>

# Existing variables (no changes)
ENCRYPTION_KEY=your-existing-key
ENCRYPTION_SALT=your-existing-salt
```

**Generate Secret:**
```bash
openssl rand -base64 32
```

---

## 📊 Migration Strategy Comparison

### **Option A: Full Migration (Recommended)**

**Pros:**
- ✅ Clean, modern authentication
- ✅ Industry-standard security
- ✅ Future-proof for OAuth providers
- ✅ Better TypeScript support
- ✅ Automatic session management

**Cons:**
- ⚠️ More initial setup (6-8 hours)
- ⚠️ Learning curve
- ⚠️ Need to test thoroughly

**Timeline:** 1-2 days  
**Risk Level:** Low  
**Rollback:** Keep old system during migration  

---

### **Option B: Hybrid Approach**

**Pros:**
- ✅ Minimal changes to existing code
- ✅ Keep both systems running
- ✅ Gradual migration
- ✅ Lower risk

**Cons:**
- ⚠️ Maintaining two systems temporarily
- ⚠️ Not getting full benefits immediately
- ⚠️ More complex codebase temporarily

**Timeline:** 2-3 days (gradual)  
**Risk Level:** Very Low  
**Rollback:** Easy (just don't use new system)  

---

### **Option C: No Migration (Keep Current)**

**Pros:**
- ✅ No development time
- ✅ No learning curve
- ✅ Existing system works

**Cons:**
- ❌ Security vulnerabilities remain
- ❌ No route protection
- ❌ Manual session management
- ❌ Cannot add OAuth providers easily
- ❌ Not following industry standards

**Timeline:** N/A  
**Risk Level:** High (security)  
**Technical Debt:** Increases over time  

---

## 💰 Cost-Benefit Analysis

### **Development Cost:**
- **Initial Setup**: 6-8 hours
- **Testing**: 2-3 hours
- **Documentation Updates**: 1 hour
- **Total**: ~2 working days

### **Benefits:**

**Security Benefits:**
- 🔒 Protection from XSS attacks
- 🔒 CSRF token protection
- 🔒 Secure session storage
- 🔒 Server-side validation
- **Value**: Prevents potential security breaches (invaluable)

**Development Benefits:**
- 🚀 Easy route protection (1 line of code vs manual checks)
- 🚀 Automatic session refresh
- 🚀 Ready for OAuth providers
- 🚀 Better developer experience
- **Value**: Saves 20-30 hours on future features

**Maintenance Benefits:**
- 🛠️ Less custom code to maintain
- 🛠️ Community-supported library
- 🛠️ Regular security updates
- **Value**: Reduced maintenance burden

**ROI**: Positive within 1 month

---

## 🚦 Decision Points

### **Implement NextAuth.js If:**
- ✅ Security is a priority
- ✅ Plan to add OAuth providers (Google, Microsoft, Azure AD)
- ✅ Need server-side session validation
- ✅ Want industry-standard authentication
- ✅ Building for production use
- ✅ Have 2 days for implementation

### **Keep Current System If:**
- ⚠️ Prototype/internal tool only
- ⚠️ No time for integration
- ⚠️ No plans for OAuth
- ⚠️ Very simple auth needs
- ⚠️ Risk-averse to changes

---

## 📋 Implementation Checklist

### **Pre-Implementation:**
- [ ] Review this proposal
- [ ] Decide on migration strategy (Full vs Hybrid)
- [ ] Allocate development time
- [ ] Generate NEXTAUTH_SECRET
- [ ] Backup current database

### **Phase 1: Setup**
- [ ] Install dependencies (`next-auth`, `@auth/core`)
- [ ] Create `app/auth.ts` configuration
- [ ] Create `app/api/auth/[...nextauth]/route.ts`
- [ ] Add environment variables
- [ ] Test authentication in isolation

### **Phase 2: Integration**
- [ ] Add SessionProvider to layout
- [ ] Update LoginDialog to use `signIn()`
- [ ] Update NavigationHeader to use `useSession()`
- [ ] Update SignUpDialog to auto-login after registration
- [ ] Test login/logout flow

### **Phase 3: Route Protection**
- [ ] Create `middleware.ts`
- [ ] Protect `/credentials` route
- [ ] Protect `/api/credentials` route
- [ ] Protect `/api/tenants` route
- [ ] Test unauthorized access handling

### **Phase 4: Testing**
- [ ] Test login with valid credentials
- [ ] Test login with invalid credentials
- [ ] Test signup → auto-login flow
- [ ] Test logout
- [ ] Test protected routes (authenticated)
- [ ] Test protected routes (unauthenticated)
- [ ] Test session persistence (refresh page)
- [ ] Test multi-tab sync
- [ ] Test session expiry

### **Phase 5: Documentation**
- [ ] Update README with NextAuth.js info
- [ ] Document environment variables
- [ ] Update developer guide
- [ ] Add troubleshooting section

---

## 🔍 Testing Plan

### **Unit Tests:**
```
✓ Authorize callback with valid credentials
✓ Authorize callback with invalid credentials
✓ JWT callback adds custom fields
✓ Session callback populates user data
```

### **Integration Tests:**
```
✓ Login flow end-to-end
✓ Signup + auto-login flow
✓ Logout clears session
✓ Protected routes redirect when unauthenticated
✓ Protected API routes return 401 when unauthenticated
```

### **Manual Testing:**
```
✓ Login with existing user account
✓ Login with wrong password
✓ Sign up new user
✓ Access protected page while logged in
✓ Access protected page while logged out
✓ Refresh page (session persistence)
✓ Open in multiple tabs (session sync)
✓ Wait for session expiry
```

---

## 📚 Resources & Documentation

### **Official NextAuth.js Documentation:**
1. [Getting Started](https://next-auth.js.org/getting-started/introduction)
2. [Credentials Provider](https://next-auth.js.org/providers/credentials)
3. [Callbacks](https://next-auth.js.org/configuration/callbacks)
4. [Session Management](https://next-auth.js.org/configuration/options#session)
5. [Middleware](https://next-auth.js.org/configuration/nextjs#middleware)
6. [TypeScript](https://next-auth.js.org/getting-started/typescript)

### **Tutorials & Guides:**
- [NextAuth.js + Next.js 15 App Router](https://next-auth.js.org/getting-started/example)
- [Credentials Provider Setup](https://next-auth.js.org/providers/credentials)
- [Custom Database Adapter](https://authjs.dev/guides/creating-a-database-adapter)

### **Community:**
- [GitHub Discussions](https://github.com/nextauthjs/next-auth/discussions)
- [Discord Server](https://discord.gg/nextauth)

---

## ⚠️ Potential Challenges & Mitigations

### **Challenge 1: Learning Curve**
- **Risk**: Team unfamiliar with NextAuth.js
- **Mitigation**: Comprehensive documentation, examples provided, gradual rollout
- **Impact**: Medium
- **Probability**: Medium

### **Challenge 2: Breaking Changes**
- **Risk**: Existing auth flow breaks
- **Mitigation**: Hybrid approach keeps old system as fallback
- **Impact**: High
- **Probability**: Low

### **Challenge 3: Database Compatibility**
- **Risk**: NextAuth doesn't work with SQLite
- **Mitigation**: Using JWT strategy (no DB adapter needed), only using DB for user lookup
- **Impact**: Low
- **Probability**: Very Low

### **Challenge 4: Tenant Management**
- **Risk**: Tenant field not properly passed through NextAuth
- **Mitigation**: Custom JWT/session callbacks to include tenant
- **Impact**: Medium
- **Probability**: Low

### **Challenge 5: Session Persistence**
- **Risk**: Users get logged out unexpectedly
- **Mitigation**: Proper maxAge configuration, automatic refresh
- **Impact**: Medium
- **Probability**: Low

---

## 🎯 Recommendation

**Status**: ✅ **RECOMMENDED for Implementation**

### **Rationale:**

1. **Security**: Current system has known vulnerabilities (localStorage, no CSRF protection)
2. **Scalability**: Future OAuth integration would be trivial
3. **Standards**: Industry-standard authentication
4. **Maintenance**: Less custom code to maintain
5. **Time**: 2-day investment for long-term benefits

### **Recommended Approach:**

**Option A: Full Migration** with the following strategy:
1. Implement NextAuth.js alongside existing system
2. Test thoroughly in development
3. Keep old login routes as fallback
4. Gradual rollout to production
5. Monitor for issues
6. Remove old system after 2 weeks of stability

### **Timeline:**
- **Week 1**: Setup and integration
- **Week 2**: Testing and documentation
- **Week 3**: Production deployment
- **Week 4**: Monitoring and cleanup

---

## ✍️ Sign-Off

**Proposed By**: AI Assistant  
**Date**: October 2025  
**Status**: Awaiting Decision  

### **Decision Required:**

- [ ] ✅ **APPROVE** - Proceed with NextAuth.js integration (Option A: Full Migration)
- [ ] ⚠️ **APPROVE WITH MODIFICATIONS** - Proceed with Hybrid Approach (Option B)
- [ ] ❌ **REJECT** - Keep current authentication system (Option C)
- [ ] 🔄 **REQUEST MORE INFORMATION** - Need clarification on specific points

---

## 📞 Next Steps

**If Approved:**
1. I will implement the NextAuth.js integration
2. Create all necessary files and configurations
3. Update existing components
4. Provide testing instructions
5. Update documentation

**If Modifications Needed:**
1. Please specify concerns or requirements
2. I will adjust the proposal accordingly

**If Rejected:**
1. Document reasons for future reference
2. Consider security hardening of current system
3. Plan for manual route protection implementation

---

**END OF PROPOSAL**

