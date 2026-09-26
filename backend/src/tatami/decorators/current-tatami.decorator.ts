import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { TatamiJwtPayload } from "../guards/tatami-auth.guard";

export const CurrentTatami = createParamDecorator(
  (data: keyof TatamiJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
