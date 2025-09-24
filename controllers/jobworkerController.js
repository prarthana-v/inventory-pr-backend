const jobWorkers = require('../model/jobworker')
const express = require('express');
const JobWorker = require('../model/jobworker');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const WorkAssignment = require('../model/WorkAssignment');

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

        const newWorker = await JobWorker.create({
            name, phone, email, password: hashedPassword,
            profileImage: req.file ? `/uploads/${req.file.filename}` : null
        });

        res.status(201).json({ sucess: true, message: "Job worker reated successfullyy !!", newWorker });
    } catch (err) {
        console.log('Error creating job worker:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

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
        if (req.file) worker.profileImage = `/uploads/${req.file.filename}`;

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

// exports.deleteJobWorker = async (req, res) => {
//     try {
//         const { jobWorkerId } = req.body;
//         const worker = await JobWorker.findByIdAndDelete(jobWorkerId);
//         if (!worker) {
//             return res.status(404).json({ message: 'Job Worker not found.' });
//         }
//         res.json({ message: 'Job Worker deleted.', worker });
//     } catch (err) {
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// };

exports.deleteJobWorker = async (req, res) => {
    try {
        const { jobWorkerId } = req.body;
        const worker = await JobWorker.findOneAndUpdate(
            { _id: jobWorkerId, isDeleted: false }, // Find a worker that is not already deleted
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date()
                }
            },
            { new: true } // Return the updated document
        );

        if (!worker) {
            return res.status(404).json({ message: 'Job Worker not found.' });
        }
        res.json({ message: 'Job Worker deleted successfully.', worker });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getAllJobWorkers = async (req, res) => {
    try {
        console.log('Fetching all job workers...');

        const workers = await JobWorker.find({ isDeleted: false });

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
        const jobWorker = await JobWorker.findOne({ email: email, isDeleted: false });
        if (!jobWorker) {
            return res.status(404).json({ message: 'Job worker not found or has been deactivated.' });
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

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const worker = await JobWorker.findOne({ email });

        if (!worker) {
            // To prevent email enumeration, send a generic success message
            // even if the user doesn't exist.
            console.warn(`⚠️ Password reset attempt for non-existent email: ${email}`);
            return res.status(200).json({ message: 'If a user with that email exists, an OTP has been sent.' });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`🔑 Generated OTP for ${email}: ${otp}`);

        // Set OTP and expiration (e.g., 10 minutes from now)
        worker.resetPasswordOtp = otp;
        worker.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await worker.save();

        // Send the OTP to the user's email
        try {
            await sendEmail({
                email: worker.email,
                subject: 'Your Password Reset OTP (Valid for 10 minutes)',
                message: `You are receiving this email because you (or someone else) have requested the reset of a password. Your OTP is: ${otp}`,
            });

            res.status(200).json({ success: true, message: 'OTP sent to email!' });

        } catch (emailError) {
            console.error('❌ Email sending error:', emailError);
            // Clear the OTP fields if email fails to send
            worker.resetPasswordOtp = undefined;
            worker.resetPasswordExpires = undefined;
            await worker.save();
            return res.status(500).json({ message: 'There was an error sending the email. Please try again later.' });
        }

    } catch (err) {
        console.error('❌ Error in forgotPassword:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.restoreJobWorker = async (req, res) => {
    try {
        const { jobWorkerId } = req.body;
        const worker = await JobWorker.findOneAndUpdate(
            { _id: jobWorkerId, isDeleted: true }, // Find a worker that is currently deleted
            {
                $set: {
                    isDeleted: false,
                    deletedAt: null
                }
            },
            { new: true }
        );

        if (!worker) {
            return res.status(404).json({ message: 'Deleted Job Worker not found.' });
        }
        res.json({ message: 'Job Worker restored successfully.', worker });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
        }

        // Find worker by email with a valid, unexpired OTP
        const worker = await JobWorker.findOne({
            email,
            resetPasswordOtp: otp,
            resetPasswordExpires: { $gt: Date.now() }, // Check if the token is not expired
        });

        if (!worker) {
            return res.status(400).json({ message: 'OTP is invalid or has expired.' });
        }

        // Hash the new password
        worker.password = await bcrypt.hash(newPassword, 10);

        // Clear the OTP fields so it can't be used again
        worker.resetPasswordOtp = undefined;
        worker.resetPasswordExpires = undefined;

        await worker.save();

        console.log(`✅ Password reset successfully for ${email}`);
        res.status(200).json({ success: true, message: 'Password has been reset successfully.' });

    } catch (err) {
        console.error('❌ Error in resetPassword:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};