import { mockDashboard } from './dashboard';

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function getWorkerDashboard() {
  await delay(180);

  return mockDashboard;
}
