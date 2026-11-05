import type { Team, User } from '../domain/types';

// DEMO DATA — synthetic organization. Names are fictional.
export const TEAMS: Team[] = [
  { id: 'T-BKK', name: 'ทีม Marketing - กรุงเทพฯ', businessUnit: 'BU กรุงเทพฯ และปริมณฑล', managerId: 'U-MGR1' },
  { id: 'T-REG', name: 'ทีม Marketing - ภูมิภาค', businessUnit: 'BU ภูมิภาค', managerId: 'U-MGR2' },
];

export const USERS: User[] = [
  { id: 'U-EXE1', name: 'อรุณี', role: 'executive', teamId: null, managerId: null },
  { id: 'U-MGR1', name: 'วิภาวดี', role: 'manager', teamId: 'T-BKK', managerId: 'U-EXE1' },
  { id: 'U-MGR2', name: 'ประเสริฐ', role: 'manager', teamId: 'T-REG', managerId: 'U-EXE1' },
  { id: 'U-MKT1', name: 'กิตติ', role: 'marketing', teamId: 'T-BKK', managerId: 'U-MGR1' },
  { id: 'U-MKT2', name: 'พิมพ์', role: 'marketing', teamId: 'T-BKK', managerId: 'U-MGR1' },
  { id: 'U-MKT3', name: 'อนันต์', role: 'marketing', teamId: 'T-BKK', managerId: 'U-MGR1' },
  { id: 'U-MKT4', name: 'ศิริพร', role: 'marketing', teamId: 'T-REG', managerId: 'U-MGR2' },
  { id: 'U-MKT5', name: 'ธนพล', role: 'marketing', teamId: 'T-REG', managerId: 'U-MGR2' },
  { id: 'U-MKT6', name: 'วรรณา', role: 'marketing', teamId: 'T-REG', managerId: 'U-MGR2' },
];

export const REGIONS_BY_TEAM: Record<string, string[]> = {
  'T-BKK': ['กรุงเทพฯ', 'ปริมณฑล', 'ภาคกลาง'],
  'T-REG': ['ภาคเหนือ', 'ภาคอีสาน', 'ภาคใต้', 'ภาคตะวันออก'],
};
