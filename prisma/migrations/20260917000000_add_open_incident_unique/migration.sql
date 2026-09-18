-- CreateIndex
-- Un único incidente OPEN por monitor, garantizado a nivel de base de datos.
CREATE UNIQUE INDEX "Incident_open_unique" ON "Incident"("monitorId") WHERE ("status" = 'OPEN');
