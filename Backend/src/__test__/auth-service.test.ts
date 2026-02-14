import { AuthService } from "../services/auth-service";
import { testUtils } from "./setup";

describe("AuthService", () => {
  let authService: AuthService;

  beforeAll(async () => {
    authService = new AuthService();
  });

  beforeEach(async () => {
    await testUtils.clearDatabase();
    await testUtils.clearRedis();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      };

      const result = await authService.register(userData);

      expect(result.user.email).toBe(userData.email);
      expect(result.user.name).toBe(userData.name);
      expect(result.user.password).toBeUndefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("should not register user with existing email", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      };

      await authService.register(userData);

      await expect(authService.register(userData)).rejects.toThrow(
        "User already exists with this email"
      );
    });
  });

  describe("login", () => {
    it("should login user with correct credentials", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      };

      await authService.register(userData);

      const result = await authService.login(userData.email, userData.password);

      expect(result.user.email).toBe(userData.email);
      expect(result.accessToken).toBeDefined();
    });

    it("should not login with incorrect password", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      };

      await authService.register(userData);

      await expect(
        authService.login(userData.email, "wrongpassword")
      ).rejects.toThrow("Invalid email or password");
    });
  });

  describe("refreshToken", () => {
    it("should refresh tokens successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      };

      const { refreshToken } = await authService.register(userData);
      const newTokens = await authService.refreshToken(refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.refreshToken).not.toBe(refreshToken);
    });
  });
});
