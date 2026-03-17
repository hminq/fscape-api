const AuthService = require('../../../services/auth.service');
const User = require('../../../models/user.model');
const { AuthProvider } = require('../../../models/authProvider.model');
const googleUtil = require('../../../utils/google.util');
const otpUtil = require('../../../utils/otp.util');
const mailUtil = require('../../../utils/mail.util');
const tokenUtil = require('../../../utils/token.util');

// Giả lập các phụ thuộc
jest.mock('../../models/user.model');
jest.mock('../../models/authProvider.model', () => ({
    AuthProvider: {
        findOne: jest.fn(),
        create: jest.fn()
    }
}));
jest.mock('../../utils/google.util');
jest.mock('../../utils/otp.util');
jest.mock('../../utils/mail.util');
jest.mock('../../utils/token.util');

describe('AuthService - Google Login (Đăng nhập Google)', () => {
    const idToken = 'fake-id-token';
    const email = 'google-user@example.com';
    const googleId = 'google-sub-123';

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    // =========================================================================
    // GOOGLE SIGN IN - BƯỚC 1 (XÁC THỰC TOKEN & GỬI OTP)
    // =========================================================================
    describe('Hàm googleSignInStep1', () => {

        it('Gửi mã OTP thành công về email Apple/Google', async () => {
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, email_verified: true });
            otpUtil.generateOtp.mockResolvedValue({ code: '111222' });
            mailUtil.sendOtpMail.mockResolvedValue(true);

            const expectedResult = { message: 'OTP sent to email' };
            const result = await AuthService.googleSignInStep1(idToken);

            console.log(`[TEST]: Gửi OTP Google Step 1 thành công`);
            console.log(`- Input   : idToken="***"`);
            console.log(`- Expected: ${JSON.stringify(expectedResult)}`);
            console.log(`- Actual  : ${JSON.stringify(result)}`);

            expect(result).toEqual(expectedResult);
        });

        it('Email Google chưa được xác thực', async () => {
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, email_verified: false });
            const expectedError = 'Google email not verified';

            console.log(`[TEST]: Email Google chưa verify`);
            console.log(`- Input   : idToken="***" (email_verified: false)`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.googleSignInStep1(idToken);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });
    });

    // =========================================================================
    // GOOGLE SIGN IN - BƯỚC 2 (XÁC THỰC OTP & VÀO ỨNG DỤNG)
    // =========================================================================
    describe('Hàm googleSignInStep2', () => {
        const otp = '111222';
        const mockUser = { id: 'u1', email, role: 'CUSTOMER' };

        it('Đăng nhập Google thành công (Người dùng đã tồn tại)', async () => {
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, sub: googleId });
            otpUtil.verifyOtp.mockResolvedValue(true);
            User.findOne.mockResolvedValue(mockUser);
            
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue({ user_id: 'u1' });
            tokenUtil.generateAccessToken.mockReturnValue('google-token');

            const result = await AuthService.googleSignInStep2(idToken, otp);

            console.log(`[TEST]: Đăng nhập Google thành công`);
            console.log(`- Input   : idToken="***", OTP="${otp}"`);
            console.log(`- Expected: Object with access_token`);
            console.log(`- Actual  : access_token="${result.access_token}"`);

            expect(result.access_token).toBe('google-token');
        });

        it('Tài khoản Google đã liên kết với một User ID khác', async () => {
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, sub: googleId });
            otpUtil.verifyOtp.mockResolvedValue(true);
            User.findOne.mockResolvedValue(mockUser);
            
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue({ user_id: 'u2' }); // Khác u1
            const expectedError = 'Google account already linked to another user';

            console.log(`[TEST]: Google account liên kết user khác`);
            console.log(`- Input   : sub="${googleId}", Linked to="u2", Current User="u1"`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.googleSignInStep2(idToken, otp);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        it('Mã OTP xác thực đăng nhập Google không chính xác', async () => {
            const invalidOtp = 'wrong-otp';
            googleUtil.verifyGoogleIdToken.mockResolvedValue({ email, sub: googleId });
            otpUtil.verifyOtp.mockRejectedValue(new Error('Invalid or expired OTP'));
            const expectedError = 'Invalid or expired OTP';

            console.log(`[TEST]: OTP Google sai`);
            console.log(`- Input   : OTP="${invalidOtp}"`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.googleSignInStep2(idToken, invalidOtp);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });
    });
});
