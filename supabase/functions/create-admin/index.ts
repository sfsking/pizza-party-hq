import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Create the preset admin user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: 'sifee1200@gmail.com',
      password: 'qwertyu123',
      user_metadata: {
        full_name: 'Admin User'
      },
      email_confirm: true
    })

    if (userError) {
      console.error('Error creating admin user:', userError)
      // If user already exists, just update the profile
      if (userError.message.includes('already registered')) {
        // Find existing user
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers.users.find(u => u.email === 'sifee1200@gmail.com')
        
        if (existingUser) {
          // Update profile to ensure admin role
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
              user_id: existingUser.id,
              email: 'sifee1200@gmail.com',
              full_name: 'Admin User',
              role: 'admin',
              is_active: true
            })
          
          if (profileError) {
            console.error('Error updating admin profile:', profileError)
            throw profileError
          }
          
          return new Response(
            JSON.stringify({ 
              message: 'Admin user already exists, profile updated', 
              user: existingUser 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        throw userError
      }
    }

    // Create/update profile for new user
    if (userData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: userData.user.id,
          email: 'sifee1200@gmail.com',
          full_name: 'Admin User',
          role: 'admin',
          is_active: true
        })

      if (profileError) {
        console.error('Error creating admin profile:', profileError)
        throw profileError
      }
    }

    console.log('Admin user created successfully:', userData.user?.email)
    
    return new Response(
      JSON.stringify({ 
        message: 'Admin user created successfully', 
        user: userData.user 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})