This folder contains domain-specific service modules that isolate business logic from controllers.
In a true microservice setup, each domain folder can be extracted into its own service/process later.

### Registration and profile uploads

Send `POST /api/users/register` using `multipart/form-data` with registration
fields (`fullName`, `email`, `phoneNumber`, `password`, and `role`), an optional
`profilePhoto` file, and a `resume` file. A resume is required for Students and
optional for Recruiters. Each file can be up to 5 MB.

After login, send an authenticated `POST /api/users/profile/updateResume` using
`multipart/form-data` with one required file in the `resume` field. This endpoint
updates only the resume and ignores other profile fields.

To replace the profile image separately, send an authenticated
`POST /api/users/profile/updateProfilePhoto` using `multipart/form-data` with one
required file in the `profilePhoto` field. Images must be JPEG, PNG, or WebP,
and no larger than 5 MB. Image extensions are derived from the accepted MIME type.
Both update endpoints require the login `token` cookie; authentication runs
before file parsing. Each returns `{ message, user, success }` without the password.
Do not manually set `Content-Type` when sending browser `FormData`; the browser
must add the multipart boundary.

Use `POST /api/users/profile/updateProfile` with JSON for other profile changes
(`fullName`, `email`, `phoneNumber`, `bio`, and comma-separated `skills`).
This endpoint does not accept file uploads or change stored file URLs.

Resumes must be PDF, DOC, or DOCX files, with a matching extension and MIME type,
and no larger than 5 MB. Basic file signatures are checked before upload; this
is not a malware scan or full document validation.

The backend uploads the file to `resume/<uuid>.<extension>` in the configured
S3 bucket (S3 prefixes do not need to be created beforehand). It saves the URL
in `profile.resume` and the uploaded filename in `profile.resumeOriginalName`.
General profile updates preserve the existing resume. Upload failures return an
error without saving the profile update.

Controllers delegate upload coordination to the auth service. Registration
validates required fields, role, duplicate email/phone number, and the user model
before uploading. It uploads the two files concurrently using a reused S3 client.
Body-supplied image/resume URLs are not persisted; use the multipart file fields.
The existing Student resume requirement and optional Recruiter uploads remain.

File replacements first check that the user exists, upload the new object, then
atomically update only the relevant file fields. The replaced S3 object is
deleted only after the database update succeeds. Concurrent replacements use
the previous URL returned by the atomic update, rather than a stale pre-upload
read. General profile fields and the other file remain untouched.

If either registration upload fails, any successful sibling upload is cleaned
up. If database persistence fails, the new upload(s) are cleaned up and existing
file references are preserved. Cleanup only deletes generated image/resume keys
in the configured bucket, never external URLs. Cleanup failures are explicitly
logged for operational retry; they do not mask the original error or turn an
already-persisted update into an apparent failure. S3 and MongoDB do not share a
transaction: a process crash or failed cleanup can still leave an orphan, so
production deployments should monitor logs and reconcile unreferenced objects.

The existing `POST /api/upload` image-only endpoint is unchanged for compatibility;
it only returns an image URL and does not update the user's profile. Use the
authenticated profile-photo endpoint for profile replacements and old-file cleanup.

Uploads use the existing `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and
`AWS_SECRET_ACCESS_KEY` settings. The upload identity needs `s3:PutObject`
and `s3:DeleteObject` permissions for both `resume/*` and `images/*`. No public ACL is
set: the stored URL follows the existing image URL convention, and its readability
depends on the bucket policy. For sensitive resumes, keep the bucket private and
serve downloads through an authorized endpoint using short-lived signed URLs.
