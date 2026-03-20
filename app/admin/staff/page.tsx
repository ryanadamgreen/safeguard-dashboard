import { getStaff, getHomes, getOrganisations } from "../../lib/supabase/queries";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  const [dbStaff, dbHomes, dbOrgs] = await Promise.all([
    getStaff(),
    getHomes(),
    getOrganisations(),
  ]);
  return <StaffClient dbStaff={dbStaff} dbHomes={dbHomes} dbOrgs={dbOrgs} />;
}
