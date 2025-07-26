// Auto-setup script to create the preset admin account
export const setupAdminAccount = async () => {
  try {
    const response = await fetch('https://ntzcpsdackxlvqmkifyp.supabase.co/functions/v1/create-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    console.log('Admin setup result:', result);
    return result;
  } catch (error) {
    console.error('Failed to setup admin account:', error);
    throw error;
  }
};

// Auto-run setup when imported
setupAdminAccount().catch(console.error);