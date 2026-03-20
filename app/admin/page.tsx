import { getHomes, getStaff, getOrganisations } from "../lib/supabase/queries";
import AdminOverviewClient from "./AdminOverviewClient";

export default async function AdminPage() {
  const [dbHomes, dbStaff, dbOrgs] = await Promise.all([
    getHomes(),
    getStaff(),
    getOrganisations(),
  ]);
  return <AdminOverviewClient dbHomes={dbHomes} dbStaff={dbStaff} dbOrgs={dbOrgs} />;
}
