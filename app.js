require("dotenv").config();
const express = require("express");
require("express-async-errors");
const helmet = require("helmet");
const xss = require("xss-clean");
const rateLimiter = require("express-rate-limit");

const app = express();

// security
app.use(helmet());
app.use(xss());
app.use(rateLimiter({ windowMs: 15 * 60 * 1000, max: 100 }));

app.set("view engine", "ejs");
app.use(require("cookie-parser")(process.env.SESSION_SECRET));
app.use(require("body-parser").urlencoded({ extended: true }));

// session setup
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);

// use test database when running tests
let mongoURL = process.env.MONGO_URI;
if (process.env.NODE_ENV == "test") {
    mongoURL = process.env.MONGO_URI_TEST;
}

const store = new MongoDBStore({
    // may throw an error, which won't be caught
    uri: mongoURL,
    collection: "mySessions",
});
store.on("error", function (error) {
    console.log(error);
});

// session params config
const sessionParms = {
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store: store,
    cookie: { secure: false, sameSite: "strict" },
};

if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionParms.cookie.secure = true;
}

app.use(session(sessionParms));

// passport needs to come after session
const passport = require("passport");
const passportInit = require("./passport/passportInit");

passportInit();

app.use(passport.initialize());
app.use(passport.session());

app.use(require("connect-flash")());

// csrf protection - has to be after cookie-parser and body-parser
const csrf = require("host-csrf");
const csrfMiddleware = csrf({
    protected_operations: ["PATCH", "PUT", "POST", "DELETE"],
    protected_content_types: [
        "application/json",
        "application/x-www-form-urlencoded",
    ],
    secret: process.env.SESSION_SECRET,
});
app.use(csrfMiddleware);

app.use((req, res, next) => {
    if (req.path == "/multiply") {
        res.set("Content-Type", "application/json");
    } else {
        res.set("Content-Type", "text/html");
    }
    next();
});

// routes
app.use(require("./middleware/storeLocals"));
app.get("/", (req, res) => {
    res.render("index");
});
app.use("/sessions", require("./routes/sessionRoutes"));

const secretWordRouter = require("./routes/secretWord");
const jobsRouter = require("./routes/jobs");
const auth = require("./middleware/auth");
app.use("/secretWord", auth, secretWordRouter);
app.use("/jobs", auth, jobsRouter);

// simple multiply api endpoint for testing
app.get("/multiply", (req, res) => {
    const result = req.query.first * req.query.second;
    if (result.isNaN) {
        result = "NaN";
    } else if (result == null) {
        result = "null";
    }
    res.json({ result: result });
});

// 404 handle
app.use((req, res) => {
    res.status(404).send(`That page (${req.url}) was not found.`);
});

// error handle
app.use((err, req, res, next) => {
    res.status(500).send(err.message);
    console.log(err);
});

const port = process.env.PORT || 3000;

const start = () => {
    try {
        require("./db/connect")(mongoURL);
        return app.listen(port, () =>
            console.log(`Server is listening on port ${port}...`),
        );
    } catch (error) {
        console.log(error);
    }
};

start();

module.exports = { app };
