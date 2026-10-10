const AuthController = require('../../controllers/auth.controller');
const AuthService = require('../../services/auth.service');

// Mock AuthService
jest.mock('../../services/auth.service');

describe('AuthController', () => {
  describe('login', () => {
    let req;
    let res;

    beforeEach(() => {
      req = {
        body: {
          email: 'test@example.com',
          passwd: 'password123'
        }
      };
      res = {
        cookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      jest.clearAllMocks();
    });

    it('should login successfully and return tokens without setting cookie if remember_me is false', async () => {
      const mockTokens = { accessToken: 'access_token', refreshToken: 'refresh_token' };
      AuthService.login.mockResolvedValue(mockTokens);

      await AuthController.login(req, res);

      expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockTokens);
    });

    it('should login successfully and set a cookie if remember_me is true', async () => {
      req.body.remember_me = true;
      const mockTokens = { accessToken: 'access_token', refreshToken: 'refresh_token' };
      AuthService.login.mockResolvedValue(mockTokens);

      await AuthController.login(req, res);

      expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(res.cookie).toHaveBeenCalledWith('refreshToken', 'refresh_token', {
        httpOnly: true,
        secure: false,
        maxAge: 365 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });
      expect(res.json).toHaveBeenCalledWith(mockTokens);
    });

    it('should return 401 if login fails', async () => {
      const errorMessage = 'Invalid credentials';
      AuthService.login.mockRejectedValue(new Error(errorMessage));

      await AuthController.login(req, res);

      expect(AuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
    });
  });
});
