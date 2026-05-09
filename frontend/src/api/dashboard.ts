import client from './client'
import type { BranchDashboard, MainDashboard } from '../types'

export const getBranchDashboard = () =>
  client.get<BranchDashboard>('/dashboard/branch/').then(r => r.data)

export const getMainDashboard = () =>
  client.get<MainDashboard>('/dashboard/main/').then(r => r.data)
