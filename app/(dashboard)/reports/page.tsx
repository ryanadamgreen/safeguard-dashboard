import { getAlerts, getChildren } from "../../lib/supabase/queries";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const [dbAlerts, dbChildren] = await Promise.all([getAlerts(500), getChildren()]);
  return <ReportsClient dbAlerts={dbAlerts} dbChildren={dbChildren} />;
}
