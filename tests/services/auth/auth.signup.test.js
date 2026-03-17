const AuthService = require('../../../services/auth.service');
const User = require('../../../models/user.model');
const { AuthProvider } = require('../../../models/authProvider.model');
const otpUtil = require('../../../utils/otp.util');
const mailUtil = require('../../../utils/mail.util');
const passwordUtil = require('../../../utils/password.util');

// Giả lập các phụ thuộc (Mocks)
jest.mock('../../models/user.model');
jest.mock('../../models/authProvider.model', () => ({
    AuthProvider: {
        create: jest.fn()
    }
}));
jest.mock('../../utils/otp.util');
jest.mock('../../utils/mail.util');
jest.mock('../../utils/password.util');

describe('AuthService - Signup (Đăng ký tài khoản)', () => {
    const validEmail = 'signup-test@example.com';
    const validPassword = 'Password123!';

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    // =========================================================================
    // HÀM SIGNUP (GỬI OTP)
    // =========================================================================
    describe('Hàm signup', () => {
        
        // --- Happy Case ---
        it('Gửi OTP thành công', async () => {
            User.findOne.mockResolvedValue(null);
            otpUtil.generateOtp.mockResolvedValue({ code: '123456' });
            mailUtil.sendOtpMail.mockResolvedValue(true);

            const expectedResult = { message: 'OTP sent to email' };
            const result = await AuthService.signup(validEmail, validPassword);

            console.log(`[TEST]: Gửi OTP thành công`);
            console.log(`- Input   : Email="${validEmail}", Password="***"`);
            console.log(`- Expected: ${JSON.stringify(expectedResult)}`);
            console.log(`- Actual  : ${JSON.stringify(result)}`);
            
            expect(result).toEqual(expectedResult);
        });

        // --- Edge Case: Email đã tồn tại ---
        it('Email đã tồn tại', async () => {
            User.findOne.mockResolvedValue({ id: '1', email: validEmail });
            const expectedError = 'Email already exists';

            console.log(`[TEST]: Email đã tồn tại`);
            console.log(`- Input   : Email="${validEmail}" (Đã có trong hệ thống)`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signup(validEmail, validPassword);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        // --- Edge Case: Vượt quá giới hạn OTP (5 lần/ngày) ---
        it('Vượt quá giới hạn OTP (5 lần/ngày)', async () => {
            User.findOne.mockResolvedValue(null);
            const expectedError = 'OTP request limit exceeded (5/day)';
            otpUtil.generateOtp.mockRejectedValue(new Error(expectedError));

            console.log(`[TEST]: Vượt quá giới hạn OTP`);
            console.log(`- Input   : Email="${validEmail}" (Lần thứ 6 trong ngày)`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signup(validEmail, validPassword);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });
    });

    // =========================================================================
    // HÀM VERIFY SIGNUP (XÁC THỰC VÀ TẠO USER)
    // =========================================================================
    describe('Hàm verifySignup', () => {
        const validOtp = '123456';

        // --- Happy Case ---
        it('Tạo tài khoản thành công khi mã OTP chính xác', async () => {
            otpUtil.verifyOtp.mockResolvedValue(true);
            User.create.mockResolvedValue({ id: 'user-uuid', email: validEmail });
            passwordUtil.hashPassword.mockResolvedValue('hash-pw');
            AuthProvider.create.mockResolvedValue({});

            const result = await AuthService.verifySignup(validEmail, validPassword, validOtp);

            console.log(`[TEST]: Tạo tài khoản thành công`);
            console.log(`- Input   : Email="${validEmail}", OTP="${validOtp}"`);
            console.log(`- Expected: User object with email "${validEmail}"`);
            console.log(`- Actual  : User object with email "${result.email}"`);

            expect(result.email).toBe(validEmail);
        });

        // --- Edge Case: OTP sai hoặc hết hạn ---
        it('Mã OTP không chính xác hoặc đã hết hạn', async () => {
            const invalidOtp = '000000';
            const expectedError = 'Invalid or expired OTP';
            otpUtil.verifyOtp.mockRejectedValue(new Error(expectedError));

            console.log(`[TEST]: Mã OTP không chính xác`);
            console.log(`- Input   : Email="${validEmail}", OTP="${invalidOtp}" (Sai mã)`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.verifySignup(validEmail, validPassword, invalidOtp);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });
    });
});
