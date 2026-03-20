import { getHomes, getOrganisations } from "../../lib/supabase/queries";
import HomesClient from "./HomesClient";

export default async function HomesPage() {
  const [dbHomes, dbOrgs] = await Promise.all([getHomes(), getOrganisations()]);
  return <HomesClient dbHomes={dbHomes} dbOrgs={dbOrgs} />;
}
