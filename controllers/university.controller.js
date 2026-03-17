const universityService = require('../services/university.service');

const handleError = (res, err) => {
    console.error('[UniversityController]', err);
    return res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
};

const getAllUniversities = async (req, res) => {
    try {
        const result = await universityService.getAllUniversities(req.query);
        return res.status(200).json({ ...result });
    } catch (err) { return handleError(res, err); }
};

const getUniversityById = async (req, res) => {
    try {
        const university = await universityService.getUniversityById(req.params.id);
        return res.status(200).json({ data: university });
    } catch (err) { return handleError(res, err); }
};

const createUniversity = async (req, res) => {
    try {
        const { name, location_id } = req.body;
        if (!name || !location_id) {
            return res.status(400).json({ message: 'Name and location_id are required' });
        }
        const university = await universityService.createUniversity(req.body);
        return res.status(201).json({ data: university });
    } catch (err) { return handleError(res, err); }
};

const updateUniversity = async (req, res) => {
    try {
        const university = await universityService.updateUniversity(req.params.id, req.body);
        return res.status(200).json({ data: university });
    } catch (err) { return handleError(res, err); }
};

const deleteUniversity = async (req, res) => {
    try {
        const result = await universityService.deleteUniversity(req.params.id);
        return res.status(200).json({ ...result });
    } catch (err) { return handleError(res, err); }
};

const toggleUniversityStatus = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                message: 'is_active must be a boolean'
            });
        }

        const university = await universityService.toggleUniversityStatus(req.params.id, is_active)
        return res.status(200).json({
            message: 'University status updated successfully',
            data: university
        })
    } catch (err) {
        return handleError(res, err)
    }
}

module.exports = {
    getAllUniversities,
    getUniversityById,
    createUniversity,
    updateUniversity,
    deleteUniversity,
    toggleUniversityStatus
};