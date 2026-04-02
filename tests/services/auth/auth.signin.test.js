const AuthService = require('../../../services/auth.service');
const passwordUtil = require('../../../utils/password.util');
const tokenUtil = require('../../../utils/token.util');

// Mock database to prevent any connection attempts
jest.mock('../../../config/db', () => {
    const mockSequelize = {
        define: jest.fn().mockReturnValue({
            associate: jest.fn(),
            belongsTo: jest.fn(),
            hasMany: jest.fn(),
            hasOne: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            destroy: jest.fn(),
            findByPk: jest.fn(),
            save: jest.fn()
        }),
        models: {},
        authenticate: jest.fn().mockResolvedValue(),
        sync: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue(),
        query: jest.fn().mockResolvedValue([]),
        transaction: jest.fn().mockResolvedValue({
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue()
        })
    };
    return {
        sequelize: mockSequelize,
        connectDB: jest.fn().mockResolvedValue()
    };
});

// Mock models to prevent database connections
jest.mock('../../../models/user.model', () => {
    return {
        findOne: jest.fn(),
        create: jest.fn(),
        associate: jest.fn()
    };
});

jest.mock('../../../models/authProvider.model', () => {
    const mockAuthProvider = {
        findOne: jest.fn(),
        create: jest.fn(),
        associate: jest.fn()
    };
    return { AuthProvider: mockAuthProvider };
});

jest.mock('../../../utils/password.util');
jest.mock('../../../utils/token.util');
jest.mock('../../../utils/otp.util');
jest.mock('../../../utils/mail.util');

const { AuthProvider } = require('../../../models/authProvider.model');

describe('AuthService - Signin', () => {
    const email = 'admin@fscape.vn';
    const password = 'Admin@123';
    const mockUser = {
        id: 'user-123',
        email: email,
        role: 'CUSTOMER',
        is_active: true,
        first_name: 'Test',
        last_name: 'User',
        avatar_url: null,
        update: jest.fn().mockResolvedValue(true)
    };
    const mockAuth = {
        password_hash: 'hashed_password',
        is_verified: true,
        User: mockUser
    };

    beforeEach(() => {
        jest.clearAllMocks();
        console.log('\n=========================================================================');
    });

    describe('signin function', () => {
        it('TC_AUTH_01: Login successfully with correct credentials', async () => {
            AuthProvider.findOne.mockResolvedValue(mockAuth);
            passwordUtil.comparePassword.mockResolvedValue(true);
            tokenUtil.generateAccessToken.mockReturnValue('valid-token');

            const result = await AuthService.signin(email, password);

            console.log(`[TEST]: Login successfully`);
            console.log(`- Input   : Email="${email}", Password="***"`);
            console.log(`- Expected: Object containing access_token`);
            console.log(`- Actual  : access_token="${result.access_token}"`);

            expect(result).toHaveProperty('access_token');
            expect(result.user.email).toBe(email);
        });

        it('TC_AUTH_02: Login failed with incorrect password', async () => {
            AuthProvider.findOne.mockResolvedValue(mockAuth);
            passwordUtil.comparePassword.mockResolvedValue(false);
            const expectedError = 'Thông tin đăng nhập không hợp lệ';

            console.log(`[TEST]: Login failed (Incorrect password)`);
            console.log(`- Input   : Email="${email}", Password="wrong-password"`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signin(email, 'wrong-password');
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        it('TC_AUTH_03: Login failed with non-existent email', async () => {
            const unknownEmail = 'unknown_user@gmail.com';
            AuthProvider.findOne.mockResolvedValue(null);
            const expectedError = 'Thông tin đăng nhập không hợp lệ';

            console.log(`[TEST]: Login failed (Email not found)`);
            console.log(`- Input   : Email="${unknownEmail}"`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signin(unknownEmail, password);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        it('TC_AUTH_04: Login failed with inactive account', async () => {
            const inactiveAuth = {
                ...mockAuth,
                User: { ...mockUser, is_active: false }
            };
            AuthProvider.findOne.mockResolvedValue(inactiveAuth);
            const expectedError = 'Tài khoản đã bị vô hiệu hóa';

            console.log(`[TEST]: Login failed (Inactive account)`);
            console.log(`- Input   : Email="${email}" (Inactive)`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signin(email, password);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });

        it('TC_AUTH_05: Login failed with unverified account', async () => {
            const unverifiedAuth = {
                ...mockAuth,
                is_verified: false
            };
            AuthProvider.findOne.mockResolvedValue(unverifiedAuth);
            const expectedError = 'Thông tin đăng nhập không hợp lệ';

            console.log(`[TEST]: Login failed (Unverified email)`);
            console.log(`- Input   : Email="${email}" (Unverified)`);
            console.log(`- Expected Error: "${expectedError}"`);

            try {
                await AuthService.signin(email, password);
            } catch (error) {
                console.log(`- Actual Error  : "${error.message}"`);
                expect(error.message).toBe(expectedError);
            }
        });
    });
});
