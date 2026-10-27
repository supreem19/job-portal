const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Types } = require("mongoose");
const { Job } = require("../dist/models/job.model");
const { getJobByIdService } = require("../dist/services/job.service");
const { Application } = require("../dist/models/application.model");
const { getJobById } = require("../dist/controllers/job.controller");
const { ServiceError } = require("../dist/services/service-error");

test("job details return application JSON with each applicant's ID", async (t) => {
  const jobId = new Types.ObjectId();
  const applications = ["pending", "accepted"].map((status) => ({
    _id: new Types.ObjectId(),
    job: jobId,
    applicant: new Types.ObjectId(),
    status,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  }));
  const findJob = t.mock.method(Job.collection, "findOne", async () => ({
    _id: jobId,
    title: "Software Engineer",
    application: applications.map((application) => application._id),
  }));
  const findApplications = t.mock.method(Application.collection, "find", () => ({
    toArray: async () => applications,
  }));
  let statusCode;
  let json;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      json = JSON.parse(JSON.stringify(body));
      return this;
    },
  };

  await getJobById({ params: { id: jobId.toString() } }, response);

  assert.equal(statusCode, 200);
  assert.equal(json.status, true);
  assert.equal(json.job._id, jobId.toString());
  assert.equal(json.job.title, "Software Engineer");
  assert.deepEqual(json.job.application, JSON.parse(JSON.stringify(applications)));
  assert.deepEqual(findJob.mock.calls[0].arguments[0], { _id: jobId });
  assert.deepEqual(
    findApplications.mock.calls[0].arguments[0]._id.$in,
    applications.map((application) => application._id),
  );
});

test("job details preserve an empty application array", async (t) => {
  t.mock.method(Job.collection, "findOne", async () => ({
    _id: new Types.ObjectId(),
    application: [],
  }));

  const result = await getJobByIdService(new Types.ObjectId().toString());
  const json = JSON.parse(JSON.stringify(result));

  assert.equal(json.status, true);
  assert.deepEqual(json.job.application, []);
});

test("job details preserve the missing-job error", async (t) => {
  t.mock.method(Job.collection, "findOne", async () => null);

  await assert.rejects(getJobByIdService(new Types.ObjectId().toString()), (error) => {
    assert.ok(error instanceof ServiceError);
    assert.equal(error.statusCode, 404);
    assert.equal(error.message, "No jobs found");
    return true;
  });
});

test("job details propagate application lookup failures", async (t) => {
  const failure = new Error("Application lookup failed");
  t.mock.method(Job.collection, "findOne", async () => ({
    _id: new Types.ObjectId(),
    application: [new Types.ObjectId()],
  }));
  t.mock.method(Application.collection, "find", () => ({
    toArray: async () => { throw failure; },
  }));

  await assert.rejects(
    getJobByIdService(new Types.ObjectId().toString()),
    (error) => error === failure,
  );
});
