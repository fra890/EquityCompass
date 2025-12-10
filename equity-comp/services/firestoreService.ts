import { Client } from '../types';

const STORAGE_KEY = 'equity_compass_clients';

// Helper to simulate network delay for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getClients = async (userId: string): Promise<Client[]> => {
  await delay(500); 
  try {
    const data = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading from local storage", e);
    return [];
  }
};

export const saveClient = async (userId: string, client: Client): Promise<void> => {
  await delay(300);
  try {
    const clients = await getClients(userId);
    const index = clients.findIndex(c => c.id === client.id);
    
    let newClients;
    if (index >= 0) {
      newClients = [...clients];
      newClients[index] = client;
    } else {
      newClients = [...clients, client];
    }
    
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newClients));
  } catch (e) {
    console.error("Error saving to local storage", e);
  }
};

export const deleteClient = async (userId: string, clientId: string): Promise<void> => {
  await delay(300);
  try {
    const clients = await getClients(userId);
    const newClients = clients.filter(c => c.id !== clientId);
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newClients));
  } catch (e) {
    console.error("Error deleting from local storage", e);
  }
};