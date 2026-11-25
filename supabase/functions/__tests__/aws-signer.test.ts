import { assertEquals } from "@std/assert";
import { AWSV4Signer } from "../_shared/aws-signer.ts";
import { AWSSESProvider } from "../_shared/email/aws-ses-provider.ts";

// Vectors: "Authenticating Requests: Using the Authorization Header (AWS Signature
// Version 4)" in the Amazon S3 API reference (Example: GET Object, PUT Object), which
// use the published example credentials below.
// https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
const ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
const SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

async function withFixedClock<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  const RealDate = Date;
  const fixed = new RealDate(iso).getTime();
  class FixedDate extends RealDate {
    constructor(value?: number | string) {
      super(value ?? fixed);
    }
  }
  globalThis.Date = FixedDate as DateConstructor;
  try {
    return await fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

Deno.test("AWS S3 docs vector: GET Object with a mixed-case Range header", async () => {
  const signer = new AWSV4Signer("us-east-1", "s3", ACCESS_KEY, SECRET_KEY);
  const signed = await withFixedClock(
    "2013-05-24T00:00:00Z",
    () =>
      signer.signRequest(
        "GET",
        "https://examplebucket.s3.amazonaws.com/test.txt",
        { Range: "bytes=0-9" },
        "",
      ),
  );
  assertEquals(signed["x-amz-content-sha256"], EMPTY_SHA256);
  assertEquals(
    signed.Authorization,
    "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
      "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, " +
      "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
  );
});

Deno.test("AWS S3 docs vector: PUT Object with a body and Date/x-amz-storage-class", async () => {
  const signer = new AWSV4Signer("us-east-1", "s3", ACCESS_KEY, SECRET_KEY);
  const signed = await withFixedClock(
    "2013-05-24T00:00:00Z",
    () =>
      signer.signRequest(
        "PUT",
        "https://examplebucket.s3.amazonaws.com/test$file.text",
        {
          Date: "Fri, 24 May 2013 00:00:00 GMT",
          "x-amz-storage-class": "REDUCED_REDUNDANCY",
        },
        "Welcome to Amazon S3.",
      ),
  );
  assertEquals(
    signed.Authorization,
    "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
      "SignedHeaders=date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class, " +
      "Signature=98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd",
  );
});

Deno.test("SignedHeaders is lowercase, sorted after lowercasing and deduplicated", async () => {
  const signer = new AWSV4Signer("us-east-1", "ses", ACCESS_KEY, SECRET_KEY);
  const signed = await signer.signRequest(
    "POST",
    "https://email.us-east-1.amazonaws.com/v2/email/outbound-emails",
    { "Content-Type": "application/json", "X-Zeta": "1", "content-type": "application/json" },
    "{}",
  );
  const list = signed.Authorization.match(/SignedHeaders=([^,]+),/)![1];
  assertEquals(
    list,
    "content-type;host;x-amz-content-sha256;x-amz-date;x-zeta",
  );
});

Deno.test("SES sends a Content-Length that equals the UTF-8 byte length (or none)", async () => {
  const provider = new AWSSESProvider({
    region: "us-west-2",
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  });
  const realFetch = globalThis.fetch;
  let captured: { headers: Headers; body: string } | undefined;
  globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
    captured = { headers: new Headers(init?.headers), body: String(init?.body) };
    return Promise.resolve(new Response(JSON.stringify({ MessageId: "m-1" })));
  }) as typeof fetch;
  try {
    const result = await provider.sendEmail({
      to: "a@example.com",
      subject: "Grüße 🍎",
      html: "<p>Täglich frische Lebensmittel – 日本語 🍞</p>",
    });
    assertEquals(result.success, true);
  } finally {
    globalThis.fetch = realFetch;
  }
  const bytes = new TextEncoder().encode(captured!.body).byteLength;
  assertEquals(bytes > captured!.body.length, true, "payload must be non-ASCII");
  const declared = captured!.headers.get("content-length");
  if (declared !== null) assertEquals(declared, String(bytes));
  const signedList = captured!.headers.get("authorization")!.match(/SignedHeaders=([^,]+),/)![1];
  assertEquals(signedList, signedList.toLowerCase());
  assertEquals(signedList.includes("content-length"), declared !== null);
});
