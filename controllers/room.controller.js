const roomService = require('../services/room.service');

const handleError = (res, err) => {
    console.error('[RoomController]', err);
    const status = err.status || 500;
    const message = err.message || 'Lỗi hệ thống';
    return res.status(status).json({ message });
};

const getAllRooms = async (req, res) => {
    try {
        const result = await roomService.getAllRooms(req.query, req.user);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

const getRoomById = async (req, res) => {
    try {
        const room = await roomService.getRoomById(req.params.id, req.user);
        return res.status(200).json({ data: room });
    } catch (err) {
        return handleError(res, err);
    }
};

const createRoom = async (req, res) => {
    try {
        const roomData = { ...req.body };

        if (!roomData.room_number || !roomData.building_id || !roomData.room_type_id || roomData.floor === undefined) {
            console.warn('[RoomController] createRoom: missing required fields');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        const room = await roomService.createRoom(roomData);

        return res.status(201).json({
            message: 'Tạo phòng thành công',
            data: room
        });

    } catch (err) {
        return handleError(res, err);
    }
};

const createBatchRooms = async (req, res) => {
    try {
        const {
            building_id, room_type_id, floor, count,
            thumbnail_url, image_3d_url, blueprint_url, gallery_images
        } = req.body;

        if (!building_id || !room_type_id || floor === undefined || !count) {
            console.warn('[RoomController] createBatchRooms: missing required fields');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        const parsedCount = Number(count);
        if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 50) {
            console.warn('[RoomController] createBatchRooms: count out of range:', parsedCount);
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        const result = await roomService.createBatchRooms({
            building_id,
            room_type_id,
            floor: Number(floor),
            count: parsedCount,
            thumbnail_url: thumbnail_url || null,
            image_3d_url: image_3d_url || null,
            blueprint_url: blueprint_url || null,
            gallery_images: gallery_images || [],
        });

        return res.status(201).json({
            message: `Đã tạo thành công ${result.count} phòng`,
            data: result
        });
    } catch (err) {
        return handleError(res, err);
    }
};

const updateRoom = async (req, res) => {
    try {
        const updateData = { ...req.body };
        const room = await roomService.updateRoom(req.params.id, updateData);

        return res.status(200).json({
            message: 'Cập nhật phòng thành công',
            data: room
        });

    } catch (err) {
        return handleError(res, err);
    }
};

const deleteRoom = async (req, res) => {
    try {
        const result = await roomService.deleteRoom(req.params.id);
        return res.status(200).json({ ...result });
    } catch (err) {
        return handleError(res, err);
    }
};

const toggleRoomStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            console.warn('[RoomController] toggleRoomStatus: missing status');
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
        }

        const room = await roomService.toggleRoomStatus(req.params.id, status, req.user);
        return res.status(200).json({
            message: `Đã cập nhật trạng thái phòng thành ${status}`,
            data: room
        });
    } catch (err) {
        return handleError(res, err);
    }
};

const getRoomsByBuilding = async (req, res, next) => {
  try {

    const { building_id } = req.params;

    const rooms = await roomService.getRoomsByBuilding(
      building_id,
      req.query,
      req.user
    );

    res.json({
      success: true,
      data: rooms
    });

  } catch (error) {
    next(error);
  }
};
const getMyRooms = async (req, res) => {
    try {
        const data = await roomService.getMyRooms(req.user.id);
        return res.status(200).json({ data });
    } catch (err) {
        return handleError(res, err);
    }
};

const getRoomStats = async (req, res) => {
    try {
        const stats = await roomService.getRoomStats(req.user);
        return res.status(200).json({ data: stats });
    } catch (err) {
        return handleError(res, err);
    }
};

module.exports = {
    getAllRooms,
    getRoomById,
    createRoom,
    createBatchRooms,
    updateRoom,
    deleteRoom,
    toggleRoomStatus,
    getRoomsByBuilding,
    getMyRooms,
    getRoomStats
};
