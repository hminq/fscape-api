const RequestService = require('../../../services/request.service');
const { sequelize } = require('../../../config/db');
const { ROLES } = require('../../../constants/roles');

// 1. Mock Notification Service
jest.mock('../../../services/notification.service', () => ({
    createNotification: jest.fn().mockResolvedValue(true)
}));

// 2. Mock Database & Models (Standard manual pattern)
jest.mock('../../../config/db', () => ({
    sequelize: {
        models: {
            Request: { count: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findAll: jest.fn() },
            RequestImage: { bulkCreate: jest.fn() },
            RequestStatusHistory: { create: jest.fn() },
            Room: { findByPk: jest.fn() },
            User: { findByPk: jest.fn() },
            Asset: { findByPk: jest.fn() },
            Building: { findByPk: jest.fn() }
        },
        transaction: jest.fn().mockResolvedValue({ 
            commit: jest.fn(), 
            rollback: jest.fn(),
            LOCK: { UPDATE: 'UPDATE' }
        }),
        authenticate: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue()
    },
    connectDB: jest.fn().mockResolvedValue()
}));

// Mock individual models
jest.mock('../../../models/request.model', () => ({
    count: jest.fn(), create: jest.fn(), findByPk: jest.fn(), findAndCountAll: jest.fn(), findAll: jest.fn()
}));
jest.mock('../../../models/requestImage.model', () => ({ bulkCreate: jest.fn() }));
jest.mock('../../../models/requestStatusHistory.model', () => ({ create: jest.fn() }));
jest.mock('../../../models/room.model', () => ({ findByPk: jest.fn() }));
jest.mock('../../../models/user.model', () => ({ findByPk: jest.fn() }));
jest.mock('../../../models/asset.model', () => ({ findByPk: jest.fn() }));
jest.mock('../../../models/building.model', () => ({ findByPk: jest.fn() }));

const Request = require('../../../models/request.model');
const Room = require('../../../models/room.model');
const RequestImage = require('../../../models/requestImage.model');
const RequestStatusHistory = require('../../../models/requestStatusHistory.model');

describe('RequestService - Workflow & Abnormal Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset trạng thái mặc định cho các Model
        Request.findByPk.mockResolvedValue(null);
        Room.findByPk.mockResolvedValue(null);
        Request.count.mockResolvedValue(0);
        Request.create.mockResolvedValue(null);
        RequestStatusHistory.create.mockResolvedValue(null);
        
        console.log('\n=========================================================================');
    });

    describe('createRequest', () => {
        it('TC_REQUEST_01: Tạo yêu cầu dịch vụ thành công (Happy Path)', async () => {
            const mockData = {
                resident_id: 1, room_id: 10, title: 'Hỏng vòi nước',
                description: 'Rò rỉ nước', request_type: 'REPAIR', priority: 'MEDIUM'
            };
            Room.findByPk.mockResolvedValue({ id: 10, building_id: 20 });
            Request.create.mockResolvedValue({ id: 'req-1', request_number: 'REQ-001', ...mockData });

            const result = await RequestService.createRequest(mockData);
            expect(result.id).toBe('req-1');
            expect(Request.create).toHaveBeenCalled();
            expect(RequestStatusHistory.create).toHaveBeenCalled();
        });

        it('TC_REQUEST_02: Lỗi khi phòng không tồn tại (Abnormal)', async () => {
            Room.findByPk.mockResolvedValue(null);
            console.log(`[TEST]: Tạo yêu cầu thất bại - Phòng không tồn tại`);
            try {
                await RequestService.createRequest({ room_id: 999 });
                throw new Error('Should have thrown error');
            } catch (error) {
                expect(error.status).toBe(404);
                expect(error.message).toBe('Không tìm thấy phòng');
            }
        });

        it('TC_REQUEST_02_Rollback: Lỗi hệ thống khi tạo History - Kiểm tra Rollback (Abnormal)', async () => {
            Room.findByPk.mockResolvedValue({ id: 10, building_id: 20 });
            Request.create.mockResolvedValue({ id: 'req-1' });
            
            // Giả lập Request tạo xong nhưng tạo history bị lỗi hệ thống
            RequestStatusHistory.create.mockRejectedValue(new Error('DB History Error'));

            const { sequelize } = require('../../../config/db');
            const mockTransaction = await sequelize.transaction();

            console.log(`[TEST]: Lỗi khi lưu History - Rollback check`);
            try {
                await RequestService.createRequest({ room_id: 10, title: 'Test' });
                throw new Error('Should have thrown error');
            } catch (error) {
                expect(error.message).toBe('DB History Error');
                expect(mockTransaction.rollback).toHaveBeenCalled();
            }
        });
    });

    describe('updateRequestStatus', () => {
        it('TC_REQUEST_03: Chuyển trạng thái thành công (Happy Path)', async () => {
            const mockRequest = { 
                id: 'req-1', status: 'PENDING', resident_id: 1,
                update: jest.fn().mockResolvedValue(true)
            };
            Request.findByPk.mockResolvedValue(mockRequest);
            // Mock subsequent findByPk for the service's return value
            Request.findByPk.mockResolvedValueOnce(mockRequest).mockResolvedValueOnce({ ...mockRequest, status: 'CANCELLED' });

            const result = await RequestService.updateRequestStatus('req-1', { 
                status: 'CANCELLED', caller_role: ROLES.RESIDENT, changed_by: 1 
            });
            expect(mockRequest.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'CANCELLED' }), expect.any(Object));
        });

        it('TC_REQUEST_04: Lỗi chuyển trạng thái không hợp lệ (Abnormal)', async () => {
            const mockRequest = { id: 'req-1', status: 'PENDING' };
            Request.findByPk.mockResolvedValue(mockRequest);
            console.log(`[TEST]: Chuyển trạng thái thất bại - Sai luồng (PENDING -> DONE)`);
            try {
                await RequestService.updateRequestStatus('req-1', { status: 'DONE', caller_role: ROLES.STAFF });
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(400);
                expect(error.message).toContain('Chuyển trạng thái không hợp lệ');
            }
        });

        it('TC_REQUEST_05: Lỗi khi vai trò không được phép (Abnormal)', async () => {
            const mockRequest = { id: 'req-1', status: 'PENDING' };
            Request.findByPk.mockResolvedValue(mockRequest);
            console.log(`[TEST]: Chuyển trạng thái thất bại - Sai vai trò (STAFF -> CANCELLED)`);
            try {
                await RequestService.updateRequestStatus('req-1', { status: 'CANCELLED', caller_role: ROLES.STAFF });
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(403);
                expect(error.message).toContain('không được phép chuyển trạng thái');
            }
        });

        it('TC_REQUEST_06: Lỗi khi thiếu trường bắt buộc (Abnormal)', async () => {
            const mockRequest = { id: 'req-1', status: 'IN_PROGRESS' };
            Request.findByPk.mockResolvedValue(mockRequest);
            console.log(`[TEST]: Chuyển trạng thái thất bại - Thiếu completion_note`);
            try {
                await RequestService.updateRequestStatus('req-1', { status: 'DONE', caller_role: ROLES.STAFF });
                throw new Error('Should have thrown error');
            } catch (error) {
                expect(error.status).toBe(400);
                expect(error.message).toContain('Thiếu trường bắt buộc: completion_note');
            }
        });
    });

    describe('assignRequest', () => {
        it('TC_REQUEST_09: Phân công nhân viên xử lý thành công (Happy Path)', async () => {
            const mockRequest = { id: 'req-1', status: 'PENDING', request_number: 'REQ-001', update: jest.fn() };
            Request.findByPk.mockResolvedValue(mockRequest);
            
            await RequestService.assignRequest('req-1', 5, 2); // id, staff_id, manager_id
            
            expect(mockRequest.update).toHaveBeenCalledWith(
                expect.objectContaining({ assigned_staff_id: 5, status: 'ASSIGNED' }),
                expect.any(Object)
            );
            expect(RequestStatusHistory.create).toHaveBeenCalledWith(
                expect.objectContaining({ to_status: 'ASSIGNED' }),
                expect.any(Object)
            );
        });

        it('TC_REQUEST_10: Lỗi không thể phân công nếu đã qua bước PENDING (Abnormal)', async () => {
            const mockRequest = { id: 'req-1', status: 'IN_PROGRESS' };
            Request.findByPk.mockResolvedValue(mockRequest);

            try {
                await RequestService.assignRequest('req-1', 5, 2);
                throw new Error('Should error');
            } catch (error) {
                expect(error.status).toBe(400);
                expect(error.message).toContain('Không thể phân công');
            }
        });
    });

    describe('getRequestById Access Control', () => {
        it('TC_REQUEST_07: Lỗi khi Resident xem yêu cầu của người khác (Abnormal)', async () => {
            const mockRequest = { id: 'req-1', resident_id: 10, room: { building_id: 1 } };
            Request.findByPk.mockResolvedValue(mockRequest);
            const caller = { id: 1, role: ROLES.RESIDENT };

            console.log(`[TEST]: Xem yêu cầu thất bại - Không có quyền (Resident)`);
            try {
                await RequestService.getRequestById(caller, 'req-1');
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(403);
                expect(error.message).toBe('Bạn không có quyền thực hiện hành động này');
            }
        });

        it('TC_REQUEST_08: Lỗi khi Staff xem yêu cầu không được phân công (Abnormal)', async () => {
            const mockRequest = { id: 'req-1', assigned_staff_id: 10, room: { building_id: 1 } };
            Request.findByPk.mockResolvedValue(mockRequest);
            const caller = { id: 1, role: ROLES.STAFF };

            console.log(`[TEST]: Xem yêu cầu thất bại - Không có quyền (Staff)`);
            try {
                await RequestService.getRequestById(caller, 'req-1');
                throw new Error('Should have thrown error');
            } catch (error) {
                console.log(`- Actual Error: "${error.message}"`);
                expect(error.status).toBe(403);
                expect(error.message).toBe('Bạn không có quyền thực hiện hành động này');
            }
        });
    });
});
