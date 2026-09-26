-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'LIVE', 'COMPLETED');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "nextMatchId" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "winnerId" TEXT;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
