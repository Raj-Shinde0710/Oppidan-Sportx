import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface TatamiJwtPayload {
  tatamiId: string;
  tournamentId: string;
  role: string;
  tatamiNumber?: number;
  username?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class TatamiAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers["authorization"];

    if (!authHeader) {
      throw new UnauthorizedException("Authorization header missing");
    }

    const [bearer, token] = authHeader.split(" ");
    if (bearer !== "Bearer" || !token) {
      throw new UnauthorizedException("Invalid token format");
    }

    try {
      const payload: TatamiJwtPayload = await this.jwtService.verifyAsync(
        token,
        {
          secret:
            process.env.JWT_SECRET ||
            "sports_ai_platform_jwt_super_secret_key_2026",
        },
      );

      if (payload.role !== "TATAMI") {
        throw new UnauthorizedException("Access denied: Not a Tatami token");
      }

      // Attach user payload to request for downstream handlers
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
