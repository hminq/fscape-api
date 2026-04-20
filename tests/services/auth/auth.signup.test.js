const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models MUST BE FIRST
jest.mock('../../../config/db', () => {
    const createMockModel = () => ({
        associate: jest.fn(),
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
        hasOne: jest.fn(),
        belongsToMany: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        save: jest.fn()
    });
    const mockModels = {
        User: createMockModel(),
        AuthProvider: createMockModel()
    };
    return {
        sequelize: {
            models: mockModels,
            define: jest.fn().mockImplementation(createMockModel),
            transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() })
        }
    };
});

// Explicitly mock model files
jest.mock('../../../models/user.model', () => (require('../../../config/db').sequelize.models.User));
jest.mock('../../../models/authProvider.model', () => ({
    AuthProvider: require('../../../config/db').sequelize.models.AuthProvider
}));
jest.mock('../../../models/otpCode.model', () => (require('../../../config/db').sequelize.define()));
jest.mock('../../../models/auditLog.model', () => (require('../../../config/db').sequelize.define()));

// Mock Utils
jest.mock('../../../utils/otp.util', () => ({
    generateOtp: jest.fn(),
    verifyOtp: jest.fn(),
    OTP_TYPES: { EMAIL_VERIFICATION: 'EMAIL_VERIFICATION', PASSWORD_RESET: 'PASSWORD_RESET' }
}));
jest.mock('../../../utils/mail.util', () => ({
    sendOtpMail: jest.fn()
}));
jest.mock('../../../utils/password.util', () => ({
    hashPassword: jest.fn(),
    comparePassword: jest.fn()
}));

const AuthService = require('../../../services/auth.service');
const otpUtil = require('../../../utils/otp.util');
const mailUtil = require('../../../utils/mail.util');
const passwordUtil = require('../../../utils/password.util');

const { User, AuthProvider } = sequelize.models;

describe('AuthService - Signup Workflow', () => {
    const validEmail = 'guest_123@fscape.vn';
    const validPassword = 'Password123!';

    beforeEach(() => {
        jest.clearAllMocks();
        // Set default return values to prevent undefined
        User.create.mockResolvedValue({ id: 'user-default', email: validEmail });
        User.findOne.mockResolvedValue(null);
        console.log('\n=========================================================================');
    });

    describe('AuthService.signup', () => {
        it('TC_AUTH_01: Gửi OTP thành công (Happy Path)', async () => {
            otpUtil.generateOtp.mockResolvedValue({ code: '123456' });
            mailUtil.sendOtpMail.mockResolvedValue(true);

            const result = await AuthService.signup(validEmail, validPassword);

            console.log(`[TEST]: Gửi OTP đăng ký thành công`);
            expect(result.message).toBe('Đã gửi mã OTP đến email');
        });

        it('TC_AUTH_02: Lỗi khi email đã tồn tại (400)', async () => {
            User.findOne.mockResolvedValue({ id: 1, email: validEmail });

            console.log(`[TEST]: Đăng ký với email đã tồn tại`);
            try {
                await AuthService.signup(validEmail, validPassword);
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe('Email đã được đăng ký');
            }
        });

        it('TC_AUTH_05: Lỗi khi bỏ trống trường bắt buộc (SignUp)', async () => {
            console.log(`[TEST]: SignUp với dữ liệu trống`);
            try {
                await AuthService.signup(null, '');
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe('Email và mật khẩu không được để trống');
            }
        });
    });

    describe('AuthService.verifySignup', () => {
        it('TC_AUTH_03: Xác thực OTP và tạo User thành công (Happy Path)', async () => {
            otpUtil.verifyOtp.mockResolvedValue(true);
            User.create.mockResolvedValue({ id: 'user-1', email: validEmail });
            passwordUtil.hashPassword.mockResolvedValue('hashed-pw');
            AuthProvider.create.mockResolvedValue({});

            const result = await AuthService.verifySignup(validEmail, validPassword, '123456');

            console.log(`[TEST]: Xác thực đăng ký thành công`);
            expect(result.id).toBe('user-1');
            expect(User.create).toHaveBeenCalled();
        });

        it('TC_AUTH_04: Lỗi khi OTP sai hoặc hết hạn', async () => {
            const errorMsg = 'Mã OTP không chính xác hoặc đã hết hạn';
            otpUtil.verifyOtp.mockRejectedValue(new Error(errorMsg));

            console.log(`[TEST]: Xác thực với OTP sai`);
            try {
                await AuthService.verifySignup(validEmail, validPassword, '000000');
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe(errorMsg);
            }
        });

        it('TC_AUTH_06: Lỗi khi thiếu OTP khi xác thực', async () => {
            console.log(`[TEST]: Xác thực không có mã OTP`);
            try {
                await AuthService.verifySignup(validEmail, validPassword, '');
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe('Thiếu thông tin xác thực');
            }
        });
    });
});
