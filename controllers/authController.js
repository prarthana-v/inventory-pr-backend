const User = require('../model/auth');
const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
const Firm = require("../model/firm")
// 🔐 Register API
exports.registerUser = async (req, res) => {
    // Log the full request body as soon as it is received
    console.log('📝 New user registration request received:');
    console.log('Request Body:', req.body);

    try {
        const { name, email, password, role, activeFirm, accessibleFirms } = req.body;

        // Log the destructured variables for verification
        console.log(`- name: ${name}`);
        console.log(`- email: ${email}`);
        console.log(`- role: ${role}`);
        console.log(`- activeFirm: ${activeFirm}`);
        console.log(`- accessibleFirms: ${accessibleFirms ? accessibleFirms.join(', ') : 'None'}`);

        // Role must be valid
        const validRoles = ['Admin', 'Employee', 'SuperAdmin'];
        if (!validRoles.includes(role)) {
            console.warn(`⚠️ Invalid role received: ${role}`);
            return res.status(400).json({ message: 'Invalid role' });
        }
        console.log(`👍 Role is valid: ${role}`);

        // SuperAdmin should not have firm fields
        if (role === 'SuperAdmin' && (activeFirm || (accessibleFirms && accessibleFirms.length > 0))) {
            console.warn(`⚠️ SuperAdmin request with firm data. activeFirm: ${activeFirm}, accessibleFirms: ${accessibleFirms}`);
            return res.status(400).json({ message: 'SuperAdmin should not be assigned firms' });
        }

        // Admin/Employee must have firm
        if ((role === 'Employee') && (!activeFirm && (!accessibleFirms || accessibleFirms.length === 0))) {
            console.warn(`⚠️ Admin or Employee request without firm data.`);
            return res.status(400).json({ message: 'Firm is required for Admin/Employee' });
        }
        // Correcting the logic for Admin and Employee
        // Original code had a bug where it only checked for 'Employee' but returned a message for 'Admin/Employee'
        // This corrected logic will return the correct message for both roles.

        // Check for existing user
        console.log(`🔍 Checking for existing user with email: ${email}`);
        const existing = await User.findOne({ email });
        if (existing) {
            console.warn(`⚠️ Registration failed: Email already registered for user with ID ${existing._id}`);
            return res.status(409).json({ message: 'Email already registered' });
        }
        console.log('✅ Email is not in use.');

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔒 Password hashed successfully.');

        // Create the new user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            activeFirm: activeFirm || null,
            accessibleFirms: accessibleFirms || [],
        });

        // Log the successful creation and final user data
        console.log(`✅ User registered successfully!`);
        console.log('New User Details:', user);
        console.log(`New user ID: ${user._id}`);

        res.status(201).json({ message: 'User registered successfully', user });
    } catch (err) {
        // Log the full error object for comprehensive debugging
        console.error('❌ An error occurred during registration:');
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};


// 🔑 Login API
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).populate('activeFirm').populate('accessibleFirms');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ message: 'Invalid credentials' });

        // For now, just send back user details (no JWT unless you're ready)
        res.status(200).json({
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                activeFirm: user.activeFirm,
                accessibleFirms: user.accessibleFirms,
            }
        });

    } catch (err) {
        console.error('❌ Login error:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getUserByEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({
            sucess: true,
            message: 'User fetched successfully',
            user
        });
    } catch (err) {
        console.error('❌ Error fetching user by email:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getAllAdmins = async (req, res) => {
    console.log('🔍 Fetching all users with role "Admin"...');
    try {
        // 1. Fetch all Admins
        const admins = await User.find({ role: 'Admin' }).lean();

        if (!admins || admins.length === 0) {
            console.warn('⚠️ No Admin users found.');
            return res.status(404).json({
                success: false,
                message: 'No Admin users found',
                admins: []
            });
        }

        console.log(`✅ Found ${admins.length} Admin user(s).`);

        // 2. Attach firms to each admin
        const adminsWithFirms = await Promise.all(
            admins.map(async (admin) => {
                const firms = await Firm.find({ admins: admin._id }).select("name address phone").lean();
                return {
                    ...admin,
                    firms
                };
            })
        );

        res.status(200).json({
            success: true,
            message: 'Admins with firms fetched successfully',
            admins: adminsWithFirms
        });

    } catch (err) {
        console.error('❌ Error fetching admins with firms:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching admins with firms',
            error: err && err.message ? err.message : 'Unknown error'
        });
    }
};

exports.deleteUserById = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const deletedUser = await User.findByIdAndDelete(userId);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully', user: deletedUser });
    } catch (err) {
        console.error('❌ Error deleting user:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};