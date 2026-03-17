const buildingService = require('../services/building.service');

const handleError = (res, err) => {
    console.error('[BuildingController]', err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    return res.status(status).json({ message });
};

// GET /api/buildings
const getAllBuildings = async (req, res) => {
    try {
        const result = await buildingService.getAllBuildings(req.query, req.user);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

// GET /api/buildings/:id
const getBuildingById = async (req, res) => {
    try {
        const building = await buildingService.getBuildingById(req.params.id, req.user);
        return res.status(200).json({ data: building });
    } catch (err) {
        return handleError(res, err);
    }
};

// POST /api/buildings
const createBuilding = async (req, res) => {
    try {
        const {
            location_id,
            name,
            address,
            latitude,
            longitude,
            description,
            total_floors,
            thumbnail_url,
            is_active,
            images,
            facilities,
            manager_id
        } = req.body;

        if (!location_id || !name || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({
                message: 'Missing required fields: location_id, name, address, latitude, longitude'
            });
        }

        // Xử lý mảng facilities
        let parsedFacilities = [];
        if (facilities) {
            if (Array.isArray(facilities)) {
                parsedFacilities = facilities;
            } else if (typeof facilities === 'string') {
                parsedFacilities = [facilities];
            }
        }

        const building = await buildingService.createBuilding({
            location_id,
            name,
            address,
            latitude,
            longitude,
            description,
            total_floors,
            thumbnail_url: thumbnail_url || null,
            is_active,
            images: images || [],
            facilities: parsedFacilities,
            manager_id: manager_id || null
        });

        return res.status(201).json({
            message: 'Building created successfully',
            data: building
        });

    } catch (err) {
        return handleError(res, err);
    }
};

// PUT /api/buildings/:id
const updateBuilding = async (req, res) => {
    try {
        const updateData = { ...req.body };

        // Xử lý mảng facilities
        if (updateData.facilities) {
            if (!Array.isArray(updateData.facilities)) {
                updateData.facilities = [updateData.facilities];
            }
        }

        const building = await buildingService.updateBuilding(req.params.id, updateData);

        return res.status(200).json({
            message: 'Building updated successfully',
            data: building
        });

    } catch (err) {
        return handleError(res, err);
    }
};
// DELETE /api/buildings/:id
const deleteBuilding = async (req, res) => {
    try {
        const result = await buildingService.deleteBuilding(req.params.id);

        return res.status(200).json({
            message: 'Building deleted successfully',
            ...result
        });

    } catch (err) {
        return handleError(res, err);
    }
};

// PATCH /api/buildings/:id/status
const toggleBuildingStatus = async (req, res) => {
    try {
        const { is_active } = req.body;

        if (typeof is_active !== 'boolean') {
            return res.status(400).json({
                message: 'is_active must be a boolean'
            });
        }

        const building = await buildingService.toggleBuildingStatus(req.params.id, is_active, req.user)
        return res.status(200).json({
            message: 'Building status updated successfully',
            data: building
        })
    } catch (err) {
        return handleError(res, err)
    }
}

const getStaffsInBuilding = async (req, res) => {
  try {
    const { buildingId } = req.params;

    const staffs = await buildingService.getStaffsByBuilding(buildingId);

    return res.json(staffs);
  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};
// GET /api/buildings/stats
const getBuildingStats = async (req, res) => {
    try {
        const stats = await buildingService.getBuildingStats();
        return res.status(200).json({ data: stats });
    } catch (err) {
        return handleError(res, err);
    }
};

module.exports = {
    getAllBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    toggleBuildingStatus,
    getStaffsInBuilding,
    getBuildingStats
};
