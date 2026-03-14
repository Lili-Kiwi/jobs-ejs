const { app } = require("../app");
const { factory, seed_db } = require("../util/seed_db");
const faker = require("@faker-js/faker").fakerEN_US;
const get_chai = require("../util/get_chai");

const User = require("../models/User");

describe("tests for registration and logon", function () {
  it("should get the registration page", async () => {
    const { expect, request } = await get_chai();
    const response = await request.execute(app).get("/sessions/register").send();
    expect(response).to.have.status(200);
    expect(response).to.have.property("text");
    expect(response.text).to.include("Enter your name");
    const pageTextNoNewlines = response.text.replaceAll("\n", "");
    const csrfMatch = /_csrf\" value=\"(.*?)\"/.exec(pageTextNoNewlines);
    expect(csrfMatch).to.not.be.null;
    this.csrfToken = csrfMatch[1];
    expect(response).to.have.property("headers");
    expect(response.headers).to.have.property("set-cookie");
    const setCookieHeader = response.headers["set-cookie"];
    this.csrfCookie = setCookieHeader.find((element) =>
      element.startsWith("csrfToken"),
    );
    expect(this.csrfCookie).to.not.be.undefined;
  });

  it("should register the user", async () => {
    const { expect, request } = await get_chai();
    this.password = faker.internet.password();
    this.user = await factory.build("user", { password: this.password });
    const formData = {
      name: this.user.name,
      email: this.user.email,
      password: this.password,
      password1: this.password,
      _csrf: this.csrfToken,
    };
    const response = await request
      .execute(app)
      .post("/sessions/register")
      .set("Cookie", this.csrfCookie)
      .set("content-type", "application/x-www-form-urlencoded")
      .send(formData);
    expect(response).to.have.status(200);
    expect(response).to.have.property("text");
    expect(response.text).to.include("Jobs List");
    newUser = await User.findOne({ email: this.user.email });
    expect(newUser).to.not.be.null;
  });

  it("should log the user on", async () => {
    const dataToPost = {
      email: this.user.email,
      password: this.password,
      _csrf: this.csrfToken,
    };
    const { expect, request } = await get_chai();
    const response = await request
      .execute(app)
      .post("/sessions/logon")
      .set("Cookie", this.csrfCookie)
      .set("content-type", "application/x-www-form-urlencoded")
      .redirects(0)
      .send(dataToPost);
    expect(response).to.have.status(302);
    expect(response.headers.location).to.equal("/");
    const cookiesAfterLogon = response.headers["set-cookie"];
    this.sessionCookie = cookiesAfterLogon.find((element) =>
      element.startsWith("connect.sid"),
    );
    expect(this.sessionCookie).to.not.be.undefined;
  });

  it("should get the index page", async () => {
    const { expect, request } = await get_chai();
    const response = await request
      .execute(app)
      .get("/")
      .set("Cookie", this.csrfCookie)
      .set("Cookie", this.sessionCookie)
      .send();
    expect(response).to.have.status(200);
    expect(response).to.have.property("text");
    expect(response.text).to.include(this.user.name);
  });

  it("should log the user off", async () => {
    const { expect, request } = await get_chai();
    const dataToPost = {
      _csrf: this.csrfToken,
    };
    const response = await request
      .execute(app)
      .post("/sessions/logoff")
      .set("Cookie", this.csrfCookie + ";" + this.sessionCookie)
      .set("content-type", "application/x-www-form-urlencoded")
      .send(dataToPost);
    expect(response).to.have.status(200);
    expect(response.text).to.include("link to logon");
  });
});
