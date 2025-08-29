import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { config } from '../config';
import { 
  AuthPayload, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse,
  AuthenticationError,
  ConflictError,
  ValidationError,
  NotFoundError
} from '../types';
import { generateSecureString, isValidEmail, isValidPhone } from '../utils';

export class AuthService {
  // Register new user
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, phone, password, firstName, lastName, role = UserRole.CITIZEN } = data;

    // Validate input
    if (!isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    if (phone && !isValidPhone(phone)) {
      throw new ValidationError('Invalid phone format');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : [])
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictError('User with this email already exists');
      }
      if (existingUser.phone === phone) {
        throw new ConflictError('User with this phone number already exists');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Return response without password
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  // Login user
  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Return response without password
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  // Refresh tokens
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
      
      // Find session
      const session = await prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session || !session.isActive || new Date() > session.expiresAt) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(session.user);

      // Update session with new refresh token
      await prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + this.parseExpiry(config.jwt.refreshExpiresIn)),
        },
      });

      return tokens;
    } catch (error) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  // Logout user (deactivate session)
  async logout(refreshToken: string): Promise<void> {
    await prisma.session.updateMany({
      where: { refreshToken },
      data: { isActive: false },
    });
  }

  // Get user profile
  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Verify JWT token and get user payload
  async verifyToken(token: string): Promise<AuthPayload> {
    try {
      const payload = jwt.verify(token, config.jwt.secret) as any;
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName,
        lastName: payload.lastName,
      };
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  // Private helper methods

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // Generate refresh token
    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    // Store refresh token in database
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + this.parseExpiry(config.jwt.refreshExpiresIn)),
      },
    });

    return { accessToken, refreshToken };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([mhd])$/);
    if (!match) return 15 * 60 * 1000; // Default 15 minutes

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm': return value * 60 * 1000; // minutes
      case 'h': return value * 60 * 60 * 1000; // hours
      case 'd': return value * 24 * 60 * 60 * 1000; // days
      default: return 15 * 60 * 1000;
    }
  }
}

export const authService = new AuthService();