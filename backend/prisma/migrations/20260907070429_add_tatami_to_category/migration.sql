-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "tatamiId" TEXT;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_tatamiId_fkey" FOREIGN KEY ("tatamiId") REFERENCES "tatamis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
