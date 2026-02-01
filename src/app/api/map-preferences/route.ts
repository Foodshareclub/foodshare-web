import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platform = request.nextUrl.searchParams.get('platform') || 'web'
  
  const { data, error } = await supabase
    .from('user_map_preferences')
    .select('*')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, preferences: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { center, zoom, mapStyle, searchRadius, platform, deviceId } = await request.json()

  const { data, error } = await supabase
    .from('user_map_preferences')
    .upsert({
      user_id: user.id,
      platform: platform || 'web',
      device_id: deviceId || null,
      last_center_lat: center.lat,
      last_center_lng: center.lng,
      last_zoom_level: zoom,
      map_style: mapStyle || 'standard',
      search_radius_km: searchRadius || 10.0
    }, {
      onConflict: 'user_id,platform,device_id'
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
