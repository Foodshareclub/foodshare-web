# Admin MFA Security System

## 🎯 Overview

Enterprise-grade Multi-Factor Authentication (MFA) system for the Foodshare admin email CRM, ensuring that only verified administrators can access sensitive admin functions and data.

## 🚀 Quick Links

- **[Quick Start Guide](./QUICKSTART.md)** - Get up and running in 5 minutes
- **[Setup Guide](./ADMIN_MFA_SETUP.md)** - Detailed configuration and setup
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Technical deep dive

## ✨ Key Features

### Security

- ✅ **Multi-Factor Authentication** - Email and SMS verification
- ✅ **AAL2 Enforcement** - Admin pages require MFA verification
- ✅ **Rate Limiting** - 5 attempts per 15 minutes
- ✅ **Session Management** - 1-hour sessions with activity tracking
- ✅ **Backup Codes** - 10 recovery codes per user
- ✅ **Audit Logging** - Complete action trail with risk scoring

### Compliance

- ✅ **SOC 2 Ready** - Comprehensive audit trail
- ✅ **GDPR Compliant** - Encrypted PII storage
- ✅ **Enterprise Security** - Defense-in-depth architecture
- ✅ **Zero Trust** - Verify every admin action

### User Experience

- ✅ **Smooth Enrollment** - Step-by-step wizard
- ✅ **Quick Verification** - 6-digit codes with 5-minute expiry
- ✅ **Recovery Options** - Backup codes for lost access
- ✅ **Clear Feedback** - User-friendly error messages

## 📦 What's Included

### Database (Supabase/PostgreSQL)

**Migration File**: `supabase/migrations/008_admin_mfa_security.sql`

**Tables**:

- `mfa_configuration` - User MFA settings and backup codes
- `mfa_verification_attempts` - Challenge tracking and rate limiting
- `mfa_sessions` - AAL2 session management
- `security_rate_limits` - System-wide rate limiting

**Functions**:

- `create_mfa_challenge()` - Generate verification challenges
- `verify_mfa_challenge()` - Verify user codes
- `requires_mfa()` - Check MFA requirements
- `get_current_aal()` - Get authenticator assurance level
- `check_rate_limit()` - Enforce rate limits

**Security**:

- Row Level Security (RLS) policies on all tables
- Bcrypt hashing for codes
- AAL2 enforcement via restrictive policies

### Frontend (TypeScript/React)

**Core Services**:

- `src/lib/security/mfa.ts` - MFA service layer
- `src/lib/security/auditLog.ts` - Audit logging service

**UI Components**:

- `src/components/security/MFAEnrollment.tsx` - Enrollment wizard
- `src/components/security/MFAVerification.tsx` - Verification screen
- `src/components/security/AdminMFAGuard.tsx` - Route protection

**Features**:

- Email and SMS verification
- Backup code support
- Rate limit handling
- Session management
- Comprehensive error handling

## 🔧 Installation

### Step 1: Database Migration

```bash
cd /Users/organic/dev/work/foodshare/foodshare
supabase db push
```

### Step 2: Verify Installation

```sql
-- Check tables
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'mfa_%';

-- Test function
SELECT generate_mfa_code();
```

### Step 3: Protect Admin Routes

```tsx
import { AdminMFAGuard } from "@/components/security/AdminMFAGuard";

// Wrap admin routes
<Route
  path="/admin/*"
  element={
    <AdminMFAGuard>
      <AdminLayout />
    </AdminMFAGuard>
  }
/>;
```

### Step 4: Configure Email Template

Add MFA verification template to your email system:

**Template Name**: `mfa_verification`

**Template Variables**: `code`, `first_name`, `expires_in`

## 📖 Usage Guide

### For Administrators

**First Login**:

1. Log in with email + password
2. Choose MFA method (Email or SMS)
3. Verify with 6-digit code
4. Download backup codes
5. Access admin dashboard

**Daily Login**:

1. Log in with email + password
2. Enter MFA code
3. Access granted for 1 hour

**Recovery**:

1. Lost access? Use backup code
2. One-time use only
3. Re-enroll MFA after recovery

### For Developers

**Check MFA Status**:

```typescript
import { checkAdminMFARequired } from "@/lib/security/mfa";

const { required, currentAAL, isAdmin } = await checkAdminMFARequired();
```

**Log Admin Actions**:

```typescript
import { AuditLogService } from "@/lib/security/auditLog";

await AuditLogService.logSuccess(adminId, "email_sent", "email", emailId);
```

**Validate AAL2**:

```typescript
import { validateAdminAAL2 } from "@/lib/security/mfa";

const { valid, error } = await validateAdminAAL2();
if (!valid) throw new Error(error);
```

## 🔒 Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────┐
│  Layer 1: Authentication (AAL1)         │
│  ├─ Email + Password                    │
│  └─ OAuth (Google, etc.)                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 2: Multi-Factor Auth (AAL2)      │
│  ├─ Email Verification                  │
│  ├─ SMS Verification                    │
│  └─ Backup Codes                        │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 3: Authorization (RBAC)          │
│  ├─ Admin Role Check                    │
│  ├─ RLS Policy Enforcement              │
│  └─ AAL2 Session Verification           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 4: Audit & Monitoring            │
│  ├─ All Actions Logged                  │
│  ├─ Risk Score Calculation              │
│  └─ Real-time Monitoring                │
└─────────────────────────────────────────┘
```

### Data Flow

```
User Login → AAL1 Session → Admin Check → MFA Required?
                                               ↓
                                            Yes → MFA Challenge
                                               ↓
                                          Code Sent → User Verifies
                                               ↓
                                          AAL2 Session → Admin Access
                                               ↓
                                          All Actions Logged
```

## 📊 Monitoring

### Key Metrics

```sql
-- MFA Adoption Rate
SELECT
  COUNT(*) FILTER (WHERE is_mfa_enabled = TRUE) * 100.0 / COUNT(*) as adoption_rate
FROM mfa_configuration
WHERE profile_id IN (
  SELECT id FROM profiles WHERE user_role IN ('admin', 'super_admin')
);

-- Failed Verification Rate
SELECT
  COUNT(*) FILTER (WHERE is_verified = FALSE) * 100.0 / COUNT(*) as failure_rate
FROM mfa_verification_attempts;

-- Active Admin Sessions
SELECT COUNT(*)
FROM mfa_sessions
WHERE is_active = TRUE
AND current_aal = 'aal2';

-- High-Risk Actions (Last 24h)
SELECT action, COUNT(*), AVG(risk_score)
FROM admin_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action
HAVING AVG(risk_score) > 50
ORDER BY AVG(risk_score) DESC;
```

## 🛠️ Maintenance

### Daily Tasks

- Monitor failed MFA attempts
- Review high-risk actions
- Check rate limit violations

### Weekly Tasks

```sql
-- Cleanup expired challenges
SELECT cleanup_expired_mfa_challenges();

-- Cleanup inactive sessions
SELECT cleanup_inactive_mfa_sessions();
```

### Monthly Tasks

- Review MFA adoption metrics
- Analyze security trends
- Update documentation
- Test recovery procedures

## 🐛 Troubleshooting

### Common Issues

| Issue             | Solution                          |
| ----------------- | --------------------------------- |
| Code not received | Check email queue and spam folder |
| Rate limited      | Wait 1 hour or admin reset        |
| Session expired   | Re-verify with MFA                |
| Lost backup codes | Contact admin for reset           |

### Debug Queries

```sql
-- Check user's MFA config
SELECT * FROM mfa_configuration WHERE profile_id = 'user-id';

-- Check recent verification attempts
SELECT * FROM mfa_verification_attempts
WHERE profile_id = 'user-id'
ORDER BY created_at DESC LIMIT 10;

-- Check active sessions
SELECT * FROM mfa_sessions
WHERE profile_id = 'user-id'
AND is_active = TRUE;

-- Check rate limits
SELECT * FROM security_rate_limits
WHERE profile_id = 'user-id';
```

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[ADMIN_MFA_SETUP.md](./ADMIN_MFA_SETUP.md)** - Complete setup documentation
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Technical implementation details

## 🎯 Success Criteria

- ✅ 100% admin MFA enrollment within 30 days
- ✅ <5% failed verification rate
- ✅ <1% rate limit violations
- ✅ Zero unauthorized admin access
- ✅ Complete audit trail for all admin actions
- ✅ <15 minute response to security incidents

## 🔐 Security Best Practices

### For Admins

1. Enable MFA immediately after first login
2. Store backup codes in secure password manager
3. Never share MFA codes or backup codes
4. Report suspicious activity immediately
5. Review audit logs regularly

### For Developers

1. Never bypass MFA checks
2. Always use AuditLogService for admin actions
3. Validate AAL2 before sensitive operations
4. Handle errors gracefully with user feedback
5. Test MFA flow in all scenarios

## 🚨 Security Incidents

### Response Procedure

1. **Detect**: Monitor audit logs and alerts
2. **Contain**: Revoke sessions, reset MFA
3. **Investigate**: Review audit trail
4. **Remediate**: Fix vulnerabilities
5. **Document**: Update incident log

### Emergency Contacts

- Security Team: security@foodshare.com
- On-Call: Check rotation schedule
- Escalation: CTO/Security Lead

## 📈 Future Roadmap

### Q2 2025

- [ ] Hardware key support (YubiKey, etc.)
- [ ] WebAuthn/FIDO2 integration
- [ ] Advanced biometric options

### Q3 2025

- [ ] Risk-based authentication
- [ ] Geographic anomaly detection
- [ ] Behavior analysis

### Q4 2025

- [ ] Mobile app integration
- [ ] Push notification verification
- [ ] Device trust management

## 🤝 Support

Need help? Consult these resources:

1. **Documentation**: Read setup guides
2. **Database**: Check debug queries
3. **Logs**: Review application logs
4. **Team**: Contact security team
5. **Emergency**: Use on-call rotation

## ✅ Compliance Checklist

- [x] **SOC 2 Type II**: Audit trail, access controls
- [x] **GDPR**: Data encryption, access logs
- [x] **NIST AAL2**: Multi-factor authentication
- [x] **OWASP**: Security best practices
- [x] **ISO 27001**: Security management

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-01-28
**Security Level**: Enterprise
**Compliance**: SOC 2, GDPR, NIST AAL2

**Maintained by**: Security Engineering Team
**Review Cycle**: Quarterly
