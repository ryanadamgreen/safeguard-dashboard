export const dynamic = 'force-dynamic';

import { getOrganisations, getHomes, getStaff } from "../../lib/supabase/queries";
import OrganisationsClient from "./OrganisationsClient";

export default async function OrganisationsPage() {
  const [dbOrgs, dbHomes, dbStaff] = await Promise.all([
    getOrganisations(), getHomes(), getStaff(),
  ]);
  return <OrganisationsClient dbOrgs={dbOrgs} dbHomes={dbHomes} dbStaff={dbStaff} />;
}
