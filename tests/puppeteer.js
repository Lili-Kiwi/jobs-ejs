const puppeteer = require("puppeteer");
require("../app");
const { seed_db, testUserPassword } = require("../util/seed_db");
const Job = require("../models/Job");

let testUser = null;

let page = null;
let browser = null;

describe("jobs-ejs puppeteer test", function () {
    before(async function () {
        this.timeout(10000);
        browser = await puppeteer.launch();
        page = await browser.newPage();
        await page.goto("http://localhost:3000");
    });
    after(async function () {
        this.timeout(5000);
        await browser.close();
    });
    describe("got to site", function () {
        it("should have completed a connection", async function () {});
    });
    describe("index page test", function () {
        this.timeout(10000);
        it("finds the index page logon link", async () => {
            this.logonLink = await page.waitForSelector(
                "a ::-p-text(Click this link to logon)",
            );
        });
        it("gets to the logon page", async () => {
            await this.logonLink.click();
            await page.waitForNavigation();
            const email = await page.waitForSelector('input[name="email"]');
        });
    });
    describe("logon page test", function () {
        this.timeout(20000);
        it("resolves all the fields", async () => {
            this.email = await page.waitForSelector('input[name="email"]');
            this.password = await page.waitForSelector(
                'input[name="password"]',
            );
            this.submit = await page.waitForSelector("button ::-p-text(Logon)");
        });
        it("sends the logon", async () => {
            testUser = await seed_db();
            await this.email.type(testUser.email);
            await this.password.type(testUserPassword);
            await this.submit.click();
            await page.waitForNavigation();
            await page.waitForSelector(
                `p ::-p-text(${testUser.name} is logged on.)`,
            );
            await page.waitForSelector("a ::-p-text(change the secret)");
            await page.waitForSelector('a[href="/secretWord"]');
            const copyr = await page.waitForSelector("p ::-p-text(copyright)");
            const copyrText = await copyr.evaluate((el) => el.textContent);
            console.log("copyright text: ", copyrText);
        });
    });

    describe("puppeteer job operations", function () {
        this.timeout(20000);

        it("should navigate to the jobs list and show 20 entries", async () => {
            const { expect } = await import("chai");
            const jobsListLink = await page.waitForSelector(
                "a ::-p-text(Click this link to view your jobs)",
            );
            await jobsListLink.click();
            await page.waitForNavigation();
            await page.waitForSelector("h2 ::-p-text(Jobs List)");
            const pageHtml = await page.content();
            const rows = pageHtml.split("<tr>");
            expect(rows.length).to.equal(21);
        });

        it("should click Add Job and show the form", async () => {
            const { expect } = await import("chai");
            const addJobLink = await page.waitForSelector(
                'a[href="/jobs/new"]',
            );
            await addJobLink.click();
            await page.waitForNavigation();
            await page.waitForSelector("h2 ::-p-text(Add a Job)");
            this.companyField = await page.waitForSelector(
                'input[name="company"]',
            );
            this.positionField = await page.waitForSelector(
                'input[name="position"]',
            );
            this.addBtn = await page.waitForSelector("button ::-p-text(add)");
            expect(this.companyField).to.not.be.null;
            expect(this.positionField).to.not.be.null;
        });

        it("should add a job and verify it in the database", async () => {
            const { expect } = await import("chai");
            const testCompany = "Puppeteer Corp";
            const testPosition = "Test Engineer";
            await this.companyField.type(testCompany);
            await this.positionField.type(testPosition);
            await this.addBtn.click();
            await page.waitForNavigation();
            // should be back on the jobs list with the new entry
            await page.waitForSelector("h2 ::-p-text(Jobs List)");
            // check the database to make sure the job was actually saved
            const allJobs = await Job.find({ createdBy: testUser._id });
            expect(allJobs.length).to.equal(21);
            const addedJob = allJobs.find((j) => j.company === testCompany);
            expect(addedJob).to.not.be.null;
            expect(addedJob.position).to.equal(testPosition);
        });
    });
});
