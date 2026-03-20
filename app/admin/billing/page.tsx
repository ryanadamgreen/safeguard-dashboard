import { getOrganisations, getHomes } from "../../lib/supabase/queries";
import BillingClient from "./BillingClient";

export default async function BillingPage() {
  const [dbOrgs, dbHomes] = await Promise.all([getOrganisations(), getHomes()]);
  return <BillingClient dbOrgs={dbOrgs} dbHomes={dbHomes} />;
}
