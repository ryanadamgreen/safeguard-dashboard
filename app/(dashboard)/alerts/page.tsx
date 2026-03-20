import { getAlerts, getChildren } from "../../lib/supabase/queries";
import AlertsClient from "./AlertsClient";

export default async function AlertsPage() {
  const [dbAlerts, dbChildren] = await Promise.all([
    getAlerts(200),
    getChildren(),
  ]);

  return <AlertsClient dbAlerts={dbAlerts} dbChildren={dbChildren} />;
}
