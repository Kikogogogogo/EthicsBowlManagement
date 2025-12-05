-- CreateTable
CREATE TABLE "win_logs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "wins_adj" INTEGER NOT NULL,
    "losses_adj" INTEGER NOT NULL,
    "ties_adj" INTEGER NOT NULL,
    "admin_id" TEXT NOT NULL,
    "admin_name" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "win_logs_pkey" PRIMARY KEY ("id")
);
