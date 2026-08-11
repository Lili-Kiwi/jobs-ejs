const { app } = require("../app");
const Job = require("../models/Job");
const { seed_db, testUserPassword } = require("../util/seed_db");
const get_chai = require("../util/get_chai");

describe("test job crud operations", function () {
  before(async function () {
    const { expect, request } = await get_chai();
    this.test_user = await seed_db();
    let logonPageRes = await request.execute(app).get("/sessions/logon").send();
    const htmlText = logonPageRes.text.replaceAll("\n", "");
    this.csrfToken = /_csrf\" value=\"(.*?)\"/.exec(htmlText)[1];
    let cookieList = logonPageRes.headers["set-cookie"];
    this.csrfCookie = cookieList.find((element) =>
      element.startsWith("csrfToken"),
    );
    const loginData = {
      email: this.test_user.email,
      password: testUserPassword,
      _csrf: this.csrfToken,
    };
    let logonPostRes = await request
      .execute(app)
      .post("/sessions/logon")
      .set("Cookie", this.csrfCookie)
      .set("content-type", "application/x-www-form-urlencoded")
      .redirects(0)
      .send(loginData);
    cookieList = logonPostRes.headers["set-cookie"];
    this.sessionCookie = cookieList.find((element) =>
      element.startsWith("connect.sid"),
    );
    expect(this.csrfToken).to.not.be.undefined;
    expect(this.sessionCookie).to.not.be.undefined;
    expect(this.csrfCookie).to.not.be.undefined;
  });

  it("should get the jobs list with 20 entries", async function () {
    const { expect, request } = await get_chai();
    const jobsPageRes = await request
      .execute(app)
      .get("/jobs")
      .set("Cookie", this.csrfCookie + ";" + this.sessionCookie)
      .send();
    expect(jobsPageRes).to.have.status(200);
    const tableRows = jobsPageRes.text.split("<tr>");
    expect(tableRows.length).to.equal(21);
  });

  it("should add a new job entry", async function () {
    const { expect, request } = await get_chai();
    const newJobData = {
      company: "Test Company",
      position: "Test Position",
      status: "pending",
      _csrf: this.csrfToken,
    };
    const addJobRes = await request
      .execute(app)
      .post("/jobs")
      .set("Cookie", this.csrfCookie + ";" + this.sessionCookie)
      .set("content-type", "application/x-www-form-urlencoded")
      .send(newJobData);
    expect(addJobRes).to.have.status(200);
    const allJobs = await Job.find({ createdBy: this.test_user._id });
    expect(allJobs.length).to.equal(21);
  });
});
