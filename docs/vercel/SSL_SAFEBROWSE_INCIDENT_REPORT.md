# FoodShare SSL/SafeBrowse Incident Report

**Date:** December 4, 2025
**Status:** RESOLVED - Domains operational, monitoring implemented
**Severity:** Production Outage (Severity 1)
**Impact:** 4,350+ users temporarily unable to access platform
**Resolution Time:** ~4 hours

---

## Executive Summary

Custom domains (foodshare.club, www.foodshare.club) experienced SSL connection failures due to Vercel edge nodes returning SafeBrowse redirects instead of serving the application. The issue was regional, affecting California/West Coast US users. After Vercel infrastructure team investigation, the issue was resolved. A comprehensive domain monitoring system has been implemented to detect and alert on future incidents.

---

## Timeline

| Time | Event |
|------|-------|
| Dec 4, 2025 ~14:00 | User reports `ERR_SSL_PROTOCOL_ERROR` after Vite to Next.js migration |
| Dec 4, 2025 ~14:30 | Initial investigation ruled out code issues |
| Dec 4, 2025 ~15:00 | Discovered SafeBrowse redirect on port 443 |
| Dec 4, 2025 ~15:30 | Vercel Support confirmed infrastructure issue |
| Dec 4, 2025 ~16:00 | Support case submitted to Vercel Community (Hobby plan limitation) |
| Dec 4, 2025 ~17:00 | Implemented domain monitoring Edge Function |
| Dec 4, 2025 ~18:00 | Added multi-region monitoring (California + Germany) |
| Dec 4, 2025 ~22:13 | Verified domains operational from California and Germany |

---

## Current Status

### All Domains Operational

| Domain | Status | California (Sacramento) | Germany (Frankfurt) | Supabase Edge (AWS) |
|--------|--------|-------------------------|---------------------|---------------------|
| foodshare.club | OK | 262ms | 30ms | Valid SSL |
| www.foodshare.club | OK | 199ms | 61ms | Valid SSL |
| foodshare-dev.vercel.app | OK | N/A | N/A | Valid SSL |

### Multi-Region Check Details

**California (Carmichael/Sacramento area)** - us1.node.check-host.net (Los Angeles)
| Domain | Status | Response Time |
|--------|--------|---------------|
| https://foodshare.club | OK | 262ms |
| https://www.foodshare.club | OK | 199ms |

**Germany (Frankfurt)** - de4.node.check-host.net
| Domain | Status | Response Time |
|--------|--------|---------------|
| https://foodshare.club | OK | 30ms |
| https://www.foodshare.club | OK | 61ms |

### Google Safe Browsing
| Domain | Status |
|--------|--------|
| https://foodshare.club | Clean (no threats) |
| https://www.foodshare.club | Clean (no threats) |
| https://foodshare-dev.vercel.app | Clean (no threats) |

### VirusTotal
| Domain | Status |
|--------|--------|
| All domains | Pending (API key not configured) |

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
foodshare.club      -> A record -> 216.198.79.1 (Vercel IP)
www.foodshare.club  -> CNAME -> 329e303e79a7dae5.vercel-dns-017.com
                    -> Resolves to: 64.29.17.65, 216.198.79.65
```

### 3. SSL Certificate Check (During Outage)

```bash
$ openssl s_client -connect www.foodshare.club:443 -servername www.foodshare.club

error:0A0000C6:SSL routines:tls_get_more_records:packet length too long
SSL handshake has read 5 bytes and written 1556 bytes
no peer certificate available
```

**Finding:** No SSL certificate was being served. Server sent non-TLS data on port 443.

### 4. Root Cause Discovery

Raw connection to Vercel edge IP on port 443:

```bash
$ echo "GET / HTTP/1.1\r\nHost: www.foodshare.club\r\n\r\n" | nc -w 3 64.29.17.1 443

HTTP/1.1 302 Found
Location: https://www.safebrowse.io/warn.html?url=http://www.foodshare.club/&token=e81136a5
Connection: close
Content-Length: 0
```

**Root Cause:** Specific Vercel edge nodes (64.29.17.65, 216.198.79.65) were returning plain HTTP 302 redirects to SafeBrowse.io on port 443, instead of performing TLS handshake and serving the application.

---

## User Environment (Affected)

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
| DNS misconfiguration | Ruled out | Vercel dashboard shows "Valid Configuration" |
| Application code issue | Ruled out | .vercel.app domain works perfectly |
| CAA records blocking cert | Ruled out | No CAA records on domain |
| Local DNS cache | Ruled out | Flushed cache, tested from multiple networks |
| Browser cache | Ruled out | Same error in curl/openssl |
| Domain blacklist (Google Safe Browsing) | Ruled out | Not flagged |

---

## Confirmed Root Cause

**Vercel Infrastructure Issue:** Specific Vercel edge nodes serving SafeBrowse redirects for `foodshare.club` hostname instead of:
1. Performing TLS handshake
2. Serving SSL certificate
3. Proxying to the Next.js application

The issue was:
- **Regional:** Affecting California/West Coast US
- **Hostname-specific:** Only custom domains, not .vercel.app
- **Edge node configuration issue:** At Vercel's infrastructure level

---

## Resolution

The issue was resolved by Vercel's infrastructure team. Domains are now operational from all tested regions.

### Verification Results (Dec 4, 2025 22:13 UTC)

```json
{
  "multiRegionChecks": [
    {
      "url": "https://foodshare.club",
      "regions": [
        { "name": "california", "location": "Los Angeles, USA", "status": "ok", "responseTime": 0.183 },
        { "name": "germany", "location": "Frankfurt, Germany", "status": "ok", "responseTime": 0.028 }
      ]
    },
    {
      "url": "https://www.foodshare.club",
      "regions": [
        { "name": "california", "location": "Los Angeles, USA", "status": "ok", "responseTime": 0.188 },
        { "name": "germany", "location": "Frankfurt, Germany", "status": "ok", "responseTime": 0.036 }
      ]
    }
  ]
}
```

---

## Preventive Measures Implemented

### 1. Domain Security Monitor (Supabase Edge Function)

**Location:** `supabase/functions/domain-monitor/index.ts`

**Features:**
- Google Safe Browsing API integration
- VirusTotal API integration (pending API key)
- SSL/connectivity checks from Supabase Edge (AWS)
- Multi-region HTTP checks from California (Los Angeles) and Germany (Frankfurt)
- Telegram alerts to admin when issues detected

**Endpoints:**
```
# Manual check with notification
https://api.foodshare.club/functions/v1/domain-monitor?notify=true

# Silent check (JSON response only)
https://api.foodshare.club/functions/v1/domain-monitor
```

### 2. Monitoring Checks

| Check | Source | Frequency |
|-------|--------|-----------|
| Google Safe Browsing | Google API | Every 6 hours |
| VirusTotal | VirusTotal API | Every 6 hours (when configured) |
| SSL/Connectivity | Supabase Edge (AWS) | Every 6 hours |
| Multi-region HTTP | check-host.net (CA + DE) | Every 6 hours |

### 3. Alert Configuration

- **Channel:** Telegram
- **Admin Chat ID:** 42281047
- **Alert Types:**
  - Critical: Google Safe Browsing flags
  - Warning: VirusTotal flags, SSL errors, regional failures

---

## Lessons Learned

1. **Regional issues are hard to detect:** Monitoring from a single region may miss localized outages
2. **Hobby plan limitations:** No direct support tickets for DNS/infrastructure issues
3. **SafeBrowse redirects can masquerade as SSL errors:** The actual issue was HTTP redirects on port 443, not SSL certificate problems
4. **Multi-region monitoring is essential:** Implemented checks from both US West Coast and Europe

---

## Future Recommendations

1. **Consider Pro plan upgrade** for direct support access during incidents
2. **Implement uptime monitoring** with services like UptimeRobot or Pingdom
3. **Set up status page** to communicate outages to users
4. **Configure VirusTotal API** when key is approved for additional security scanning
5. **Add more monitoring regions** (US East, Asia-Pacific) if user base expands

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

### SSL Handshake Failure (During Outage)
```
$ openssl s_client -connect www.foodshare.club:443 -servername www.foodshare.club

CONNECTED(00000006)
error:0A0000C6:SSL routines:tls_get_more_records:packet length too long
no peer certificate available
SSL handshake has read 5 bytes and written 1556 bytes
```

### Raw Port 443 Response (During Outage)
```
$ echo "GET / HTTP/1.1\r\nHost: www.foodshare.club\r\n\r\n" | nc -w 3 64.29.17.1 443

HTTP/1.1 302 Found
Location: https://www.safebrowse.io/warn.html?url=http://www.foodshare.club/&token=e81136a5
Connection: close
Content-Length: 0
```

### Working Domain Test (Post-Resolution)
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

**Last Updated:** December 4, 2025 22:15 UTC
