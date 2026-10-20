const assert = require("node:assert/strict");
const { test } = require("node:test");
const { Types } = require("mongoose");
const { Company } = require("../dist/models/company.model");
const { Job } = require("../dist/models/job.model");
const { getAllJobsService } = require("../dist/services/job.service");
const { ServiceError } = require("../dist/services/service-error");

test("job listings include the complete company document and preserve filtering", async (t) => {
  const company = {
    _id: new Types.ObjectId(),
    name: "Example Company",
    description: "An example employer",
    website: "https://example.com",
    location: "Remote",
    logo: "https://example.com/logo.png",
    userId: new Types.ObjectId(),
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
  };
  const job = {
    _id: new Types.ObjectId(),
    title: "Software Engineer",
    company: company._id,
  };
  const findJobs = t.mock.method(Job.collection, "find", () => ({
    toArray: async () => [job],
  }));
  const findCompanies = t.mock.method(Company.collection, "find", () => ({
    toArray: async () => [company],
  }));

  const result = await getAllJobsService("Engineer");
  const json = JSON.parse(JSON.stringify(result));

  assert.equal(json.status, true);
  assert.equal(json.jobs.length, 1);
  assert.equal(json.jobs[0]._id, job._id.toString());
  assert.equal(json.jobs[0].title, job.title);
  assert.deepEqual(json.jobs[0].company, JSON.parse(JSON.stringify(company)));
  assert.deepEqual(findJobs.mock.calls[0].arguments[0], {
    $or: ["title", "description", "requirements", "location", "jobType", "position"]
      .map((field) => ({ [field]: { $regex: "Engineer", $options: "i" } })),
  });
  assert.deepEqual(findCompanies.mock.calls[0].arguments[0]._id.$in, [company._id]);
});

test("job listings return null for a missing referenced company", async (t) => {
  t.mock.method(Job.collection, "find", () => ({
    toArray: async () => [{
      _id: new Types.ObjectId(),
      title: "Software Engineer",
      company: new Types.ObjectId(),
    }],
  }));
  t.mock.method(Company.collection, "find", () => ({
    toArray: async () => [],
  }));

  const result = await getAllJobsService("");

  assert.equal(result.status, true);
  assert.equal(result.jobs[0].company, null);
});

test("job listings preserve the no-results error", async (t) => {
  t.mock.method(Job.collection, "find", () => ({
    toArray: async () => [],
  }));

  await assert.rejects(getAllJobsService("missing"), (error) => {
    assert.ok(error instanceof ServiceError);
    assert.equal(error.statusCode, 404);
    assert.equal(error.message, "No jobs found");
    return true;
  });
});

test("job listings propagate company lookup failures", async (t) => {
  const failure = new Error("Company lookup failed");
  t.mock.method(Job.collection, "find", () => ({
    toArray: async () => [{
      _id: new Types.ObjectId(),
      company: new Types.ObjectId(),
    }],
  }));
  t.mock.method(Company.collection, "find", () => ({
    toArray: async () => { throw failure; },
  }));

  await assert.rejects(getAllJobsService(""), (error) => error === failure);
});
