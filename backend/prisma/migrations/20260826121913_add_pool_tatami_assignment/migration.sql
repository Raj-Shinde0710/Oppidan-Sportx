-- DropForeignKey
ALTER TABLE "tatamis" DROP CONSTRAINT "tatamis_tournament_fkey";

-- AlterTable
ALTER TABLE "pools" ADD COLUMN     "tatamiId" TEXT;

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_tatamiId_fkey" FOREIGN KEY ("tatamiId") REFERENCES "tatamis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tatamis" ADD CONSTRAINT "tatamis_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
