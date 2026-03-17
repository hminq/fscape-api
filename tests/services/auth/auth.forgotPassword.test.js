const AuthService = require('../../../services/auth.service');
const { AuthProvider } = require('../../../models/authProvider.model');
const otpUtil = require('../../../utils/otp.util');
const mailUtil = require('../../../utils/mail.util');
const passwordUtil = require('../../../utils/password.util');

// Giả lập các phụ thuộc
jest.mock('../../models/authProvider.model', () => ({
    AuthProvider: {
        findOne: jest.fn()
    }
}));
jest.mock('../../utils/otp.util');
jest.mock('../../utils/mail.util');
jest.mock('../../utils/password.util');

describe('AuthService - Forgot Password (Quên/Đặt lại mật khẩu)', () => {
    const email = 'forgot@example.com';

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    // =========================================================================
    // HÀM FORGOT PASSWORD (GỬI OTP RESET)
    // =========================================================================
    describe('Hàm forgotPassword', () => {

        it('Gửi mã OTP thành công để đặt lại mật khẩu', async () => {
            otpUtil.generateOtp.mockResolvedValue({ code: '654321' });
            mailUtil.sendOtpMail.mockResolvedValue(true);

            const expectedResult = { message: 'OTP sent' };
            const result = await AuthService.forgotPassword(email);

            console.log(`[TEST]: Gửi OTP reset mật khẩu thành công`);
            console.log(`- Input   : Email="${email}"`);
            console.log(`- Expected: ${JSON.stringify(expectedResult)}`);
            console.log(`- Actual  : ${JSON.stringify(result)}`);

            expect(result).toEqual(expectedResult);
        });

        it('Vượt quá giới hạn yêu cầu OTP (5 lần/ngày)', async () => {
            const expectedError = 'OTP request limit exceeded (5/day)';
            otpUtil.generateOtp.mockRejectedValue(new Error(expectedError));

            console.log(`[TEST]: Vượt giới hạn yêu cầu OTP`);
            console.log(`- Input   : Email="${email}" (Gửi lần thứ 6)`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.forgotPassword(email);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });
    });

    // =========================================================================
    // HÀM RESET PASSWORD (XÁC THỰC VÀ CẬP NHẬT PASS)
    // =========================================================================
    describe('Hàm resetPassword', () => {
        const otp = '654321';
        const newPassword = 'NewPassword123!';
        const mockAuth = {
            password_hash: '',
            save: jest.fn().mockResolvedValue(true)
        };

        it('Đặt lại mật khẩu thành công', async () => {
            otpUtil.verifyOtp.mockResolvedValue(true);
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue(mockAuth);
            passwordUtil.hashPassword.mockResolvedValue('new_hash');

            const expectedResult = { message: 'Password updated' };
            const result = await AuthService.resetPassword(email, otp, newPassword);

            console.log(`[TEST]: Đặt lại mật khẩu thành công`);
            console.log(`- Input   : Email="${email}", OTP="${otp}", NewPassword="***"`);
            console.log(`- Expected: ${JSON.stringify(expectedResult)}`);
            console.log(`- Actual  : ${JSON.stringify(result)}`);

            expect(result).toEqual(expectedResult);
        });

        it('Mã OTP đặt lại mật khẩu không chính xác', async () => {
            const invalidOtp = '000000';
            const expectedError = 'Invalid or expired OTP';
            otpUtil.verifyOtp.mockRejectedValue(new Error(expectedError));

            console.log(`[TEST]: OTP đặt lại mật khẩu sai`);
            console.log(`- Input   : Email="${email}", OTP="${invalidOtp}"`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.resetPassword(email, invalidOtp, newPassword);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        it('Email không tồn tại trong hệ thống', async () => {
            otpUtil.verifyOtp.mockResolvedValue(true);
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue(null);
            const expectedError = 'Account not found';

            console.log(`[TEST]: Email không tồn tại khi reset password`);
            console.log(`- Input   : Email="${email}"`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.resetPassword(email, otp, newPassword);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });
    });
});
