const Plan = require("../model/plan");

// 1. Get all plans
exports.getAllPlans = async (req, res) => {
    console.log("⚡ [GET] /plans → Fetching all plans...");
    try {
        const plans = await Plan.find();
        console.log(`✅ ${plans.length} plans fetched successfully.`);
        res.status(200).json(plans);
    } catch (err) {
        console.error("❌ Error fetching plans:", err.message);
        res.status(500).json({ message: "Error fetching plans", error: err.message });
    }
};

// 2. Get a single plan by its ID
exports.getPlanById = async (req, res) => {
    console.log(`⚡ [GET] /plans/${req.body.id} → Fetching plan by ID...`);
    try {
        const { planId } = req.body;
        const plan = await Plan.findById(planId);
        if (!plan) {
            console.warn("⚠️ Plan not found!");
            return res.status(404).json({ message: "Plan not found" });
        }
        console.log("✅ Plan fetched:", plan.name);
        res.status(200).json(plan);
    } catch (err) {
        console.error("❌ Error fetching plan:", err.message);
        res.status(500).json({ message: "Error fetching plan", error: err.message });
    }
};

// 3. Create a new plan
exports.createPlan = async (req, res) => {
    console.log("⚡ [POST] /plans → Creating new plan...");
    try {
        const { name, price, features, popular } = req.body;

        if (!name || !price) {
            console.warn("⚠️ Missing required fields: name or price");
            return res.status(400).json({ message: "Name and price are required" });
        }

        const newPlan = new Plan({ name, price, features, popular });
        await newPlan.save();

        console.log("✅ Plan created successfully:", newPlan.name);
        res.status(201).json(newPlan);
    } catch (err) {
        console.error("❌ Error creating plan:", err.message);
        res.status(500).json({ message: "Error creating plan", error: err.message });
    }
};
// 4. Update an existing plan
exports.updatePlan = async (req, res) => {
    console.log(`⚡ [PUT] /plans/${req.params.id} → Updating plan...`);

    try {
        const updatedPlan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
            new: true,           // return the updated doc
            runValidators: true, // validate updates against schema
        });

        if (!updatedPlan) {
            console.warn(`⚠️ Plan with ID ${req.params.id} not found for update.`);
            return res.status(404).json({ message: "Plan not found" });
        }

        console.log(`✅ Plan updated successfully → ${updatedPlan.name}`);
        res.status(200).json(updatedPlan);

    } catch (err) {
        console.error(`❌ Error updating plan with ID ${req.params.id}:`, err.message);
        res.status(500).json({
            message: "Error updating plan",
            error: err.message
        });
    }
};


// 5. Delete a plan
exports.deletePlan = async (req, res) => {
    console.log(`⚡ [DELETE] /plans/${req.params.id} → Deleting plan...`);
    try {
        const deletedPlan = await Plan.findByIdAndDelete(req.params.id);

        if (!deletedPlan) {
            console.warn("⚠️ Plan not found for deletion!");
            return res.status(404).json({ message: "Plan not found" });
        }

        console.log("✅ Plan deleted successfully:", deletedPlan.name);
        res.status(200).json({ message: "Plan deleted successfully" });
    } catch (err) {
        console.error("❌ Error deleting plan:", err.message);
        res.status(500).json({ message: "Error deleting plan", error: err.message });
    }
};
