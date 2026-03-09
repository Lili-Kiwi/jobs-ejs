const express = require("express");
const router = express.Router();
const {
  getAllJobs,
  newJob,
  createJob,
  editJob,
  updateJob,
  deleteJob,
} = require("../controllers/jobs");

// all the job routes
router.get("/", getAllJobs);
router.get("/new", newJob);
router.post("/", createJob);
router.get("/edit/:id", editJob);
router.post("/update/:id", updateJob);
router.post("/delete/:id", deleteJob);

module.exports = router;
