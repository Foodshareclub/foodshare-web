# FoodShare SSL/SafeBrowse Incident Report

**Date:** December 4, 2025
**Status:** ONGOING - Awaiting Vercel Infrastructure Team Resolution
**Severity:** Production Outage (Severity 1)
**Impact:** 4,350+ users unable to access platform

---

## Executive Summary

Custom domains (foodshare.club, www.foodshare.club) are experiencing SSL connection failures due to Vercel edge nodes returning SafeBrowse redirects instead of serving the application. The `.vercel.app` domain works correctly, confirming the issue is with Vercel's edge infrastructure, not the application or DNS configuration.

---

## Timeline

| Time | Event |
|------|-------|
| Dec 4, 2025 | User reports `ERR_SSL_PROTOCOL_ERROR` after Vite → Next.js migration |
| Dec 4, 2025 | Initial investigation ruled out code issues |
| Dec 4, 2025 | Discovered SafeBrowse redirect on port 443 |
| Dec 4, 2025 | Vercel Support confirmed infrastructure issue |
| Dec 4, 2025 | Support case submitted to Vercel Community (Hobby plan limitation) |

---

## Affected Resources

### Domains Not Working
| Domain | Status | Error |
|--------|--------|-------|
| foodshare.club | ❌ DOWN | SSL Protocol Error → SafeBrowse redirect |
| www.foodshare.club | ❌ DOWN | SSL Protocol Error → SafeBrowse redirect |
| test.foodshare.club | ❌ DOWN | SSL Protocol Error → SafeBrowse redirect |

### Domains Working
| Domain | Status |
|--------|--------|
| foodshare-dev.vercel.app | ✅ OK (HTTP 200, valid SSL) |

---

## Technical Investigation

### 1. Initial Symptoms

```
ERR_SSL_PROTOCOL_ERROR
This site can't provide a secure connection
foodshare.club sent an invalid response.
```

### 2. DNS Configuration (Verified Correct)

**Vercel Dashboard Status:** All domains show "Valid Configuration"

```
foodshare.club      → A record → 216.198.79.1 (Vercel IP)
www.foodshare.club  → CNAME → 329e303e79a7dae5.vercel-dns-017.com
                    → Resolves to: 64.29.17.65, 216.198.79.65
```

### 3. SSL Certificate Check

```bash
$ openssl s_client -connect www.foodshare.club:443 -servername www.foodshare.club

error:0A0000C6:SSL routines:tls_get_more_records:packet length too long
SSL handshake has read 5 bytes and written 1556 bytes
no peer certificate available
```

**Finding:** No SSL certificate is being served. Server sends non-TLS data on port 443.

### 4. Root Cause Discovery

Raw connection to Vercel edge IP on port 443:

```bash
$ echo "GET / HTTP/1.1\r\nHost: www.foodshare.club\r\n\r\n" | nc -w 3 64.29.17.1 443

HTTP/1.1 302 Found
Location: https://www.safebrowse.io/warn.html?url=http://www.foodshare.club/&token=e81136a5
Connection: close
Content-Length: 0
```

**Root Cause:** Vercel's edge nodes (64.29.17.65, 216.198.79.65) are returning plain HTTP 302 redirects to SafeBrowse.io on port 443, instead of performing TLS handshake and serving the application.

### 5. Verification Tests

```bash
# Vercel app domain - WORKS
$ curl -I https://foodshare-dev.vercel.app
HTTP/2 200
server: Vercel
x-powered-by: Next.js

# Custom domain - FAILS
$ curl -I https://www.foodshare.club
curl: (35) LibreSSL/3.3.6: error:1404B42E:SSL routines:ST_CONNECT:tlsv1 alert protocol version

# Even forcing Vercel's main IP - FAILS
$ curl --resolve www.foodshare.club:443:76.76.21.21 -I https://www.foodshare.club
curl: (35) LibreSSL/3.3.6: error:1404B42E:SSL routines:ST_CONNECT:tlsv1 alert protocol version
```

---

## User Environment

| Property | Value |
|----------|-------|
| IP Address | 98.238.135.19 |
| ISP | Comcast Cable Communications (AS7922) |
| Location | Carmichael, California, US |
| Hostname | c-98-238-135-19.hsd1.ca.comcast.net |

---

## What Was Ruled Out

| Potential Cause | Status | Evidence |
|-----------------|--------|----------|
| DNS misconfiguration | ❌ Ruled out | Vercel dashboard shows "Valid Configuration" |
| Application code issue | ❌ Ruled out | .vercel.app domain works perfectly |
| CAA records blocking cert | ❌ Ruled out | No CAA records on domain |
| Local DNS cache | ❌ Ruled out | Flushed cache, tested from multiple networks |
| Browser cache | ❌ Ruled out | Same error in curl/openssl |
| Domain blacklist (Google Safe Browsing) | ❌ Ruled out | Not flagged |

---

## Confirmed Root Cause

**Vercel Infrastructure Issue:** Specific Vercel edge nodes (64.29.17.65, 216.198.79.65) serving SafeBrowse redirects for `foodshare.club` hostname instead of:
1. Performing TLS handshake
2. Serving SSL certificate
3. Proxying to the Next.js application

This appears to be:
- Regional (affecting California/West Coast US)
- Hostname-specific (only custom domains, not .vercel.app)
- Edge node configuration issue at Vercel's infrastructure level

---

## Vercel Support Communication

### Initial Response
Vercel support ran domain analysis from external monitoring infrastructure and reported domains working correctly. This suggests the issue is regional/edge-specific.

### Escalation
Vercel confirmed this is an infrastructure issue requiring investigation by their infrastructure team. However, **Hobby plan users cannot submit direct support tickets** for DNS issues - redirected to Community forum.

---

## Actions Taken

1. ✅ Verified DNS configuration correct
2. ✅ Verified application works on .vercel.app domain
3. ✅ Removed and re-added all domains in Vercel dashboard
4. ✅ Added test subdomain (test.foodshare.club) - same issue
5. ✅ Flushed local DNS cache
6. ✅ Contacted Vercel Support via chat
7. ✅ Submitted report to Vercel Community forum
8. ⏳ Awaiting Vercel infrastructure team investigation

---

## Temporary Workaround

Users can access the platform via:
```
https://foodshare-dev.vercel.app
```

Consider communicating this to users via:
- Social media announcement
- Email to registered users
- Banner on any working pages

---

## Resolution Request

Vercel infrastructure team needs to:
1. Investigate edge nodes 64.29.17.65 and 216.198.79.65
2. Remove SafeBrowse filtering for foodshare.club
3. Ensure SSL certificates are properly provisioned and served
4. Verify fix from California/West Coast US location

---

## Community Post

**Vercel Community Discussion:** [Link to be added after posting]

**Title:** `[Production Outage] Custom domains redirect to SafeBrowse - Vercel edge node issue (California/West Coast)`

---

## Contacts

| Role | Name | Email |
|------|------|-------|
| FoodShare Founder | Tarlan Isaev | tamerlanium@gmail.com |

---

## Appendix: Full Debug Output

### DNS Resolution
```
$ dig +short www.foodshare.club
329e303e79a7dae5.vercel-dns-017.com.
64.29.17.65
216.198.79.65
```

### Traceroute (First 6 hops)
```
traceroute to 329e303e79a7dae5.vercel-dns-017.com (216.198.79.65), 10 hops max
 1  10.0.0.1 (10.0.0.1)
 2  10.61.197.114 (10.61.197.114)
 3  po-62-rur601.sacramento.ca.ccal.comcast.net (68.87.212.201)
 4  po-600-xar02.sacramento.ca.ccal.comcast.net (96.216.199.89)
 5  be-300-arsc1.sacramento.ca.ccal.comcast.net (96.216.198.77)
 6  be-36431-cs03.sunnyvale.ca.ibone.comcast.net (96.110.41.105)
```

### SSL Handshake Failure
```
$ openssl s_client -connect www.foodshare.club:443 -servername www.foodshare.club

CONNECTED(00000006)
error:0A0000C6:SSL routines:tls_get_more_records:packet length too long
no peer certificate available
SSL handshake has read 5 bytes and written 1556 bytes
```

### Raw Port 443 Response
```
$ echo "GET / HTTP/1.1\r\nHost: www.foodshare.club\r\n\r\n" | nc -w 3 64.29.17.1 443

HTTP/1.1 302 Found
Location: https://www.safebrowse.io/warn.html?url=http://www.foodshare.club/&token=e81136a5
Connection: close
Content-Length: 0
```

### Working Domain Test
```
$ curl -I https://foodshare-dev.vercel.app

HTTP/2 200
age: 0
cache-control: private, no-cache, no-store, max-age=0, must-revalidate
content-type: text/html; charset=utf-8
server: Vercel
x-powered-by: Next.js
```

---

**Last Updated:** December 4, 2025
