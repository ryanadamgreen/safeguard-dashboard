import { getChildren, getAlerts, getStaff } from "../../lib/supabase/queries";
import ChildrenClient from "./ChildrenClient";

export default async function ChildrenPage() {
  const [dbChildren, dbAlerts, dbStaff] = await Promise.all([
    getChildren(),
    getAlerts(200),
    getStaff(),
  ]);

  return (
    <ChildrenClient
      dbChildren={dbChildren}
      dbAlerts={dbAlerts}
      dbStaff={dbStaff}
    />
  );
}
