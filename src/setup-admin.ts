// Auto-setup script to create the preset admin account
export const setupAdminAccount = async () => {
  try {
    // We don't need authentication for this initial setup call
    // The edge function will handle creating the admin directly
    const response = await fetch('https://ntzcpsdackxlvqmkifyp.supabase.co/functions/v1/create-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50emNwc2RhY2t4bHZxbWtpZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyODE5MDAsImV4cCI6MjA2ODg1NzkwMH0.Ifnxd7mvbUiX0WfuWpTt836wmuDOqi25NiklPbYwJ7Q',
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