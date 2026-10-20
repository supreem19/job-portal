const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");
const jwt = require("jsonwebtoken");
const { S3Client } = require("@aws-sdk/client-s3");
const { User } = require("../dist/models/user.model");
const app = require("../dist/app").default;

test("resume profile uploads", async (t) => {
  const environment = {
    AWS_S3_BUCKET: "resume-test-bucket",
    AWS_REGION: "us-east-1",
    AWS_ACCESS_KEY_ID: "test-access-key",
    AWS_SECRET_ACCESS_KEY: "test-secret-key",
    JWT_SECRET: "test-jwt-secret",
  };
  const originalEnvironment = {};
  for (const [key, value] of Object.entries(environment)) {
    originalEnvironment[key] = process.env[key];
    process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/users`;
  const url = `${baseUrl}/profile/updateResume`;
  const token = jwt.sign({ userId: "507f1f77bcf86cd799439011" }, environment.JWT_SECRET);
  const uploaded = [];
  const send = t.mock.method(S3Client.prototype, "send", async (command) => {
    uploaded.push(command.input);
    return {};
  });
  let user;
  let saves;
  const lookup = t.mock.method(User, "findById", async () => user);
  const existenceCheck = t.mock.method(User, "exists", async () => user ? { _id: user._id } : null);

  const reset = () => {
    uploaded.length = 0;
    saves = 0;
    user = {
      _id: "507f1f77bcf86cd799439011",
      fullName: "Test User",
      email: "test@example.com",
      phoneNumber: "1234567890",
      role: "Student",
      profile: {
        skills: ["TypeScript"],
        profilePhoto: "https://example.com/photo.png",
        resume: "https://example.com/old.pdf",
        resumeOriginalName: "old.pdf",
      },
      save: async () => { saves += 1; },
    };
  };
  const request = async (filename, type, content, authenticated = true) => {
    const form = new FormData();
    form.append("bio", "Updated bio");
    form.append("skills", "Node.js, AWS");
    form.append("resume", new Blob([content], { type }), filename);
    const response = await fetch(url, {
      method: "POST",
      headers: authenticated ? { Cookie: `token=${token}` } : {},
      body: form,
    });
    return { status: response.status, body: await response.json() };
  };

  for (const [extension, type, content] of [
    ["pdf", "application/pdf", Buffer.from("%PDF-1.7\nresume")],
    ["doc", "application/msword", Buffer.from("d0cf11e0a1b11ae10000", "hex")],
    ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      Buffer.from("504b03040000", "hex")],
  ]) {
    await t.test(`uploads ${extension} under resume/ and persists metadata`, async () => {
      reset();
      const filename = `My Resume.${extension.toUpperCase()}`;
      const result = await request(filename, type, content);
      assert.equal(result.status, 200);
      assert.equal(result.body.success, true);
      assert.equal(uploaded.length, 1);
      const upload = uploaded[0];
      assert.equal(upload.Bucket, environment.AWS_S3_BUCKET);
      assert.match(upload.Key, new RegExp(`^resume/[0-9a-f-]{36}\\.${extension}$`));
      assert.equal(upload.ContentType, type);
      assert.deepEqual(upload.Body, content);
      assert.equal(upload.ACL, undefined);
      assert.equal(result.body.user.profile.resume,
        `https://${environment.AWS_S3_BUCKET}.s3.us-east-1.amazonaws.com/${upload.Key}`);
      assert.equal(result.body.user.profile.resumeOriginalName, filename);
      assert.equal(result.body.user.profile.profilePhoto, "https://example.com/photo.png");
      assert.deepEqual(result.body.user.profile.skills, ["TypeScript"]);
      assert.equal(result.body.user.profile.bio, undefined);
      assert.equal(saves, 1);
    });
  }

  await t.test("JSON updates preserve the existing resume", async () => {
    reset();
    const response = await fetch(`${baseUrl}/profile/updateProfile`, {
      method: "POST",
      headers: { Cookie: `token=${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ bio: "New bio", resume: "untrusted-url" }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.user.profile.bio, "New bio");
    assert.equal(body.user.profile.resume, "https://example.com/old.pdf");
    assert.equal(body.user.profile.resumeOriginalName, "old.pdf");
    assert.equal(uploaded.length, 0);
    assert.equal(saves, 1);
  });

    await t.test("resume replacement requires a file", async () => {
      reset();
      const response = await fetch(url, {
        method: "POST",
        headers: { Cookie: `token=${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ resume: "untrusted-url" }),
      });
      const body = await response.json();
      assert.equal(response.status, 400);
      assert.match(body.message, /resume file is required/);
      assert.equal(uploaded.length, 0);
      assert.equal(saves, 0);
    });

    await t.test("registration uploads both files and persists resume metadata", async (t) => {
      reset();
      t.mock.method(User, "findOne", async () => null);
      let registeredUser;
      t.mock.method(User.prototype, "save", async function () {
        registeredUser = this;
        return this;
      });
      const form = new FormData();
      for (const [key, value] of Object.entries({
        fullName: "New Student", email: "student@example.com", phoneNumber: "1234567890",
        password: "test-password", role: "Student",
      })) form.append(key, value);
      form.append("resume", new Blob(["%PDF-1.7"], { type: "application/pdf" }), "student.pdf");
      form.append("profilePhoto", new Blob(["image"], { type: "image/png" }), "photo.png");
      const response = await fetch(`${baseUrl}/register`, { method: "POST", body: form });
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(uploaded.length, 2);
      assert.match(uploaded[0].Key, /^resume\//);
      assert.match(uploaded[1].Key, /^images\//);
      assert.equal(registeredUser.profile.resumeOriginalName, "student.pdf");
      assert.equal(registeredUser.profile.resume,
        `https://${environment.AWS_S3_BUCKET}.s3.us-east-1.amazonaws.com/${uploaded[0].Key}`);
      assert.equal(registeredUser.profile.profilePhoto,
        `https://${environment.AWS_S3_BUCKET}.s3.us-east-1.amazonaws.com/${uploaded[1].Key}`);
    });

    await t.test("Student registration requires a real file, not a body URL", async () => {
      reset();
      const form = new FormData();
      form.append("role", "Student");
      form.append("resume", "https://example.com/resume.pdf");
      form.append("profilePhoto", new Blob(["image"], { type: "image/png" }), "photo.png");
      const response = await fetch(`${baseUrl}/register`, { method: "POST", body: form });
      const body = await response.json();
      assert.equal(response.status, 400);
      assert.match(body.message, /resume is required for Student/);
      assert.equal(uploaded.length, 0);
    });

    await t.test("Recruiter registration works without files", async (t) => {
      reset();
      t.mock.method(User, "findOne", async () => null);
      let registeredUser;
      t.mock.method(User.prototype, "save", async function () {
        registeredUser = this;
        return this;
      });
      const response = await fetch(`${baseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Recruiter", email: "recruiter@example.com", phoneNumber: "1234567890",
          password: "test-password", role: "Recruiter", resume: "untrusted-url",
        }),
      });
      assert.equal(response.status, 200);
      assert.equal(registeredUser.profile.resume, undefined);
      assert.equal(uploaded.length, 0);
    });
  for (const [name, filename, type, content, message] of [
    ["unsupported files", "resume.txt", "text/plain", "resume", /Only PDF, DOC, and DOCX/],
    ["mismatched MIME types", "resume.pdf", "image/png", "%PDF-1.7", /Only PDF, DOC, and DOCX/],
    ["spoofed content", "resume.pdf", "application/pdf", "not a PDF", /content does not match/],
    ["empty files", "resume.pdf", "application/pdf", "", /content does not match/],
    ["oversized files", "resume.pdf", "application/pdf", Buffer.alloc(5 * 1024 * 1024 + 1),
      /5 MB or smaller/],
  ]) {
    await t.test(`rejects ${name} without uploading or saving`, async () => {
      reset();
      const result = await request(filename, type, content);
      assert.equal(result.status, 400);
      assert.equal(result.body.success, false);
      assert.match(result.body.message, message);
      assert.equal(uploaded.length, 0);
      assert.equal(saves, 0);
    });
  }

  await t.test("accepts a file exactly at the size limit", async () => {
    reset();
    const content = Buffer.alloc(5 * 1024 * 1024);
    content.write("%PDF-1.7");
    const result = await request("resume.pdf", "application/pdf", content);
    assert.equal(result.status, 200);
    assert.equal(uploaded[0].Body.length, 5 * 1024 * 1024);
    assert.equal(saves, 1);
  });

  await t.test("authentication is required before upload", async () => {
    reset();
    const lookups = lookup.mock.callCount();
    const existenceChecks = existenceCheck.mock.callCount();
    const result = await request("resume.pdf", "application/pdf", "%PDF-1.7", false);
    assert.equal(result.status, 401);
    assert.equal(lookup.mock.callCount(), lookups);
    assert.equal(existenceCheck.mock.callCount(), existenceChecks);
    assert.equal(uploaded.length, 0);
    assert.equal(saves, 0);
  });

  await t.test("missing users do not create S3 objects", async () => {
    reset();
    user = null;
    const result = await request("resume.pdf", "application/pdf", "%PDF-1.7");
    assert.equal(result.status, 404);
    assert.equal(uploaded.length, 0);
    assert.equal(saves, 0);
  });

  await t.test("S3 failures are reported without saving profile changes", async () => {
    reset();
    send.mock.mockImplementationOnce(async () => { throw new Error("Test S3 failure"); });
    const logged = t.mock.method(console, "error", () => {});
    try {
      const result = await request("resume.pdf", "application/pdf", "%PDF-1.7");
      assert.equal(result.status, 500);
      assert.equal(result.body.success, false);
      assert.equal(saves, 0);
      assert.equal(user.profile.bio, undefined);
      assert.equal(user.profile.resume, "https://example.com/old.pdf");
      assert.equal(logged.mock.callCount(), 1);
    } finally {
      logged.mock.restore();
    }
  });

  await t.test("profile images still use images/ with the existing response", async () => {
    reset();
    const form = new FormData();
    form.append("image", new Blob(["image"], { type: "image/png" }), "photo.png");
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/upload`,
      { method: "POST", body: form },
    );
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(uploaded[0].Key, /^images\/[0-9a-f-]{36}\.png$/);
    assert.equal(body.imageUrl,
      `https://${environment.AWS_S3_BUCKET}.s3.us-east-1.amazonaws.com/${uploaded[0].Key}`);
  });
});
