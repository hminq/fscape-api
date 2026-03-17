const AuthService = require('../../../services/auth.service');
const User = require('../../../models/user.model');
const { AuthProvider } = require('../../../models/authProvider.model');
const passwordUtil = require('../../../utils/password.util');
const tokenUtil = require('../../../utils/token.util');

// Giả lập các phụ thuộc
jest.mock('../../models/user.model');
jest.mock('../../models/authProvider.model', () => ({
    AuthProvider: {
        findOne: jest.fn()
    }
}));
jest.mock('../../utils/password.util');
jest.mock('../../utils/token.util');

describe('AuthService - Signin (Đăng nhập)', () => {
    const email = 'login@example.com';
    const password = 'Password123!';
    const mockUser = {
        id: 'user-id',
        email: email,
        role: 'CUSTOMER',
        is_active: true,
        update: jest.fn().mockResolvedValue(true)
    };
    const mockAuth = {
        password_hash: 'hashed_pw',
        is_verified: true,
        User: mockUser
    };

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    // =========================================================================
    // HÀM SIGNIN (WEB LOGIN)
    // =========================================================================
    describe('Hàm signin', () => {

        // --- Happy Case ---
        it('Đăng nhập thành công với thông tin đúng', async () => {
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue(mockAuth);
            passwordUtil.comparePassword.mockResolvedValue(true);
            tokenUtil.generateAccessToken.mockReturnValue('fake-token');

            const result = await AuthService.signin(email, password);

            console.log(`[TEST]: Đăng nhập thành công`);
            console.log(`- Input   : Email="${email}", Password="***"`);
            console.log(`- Expected: Object containing access_token`);
            console.log(`- Actual  : Object with access_token "${result.access_token}"`);

            expect(result).toHaveProperty('access_token');
        });

        // --- Edge Case: Sai mật khẩu ---
        it('Mật khẩu không chính xác', async () => {
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue(mockAuth);
            passwordUtil.comparePassword.mockResolvedValue(false);
            const expectedError = 'Invalid credentials';

            console.log(`[TEST]: Mật khẩu không chính xác`);
            console.log(`- Input   : Email="${email}", Password="WrongPassword"`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signin(email, 'WrongPassword');
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        // --- Edge Case: Email không tồn tại ---
        it('Email không tồn tại', async () => {
            const unknownEmail = 'unknown@example.com';
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue(null);
            const expectedError = 'Invalid credentials';

            console.log(`[TEST]: Email không tồn tại`);
            console.log(`- Input   : Email="${unknownEmail}"`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signin(unknownEmail, password);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        // --- Edge Case: Email trống ---
        it('Email trống', async () => {
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue(null);
            const expectedError = 'Invalid credentials';

            console.log(`[TEST]: Email trống`);
            console.log(`- Input   : Email=""`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signin('', password);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        // --- Edge Case: Password trống ---
        it('Password trống', async () => {
            const { AuthProvider } = require('../../../models/authProvider.model');
            AuthProvider.findOne.mockResolvedValue(mockAuth);
            passwordUtil.comparePassword.mockResolvedValue(false);
            const expectedError = 'Invalid credentials';

            console.log(`[TEST]: Password trống`);
            console.log(`- Input   : Email="${email}", Password=""`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signin(email, '');
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });
    });
});
