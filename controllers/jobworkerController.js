const jobWorkers = require('../model/jobworker')
const express = require('express');
const JobWorker = require('../model/jobworker');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const WorkAssignment = require('../model/WorkAssignment');

/**
 * 🚀 Create a new Job Worker
 * POST /jobworkers
 */
exports.createJobWorker = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        if (!name || !phone || !email) {
            return res.status(400).json({ message: 'Name, phone, and email are required.' });
        }

        // Check if a job worker with the same email already exists
        const existingWorker = await JobWorker.findOne({
            email: email.toLowerCase()
        });
        if (existingWorker) {
            return res.status(400).json({
                message: 'Job worker with this email already exists'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔒 Password hashed successfully.');

        const newWorker = await JobWorker.create({ name, phone, email, password: hashedPassword });

        res.status(201).json({ sucess: true, message: "Job worker reated successfullyy !!", newWorker });
    } catch (err) {
        console.log('Error creating job worker:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/**
 * ✏️ Edit an existing Job Worker
 * PUT /jobworkers/:id
 */
exports.updateJobWorker = async (req, res) => {
    try {
        const { jobWorkerId, name, phone, email, password } = req.body;

        if (!jobWorkerId) {
            console.warn("⚠️ jobWorkerId missing in request body.");
            return res.status(400).json({ error: "jobWorkerId is required." });
        }

        const worker = await JobWorker.findById(jobWorkerId);
        if (!worker) {
            console.warn(`⚠️ Job Worker not found: ${jobWorkerId}`);
            return res.status(404).json({ error: "Job Worker not found." });
        }

        // Update only provided fields
        if (name !== undefined) worker.name = name;
        if (phone !== undefined) worker.phone = phone;
        if (email !== undefined) worker.email = email;
        if (password !== undefined) {
            worker.password = await bcrypt.hash(password, 10); // Hash the new password
        }

        await worker.save();

        console.log(`✅ Job Worker updated: ${worker._id}`);
        return res.status(200).json({
            message: "Job Worker updated successfully.",
            worker
        });

    } catch (err) {
        console.error("❌ Error updating Job Worker:", err.message);
        return res.status(500).json({ error: "Server error while updating job worker." });
    }
};

/**
 * 🗑️ Delete a Job Worker
 * DELETE /jobworkers/:id
 */
exports.deleteJobWorker = async (req, res) => {
    try {
        const { jobWorkerId } = req.body;
        const worker = await JobWorker.findByIdAndDelete(jobWorkerId);
        if (!worker) {
            return res.status(404).json({ message: 'Job Worker not found.' });
        }
        res.json({ message: 'Job Worker deleted.', worker });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/**
 * 👀 View all Job Workers
 * GET /jobworkers
 */
exports.getAllJobWorkers = async (req, res) => {
    try {
        console.log('Fetching all job workers...');
        const workers = await JobWorker.find();

        if (!workers || workers.length === 0) {
            console.warn('⚠️ No job workers found.');
        }
        console.log(`📦 ${workers.length} job workers fetched successfully.`);
        // Return the list of job workers
        res.json({
            success: true,
            message: 'Job Workers fetched successfully.',
            workers
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.loginJobworker = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔍 Attempting to log in job worker:', email);

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find the job worker by email
        const jobWorker = await JobWorker.findOne({ email: email });
        if (!jobWorker) {
            return res.status(404).json({ message: 'Job worker not found.' });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, jobWorker.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // If login is successful, return the job worker details (excluding password)
        const { password: _, ...workerDetails } = jobWorker.toObject();

        console.log('✅ Job worker logged in successfully:', workerDetails._id);

        // Return success response with worker details
        res.json({ success: true, message: 'Login successful.', worker: workerDetails });

    } catch (error) {
        console.log('Error logging in job worker:', error.message);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * 📦 Get total number of products assigned to a Job Worker
 * GET /jobworkers/:id/assigned-products-count
 */

exports.getAssignedProductsCount = async (req, res) => {
    try {
        const { jobWorkerId } = req.body;
        console.log(`🔍 Fetching assigned products count for Job Worker ID: ${jobWorkerId}`);

        if (!jobWorkerId) {
            console.warn('⚠️ Job Worker ID is missing in request body.');
            return res.status(400).json({ message: 'Job Worker ID is required.' });
        }

        // Validate JobWorker existence before counting
        const workerExists = await JobWorker.exists({ _id: jobWorkerId });
        if (!workerExists) {
            console.warn(`⚠️ Job Worker not found: ${jobWorkerId}`);
            return res.status(404).json({ message: 'Job Worker not found.' });
        }

        // Use lean() for performance as we only need the count
        const jobworkerInventorys = await WorkAssignment.find({ jobWorker: jobWorkerId }).lean();

        console.log(`📦 Job Worker ${jobWorkerId} has assigned products.`);
        res.json({
            success: true,
            jobWorkerId,
            jobworkerInventorys: jobworkerInventorys
        });

    } catch (err) {
        console.error('❌ Error fetching assigned products count:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getAssignedInventoryStatusCounts = async (req, res) => {
    try {
        const { jobWorkerId } = req.body;
        console.log("📥 Incoming request for status quantity counts:", req.body);

        if (!jobWorkerId) {
            return res.status(400).json({ message: 'Job Worker ID is required.' });
        }

        // ✅ Check JobWorker existence
        const workerExists = await JobWorker.exists({ _id: jobWorkerId });
        if (!workerExists) {
            return res.status(404).json({ message: 'Job Worker not found.' });
        }

        // 🔍 Aggregate quantity sums by status
        const statusCounts = await WorkAssignment.aggregate([
            { $match: { jobworker: new mongoose.Types.ObjectId(jobWorkerId) } },
            { $group: { _id: "$status", totalQuantity: { $sum: "$quantity" } } }
        ]);

        console.log("📊 Raw aggregation result:", statusCounts);

        // 📝 Format result
        const result = {
            pending: 0,
            inprogress: 0,
            cleared: 0
        };

        statusCounts.forEach(item => {
            console.log(`➡️ Status: ${item._id}, Total Qty: ${item.totalQuantity}`);
            if (item._id === 'Pending') result.pending = item.totalQuantity;
            if (item._id === 'InProgress') result.inprogress = item.totalQuantity;
            if (item._id === 'Cleared') result.cleared = item.totalQuantity;
        });

        res.json({
            success: true,
            jobWorkerId,
            statusQuantities: result
        });
    } catch (err) {
        console.error("🔥 Error in getAssignedInventoryStatusCounts:", err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
