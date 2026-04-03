import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Generic Supabase CRUD hook
 * @param {string} table - Supabase table name
 * @param {object} [options]
 * @param {string} [options.orderBy] - column name to order by
 * @param {boolean} [options.ascending] - order direction
 * @param {object} [options.filter] - { column, value } to filter
 * @param {boolean} [options.skip] - skip initial fetch
 */
export function useSupabase(table, options = {}) {
  const { orderBy = 'created_at', ascending = false, filter, skip = false } = options

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!table) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase.from(table).select('*')
      if (filter?.column && filter?.value !== undefined && filter?.value !== '') {
        query = query.eq(filter.column, filter.value)
      }
      if (orderBy) {
        query = query.order(orderBy, { ascending })
      }
      const { data: rows, error: err } = await query
      if (err) throw err
      setData(rows || [])
    } catch (e) {
      console.error(`useSupabase [${table}] fetch error:`, e)
      setError(e)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [table, orderBy, ascending, filter?.column, filter?.value, skip])

  useEffect(() => {
    if (!skip) fetch()
  }, [fetch, skip])

  const insert = useCallback(async (row) => {
    const { data: inserted, error: err } = await supabase
      .from(table)
      .insert([row])
      .select()
      .single()
    if (err) throw err
    setData(prev => [inserted, ...prev])
    return inserted
  }, [table])

  const update = useCallback(async (id, updates) => {
    const { data: updated, error: err } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (err) throw err
    setData(prev => prev.map(r => r.id === id ? updated : r))
    return updated
  }, [table])

  const remove = useCallback(async (id) => {
    const { error: err } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
    if (err) throw err
    setData(prev => prev.filter(r => r.id !== id))
  }, [table])

  const upsert = useCallback(async (row) => {
    const { data: result, error: err } = await supabase
      .from(table)
      .upsert([row])
      .select()
      .single()
    if (err) throw err
    setData(prev => {
      const idx = prev.findIndex(r => r.id === result.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = result
        return next
      }
      return [result, ...prev]
    })
    return result
  }, [table])

  return { data, loading, error, fetch, insert, update, remove, upsert, setData }
}

/**
 * Fetch a single row by id
 */
export function useSupabaseRow(table, id) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id || !table) return
    setLoading(true)
    supabase.from(table).select('*').eq('id', id).single()
      .then(({ data: row, error: err }) => {
        if (err) setError(err)
        else setData(row)
      })
      .finally(() => setLoading(false))
  }, [table, id])

  return { data, loading, error }
}

/**
 * Fetch team_settings (single row pattern)
 */
export function useSettings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const { DEFAULT_SETTINGS } = require('../lib/constants')

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('team_settings')
        .select('*')
        .limit(1)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      setSettings(data || DEFAULT_SETTINGS)
    } catch {
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const save = useCallback(async (updates) => {
    try {
      const { data: existing } = await supabase
        .from('team_settings')
        .select('id')
        .limit(1)
        .single()
      if (existing?.id) {
        await supabase.from('team_settings').update(updates).eq('id', existing.id)
      } else {
        await supabase.from('team_settings').insert([updates])
      }
      setSettings(prev => ({ ...prev, ...updates }))
    } catch (e) {
      console.error('settings save error:', e)
    }
  }, [])

  return { settings, loading, save, refetch: fetch }
}
