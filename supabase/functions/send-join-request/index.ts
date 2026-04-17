import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { eventId, userId, skills, message } = await req.json();

    // Get event details
    const { data: event } = await supabaseClient
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organizer profile for email
    const { data: organizer } = await supabaseClient
      .from("profiles")
      .select("email, name")
      .eq("id", event.organizer_id)
      .single();

    if (!organizer?.email) {
      return new Response(JSON.stringify({ error: "Organizer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store the application in the database
    const { error: insertError } = await supabaseClient
      .from("applications")
      .insert({
        event_id: eventId,
        user_id: userId,
        skills,
        message,
        status: "pending",
      });

    if (insertError) throw insertError;

    // For now, we store the request. In production, integrate with an email service.
    // The organizer can see requests in their dashboard.
    console.log(`Join request from ${profile.name} (${profile.email}) to ${organizer.name} (${organizer.email}) for event: ${event.title}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Join request sent to ${organizer.name}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
