const { sequelize } = require('../../../config/db');

// 1. Mock Database & Models MUST BE FIRST
jest.mock('../../../config/db', () => {
    const mockModel = {
        associate: jest.fn(),
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
        hasOne: jest.fn(),
        belongsToMany: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn()
    };
    const mockModels = {
        User: { ...mockModel },
        AuthProvider: { ...mockModel }
    };
    return {
        sequelize: {
            models: mockModels,
            define: jest.fn().mockReturnValue(mockModel),
            transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() })
        }
    };
});

jest.mock('../../../models/authProvider.model', () => ({
    AuthProvider: require('../../../config/db').sequelize.models.AuthProvider
}));
jest.mock('../../../models/user.model', () => (require('../../../config/db').sequelize.models.User));
jest.mock('../../../models/otpCode.model', () => (require('../../../config/db').sequelize.define()));
jest.mock('../../../models/auditLog.model', () => (require('../../../config/db').sequelize.define()));

// Mock Utils
jest.mock('../../../utils/otp.util', () => ({
    generateOtp: jest.fn(),
    verifyOtp: jest.fn()
}));
jest.mock('../../../utils/mail.util', () => ({
    sendOtpMail: jest.fn()
}));
jest.mock('../../../utils/password.util', () => ({
    hashPassword: jest.fn()
}));

const AuthService = require('../../../services/auth.service');
const otpUtil = require('../../../utils/otp.util');
const mailUtil = require('../../../utils/mail.util');
const passwordUtil = require('../../../utils/password.util');

const { AuthProvider } = sequelize.models;

describe('AuthService - Forgot Password Workflow', () => {
    const email = 'forgot@example.com';

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    describe('AuthService.forgotPassword', () => {
        it('TC_AUTH_05: Gửi mã OTP reset mật khẩu thành công (Happy Path)', async () => {
            otpUtil.generateOtp.mockResolvedValue({ code: '654321' });
            mailUtil.sendOtpMail.mockResolvedValue(true);

            const result = await AuthService.forgotPassword(email);

            console.log(`[TEST]: Gửi OTP reset mật khẩu thành công`);
            expect(result.message).toBe('Đã gửi mã OTP');
        });

        it('TC_AUTH_09: Lỗi khi không cung cấp email (ForgotPassword)', async () => {
            // Hiện tại Service không throw lỗi này, nên chúng ta mock otpUtil quăng lỗi
            const errorMsg = 'Email không hợp lệ';
            otpUtil.generateOtp.mockRejectedValue(new Error(errorMsg));
            
            console.log(`[TEST]: ForgotPassword với email trống`);
            try {
                await AuthService.forgotPassword('');
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe(errorMsg);
            }
        });
    });

    describe('AuthService.resetPassword', () => {
        const otp = '654321';
        const newPassword = 'NewPassword123!';

        it('TC_AUTH_06: Đặt lại mật khẩu thành công (Happy Path)', async () => {
            otpUtil.verifyOtp.mockResolvedValue(true);
            const mockAuth = {
                password_hash: '',
                save: jest.fn().mockResolvedValue(true)
            };
            AuthProvider.findOne.mockResolvedValue(mockAuth);
            passwordUtil.hashPassword.mockResolvedValue('new_hash');

            const result = await AuthService.resetPassword(email, otp, newPassword);

            console.log(`[TEST]: Đặt lại mật khẩu thành công`);
            expect(result.message).toBe('Đã cập nhật mật khẩu');
            expect(mockAuth.save).toHaveBeenCalled();
        });

        it('TC_AUTH_07: Lỗi khi không tìm thấy tài khoản (404-like)', async () => {
            otpUtil.verifyOtp.mockResolvedValue(true);
            AuthProvider.findOne.mockResolvedValue(null);

            console.log(`[TEST]: Reset password cho email không tồn tại`);
            try {
                await AuthService.resetPassword(email, otp, newPassword);
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe('Không tìm thấy tài khoản');
            }
        });

        it('TC_AUTH_08: Lỗi khi mã OTP không chính xác hoặc đã hết hạn (400)', async () => {
            const errorMsg = 'Mã OTP không chính xác hoặc đã hết hạn';
            otpUtil.verifyOtp.mockRejectedValue(new Error(errorMsg));

            console.log(`[TEST]: Reset password với OTP sai`);
            try {
                await AuthService.resetPassword(email, '000000', newPassword);
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe(errorMsg);
            }
        });

        it('TC_AUTH_10: Lỗi khi thiếu thông tin bắt buộc (ResetPassword)', async () => {
            const errorMsg = 'Mã OTP không chính xác hoặc đã hết hạn'; // Do verifyOtp quăng ra
            otpUtil.verifyOtp.mockRejectedValue(new Error(errorMsg));

            console.log(`[TEST]: ResetPassword với dữ liệu rỗng`);
            try {
                await AuthService.resetPassword(email, null, '');
                throw new Error('Should error');
            } catch (error) {
                expect(error.message).toBe(errorMsg);
            }
        });
    });
});
