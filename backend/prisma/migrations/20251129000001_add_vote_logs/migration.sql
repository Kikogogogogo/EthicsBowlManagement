-- CreateTable
CREATE TABLE "vote_logs" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "adjustment" DOUBLE PRECISION NOT NULL,
    "admin_id" TEXT NOT NULL,
    "admin_name" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_logs_pkey" PRIMARY KEY ("id")
);

