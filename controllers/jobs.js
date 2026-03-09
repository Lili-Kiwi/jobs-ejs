const Job = require("../models/Job");
const parseVErr = require("../util/parseValidationErr");

const getAllJobs = async (req, res) => {
    const jobs = await Job.find({ createdBy: req.user._id });
    res.render("jobs", { jobs });
};

const newJob = (req, res) => {
    res.render("job", { job: null });
};

const createJob = async (req, res, next) => {
    // set the user
    req.body.createdBy = req.user._id;
    try {
        await Job.create(req.body);
    } catch (e) {
        if (e.constructor.name === "ValidationError") {
            parseVErr(e, req);
            return res.render("job", { job: null, errors: req.flash("error") });
        }
        return next(e);
    }
    res.redirect("/jobs");
};

const editJob = async (req, res) => {
    const job = await Job.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
    });
    if (!job) {
        req.flash("error", "Job not found.");
        return res.redirect("/jobs");
    }
    res.render("job", { job });
};

const updateJob = async (req, res, next) => {
    try {
        const job = await Job.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user._id },
            req.body,
            { new: true, runValidators: true },
        );
        if (!job) {
            req.flash("error", "Job not found.");
            return res.redirect("/jobs");
        }
    } catch (e) {
        if (e.constructor.name === "ValidationError") {
            parseVErr(e, req);
            const job = await Job.findById(req.params.id);
            return res.render("job", { job, errors: req.flash("error") });
        }
        return next(e);
    }
    res.redirect("/jobs");
};

const deleteJob = async (req, res) => {
    await Job.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    res.redirect("/jobs");
};

module.exports = {
    getAllJobs,
    newJob,
    createJob,
    editJob,
    updateJob,
    deleteJob,
};
