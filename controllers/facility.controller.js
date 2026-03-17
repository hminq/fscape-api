const facilityService = require('../services/facility.service');

const handleError = (res, err) => {
    console.error('[FacilityController]', err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    return res.status(status).json({ message });
};

const getAllFacilities = async (req, res) => {
    try {
        const result = await facilityService.getAllFacilities(req.query, req.user);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

const getFacilityById = async (req, res) => {
    try {
        const facility = await facilityService.getFacilityById(req.params.id);
        return res.status(200).json({ data: facility });
    } catch (err) {
        return handleError(res, err);
    }
};

const createFacility = async (req, res) => {
    try {
        const { name, is_active } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Facility name is required' });
        }

        const facility = await facilityService.createFacility({
            name,
            is_active
        });

        return res.status(201).json({ message: 'Facility created successfully', data: facility });
    } catch (err) {
        return handleError(res, err);
    }
};

const updateFacility = async (req, res) => {
    try {
        const { name, is_active } = req.body;
        let updatedData = { name, is_active };

        const facility = await facilityService.updateFacility(req.params.id, updatedData);

        return res.status(200).json({ message: 'Facility updated successfully', data: facility });
    } catch (err) {
        return handleError(res, err);
    }
};

const deleteFacility = async (req, res) => {
    try {
        const result = await facilityService.deleteFacility(req.params.id);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

module.exports = {
    getAllFacilities,
    getFacilityById,
    createFacility,
    updateFacility,
    deleteFacility
};