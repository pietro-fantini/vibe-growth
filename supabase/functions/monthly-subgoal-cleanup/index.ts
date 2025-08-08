import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting monthly subgoal cleanup...')
    
    // Get current period
    const currentPeriod = new Date().toISOString().slice(0, 7) // YYYY-MM format
    const nextPeriod = getNextMonth(currentPeriod)
    
    // Get all active subgoals with their current progress
    const { data: subgoals, error: subgoalsError } = await supabaseClient
      .from('subgoals')
      .select(`
        id,
        type,
        target_count,
        user_id,
        goal_id,
        subgoal_progress!inner(
          completed_count,
          period
        )
      `)
      .eq('is_active', true)
      .eq('subgoal_progress.period', currentPeriod)

    if (subgoalsError) {
      console.error('Error fetching subgoals:', subgoalsError)
      throw subgoalsError
    }

    console.log(`Found ${subgoals?.length || 0} subgoals with progress in current period`)

    if (!subgoals || subgoals.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No subgoals found for cleanup',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let deletedCount = 0
    let resetCount = 0

    for (const subgoal of subgoals) {
      const progress = subgoal.subgoal_progress[0]
      const isCompleted = progress.completed_count >= subgoal.target_count

      if (subgoal.type === 'one_time') {
        if (isCompleted) {
          // Delete completed one-time subgoals
          const { error: deleteError } = await supabaseClient.rpc('delete_subgoal_and_recalculate', {
            subgoal_uuid: subgoal.id
          })
          
          if (deleteError) {
            console.error(`Error deleting subgoal ${subgoal.id}:`, deleteError)
          } else {
            deletedCount++
            console.log(`Deleted completed one-time subgoal: ${subgoal.id}`)
          }
        }
        // Incomplete one-time subgoals are kept as-is
      } else if (subgoal.type === 'recurring') {
        // Reset recurring subgoals to zero progress for the new month
        // Create new progress record for next month with zero count
        const { error: insertError } = await supabaseClient
          .from('subgoal_progress')
          .insert({
            subgoal_id: subgoal.id,
            period: nextPeriod,
            completed_count: 0
          })
        
        if (insertError && !insertError.message.includes('duplicate key')) {
          console.error(`Error creating next month progress for subgoal ${subgoal.id}:`, insertError)
        } else {
          resetCount++
          console.log(`Reset recurring subgoal for next month: ${subgoal.id}`)
        }

        // Recalculate parent goal progress
        const { error: recalcError } = await supabaseClient.rpc('recalculate_goal_progress', {
          goal_uuid: subgoal.goal_id
        })
        
        if (recalcError) {
          console.error(`Error recalculating goal progress for goal ${subgoal.goal_id}:`, recalcError)
        }
      }
    }

    // Ensure all active goals start next month at zero
    const { data: goals, error: goalsError } = await supabaseClient
      .from('goals')
      .select('id')
      .eq('is_active', true)

    if (goalsError) {
      console.error('Error fetching goals for next month init:', goalsError)
    } else if (goals) {
      for (const g of goals) {
        const { error: gpErr } = await supabaseClient
          .from('goal_progress')
          .insert({ goal_id: g.id, period: nextPeriod, completed_count: 0 })

        if (gpErr && !gpErr.message.includes('duplicate key')) {
          console.error(`Error initializing goal ${g.id} for ${nextPeriod}:`, gpErr)
        }
      }
    }

    console.log(`Cleanup completed: ${deletedCount} deleted, ${resetCount} reset`) 

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Monthly cleanup completed successfully',
        deletedSubgoals: deletedCount,
        resetSubgoals: resetCount,
        totalProcessed: deletedCount + resetCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in monthly cleanup:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function getNextMonth(currentPeriod: string): string {
  const [year, month] = currentPeriod.split('-').map(Number)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return `${nextYear}-${nextMonth.toString().padStart(2, '0')}`
}