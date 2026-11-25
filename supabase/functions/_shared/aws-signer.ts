/**
 * AWS Signature V4 Signing Implementation
 *
 * Pure Deno implementation using crypto.subtle.
 * Extracted from aws-ses.ts for reuse across AWS-compatible services (SES, S3/R2).
 */

export class AWSV4Signer {
  private algorithm = "AWS4-HMAC-SHA256";

  constructor(
    private region: string,
    private service: string,
    private accessKeyId: string,
    private secretAccessKey: string,
  ) {}

  /**
   * Sign AWS request with Signature V4
   * Accepts string or Uint8Array payload for binary content (e.g. image uploads).
   */
  async signRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    payload: string | Uint8Array,
  ): Promise<Record<string, string>> {
    const now = new Date();
    const dateStamp = this.getDateStamp(now);
    const amzDate = this.getAmzDate(now);

    // Compute payload hash for S3-compatible services (R2 requires x-amz-content-sha256)
    const payloadHash = await this.sha256Hex(payload);

    // Add required headers. Names are lowercased (and case-variants merged) so the
    // canonical request and the Authorization SignedHeaders list agree exactly.
    const signedHeaders = this.normalizeHeaders({
      ...headers,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      host: new URL(url).host,
    });

    // Create canonical request
    const canonicalRequest = await this.createCanonicalRequest(
      method,
      url,
      signedHeaders,
      payload,
    );

    // Create string to sign
    const credentialScope = `${dateStamp}/${this.region}/${this.service}/aws4_request`;
    const stringToSign = await this.createStringToSign(
      amzDate,
      credentialScope,
      canonicalRequest,
    );

    // Calculate signature
    const signature = await this.calculateSignature(dateStamp, stringToSign);

    // Create authorization header
    const signedHeadersList = Object.keys(signedHeaders).sort().join(";");

    const authorization = `${this.algorithm} Credential=${this.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeadersList}, Signature=${signature}`;

    return {
      ...signedHeaders,
      Authorization: authorization,
    };
  }

  /** Lowercase header names; values of names differing only by case are comma-joined. */
  private normalizeHeaders(headers: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
      const key = name.toLowerCase();
      const v = String(value).trim().replace(/\s+/g, " ");
      out[key] = key in out ? `${out[key]},${v}` : v;
    }
    return out;
  }

  /**
   * RFC 3986 URI-encode each path segment (only unreserved characters stay literal).
   * S3 and S3-compatible services (R2) encode once; every other service encodes twice.
   */
  private canonicalUri(pathname: string): string {
    const encodeOnce = (segment: string) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
      );
    const path = (pathname || "/").split("/").map((segment) => {
      let decoded = segment;
      try {
        decoded = decodeURIComponent(segment);
      } catch { /* keep as is */ }
      const once = encodeOnce(decoded);
      return this.service === "s3" ? once : encodeOnce(once);
    }).join("/");
    return path || "/";
  }

  private async createCanonicalRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    payload: string | Uint8Array,
  ): Promise<string> {
    const urlObj = new URL(url);
    const canonicalUri = this.canonicalUri(urlObj.pathname);
    const canonicalQueryString = urlObj.search.slice(1) || "";

    // Canonical headers (sorted, lowercase keys)
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((key) => `${key}:${headers[key]}`)
      .join("\n") + "\n";

    const signedHeaders = Object.keys(headers)
      .sort()
      .join(";");

    // Hash payload — supports both string and binary
    const payloadHash = await this.sha256Hex(payload);

    return [
      method,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
  }

  private async createStringToSign(
    amzDate: string,
    credentialScope: string,
    canonicalRequest: string,
  ): Promise<string> {
    const hashedCanonicalRequest = await this.sha256Hex(canonicalRequest);

    return [this.algorithm, amzDate, credentialScope, hashedCanonicalRequest]
      .join("\n");
  }

  private async calculateSignature(
    dateStamp: string,
    stringToSign: string,
  ): Promise<string> {
    const kDate = await this.hmacSha256(
      `AWS4${this.secretAccessKey}`,
      dateStamp,
    );
    const kRegion = await this.hmacSha256(kDate, this.region);
    const kService = await this.hmacSha256(kRegion, this.service);
    const kSigning = await this.hmacSha256(kService, "aws4_request");
    const signature = await this.hmacSha256(kSigning, stringToSign);

    return this.bufferToHex(signature);
  }

  private getDateStamp(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, "");
  }

  private getAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  }

  private async sha256Hex(data: string | Uint8Array): Promise<string> {
    const encoded = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoded as BufferSource,
    );
    return this.bufferToHex(new Uint8Array(hashBuffer));
  }

  private async hmacSha256(
    key: string | Uint8Array,
    data: string,
  ): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyData = typeof key === "string" ? encoder.encode(key) : key;

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData as BufferSource,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(data),
    );

    return new Uint8Array(signature);
  }

  private bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
