// lib/initialSetup.ts
import { supabaseService } from './supabase'

/**
 * Performs the one-time, highly privileged setup:
 * 1. Creates the Organization.
 * 2. Creates the initial Owner User/Profile.
 * 3. Associates the user as Owner to the organization.
 *
 * WARNING: This function MUST ONLY be run ONCE, ideally via a secure CLI/script, not exposed to the public API.
 * It requires the SUPABASE_SERVICE_ROLE_KEY.
 * @param initialEmail The email for the first owner.
 * @param initialName The full name of the first owner.
 */
export async function bootstrapOrganization(initialEmail: string, initialName: string) {
    console.log("--- Starting One-Time Organization Bootstrap ---");

    // 1. Check if an organization already exists (simple check for idempotency)
    const { data: existingOrgs, error: checkError } = await supabaseService
        .from('organizations')
        .select('id')
        .limit(1);

    if (checkError) throw new Error(`DB Check Error: ${checkError.message}`);
    if (existingOrgs && existingOrgs.length > 0) {
        console.warn("Organization already exists. Skipping bootstrap.");
        return existingOrgs[0].id;
    }

    // 2. Create Organization
    const { data: orgData, error: orgError } = await supabaseService
        .from('organizations')
        .insert([{ name: "Gnapika Computer Shopee" }])
        .select()
        .single();

    if (orgError) throw new Error(`Org Creation Error: ${orgError.message}`);
    const orgId = orgData.id;
    console.log(`Organization created with ID: ${orgId}`);

    // 3. Create User Profile (This assumes the user was registered via Supabase Auth first)
    // In a real scenario, the auth.uid() would be used here after sign-up.
    // For bootstrap, we simulate linking a known email.
    const { data: profileData, error: profileError } = await supabaseService
        .from('user_profiles')
        .insert([{ organization_id: orgId, email: initialEmail, full_name: initialName }])
        .select()
        .single();

    if (profileError) throw new Error(`Profile Creation Error: ${profileError.message}`);
    const profileId = profileData.id;
    console.log(`User Profile created with ID: ${profileId}`);

    // 4. Assign Owner Role
    const { error: roleError } = await supabaseService
        .from('organization_memberships')
        .insert([{ user_profile_id: profileId, organization_id: orgId, role: 'Owner' }])
        .select();

    if (roleError) throw new Error(`Role Assignment Error: ${roleError.message}`);

    console.log("✅ Bootstrap complete. Organization and Owner created successfully.");
    return orgId;
}
