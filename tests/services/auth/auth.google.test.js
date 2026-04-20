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
jest.mock('../../../utils/google.util', () => ({
    verifyGoogleIdToken: jest.fn()
}));
jest.mock('../../../utils/otp.util', () => ({
    generateOtp: jest.fn(),
    verifyOtp: jest.fn(),
    OTP_TYPES: { EMAIL_VERIFICATION: 'EMAIL_VERIFICATION', PASSWORD_RESET: 'PASSWORD_RESET' }
}));
jest.mock('../../../utils/mail.util', () => ({
    sendOtpMail: jest.fn()
}));
jest.mock('../../../utils/token.util', () => ({
    generateAccessToken: jest.fn()
}));

const AuthService = require('../../../services/auth.service');
const googleUtil = require('../../../utils/google.util');
const otpUtil = require('../../../utils/otp.util');
const mailUtil = require('../../../utils/mail.util');
const tokenUtil = require('../../../utils/token.util');

const { User, AuthProvider } = sequelize.models;

describe('AuthService - Google Login Workflow', () => {
    const idToken = 'fake-id-token';
    const email = 'google-user@example.com';
    const googleId = 'google-sub-123';

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    describe('AuthService.googleSignInStep1', () => {
        it('TC_AUTH_08: Gửi mã OTP xác thực Google thành công (Happy Path)', async () => {
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, email_verified: true });
            otpUtil.generateOtp.mockResolvedValue({ code: '111222' });
            mailUtil.sendOtpMail.mockResolvedValue(true);

            const result = await AuthService.googleSignInStep1(idToken);

            console.log(`[TEST]: Gửi OTP Google thành công`);
            expect(result.message).toBe('Đã gửi mã OTP đến email');
        });

        it('TC_AUTH_09: Lỗi khi email Google chưa được xác minh', async () => {
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, email_verified: false });

            console.log(`[TEST]: Google email chưa xác minh`);
            try {
                await AuthService.googleSignInStep1(idToken);
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe('Email Google chưa được xác minh');
            }
        });
    });

    describe('AuthService.googleSignInStep2', () => {
        const otp = '111222';
        const mockUser = { id: 'u1', email, role: 'CUSTOMER' };

        it('TC_AUTH_10: Đăng nhập Google thành công với User đã tồn tại (Happy Path)', async () => {
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, sub: googleId });
            otpUtil.verifyOtp.mockResolvedValue(true);
            User.findOne.mockResolvedValue(mockUser);
            AuthProvider.findOne.mockResolvedValue({ user_id: 'u1' });
            tokenUtil.generateAccessToken.mockReturnValue('google-token');

            const result = await AuthService.googleSignInStep2(idToken, otp);

            console.log(`[TEST]: Đăng nhập Google thành công`);
            expect(result.access_token).toBe('google-token');
        });

        it('TC_AUTH_11: Lỗi khi tài khoản Google đã liên kết với User khác', async () => {
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, sub: googleId });
            otpUtil.verifyOtp.mockResolvedValue(true);
            User.findOne.mockResolvedValue(mockUser);
            AuthProvider.findOne.mockResolvedValue({ user_id: 'u2' }); // Mismatched

            console.log(`[TEST]: Google ID đã liên kết User khác`);
            try {
                await AuthService.googleSignInStep2(idToken, otp);
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe('Tài khoản Google đã được liên kết với người dùng khác');
            }
        });
    });
});
